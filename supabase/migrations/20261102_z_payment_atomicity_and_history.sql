-- Atomic tenant-charge settlement and additive payment-period safeguards.
-- This migration preserves existing payment and charge rows.

ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS parent_payment_id UUID,
    ADD COLUMN IF NOT EXISTS detail_total_du JSONB,
    ADD COLUMN IF NOT EXISTS periode_normalisee VARCHAR(50);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'payments_parent_payment_id_fkey'
          AND conrelid = 'public.payments'::regclass
    ) THEN
        ALTER TABLE public.payments
            ADD CONSTRAINT payments_parent_payment_id_fkey
            FOREIGN KEY (parent_payment_id)
            REFERENCES public.payments(id)
            ON DELETE RESTRICT;
    END IF;
END;
$$;

ALTER TABLE public.tenant_charges
    DROP CONSTRAINT IF EXISTS tenant_charges_locataire_id_fkey,
    DROP CONSTRAINT IF EXISTS tenant_charges_payment_id_fkey;

ALTER TABLE public.tenant_charges
    ADD CONSTRAINT tenant_charges_locataire_id_fkey
        FOREIGN KEY (locataire_id)
        REFERENCES public.tenants(id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT tenant_charges_payment_id_fkey
        FOREIGN KEY (payment_id)
        REFERENCES public.payments(id)
        ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.validate_tenant_charge_agency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    tenant_agency_id UUID;
    property_agency_id UUID;
    payment_agency_id UUID;
    payment_tenant_id UUID;
BEGIN
    SELECT agency_id INTO tenant_agency_id
    FROM public.tenants
    WHERE id = NEW.locataire_id;

    IF tenant_agency_id IS DISTINCT FROM NEW.agency_id THEN
        RAISE EXCEPTION 'Le locataire doit appartenir à la même agence que la charge.'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.bien_id IS NOT NULL THEN
        SELECT agency_id INTO property_agency_id
        FROM public.properties
        WHERE id = NEW.bien_id;

        IF property_agency_id IS DISTINCT FROM NEW.agency_id THEN
            RAISE EXCEPTION 'Le bien doit appartenir à la même agence que la charge.'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    IF NEW.payment_id IS NOT NULL THEN
        SELECT agency_id, locataire_id
        INTO payment_agency_id, payment_tenant_id
        FROM public.payments
        WHERE id = NEW.payment_id;

        IF payment_agency_id IS DISTINCT FROM NEW.agency_id
           OR payment_tenant_id IS DISTINCT FROM NEW.locataire_id THEN
            RAISE EXCEPTION 'Le paiement doit appartenir à la même agence et au même locataire que la charge.'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenant_charges_agency_guard ON public.tenant_charges;
CREATE TRIGGER tenant_charges_agency_guard
    BEFORE INSERT OR UPDATE OF agency_id, locataire_id, bien_id, payment_id
    ON public.tenant_charges
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_tenant_charge_agency();

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
        SELECT
            id,
            parent_payment_id,
            montant_versement,
            montant_paye
        FROM public.payments
        WHERE agency_id = p_agency_id
          AND locataire_id = p_locataire_id
          AND LOWER(BTRIM(periode)) = LOWER(BTRIM(p_periode))
          AND id IS DISTINCT FROM p_exclude_payment_id
          AND deleted_at IS NULL
          AND verification_statut IS DISTINCT FROM 'rejete'
          AND statut IN ('Payé', 'Partiel')
    ),
    chain_roots AS (
        SELECT
            payment.id,
            payment.id AS root_id,
            ARRAY[payment.id] AS visited
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
        JOIN chain_roots AS parent
          ON child.parent_payment_id = parent.id
        WHERE NOT child.id = ANY(parent.visited)
    ),
    grouped_payments AS (
        SELECT
            COALESCE(root.root_id, payment.id) AS root_id,
            SUM(COALESCE(payment.montant_versement, 0)) AS installments,
            MAX(
                CASE
                    WHEN payment.montant_versement IS NULL
                    THEN COALESCE(payment.montant_paye, 0)
                    ELSE 0
                END
            ) AS legacy_cumulative
        FROM payment_rows AS payment
        LEFT JOIN chain_roots AS root ON root.id = payment.id
        GROUP BY COALESCE(root.root_id, payment.id)
    )
    SELECT COALESCE(SUM(installments + legacy_cumulative), 0)
    FROM grouped_payments;
