ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS locataire_nom VARCHAR(150),
    ADD COLUMN IF NOT EXISTS bien_nom VARCHAR(150),
    ADD COLUMN IF NOT EXISTS created_by_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS created_by_nom VARCHAR(150),
    ADD COLUMN IF NOT EXISTS created_by_role VARCHAR(50),
    ADD COLUMN IF NOT EXISTS type_recu VARCHAR(30) DEFAULT 'QUITTANCE',
    ADD COLUMN IF NOT EXISTS reference_paiement_initial VARCHAR(100),
    ADD COLUMN IF NOT EXISTS montant_initial_du NUMERIC(15, 2) DEFAULT 0.00;

CREATE OR REPLACE FUNCTION public.prevent_duplicate_final_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.deleted_at IS NOT NULL
       OR NEW.verification_statut IS NOT DISTINCT FROM 'rejete'
       OR (NEW.statut IN ('Payé', 'En attente') OR NEW.verification_statut = 'en_attente') IS NOT TRUE THEN
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
              payment.statut IN ('Payé', 'En attente')
              OR payment.verification_statut = 'en_attente'
          )
    ) THEN
        RAISE EXCEPTION 'Un paiement réglé ou en attente existe déjà pour ce locataire et cette période.'
            USING ERRCODE = '23505', CONSTRAINT = 'uq_payment_tenant_period_blocking';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_duplicate_final_payment ON public.payments;
CREATE TRIGGER prevent_duplicate_final_payment
    BEFORE INSERT OR UPDATE OF agency_id, locataire_id, periode, statut, verification_statut, deleted_at
    ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_duplicate_final_payment();
