CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    locataire_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    periode VARCHAR(50) NOT NULL,
    montant NUMERIC(15, 2) NOT NULL CHECK (montant > 0),
    provider VARCHAR(30) NOT NULL CHECK (provider IN ('WAVE', 'ORANGE_MONEY', 'PAYDUNYA')),
    provider_transaction_id TEXT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
    checkout_url TEXT,
    paydunya_token TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_active_tenant_period
    ON public.payment_transactions (agency_id, locataire_id, LOWER(BTRIM(periode)))
    WHERE status IN ('pending', 'success');

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_transaction_provider_id
    ON public.payment_transactions (provider, provider_transaction_id)
    WHERE provider_transaction_id IS NOT NULL;

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
    ) OR EXISTS (
        SELECT 1
        FROM public.payment_transactions AS payment_tx
        WHERE payment_tx.agency_id = NEW.agency_id
          AND payment_tx.locataire_id = NEW.locataire_id
          AND LOWER(BTRIM(payment_tx.periode)) = LOWER(BTRIM(NEW.periode))
          AND payment_tx.status IN ('pending', 'success')
          AND payment_tx.provider_transaction_id IS DISTINCT FROM NEW.reference_transaction
    ) THEN
        RAISE EXCEPTION 'Un paiement réglé ou en attente existe déjà pour ce locataire et cette période.'
            USING ERRCODE = '23505', CONSTRAINT = 'uq_payment_tenant_period_blocking';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_duplicate_payment_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        FROM public.payments AS payment
        WHERE payment.agency_id = NEW.agency_id
          AND payment.locataire_id = NEW.locataire_id
          AND LOWER(BTRIM(payment.periode)) = LOWER(BTRIM(NEW.periode))
          AND payment.deleted_at IS NULL
          AND payment.verification_statut IS DISTINCT FROM 'rejete'
          AND (
              payment.statut IN ('Payé', 'En attente')
              OR payment.verification_statut = 'en_attente'
          )
          AND payment.reference_transaction IS DISTINCT FROM NEW.provider_transaction_id
    ) OR EXISTS (
        SELECT 1
        FROM public.payment_transactions AS payment_tx
        WHERE payment_tx.agency_id = NEW.agency_id
          AND payment_tx.locataire_id = NEW.locataire_id
          AND LOWER(BTRIM(payment_tx.periode)) = LOWER(BTRIM(NEW.periode))
          AND payment_tx.id <> NEW.id
          AND payment_tx.status IN ('pending', 'success')
    ) THEN
        RAISE EXCEPTION 'Un paiement réglé ou en attente existe déjà pour ce locataire et cette période.'
            USING ERRCODE = '23505', CONSTRAINT = 'uq_payment_tenant_period_blocking';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_duplicate_payment_transaction ON public.payment_transactions;
CREATE TRIGGER prevent_duplicate_payment_transaction
    BEFORE INSERT OR UPDATE OF agency_id, locataire_id, periode, status
    ON public.payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_duplicate_payment_transaction();