$$;

REVOKE ALL ON FUNCTION public.payment_period_paid_total(UUID, UUID, TEXT, UUID)
    FROM PUBLIC, anon, authenticated;

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
        NEW.agency_id,
        NEW.locataire_id,
        NEW.periode
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
        NEW.agency_id,
        NEW.locataire_id,
        NEW.periode,
        NEW.id
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

DROP TRIGGER IF EXISTS prevent_duplicate_final_payment ON public.payments;
CREATE TRIGGER prevent_duplicate_final_payment
    BEFORE INSERT OR UPDATE OF
        agency_id, locataire_id, periode, statut, verification_statut, deleted_at,
        montant_paye, montant_versement, montant_total, montant_initial_du,
        parent_payment_id
    ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_duplicate_final_payment();

CREATE OR REPLACE FUNCTION public.prevent_duplicate_payment_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    expected_due NUMERIC;
    previously_paid NUMERIC;
    pending_transaction_amount NUMERIC;
BEGIN
    IF NEW.status NOT IN ('pending', 'success') THEN
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
        FROM public.payment_transactions AS transaction
        WHERE transaction.agency_id = NEW.agency_id
          AND transaction.locataire_id = NEW.locataire_id
          AND LOWER(BTRIM(transaction.periode)) = LOWER(BTRIM(NEW.periode))
          AND transaction.id <> NEW.id
          AND transaction.status = 'pending'
    ) THEN
        RAISE EXCEPTION 'Une transaction de paiement est déjà en attente pour cette période.'
            USING ERRCODE = '23505', CONSTRAINT = 'uq_payment_transaction_tenant_period_pending';
    END IF;

    expected_due := public.payment_period_expected_due(
        NEW.agency_id,
        NEW.locataire_id,
        NEW.periode
    );
    previously_paid := public.payment_period_paid_total(
        NEW.agency_id,
        NEW.locataire_id,
        NEW.periode,
        NULL
    );

    SELECT COALESCE(SUM(transaction.montant), 0)
    INTO pending_transaction_amount
    FROM public.payment_transactions AS transaction
    WHERE transaction.agency_id = NEW.agency_id
      AND transaction.locataire_id = NEW.locataire_id
      AND LOWER(BTRIM(transaction.periode)) = LOWER(BTRIM(NEW.periode))
      AND transaction.id <> NEW.id
      AND transaction.status IN ('pending', 'success')
      AND NOT EXISTS (
          SELECT 1
          FROM public.payments AS payment
          WHERE payment.agency_id = NEW.agency_id
            AND payment.reference_transaction = transaction.provider_transaction_id
            AND payment.deleted_at IS NULL
            AND payment.verification_statut IS DISTINCT FROM 'rejete'
      );

    IF expected_due IS NOT NULL THEN
        IF previously_paid + pending_transaction_amount + NEW.montant > expected_due THEN
            RAISE EXCEPTION 'La transaction dépasse le solde réellement dû pour cette période.'
                USING ERRCODE = '23514', CONSTRAINT = 'payment_transaction_amount_exceeds_balance';
        END IF;
    ELSIF EXISTS (
        SELECT 1
        FROM public.payment_transactions AS transaction
        WHERE transaction.agency_id = NEW.agency_id
          AND transaction.locataire_id = NEW.locataire_id
          AND LOWER(BTRIM(transaction.periode)) = LOWER(BTRIM(NEW.periode))
          AND transaction.id <> NEW.id
          AND transaction.status IN ('pending', 'success')
    ) THEN
        RAISE EXCEPTION 'Une transaction de paiement existe déjà pour ce locataire et cette période.'
            USING ERRCODE = '23505', CONSTRAINT = 'uq_payment_tenant_period_blocking';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_duplicate_payment_transaction ON public.payment_transactions;
