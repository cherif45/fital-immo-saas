-- ============================================================
-- MIGRATION : DATE DÉLIVRANCE PIÈCE & CHARGES VARIABLES LOCATAIRES
-- Date : 2026-11-02
-- Application : FITAL-IMMO
-- ============================================================

-- 1. Évolution de la table tenants (Locataires)
-- Ajout de la date de délivrance et confirmation du type de pièce
ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS date_delivrance_piece DATE,
    ADD COLUMN IF NOT EXISTS type_piece VARCHAR(50) DEFAULT 'CNI';

-- 2. Évolution de la table payments (Paiements & Quittances)
-- Ajout du détail distinct des charges variables
ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS charges_eau NUMERIC(15, 2) DEFAULT 0.00 CHECK (charges_eau >= 0),
    ADD COLUMN IF NOT EXISTS charges_electricite NUMERIC(15, 2) DEFAULT 0.00 CHECK (charges_electricite >= 0),
    ADD COLUMN IF NOT EXISTS charges_nettoyage NUMERIC(15, 2) DEFAULT 0.00 CHECK (charges_nettoyage >= 0),
    ADD COLUMN IF NOT EXISTS montant_versement NUMERIC(15, 2) CHECK (montant_versement >= 0);

-- 3. Création de la table dédiée tenant_charges (Charges Variables Locataires)
CREATE TABLE IF NOT EXISTS public.tenant_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    locataire_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    bien_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    categorie VARCHAR(50) NOT NULL CHECK (categorie IN ('Eau', 'Électricité', 'Nettoyage')),
    montant NUMERIC(15, 2) NOT NULL CHECK (montant > 0),
    date_operation DATE NOT NULL DEFAULT CURRENT_DATE,
    periode VARCHAR(50) NOT NULL,
    description TEXT,
    statut VARCHAR(30) NOT NULL DEFAULT 'En attente' CHECK (statut IN ('En attente', 'Payé', 'Partiel', 'Annulé')),
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index de performance
CREATE INDEX IF NOT EXISTS idx_tenant_charges_agency_tenant_date
    ON public.tenant_charges(agency_id, locataire_id, date_operation DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_charges_agency_periode
    ON public.tenant_charges(agency_id, periode);
CREATE INDEX IF NOT EXISTS idx_tenant_charges_payment_id
    ON public.tenant_charges(payment_id)
    WHERE payment_id IS NOT NULL;

-- Garantit qu'un enregistrement ne peut pas relier des entités d'agences différentes.
CREATE OR REPLACE FUNCTION public.validate_tenant_charge_agency()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    tenant_agency_id UUID;
    property_agency_id UUID;
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

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenant_charges_agency_guard ON public.tenant_charges;
CREATE TRIGGER tenant_charges_agency_guard
    BEFORE INSERT OR UPDATE OF agency_id, locataire_id, bien_id
    ON public.tenant_charges
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_tenant_charge_agency();

-- 4. Sécurité RLS (Row Level Security) Multi-Agences
ALTER TABLE public.tenant_charges ENABLE ROW LEVEL SECURITY;

-- Politique de consultation (SELECT)
DROP POLICY IF EXISTS "tenant_charges_select_policy" ON public.tenant_charges;
CREATE POLICY "tenant_charges_select_policy" ON public.tenant_charges
    FOR SELECT TO authenticated
    USING (
        agency_id = public.get_user_agency_id() AND (
            public.get_user_role() NOT IN ('PROPRIETAIRE', 'LOCATAIRE')
            OR (public.get_user_role() = 'LOCATAIRE' AND locataire_id = (SELECT locataire_id FROM public.profiles WHERE id = auth.uid()))
            OR (public.get_user_role() = 'PROPRIETAIRE' AND bien_id IN (SELECT id FROM public.properties WHERE proprietaire_id = (SELECT proprietaire_id FROM public.profiles WHERE id = auth.uid())))
        )
    );

-- Politique de modification (INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "tenant_charges_mutation_policy" ON public.tenant_charges;
CREATE POLICY "tenant_charges_mutation_policy" ON public.tenant_charges
    FOR ALL TO authenticated
    USING (
        agency_id = public.get_user_agency_id() AND 
        public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'GESTIONNAIRE', 'CAISSIER')
    )
    WITH CHECK (
        agency_id = public.get_user_agency_id() AND 
        public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'GESTIONNAIRE', 'CAISSIER')
    );
