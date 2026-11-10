-- FITAL-IMMO — Annulation contrôlée d'un encaissement
-- Migration additive : conserve le paiement et sa quittance dans l'historique.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS annule_par_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS annule_par_nom VARCHAR(150),
  ADD COLUMN IF NOT EXISTS date_annulation TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motif_annulation TEXT;

-- Les paiements annulés ne doivent plus être comptés dans le total encaissé.
CREATE OR REPLACE FUNCTION public.payment_period_paid_total(
    p_agency_id UUID,
    p_locataire_id UUID,
    p_periode TEXT,
    p_exclude_payment_id UUID DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH RECURSIVE payment_rows AS (
        SELECT id, parent_payment_id, montant_versement, montant_paye
        FROM public.payments
        WHERE agency_id = p_agency_id
          AND locataire_id = p_locataire_id
          AND LOWER(BTRIM(periode)) = LOWER(BTRIM(p_periode))
          AND id IS DISTINCT FROM p_exclude_payment_id
          AND deleted_at IS NULL
          AND verification_statut IS DISTINCT FROM 'rejete'
          AND verification_statut IS DISTINCT FROM 'annule'
          AND statut IN ('Payé', 'Partiel')
    ),
    chain_roots AS (
        SELECT payment.id, payment.id AS root_id, ARRAY[payment.id] AS visited
        FROM payment_rows AS payment
        WHERE payment.parent_payment_id IS NULL
           OR NOT EXISTS (
                SELECT 1 FROM payment_rows AS parent
                WHERE parent.id = payment.parent_payment_id
           )
        UNION ALL
        SELECT child.id, parent.root_id, parent.visited || child.id
        FROM payment_rows AS child
        JOIN chain_roots AS parent ON child.parent_payment_id = parent.id
        WHERE NOT child.id = ANY(parent.visited)
    ),
    grouped_payments AS (
        SELECT
            COALESCE(root.root_id, payment.id) AS root_id,
            SUM(COALESCE(payment.montant_versement, 0)) AS installments,
            MAX(CASE WHEN payment.montant_versement IS NULL
                     THEN COALESCE(payment.montant_paye, 0)
                     ELSE 0 END) AS legacy_cumulative
        FROM payment_rows AS payment
        LEFT JOIN chain_roots AS root ON root.id = payment.id
        GROUP BY COALESCE(root.root_id, payment.id)
    )
    SELECT COALESCE(SUM(installments + legacy_cumulative), 0)
    FROM grouped_payments;
$$;

REVOKE ALL ON FUNCTION public.payment_period_paid_total(UUID, UUID, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;

-- Évite que le trigger de contrôle des encaissements recalcule un paiement
-- pendant sa transition vers l'état annulé.
CREATE OR REPLACE FUNCTION public.prevent_duplicate_final_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_due NUMERIC;
    expected_due NUMERIC;
    previously_paid NUMERIC;
    current_installment NUMERIC;
BEGIN
    IF NEW.deleted_at IS NOT NULL
       OR NEW.verification_statut IS NOT DISTINCT FROM 'rejete'
       OR NEW.verification_statut IS NOT DISTINCT FROM 'annule'
       OR NEW.statut IN ('Impayé', 'Annulé') THEN
        RETURN NEW;
    END IF;

    PERFORM pg_advisory_xact_lock(
        hashtextextended(
            NEW.agency_id::TEXT || ':' || NEW.locataire_id::TEXT || ':' || LOWER(BTRIM(NEW.periode)),
            0
        )
    );

    IF EXISTS (
        SELECT 1
        FROM public.payments AS payment
        WHERE payment.agency_id = NEW.agency_id
          AND payment.locataire_id = NEW.locataire_id
          AND LOWER(BTRIM(payment.periode)) = LOWER(BTRIM(NEW.periode))
          AND payment.id <> NEW.id
          AND payment.deleted_at IS NULL
          AND payment.verification_statut IS DISTINCT FROM 'rejete'
          AND payment.verification_statut IS DISTINCT FROM 'annule'
          AND (
              payment.statut = 'En attente'
              OR payment.verification_statut = 'en_attente'
          )
    ) THEN
        RAISE EXCEPTION 'Un paiement est déjà en attente de validation pour ce locataire et cette période.'
            USING ERRCODE = '23505', CONSTRAINT = 'uq_payment_tenant_period_blocking';
    END IF;

    total_due := COALESCE(NULLIF(NEW.montant_initial_du, 0), NEW.montant_total, 0);
    expected_due := public.payment_period_expected_due(
        NEW.agency_id, NEW.locataire_id, NEW.periode
    );
    IF expected_due IS NOT NULL THEN
        IF total_due <> expected_due THEN
            RAISE EXCEPTION 'Le montant dû ne correspond pas au solde contractuel et aux charges enregistrées.'
                USING ERRCODE = '23514', CONSTRAINT = 'payment_total_due_mismatch';
        END IF;
        total_due := expected_due;
    END IF;

    current_installment := COALESCE(NEW.montant_versement, NEW.montant_paye, 0);
    previously_paid := public.payment_period_paid_total(
        NEW.agency_id, NEW.locataire_id, NEW.periode, NEW.id
    );

    IF total_due <= 0 OR current_installment <= 0 THEN
        RAISE EXCEPTION 'Le montant dû et le versement doivent être positifs.'
            USING ERRCODE = '23514';
    END IF;

    IF previously_paid + current_installment > total_due THEN
        RAISE EXCEPTION 'Le versement dépasse le solde réellement dû pour cette période.'
            USING ERRCODE = '23514', CONSTRAINT = 'payment_amount_exceeds_balance';
    END IF;

    IF NEW.statut <> 'En attente' THEN
        IF previously_paid + current_installment >= total_due THEN
            NEW.statut := 'Payé';
            NEW.montant_restant := 0;
        ELSE
            NEW.statut := 'Partiel';
            NEW.montant_restant := total_due - previously_paid - current_installment;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_payment_with_history(
    p_payment_id UUID,
    p_agency_id UUID,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor_role TEXT;
    actor_name TEXT;
    payment_row public.payments%ROWTYPE;
    reason_text TEXT;
BEGIN
    IF auth.uid() IS NULL
       OR public.get_user_agency_id() IS DISTINCT FROM p_agency_id THEN
        RAISE EXCEPTION 'Agence ou session utilisateur invalide.'
          USING ERRCODE = '42501';
    END IF;

    actor_role := public.get_user_role();
    IF actor_role NOT IN ('SUPER_ADMIN', 'ADMIN', 'GESTIONNAIRE') THEN
        RAISE EXCEPTION 'Seuls un administrateur ou un gestionnaire peuvent annuler un encaissement.'
          USING ERRCODE = '42501';
    END IF;

    reason_text := NULLIF(BTRIM(p_reason), '');
    IF reason_text IS NULL OR LENGTH(reason_text) < 5 THEN
        RAISE EXCEPTION 'Le motif d’annulation doit contenir au moins 5 caractères.'
          USING ERRCODE = '23514';
    END IF;

    SELECT COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', prenom, nom)), ''), auth.uid()::TEXT)
      INTO actor_name
    FROM public.profiles
    WHERE id = auth.uid();

    PERFORM pg_advisory_xact_lock(hashtextextended(p_agency_id::TEXT || ':' || p_payment_id::TEXT, 0));

    SELECT * INTO payment_row
    FROM public.payments
    WHERE id = p_payment_id AND agency_id = p_agency_id
    FOR UPDATE;

    IF NOT FOUND OR payment_row.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Paiement introuvable dans cette agence.'
          USING ERRCODE = 'P0002';
    END IF;

    IF payment_row.verification_statut = 'annule' THEN
        RAISE EXCEPTION 'Ce paiement est déjà annulé.'
          USING ERRCODE = '23514';
    END IF;

    -- Ne jamais annuler le parent d'un acompte/solde déjà enregistré.
    IF EXISTS (
        SELECT 1 FROM public.payments child
        WHERE child.agency_id = p_agency_id
          AND child.parent_payment_id = p_payment_id
          AND child.deleted_at IS NULL
          AND child.verification_statut IS DISTINCT FROM 'rejete'
          AND child.verification_statut IS DISTINCT FROM 'annule'
    ) THEN
        RAISE EXCEPTION 'Ce paiement possède un versement complémentaire. Annulez d’abord le versement lié.'
          USING ERRCODE = '23514';
    END IF;

    UPDATE public.payments
    SET verification_statut = 'annule',
        annule_par_id = auth.uid(),
        annule_par_nom = actor_name,
        date_annulation = NOW(),
        motif_annulation = reason_text,
        observation = CONCAT_WS(E'\n', NULLIF(BTRIM(observation), ''),
          'ANNULATION : ' || reason_text),
        updated_at = NOW()
    WHERE id = p_payment_id AND agency_id = p_agency_id
    RETURNING * INTO payment_row;

    UPDATE public.cash_movements
    SET statut = 'Annulé'
    WHERE agency_id = p_agency_id
      AND paiement_id = p_payment_id
      AND statut NOT IN ('Payé', 'Annulé');

    -- Les charges rattachées à cet encaissement redeviennent dues.
    UPDATE public.tenant_charges
    SET statut = 'En attente',
        payment_id = NULL,
        updated_at = NOW()
    WHERE agency_id = p_agency_id
      AND payment_id = p_payment_id
      AND statut NOT IN ('Payé', 'Annulé');

    INSERT INTO public.audit_logs (
      agency_id, user_id, user_nom, action, module,
      entity_type, entity_ref, details
    ) VALUES (
      p_agency_id, auth.uid(), COALESCE(actor_name, auth.uid()::TEXT),
      'ANNULATION_ENCAISSEMENT', 'PAIEMENTS',
      'payment', payment_row.ref,
      FORMAT('Paiement %s annulé. Montant conservé dans l’historique : %s. Motif : %s',
        payment_row.ref, payment_row.montant_paye, reason_text)
    );

    RETURN TO_JSONB(payment_row);
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_payment_with_history(UUID, UUID, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_payment_with_history(UUID, UUID, TEXT)
  TO authenticated;

-- Recalcul du montant dû en excluant les paiements annulés.
CREATE OR REPLACE FUNCTION public.payment_period_expected_due(
    p_agency_id UUID,
    p_locataire_id UUID,
    p_periode TEXT
)
RETURNS NUMERIC
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH RECURSIVE payment_rows AS (
        SELECT id, parent_payment_id, montant_initial_du, montant_total, created_at
        FROM public.payments
        WHERE agency_id = p_agency_id
          AND locataire_id = p_locataire_id
          AND LOWER(BTRIM(periode)) = LOWER(BTRIM(p_periode))
          AND deleted_at IS NULL
          AND verification_statut IS DISTINCT FROM 'rejete'
          AND verification_statut IS DISTINCT FROM 'annule'
          AND statut IN ('Payé', 'Partiel', 'En attente')
    ),
    chain_roots AS (
        SELECT payment.id, payment.id AS root_id, ARRAY[payment.id] AS visited
        FROM payment_rows AS payment
        WHERE payment.parent_payment_id IS NULL
           OR NOT EXISTS (
                SELECT 1
                FROM payment_rows AS parent
                WHERE parent.id = payment.parent_payment_id
           )
        UNION ALL
        SELECT child.id, parent.root_id, parent.visited || child.id
        FROM payment_rows AS child
        JOIN chain_roots AS parent ON child.parent_payment_id = parent.id
        WHERE NOT child.id = ANY(parent.visited)
    ),
    first_root AS (
        SELECT
            root.id,
            COALESCE(NULLIF(root.montant_initial_du, 0), root.montant_total, 0) AS initial_due,
            root.created_at
        FROM payment_rows AS root
        JOIN chain_roots AS chain ON chain.id = root.id AND chain.root_id = root.id
        ORDER BY root.created_at ASC
        LIMIT 1
    )
    SELECT CASE
        WHEN first_root.id IS NULL THEN NULL
        ELSE first_root.initial_due + COALESCE((
            SELECT SUM(charge.montant)
            FROM public.tenant_charges AS charge
            WHERE charge.agency_id = p_agency_id
              AND charge.locataire_id = p_locataire_id
              AND LOWER(BTRIM(charge.periode)) = LOWER(BTRIM(p_periode))
              AND charge.created_at > first_root.created_at
              AND charge.statut <> 'Annulé'
        ), 0)
    END
    FROM (SELECT 1) AS singleton
    LEFT JOIN first_root ON TRUE;
$$;

REVOKE ALL ON FUNCTION public.payment_period_expected_due(UUID, UUID, TEXT)
    FROM PUBLIC, anon, authenticated;