CREATE TRIGGER prevent_duplicate_payment_transaction
    BEFORE INSERT OR UPDATE OF
        agency_id, locataire_id, periode, status, montant, provider_transaction_id
    ON public.payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_duplicate_payment_transaction();

CREATE OR REPLACE FUNCTION public.record_payment_with_tenant_charges(
    p_payment JSONB,
    p_agency_id UUID,
    p_charge_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor_role TEXT;
    actor_agency_id UUID;
    payment_id UUID;
    payment_tenant_id UUID;
    payment_property_id UUID;
    payment_owner_id UUID;
    existing_agency_id UUID;
    existing_tenant_id UUID;
    existing_deleted_at TIMESTAMPTZ;
    tenant_agency_id UUID;
    property_agency_id UUID;
    owner_agency_id UUID;
    payment_period TEXT;
    payment_status TEXT;
    verification_status TEXT;
    saved_payment public.payments%ROWTYPE;
    affected_charges INTEGER;
BEGIN
    actor_agency_id := public.get_user_agency_id();
    actor_role := public.get_user_role();
    IF auth.uid() IS NULL OR actor_agency_id IS DISTINCT FROM p_agency_id THEN
        RAISE EXCEPTION 'Agence utilisateur invalide.' USING ERRCODE = '42501';
    END IF;
    IF actor_role IS NULL
       OR actor_role NOT IN ('SUPER_ADMIN', 'ADMIN', 'GESTIONNAIRE', 'CAISSIER', 'LOCATAIRE') THEN
        RAISE EXCEPTION 'Permission insuffisante pour enregistrer un paiement.'
            USING ERRCODE = '42501';
    END IF;

    payment_id := NULLIF(p_payment->>'id', '')::UUID;
    payment_tenant_id := NULLIF(p_payment->>'locataire_id', '')::UUID;
    payment_property_id := NULLIF(p_payment->>'bien_id', '')::UUID;
    payment_owner_id := NULLIF(p_payment->>'proprietaire_id', '')::UUID;
    payment_period := NULLIF(BTRIM(p_payment->>'periode'), '');
    payment_status := COALESCE(p_payment->>'statut', 'Payé');
    verification_status := COALESCE(p_payment->>'verification_statut', 'valide');

    IF payment_id IS NULL OR payment_tenant_id IS NULL OR payment_period IS NULL THEN
        RAISE EXCEPTION 'Identifiant, locataire et période sont obligatoires.'
            USING ERRCODE = '23514';
    END IF;

    SELECT agency_id, locataire_id, deleted_at
    INTO existing_agency_id, existing_tenant_id, existing_deleted_at
    FROM public.payments
    WHERE id = payment_id
    FOR UPDATE;
    IF FOUND AND (
        existing_agency_id IS DISTINCT FROM p_agency_id
        OR existing_tenant_id IS DISTINCT FROM payment_tenant_id
        OR existing_deleted_at IS NOT NULL
        OR actor_role = 'LOCATAIRE'
    ) THEN
        RAISE EXCEPTION 'Ce paiement ne peut pas être remplacé.'
            USING ERRCODE = '42501';
    END IF;

    IF payment_status NOT IN ('Payé', 'Partiel', 'Impayé', 'En attente')
       OR verification_status NOT IN ('en_attente', 'valide', 'rejete', 'confirme', 'echoue', 'annule') THEN
        RAISE EXCEPTION 'Statut de paiement invalide.' USING ERRCODE = '23514';
    END IF;

    SELECT agency_id INTO tenant_agency_id
    FROM public.tenants
    WHERE id = payment_tenant_id;
    IF tenant_agency_id IS DISTINCT FROM p_agency_id THEN
        RAISE EXCEPTION 'Le locataire doit appartenir à la même agence que le paiement.'
            USING ERRCODE = '23514';
    END IF;

    SELECT agency_id INTO property_agency_id
    FROM public.properties
    WHERE id = payment_property_id;
    IF property_agency_id IS DISTINCT FROM p_agency_id THEN
        RAISE EXCEPTION 'Le bien doit appartenir à la même agence que le paiement.'
            USING ERRCODE = '23514';
    END IF;

    SELECT agency_id INTO owner_agency_id
    FROM public.owners
    WHERE id = payment_owner_id;
    IF owner_agency_id IS DISTINCT FROM p_agency_id THEN
        RAISE EXCEPTION 'Le propriétaire doit appartenir à la même agence que le paiement.'
            USING ERRCODE = '23514';
    END IF;

    IF actor_role = 'LOCATAIRE' THEN
        IF payment_tenant_id IS DISTINCT FROM (
            SELECT profile.locataire_id FROM public.profiles AS profile WHERE profile.id = auth.uid()
        ) OR payment_status <> 'En attente' OR verification_status <> 'en_attente'
          OR COALESCE(cardinality(p_charge_ids), 0) <> 0 THEN
            RAISE EXCEPTION 'Un locataire ne peut soumettre que son propre paiement en attente.'
                USING ERRCODE = '42501';
        END IF;
    ELSIF actor_role IS NULL
       OR actor_role NOT IN ('SUPER_ADMIN', 'ADMIN', 'GESTIONNAIRE', 'CAISSIER') THEN
        RAISE EXCEPTION 'Permission insuffisante pour enregistrer ce paiement.'
            USING ERRCODE = '42501';
    END IF;

    IF COALESCE(cardinality(p_charge_ids), 0) > 0 THEN
        PERFORM 1
        FROM public.tenant_charges AS charge
        WHERE charge.id = ANY(p_charge_ids)
          AND charge.agency_id = p_agency_id
          AND charge.locataire_id = payment_tenant_id
          AND LOWER(BTRIM(charge.periode)) = LOWER(BTRIM(payment_period))
          AND charge.statut NOT IN ('Payé', 'Annulé')
        FOR UPDATE;

        GET DIAGNOSTICS affected_charges = ROW_COUNT;
        IF affected_charges <> cardinality(p_charge_ids)
           OR affected_charges <> (
                SELECT COUNT(DISTINCT requested_id)
                FROM UNNEST(p_charge_ids) AS requested(requested_id)
           ) THEN
            RAISE EXCEPTION 'Une ou plusieurs charges ne sont pas valides pour ce paiement.'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    INSERT INTO public.payments (
        id, agency_id, ref, quittance_numero, locataire_id, bien_id,
        locataire_nom, bien_nom, proprietaire_id, periode, loyer_base,
        charges, charges_eau, charges_electricite, charges_nettoyage,
        tva, tom, penalites, indemnites_occupation, montant_total, montant_paye,
        montant_versement, montant_restant, statut, mode_paiement,
        moyen_paiement_code, verification_statut, reference_transaction, proof_url,
        date_paiement, date_echeance, recu_par, caissier_id, validated_by,
        observation, created_by_id, created_by_nom, created_by_role, type_recu,
        reference_paiement_initial, montant_initial_du, parent_payment_id,
        detail_total_du, periode_normalisee
    )
    VALUES (
        payment_id, p_agency_id,
        COALESCE(NULLIF(p_payment->>'ref', ''), 'PAY-' || LEFT(payment_id::TEXT, 8)),
        COALESCE(NULLIF(p_payment->>'quittance_numero', ''), 'QUI-' || LEFT(payment_id::TEXT, 8)),
        payment_tenant_id, payment_property_id,
        NULLIF(p_payment->>'locataire_nom', ''), NULLIF(p_payment->>'bien_nom', ''),
        payment_owner_id, payment_period,
        COALESCE(NULLIF(p_payment->>'loyer_base', '')::NUMERIC, 0),
        COALESCE(NULLIF(p_payment->>'charges', '')::NUMERIC, 0),
        COALESCE(NULLIF(p_payment->>'charges_eau', '')::NUMERIC, 0),
        COALESCE(NULLIF(p_payment->>'charges_electricite', '')::NUMERIC, 0),
        COALESCE(NULLIF(p_payment->>'charges_nettoyage', '')::NUMERIC, 0),
        COALESCE(NULLIF(p_payment->>'tva', '')::NUMERIC, 0),
        COALESCE(NULLIF(p_payment->>'tom', '')::NUMERIC, 0),
        COALESCE(NULLIF(p_payment->>'penalites', '')::NUMERIC, 0),
        COALESCE(NULLIF(p_payment->>'indemnites_occupation', '')::NUMERIC, 0),
        COALESCE(NULLIF(p_payment->>'montant_total', '')::NUMERIC, 0),
        COALESCE(NULLIF(p_payment->>'montant_paye', '')::NUMERIC, 0),
        COALESCE(NULLIF(p_payment->>'montant_versement', '')::NUMERIC, 0),
        COALESCE(NULLIF(p_payment->>'montant_restant', '')::NUMERIC, 0),
        payment_status, COALESCE(NULLIF(p_payment->>'mode_paiement', ''), 'Espèces'),
        COALESCE(NULLIF(p_payment->>'moyen_paiement_code', ''), 'ESPECES'),
        verification_status, NULLIF(p_payment->>'reference_transaction', ''),
        NULLIF(p_payment->>'proof_url', ''),
        COALESCE(NULLIF(p_payment->>'date_paiement', '')::DATE, CURRENT_DATE),
        COALESCE(NULLIF(p_payment->>'date_echeance', '')::DATE, CURRENT_DATE),
        COALESCE(NULLIF(p_payment->>'recu_par', ''), 'Service Gérance'),
        NULLIF(p_payment->>'caissier_id', '')::UUID,
        NULLIF(p_payment->>'validated_by', '')::UUID,
        COALESCE(p_payment->>'observation', ''),
        NULLIF(p_payment->>'created_by_id', ''),
        NULLIF(p_payment->>'created_by_nom', ''),
        NULLIF(p_payment->>'created_by_role', ''),
        COALESCE(NULLIF(p_payment->>'type_recu', ''), 'QUITTANCE'),
        NULLIF(p_payment->>'reference_paiement_initial', ''),
        COALESCE(NULLIF(p_payment->>'montant_initial_du', '')::NUMERIC, 0),
        NULLIF(p_payment->>'parent_payment_id', '')::UUID,
        p_payment->'detail_total_du',
        COALESCE(NULLIF(p_payment->>'periode_normalisee', ''), payment_period)
    )
    ON CONFLICT (id) DO UPDATE SET
        agency_id = EXCLUDED.agency_id,
        ref = EXCLUDED.ref,
        quittance_numero = EXCLUDED.quittance_numero,
        locataire_id = EXCLUDED.locataire_id,
        bien_id = EXCLUDED.bien_id,
        locataire_nom = EXCLUDED.locataire_nom,
        bien_nom = EXCLUDED.bien_nom,
        proprietaire_id = EXCLUDED.proprietaire_id,
        periode = EXCLUDED.periode,
        loyer_base = EXCLUDED.loyer_base,
        charges = EXCLUDED.charges,
        charges_eau = EXCLUDED.charges_eau,
        charges_electricite = EXCLUDED.charges_electricite,
        charges_nettoyage = EXCLUDED.charges_nettoyage,
        tva = EXCLUDED.tva,
        tom = EXCLUDED.tom,
        penalites = EXCLUDED.penalites,
        indemnites_occupation = EXCLUDED.indemnites_occupation,
        montant_total = EXCLUDED.montant_total,
        montant_paye = EXCLUDED.montant_paye,
        montant_versement = EXCLUDED.montant_versement,
        montant_restant = EXCLUDED.montant_restant,
        statut = EXCLUDED.statut,
        mode_paiement = EXCLUDED.mode_paiement,
        moyen_paiement_code = EXCLUDED.moyen_paiement_code,
        verification_statut = EXCLUDED.verification_statut,
        reference_transaction = EXCLUDED.reference_transaction,
        proof_url = EXCLUDED.proof_url,
        date_paiement = EXCLUDED.date_paiement,
        date_echeance = EXCLUDED.date_echeance,
        recu_par = EXCLUDED.recu_par,
        caissier_id = EXCLUDED.caissier_id,
        validated_by = EXCLUDED.validated_by,
        observation = EXCLUDED.observation,
        created_by_id = EXCLUDED.created_by_id,
        created_by_nom = EXCLUDED.created_by_nom,
        created_by_role = EXCLUDED.created_by_role,
        type_recu = EXCLUDED.type_recu,
        reference_paiement_initial = EXCLUDED.reference_paiement_initial,
        montant_initial_du = EXCLUDED.montant_initial_du,
        parent_payment_id = EXCLUDED.parent_payment_id,
        detail_total_du = EXCLUDED.detail_total_du,
        periode_normalisee = EXCLUDED.periode_normalisee,
        updated_at = NOW()
    WHERE public.payments.agency_id = p_agency_id
    RETURNING * INTO saved_payment;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Le paiement existe dans une autre agence ou ne peut pas être modifié.'
            USING ERRCODE = '42501';
    END IF;

    IF COALESCE(cardinality(p_charge_ids), 0) > 0 THEN
        UPDATE public.tenant_charges AS charge
        SET payment_id = COALESCE(charge.payment_id, saved_payment.id),
            statut = CASE
                WHEN saved_payment.statut = 'En attente' THEN 'En attente'
                WHEN saved_payment.statut = 'Payé' THEN 'Payé'
                ELSE 'Partiel'
            END,
            updated_at = NOW()
        WHERE charge.id = ANY(p_charge_ids)
          AND charge.agency_id = p_agency_id
          AND charge.locataire_id = payment_tenant_id;
        GET DIAGNOSTICS affected_charges = ROW_COUNT;
        IF affected_charges <> cardinality(p_charge_ids) THEN
            RAISE EXCEPTION 'Le rattachement des charges a échoué.'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    RETURN TO_JSONB(saved_payment);
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_pending_payment_with_charges(
    p_payment_id UUID,
    p_agency_id UUID,
    p_validated_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor_role TEXT;
    payment_row public.payments%ROWTYPE;
    amount_due NUMERIC;
    total_paid NUMERIC;
    amount_remaining NUMERIC;
    final_status TEXT;
    affected_charges INTEGER;
BEGIN
    IF auth.uid() IS NULL
       OR public.get_user_agency_id() IS DISTINCT FROM p_agency_id
       OR p_validated_by IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Agence ou utilisateur de validation invalide.'
            USING ERRCODE = '42501';
    END IF;

    actor_role := public.get_user_role();
    IF actor_role IS NULL
       OR actor_role NOT IN ('SUPER_ADMIN', 'ADMIN', 'GESTIONNAIRE', 'CAISSIER') THEN
        RAISE EXCEPTION 'Permission insuffisante pour valider un paiement.'
            USING ERRCODE = '42501';
    END IF;

    SELECT * INTO payment_row
    FROM public.payments
    WHERE id = p_payment_id
      AND agency_id = p_agency_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Paiement introuvable dans cette agence.'
            USING ERRCODE = 'P0002';
    END IF;

    IF payment_row.verification_statut <> 'en_attente' THEN
        RAISE EXCEPTION 'Seul un paiement en attente peut être validé.'
            USING ERRCODE = '23514';
    END IF;

    amount_due := COALESCE(
        NULLIF(payment_row.montant_initial_du, 0),
        payment_row.montant_total,
        0
    );
    total_paid := public.payment_period_paid_total(
        p_agency_id,
        payment_row.locataire_id,
        payment_row.periode,
        p_payment_id
    ) + COALESCE(payment_row.montant_versement, payment_row.montant_paye, 0);
    amount_remaining := GREATEST(0, amount_due - total_paid);
    final_status := CASE
        WHEN total_paid <= 0 THEN 'Impayé'
        WHEN amount_remaining > 0 THEN 'Partiel'
        ELSE 'Payé'
    END;

    UPDATE public.payments
    SET statut = final_status,
        verification_statut = 'valide',
        montant_versement = COALESCE(montant_versement, montant_paye),
        montant_restant = amount_remaining,
        validated_by = p_validated_by,
        updated_at = NOW()
    WHERE id = p_payment_id
    RETURNING * INTO payment_row;

    UPDATE public.tenant_charges
    SET payment_id = COALESCE(payment_id, p_payment_id),
        statut = CASE
            WHEN final_status = 'Payé' THEN 'Payé'
            WHEN total_paid > 0 THEN 'Partiel'
            ELSE 'En attente'
        END,
        updated_at = NOW()
    WHERE agency_id = p_agency_id
      AND locataire_id = payment_row.locataire_id
      AND LOWER(BTRIM(periode)) = LOWER(BTRIM(payment_row.periode))
      AND statut NOT IN ('Payé', 'Annulé');
    GET DIAGNOSTICS affected_charges = ROW_COUNT;

    RETURN TO_JSONB(payment_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_pending_payment_with_charges(
    p_payment_id UUID,
    p_agency_id UUID,
    p_motif TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor_role TEXT;
    payment_row public.payments%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL
       OR public.get_user_agency_id() IS DISTINCT FROM p_agency_id THEN
        RAISE EXCEPTION 'Agence utilisateur invalide.' USING ERRCODE = '42501';
    END IF;

    actor_role := public.get_user_role();
    IF actor_role IS NULL
       OR actor_role NOT IN ('SUPER_ADMIN', 'ADMIN', 'GESTIONNAIRE', 'CAISSIER') THEN
        RAISE EXCEPTION 'Permission insuffisante pour rejeter un paiement.'
            USING ERRCODE = '42501';
    END IF;

    SELECT * INTO payment_row
    FROM public.payments
    WHERE id = p_payment_id
      AND agency_id = p_agency_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Paiement introuvable dans cette agence.'
            USING ERRCODE = 'P0002';
    END IF;
    IF payment_row.verification_statut <> 'en_attente' THEN
        RAISE EXCEPTION 'Seul un paiement en attente peut être rejeté.'
            USING ERRCODE = '23514';
    END IF;

    UPDATE public.payments
    SET statut = 'Impayé',
        verification_statut = 'rejete',
        observation = COALESCE(NULLIF(BTRIM(p_motif), ''), 'Paiement rejeté'),
        updated_at = NOW()
    WHERE id = p_payment_id;

    UPDATE public.tenant_charges
    SET statut = 'En attente',
        payment_id = NULL,
        updated_at = NOW()
    WHERE payment_id = p_payment_id
      AND agency_id = p_agency_id
      AND locataire_id = payment_row.locataire_id
      AND statut NOT IN ('Payé', 'Annulé');
END;
$$;

REVOKE ALL ON FUNCTION public.record_payment_with_tenant_charges(JSONB, UUID, UUID[])
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_payment_with_tenant_charges(JSONB, UUID, UUID[])
    TO authenticated;

REVOKE ALL ON FUNCTION public.validate_pending_payment_with_charges(UUID, UUID, UUID)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_pending_payment_with_charges(UUID, UUID, UUID)
    TO authenticated;

REVOKE ALL ON FUNCTION public.reject_pending_payment_with_charges(UUID, UUID, TEXT)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_pending_payment_with_charges(UUID, UUID, TEXT)
    TO authenticated;
