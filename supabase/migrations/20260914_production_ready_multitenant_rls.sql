-- ==============================================================================
-- FITAL-IMMO : SCHÉMA DE PRODUCTION COMPLET, MULTI-TENANT & SÉCURISÉ PAR RLS
-- Migration : 20260914_production_ready_multitenant_rls.sql
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. TABLE : agencies (Multi-Tenant & Entités Agences Immobilières)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT,
    city VARCHAR(100) DEFAULT 'Dakar',
    country VARCHAR(100) DEFAULT 'Sénégal',
    ninea VARCHAR(100),
    rc_numero VARCHAR(100),
    logo_url TEXT,
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. TABLE : profiles (Profils Utilisateurs liés à Supabase Auth & Multi-Rôles)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    telephone VARCHAR(50) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'CAISSIER', 'GESTIONNAIRE', 'PROPRIETAIRE', 'LOCATAIRE', 'AGENT')),
    statut VARCHAR(20) NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'suspendu', 'desactive')),
    proprietaire_id UUID,
    locataire_id UUID,
    permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
    avatar_url TEXT,
    derniere_connexion TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vue de rétro-compatibilité pour user_accounts
CREATE OR REPLACE VIEW public.user_accounts AS
SELECT 
    p.id,
    p.id AS auth_user_id,
    p.agency_id,
    p.email,
    p.nom,
    p.prenom,
    p.telephone,
    p.role,
    p.statut,
    p.proprietaire_id,
    p.locataire_id,
    a.name AS organisation,
    p.permissions,
    p.avatar_url,
    p.derniere_connexion,
    p.created_at,
    p.updated_at
FROM public.profiles p
LEFT JOIN public.agencies a ON a.id = p.agency_id;

-- ------------------------------------------------------------------------------
-- 3. FONCTIONS POSTGRESQL SÉCURISÉES POUR LE CONTEXTE MULTI-TENANT & RBAC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_agency_id()
RETURNS UUID AS $$
    SELECT agency_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 4. TABLE : owners (Propriétaires Bailleurs)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    ref VARCHAR(50) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    adresse TEXT,
    telephone VARCHAR(50) NOT NULL,
    telephone_secondaire VARCHAR(50),
    email VARCHAR(255) NOT NULL,
    banque VARCHAR(100) DEFAULT 'CBAO Attijariwafa Bank',
    compte_bancaire VARCHAR(100),
    ninea VARCHAR(50),
    taux_commission NUMERIC(5, 2) DEFAULT 10.00 CHECK (taux_commission >= 0 AND taux_commission <= 100),
    statut VARCHAR(20) DEFAULT 'Actif' CHECK (statut IN ('Actif', 'Inactif', 'Archivé')),
    mandat_gerance VARCHAR(100) NOT NULL,
    date_mandat DATE DEFAULT CURRENT_DATE,
    mode_reversement VARCHAR(50) DEFAULT 'Virement',
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_owner_ref_agency UNIQUE (agency_id, ref)
);

-- ------------------------------------------------------------------------------
-- 5. TABLE : properties (Biens Immobiliers & Lots)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    ref VARCHAR(50) NOT NULL,
    nom VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Appartement', 'Villa', 'Bureau', 'Commerce', 'Immeuble', 'Studio', 'Chambre', 'Magasin', 'Terrain')),
    adresse TEXT NOT NULL,
    quartier VARCHAR(100) NOT NULL,
    ville VARCHAR(100) DEFAULT 'Dakar',
    proprietaire_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE RESTRICT,
    taux_commission NUMERIC(5, 2) DEFAULT 10.00 CHECK (taux_commission >= 0 AND taux_commission <= 100),
    loyer_base NUMERIC(15, 2) NOT NULL CHECK (loyer_base >= 0),
    charges NUMERIC(15, 2) DEFAULT 0.00 CHECK (charges >= 0),
    tva_applicable BOOLEAN DEFAULT FALSE,
    statut VARCHAR(30) DEFAULT 'Vacant' CHECK (statut IN ('Occupé', 'Vacant', 'Maintenance', 'En litige')),
    superficie NUMERIC(10, 2) DEFAULT 0.00,
    nombre_pieces INTEGER DEFAULT 3,
    etage VARCHAR(20),
    numero_porte VARCHAR(20),
    avatar VARCHAR(10),
    photo_principale TEXT,
    photos TEXT[] DEFAULT ARRAY[]::TEXT[],
    equipements TEXT[] DEFAULT ARRAY[]::TEXT[],
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_property_ref_agency UNIQUE (agency_id, ref)
);

-- ------------------------------------------------------------------------------
-- 6. TABLE : tenants (Locataires)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    ref VARCHAR(50) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    telephone VARCHAR(50) NOT NULL,
    telephone_secondaire VARCHAR(50),
    email VARCHAR(255) NOT NULL,
    cni VARCHAR(100) NOT NULL,
    fonction VARCHAR(150),
    employeur VARCHAR(150),
    revenu_mensuel NUMERIC(15, 2),
    contact_urgence_nom VARCHAR(150),
    contact_urgence_telephone VARCHAR(50),
    statut VARCHAR(30) DEFAULT 'À jour' CHECK (statut IN ('À jour', 'Impayé', 'Retard', 'Archivé', 'Résilié')),
    score_solvabilite INTEGER DEFAULT 85 CHECK (score_solvabilite BETWEEN 0 AND 100),
    bien_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    proprietaire_id UUID REFERENCES public.owners(id) ON DELETE SET NULL,
    date_entree DATE NOT NULL,
    date_sortie DATE,
    loyer_mensuel NUMERIC(15, 2) NOT NULL CHECK (loyer_mensuel >= 0),
    arrieres_cumules NUMERIC(15, 2) DEFAULT 0.00 CHECK (arrieres_cumules >= 0),
    jours_retard INTEGER DEFAULT 0 CHECK (jours_retard >= 0),
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_tenant_ref_agency UNIQUE (agency_id, ref)
);

-- ------------------------------------------------------------------------------
-- 7. TABLE : contracts (Baux & Contrats de Location)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    ref VARCHAR(50) NOT NULL,
    type_contrat VARCHAR(50) DEFAULT 'Bail d''habitation',
    locataire_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
    bien_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
    proprietaire_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE RESTRICT,
    loyer_base NUMERIC(15, 2) NOT NULL CHECK (loyer_base >= 0),
    charges NUMERIC(15, 2) DEFAULT 0.00 CHECK (charges >= 0),
    tva NUMERIC(15, 2) DEFAULT 0.00 CHECK (tva >= 0),
    tom NUMERIC(15, 2) DEFAULT 0.00 CHECK (tom >= 0),
    tlv NUMERIC(15, 2) DEFAULT 0.00 CHECK (tlv >= 0),
    caution_loyer NUMERIC(15, 2) DEFAULT 0.00 CHECK (caution_loyer >= 0),
    caution_eau NUMERIC(15, 2) DEFAULT 0.00 CHECK (caution_eau >= 0),
    caution_electricite NUMERIC(15, 2) DEFAULT 0.00 CHECK (caution_electricite >= 0),
    frais_adhesion NUMERIC(15, 2) DEFAULT 0.00 CHECK (frais_adhesion >= 0),
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    type_reglement VARCHAR(30) DEFAULT 'Mensuel',
    jour_echeance INTEGER DEFAULT 5 CHECK (jour_echeance BETWEEN 1 AND 31),
    statut VARCHAR(30) DEFAULT 'En cours' CHECK (statut IN ('En cours', 'À renouveler', 'Résilié', 'Expiré', 'DRAFT')),
    date_signature DATE DEFAULT CURRENT_DATE,
    conditions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT ck_contract_dates CHECK (date_fin >= date_debut),
    CONSTRAINT uq_contract_ref_agency UNIQUE (agency_id, ref)
);

-- ------------------------------------------------------------------------------
-- 8. TABLE : rent_due_dates (Échéances de Loyers Réelles)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rent_due_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    locataire_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
    bien_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
    periode VARCHAR(50) NOT NULL, -- Ex: "05-2026" ou "Mai 2026"
    due_date DATE NOT NULL,
    amount_due NUMERIC(15, 2) NOT NULL CHECK (amount_due >= 0),
    amount_paid NUMERIC(15, 2) DEFAULT 0.00 CHECK (amount_paid >= 0),
    remaining_amount NUMERIC(15, 2) NOT NULL CHECK (remaining_amount >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'A_PAYER' CHECK (status IN ('A_PAYER', 'PARTIELLEMENT_PAYE', 'PAYE', 'EN_RETARD', 'ANNULE')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 9. TABLE : payment_methods_config (Configuration Moyens de Paiement)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_methods_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL CHECK (code IN ('ESPECES', 'WAVE', 'ORANGE_MONEY', 'FREE_MONEY', 'VIREMENT', 'CHEQUE', 'CARTE_BANCAIRE', 'AUTRE')),
    libelle VARCHAR(100) NOT NULL,
    type VARCHAR(50) DEFAULT 'CASH',
    description TEXT,
    actif BOOLEAN DEFAULT TRUE,
    par_defaut BOOLEAN DEFAULT FALSE,
    frais_pourcentage NUMERIC(5, 2) DEFAULT 0.00,
    delai_validation_heures INTEGER DEFAULT 0,
    numero_compte_ou_telephone VARCHAR(100),
    banque_nom VARCHAR(100),
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_payment_method_code_agency UNIQUE (agency_id, code)
);

-- ------------------------------------------------------------------------------
-- 10. TABLE : payments (Paiements, Quittances & Règlements)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    ref VARCHAR(50) NOT NULL,
    quittance_numero VARCHAR(50) NOT NULL,
    locataire_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
    bien_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
    proprietaire_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE RESTRICT,
    contrat_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    periode VARCHAR(50) NOT NULL,
    loyer_base NUMERIC(15, 2) NOT NULL CHECK (loyer_base >= 0),
    charges NUMERIC(15, 2) DEFAULT 0.00 CHECK (charges >= 0),
    tva NUMERIC(15, 2) DEFAULT 0.00 CHECK (tva >= 0),
    tom NUMERIC(15, 2) DEFAULT 0.00 CHECK (tom >= 0),
    penalites NUMERIC(15, 2) DEFAULT 0.00 CHECK (penalites >= 0),
    indemnites_occupation NUMERIC(15, 2) DEFAULT 0.00 CHECK (indemnites_occupation >= 0),
    montant_total NUMERIC(15, 2) NOT NULL CHECK (montant_total >= 0),
    montant_paye NUMERIC(15, 2) NOT NULL CHECK (montant_paye >= 0),
    montant_restant NUMERIC(15, 2) DEFAULT 0.00 CHECK (montant_restant >= 0),
    statut VARCHAR(30) NOT NULL CHECK (statut IN ('Payé', 'Partiel', 'Impayé', 'En attente')),
    mode_paiement VARCHAR(50) NOT NULL,
    moyen_paiement_code VARCHAR(50) DEFAULT 'ESPECES',
    verification_statut VARCHAR(30) DEFAULT 'valide' CHECK (verification_statut IN ('en_attente', 'valide', 'rejete', 'confirme', 'echoue', 'annule')),
    reference_transaction VARCHAR(100),
    proof_url TEXT,
    date_paiement DATE NOT NULL,
    date_echeance DATE NOT NULL,
    recu_par VARCHAR(100) NOT NULL,
    caissier_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    validated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    observation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_payment_ref_agency UNIQUE (agency_id, ref),
    CONSTRAINT uq_payment_quittance_agency UNIQUE (agency_id, quittance_numero)
);

-- ------------------------------------------------------------------------------
-- 11. TABLE : cash_movements (Journal de Caisse & Flux d'Espèces)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    reference VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('ENTREE', 'SORTIE', 'ENCAISSEMENT', 'DECAISSEMENT')),
    montant NUMERIC(15, 2) NOT NULL CHECK (montant > 0),
    description TEXT NOT NULL,
    categorie VARCHAR(100) DEFAULT 'Encaissement Loyer',
    moyen_paiement_code VARCHAR(50) DEFAULT 'ESPECES',
    paiement_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_nom VARCHAR(100),
    beneficiaire VARCHAR(150),
    date_operation TIMESTAMPTZ DEFAULT NOW(),
    statut VARCHAR(30) DEFAULT 'Validé',
    justificatif_ref VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_cash_mov_ref_agency UNIQUE (agency_id, reference)
);

-- ------------------------------------------------------------------------------
-- 12. TABLE : cash_closings (Clôtures Journalières de Caisse)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cash_closings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    reference VARCHAR(50) NOT NULL,
    date_cloture DATE NOT NULL,
    caissier_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    caissier_nom VARCHAR(100) NOT NULL,
    solde_initial NUMERIC(15, 2) NOT NULL CHECK (solde_initial >= 0),
    total_entrees_especes NUMERIC(15, 2) NOT NULL CHECK (total_entrees_especes >= 0),
    total_sorties_especes NUMERIC(15, 2) NOT NULL CHECK (total_sorties_especes >= 0),
    solde_theorique NUMERIC(15, 2) NOT NULL,
    solde_reel NUMERIC(15, 2) NOT NULL CHECK (solde_reel >= 0),
    ecart NUMERIC(15, 2) DEFAULT 0.00,
    details_comptage JSONB,
    observations TEXT,
    statut VARCHAR(40) DEFAULT 'Validé par Responsable',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_cash_close_ref_agency UNIQUE (agency_id, reference)
);

-- ------------------------------------------------------------------------------
-- 13. TABLE : maintenance_tickets (Travaux & Pannes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.maintenance_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    ref VARCHAR(50) NOT NULL,
    titre VARCHAR(200) NOT NULL,
    bien_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    locataire_nom VARCHAR(100),
    priorite VARCHAR(20) DEFAULT 'Moyenne' CHECK (priorite IN ('Basse', 'Moyenne', 'Haute', 'Urgente', 'Faible')),
    cout_estime NUMERIC(15, 2) DEFAULT 0.00 CHECK (cout_estime >= 0),
    artisan_nom VARCHAR(100),
    prestataire VARCHAR(150),
    imputable_a VARCHAR(50) DEFAULT 'Propriétaire',
    date_signalement DATE DEFAULT CURRENT_DATE,
    date_intervention DATE,
    statut VARCHAR(30) DEFAULT 'Signalé' CHECK (statut IN ('Signalé', 'En cours', 'Planifié', 'Terminé', 'Annulé', 'En attente')),
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_maint_ref_agency UNIQUE (agency_id, ref)
);

-- ------------------------------------------------------------------------------
-- 14. TABLE : property_inspections (États des Lieux d'Entrée & Sortie)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    ref VARCHAR(50) NOT NULL,
    bien_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    locataire_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Entrée', 'Sortie')),
    date_inspection DATE DEFAULT CURRENT_DATE,
    clefs_remises INTEGER DEFAULT 3 CHECK (clefs_remises >= 0),
    agent_nom VARCHAR(100) NOT NULL,
    elements JSONB,
    total_degats NUMERIC(15, 2) DEFAULT 0.00 CHECK (total_degats >= 0),
    retenue_caution NUMERIC(15, 2) DEFAULT 0.00 CHECK (retenue_caution >= 0),
    montant_restitue_caution NUMERIC(15, 2) DEFAULT 0.00 CHECK (montant_restitue_caution >= 0),
    statut VARCHAR(30) DEFAULT 'Signé',
    commentaires_generaux TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_inspection_ref_agency UNIQUE (agency_id, ref)
);

-- ------------------------------------------------------------------------------
-- 15. TABLE : disbursements & cash_vouchers (Reversements Bailleurs)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.disbursements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    ref VARCHAR(50) NOT NULL,
    proprietaire_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE RESTRICT,
    periode VARCHAR(50) NOT NULL,
    loyers_bruts_recouvres NUMERIC(15, 2) NOT NULL CHECK (loyers_bruts_recouvres >= 0),
    taux_commission NUMERIC(5, 2) NOT NULL CHECK (taux_commission >= 0 AND taux_commission <= 100),
    montant_commission NUMERIC(15, 2) NOT NULL CHECK (montant_commission >= 0),
    tva_commission NUMERIC(15, 2) DEFAULT 0.00 CHECK (tva_commission >= 0),
    charges_deduites NUMERIC(15, 2) DEFAULT 0.00 CHECK (charges_deduites >= 0),
    net_a_reverser NUMERIC(15, 2) NOT NULL CHECK (net_a_reverser >= 0),
    mode_reglement VARCHAR(50) NOT NULL,
    date_versement DATE DEFAULT CURRENT_DATE,
    statut VARCHAR(30) DEFAULT 'Versé',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_disbursement_ref_agency UNIQUE (agency_id, ref)
);

CREATE TABLE IF NOT EXISTS public.cash_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    numero VARCHAR(50) NOT NULL,
    proprietaire_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE RESTRICT,
    periode VARCHAR(50) NOT NULL,
    loyers_encaisses NUMERIC(15, 2) NOT NULL CHECK (loyers_encaisses >= 0),
    commissions NUMERIC(15, 2) NOT NULL CHECK (commissions >= 0),
    travaux NUMERIC(15, 2) DEFAULT 0.00 CHECK (travaux >= 0),
    depenses NUMERIC(15, 2) DEFAULT 0.00 CHECK (depenses >= 0),
    montant_net NUMERIC(15, 2) NOT NULL CHECK (montant_net >= 0),
    montant_en_lettres TEXT NOT NULL,
    mode_reversement VARCHAR(50) NOT NULL,
    date_emission DATE DEFAULT CURRENT_DATE,
    statut VARCHAR(30) DEFAULT 'Payé',
    observation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_voucher_num_agency UNIQUE (agency_id, numero)
);

-- ------------------------------------------------------------------------------
-- 16. TABLE : invoices (Factures Honoraires & Prestations)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    ref VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    proprietaire_id UUID REFERENCES public.owners(id) ON DELETE SET NULL,
    locataire_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    bien_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    date_facture DATE DEFAULT CURRENT_DATE,
    date_echeance DATE NOT NULL,
    sous_total NUMERIC(15, 2) NOT NULL CHECK (sous_total >= 0),
    taxes NUMERIC(15, 2) DEFAULT 0.00 CHECK (taxes >= 0),
    total NUMERIC(15, 2) NOT NULL CHECK (total >= 0),
    statut VARCHAR(30) DEFAULT 'Émise' CHECK (statut IN ('Émise', 'Payée', 'Brouillon', 'Annulée')),
    lignes JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_invoice_ref_agency UNIQUE (agency_id, ref)
);

-- ------------------------------------------------------------------------------
-- 17. TABLE : tenant_reminders (Relances de Recouvrement)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    locataire_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    locataire_nom VARCHAR(100) NOT NULL,
    telephone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    bien_nom VARCHAR(150) NOT NULL,
    montant_du NUMERIC(15, 2) NOT NULL CHECK (montant_du >= 0),
    penalites NUMERIC(15, 2) DEFAULT 0.00 CHECK (penalites >= 0),
    jours_retard INTEGER NOT NULL CHECK (jours_retard >= 0),
    niveau VARCHAR(100) NOT NULL,
    canal VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    statut VARCHAR(30) DEFAULT 'Envoyé',
    date_creation TIMESTAMPTZ DEFAULT NOW(),
    date_envoi TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 18. TABLE : audit_logs (Journal d'Activité Réel & Traçabilité Complète)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_nom VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_ref VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 19. TABLE : agency_settings (Paramètres Agence)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agency_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID UNIQUE NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    nom_agence VARCHAR(150) NOT NULL DEFAULT 'FITAL-IMMO',
    slogan VARCHAR(255) DEFAULT 'Gestion Immobilière, Syndic & Recouvrement',
    telephone VARCHAR(50) DEFAULT '+221 33 820 00 00',
    email VARCHAR(255) DEFAULT 'contact@fital-immo.sn',
    adresse TEXT DEFAULT 'Avenue Cheikh Anta Diop, Dakar',
    ville VARCHAR(100) DEFAULT 'Dakar',
    pays VARCHAR(100) DEFAULT 'Sénégal',
    ninea VARCHAR(100) DEFAULT '008920194 2V8',
    devise VARCHAR(20) DEFAULT 'FCFA',
    taux_gerance_defaut NUMERIC(5, 2) DEFAULT 10.00 CHECK (taux_gerance_defaut >= 0),
    penalite_defaut NUMERIC(5, 2) DEFAULT 10.00 CHECK (penalite_defaut >= 0),
    tva_taux NUMERIC(5, 2) DEFAULT 18.00 CHECK (tva_taux >= 0),
    prefix_facture VARCHAR(20) DEFAULT 'FAC-2026-',
    prefix_quittance VARCHAR(20) DEFAULT 'QUI-2026-',
    prefix_paiement VARCHAR(20) DEFAULT 'PAY-2026-',
    prefix_contrat VARCHAR(20) DEFAULT 'BAIL-2026-',
    prefix_bon_caisse VARCHAR(20) DEFAULT 'BCA-2026-',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 20. TABLE : documents (GED Immobilière & Stockage Fichiers Supabase)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    nom VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    taille VARCHAR(30) NOT NULL,
    date_creation DATE DEFAULT CURRENT_DATE,
    categorie VARCHAR(50) NOT NULL,
    url TEXT NOT NULL,
    storage_path TEXT,
    entity_ref VARCHAR(100),
    locataire_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    proprietaire_id UUID REFERENCES public.owners(id) ON DELETE SET NULL,
    bien_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 21. TABLE : notifications (Alertes Métier Réelles)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'info' CHECK (type IN ('danger', 'warning', 'info', 'success')),
    is_read BOOLEAN DEFAULT FALSE,
    link_tab VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEX POUR PERFORMANCES & MULTI-TENANT ISOLATION
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_agency ON public.profiles(agency_id);
CREATE INDEX IF NOT EXISTS idx_owners_agency ON public.owners(agency_id);
CREATE INDEX IF NOT EXISTS idx_properties_agency ON public.properties(agency_id);
CREATE INDEX IF NOT EXISTS idx_tenants_agency ON public.tenants(agency_id);
CREATE INDEX IF NOT EXISTS idx_contracts_agency ON public.contracts(agency_id);
CREATE INDEX IF NOT EXISTS idx_payments_agency ON public.payments(agency_id);
CREATE INDEX IF NOT EXISTS idx_payments_locataire ON public.payments(locataire_id);
CREATE INDEX IF NOT EXISTS idx_payments_bien ON public.payments(bien_id);
CREATE INDEX IF NOT EXISTS idx_payments_statut ON public.payments(statut);
CREATE INDEX IF NOT EXISTS idx_cash_mov_agency ON public.cash_movements(agency_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_agency ON public.audit_logs(agency_id);
CREATE INDEX IF NOT EXISTS idx_rent_due_agency ON public.rent_due_dates(agency_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES — SÉCURITÉ ABSOLUE
-- ==============================================================================
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_due_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 1. AGENCIES POLICIES
CREATE POLICY "agencies_select_policy" ON public.agencies
    FOR SELECT TO authenticated
    USING (id = public.get_user_agency_id() OR public.get_user_role() = 'SUPER_ADMIN');

CREATE POLICY "agencies_update_policy" ON public.agencies
    FOR UPDATE TO authenticated
    USING (id = public.get_user_agency_id() AND public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN'));

-- 2. PROFILES POLICIES
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT TO authenticated
    USING (agency_id = public.get_user_agency_id() OR public.get_user_role() = 'SUPER_ADMIN');

CREATE POLICY "profiles_update_own_policy" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR (agency_id = public.get_user_agency_id() AND public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN')));

-- 3. CORE TENANT-ISOLATED DATA POLICIES
-- Owners
CREATE POLICY "owners_select_policy" ON public.owners
    FOR SELECT TO authenticated
    USING (
        agency_id = public.get_user_agency_id() AND (
            public.get_user_role() NOT IN ('PROPRIETAIRE', 'LOCATAIRE')
            OR (public.get_user_role() = 'PROPRIETAIRE' AND id = (SELECT proprietaire_id FROM public.profiles WHERE id = auth.uid()))
        )
    );

CREATE POLICY "owners_mutation_policy" ON public.owners
    FOR ALL TO authenticated
    USING (agency_id = public.get_user_agency_id() AND public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'GESTIONNAIRE'))
    WITH CHECK (agency_id = public.get_user_agency_id() AND public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'GESTIONNAIRE'));

-- Properties
CREATE POLICY "properties_select_policy" ON public.properties
    FOR SELECT TO authenticated
    USING (
        agency_id = public.get_user_agency_id() AND (
            public.get_user_role() NOT IN ('PROPRIETAIRE', 'LOCATAIRE')
            OR (public.get_user_role() = 'PROPRIETAIRE' AND proprietaire_id = (SELECT proprietaire_id FROM public.profiles WHERE id = auth.uid()))
            OR (public.get_user_role() = 'LOCATAIRE' AND id = (SELECT bien_id FROM public.tenants WHERE id = (SELECT locataire_id FROM public.profiles WHERE id = auth.uid())))
        )
    );

CREATE POLICY "properties_mutation_policy" ON public.properties
    FOR ALL TO authenticated
    USING (agency_id = public.get_user_agency_id() AND public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'GESTIONNAIRE'))
    WITH CHECK (agency_id = public.get_user_agency_id() AND public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'GESTIONNAIRE'));

-- Tenants
CREATE POLICY "tenants_select_policy" ON public.tenants
    FOR SELECT TO authenticated
    USING (
        agency_id = public.get_user_agency_id() AND (
            public.get_user_role() NOT IN ('PROPRIETAIRE', 'LOCATAIRE')
            OR (public.get_user_role() = 'PROPRIETAIRE' AND proprietaire_id = (SELECT proprietaire_id FROM public.profiles WHERE id = auth.uid()))
            OR (public.get_user_role() = 'LOCATAIRE' AND id = (SELECT locataire_id FROM public.profiles WHERE id = auth.uid()))
        )
    );

CREATE POLICY "tenants_mutation_policy" ON public.tenants
    FOR ALL TO authenticated
    USING (agency_id = public.get_user_agency_id() AND public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'GESTIONNAIRE'))
    WITH CHECK (agency_id = public.get_user_agency_id() AND public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'GESTIONNAIRE'));

-- Contracts
CREATE POLICY "contracts_select_policy" ON public.contracts
    FOR SELECT TO authenticated
    USING (
        agency_id = public.get_user_agency_id() AND (
            public.get_user_role() NOT IN ('PROPRIETAIRE', 'LOCATAIRE')
            OR (public.get_user_role() = 'PROPRIETAIRE' AND proprietaire_id = (SELECT proprietaire_id FROM public.profiles WHERE id = auth.uid()))
            OR (public.get_user_role() = 'LOCATAIRE' AND locataire_id = (SELECT locataire_id FROM public.profiles WHERE id = auth.uid()))
        )
    );

CREATE POLICY "contracts_mutation_policy" ON public.contracts
    FOR ALL TO authenticated
    USING (agency_id = public.get_user_agency_id() AND public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'GESTIONNAIRE'))
    WITH CHECK (agency_id = public.get_user_agency_id() AND public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'GESTIONNAIRE'));

-- Payments
CREATE POLICY "payments_select_policy" ON public.payments
    FOR SELECT TO authenticated
    USING (
        agency_id = public.get_user_agency_id() AND (
            public.get_user_role() NOT IN ('PROPRIETAIRE', 'LOCATAIRE')
            OR (public.get_user_role() = 'PROPRIETAIRE' AND proprietaire_id = (SELECT proprietaire_id FROM public.profiles WHERE id = auth.uid()))
            OR (public.get_user_role() = 'LOCATAIRE' AND locataire_id = (SELECT locataire_id FROM public.profiles WHERE id = auth.uid()))
        )
    );

CREATE POLICY "payments_insert_policy" ON public.payments
    FOR INSERT TO authenticated
    WITH CHECK (
        agency_id = public.get_user_agency_id() AND (
            public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'CAISSIER', 'GESTIONNAIRE')
            OR (public.get_user_role() = 'LOCATAIRE' AND locataire_id = (SELECT locataire_id FROM public.profiles WHERE id = auth.uid()) AND verification_statut = 'en_attente')
        )
    );

CREATE POLICY "payments_update_delete_policy" ON public.payments
    FOR UPDATE TO authenticated
    USING (agency_id = public.get_user_agency_id() AND public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'CAISSIER', 'GESTIONNAIRE'));

-- Cash Movements & Closings
CREATE POLICY "cash_mov_policy" ON public.cash_movements
    FOR ALL TO authenticated
    USING (agency_id = public.get_user_agency_id() AND public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'CAISSIER'))
    WITH CHECK (agency_id = public.get_user_agency_id() AND public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'CAISSIER'));

CREATE POLICY "cash_close_policy" ON public.cash_closings
    FOR ALL TO authenticated
    USING (agency_id = public.get_user_agency_id() AND public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'CAISSIER'))
    WITH CHECK (agency_id = public.get_user_agency_id() AND public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'CAISSIER'));

-- Maintenance Tickets
CREATE POLICY "maintenance_policy" ON public.maintenance_tickets
    FOR ALL TO authenticated
    USING (agency_id = public.get_user_agency_id())
    WITH CHECK (agency_id = public.get_user_agency_id());

-- Rent Due Dates (Échéances de loyer)
CREATE POLICY "rent_due_dates_select_policy" ON public.rent_due_dates
    FOR SELECT TO authenticated
    USING (
        agency_id = public.get_user_agency_id() AND (
            public.get_user_role() NOT IN ('PROPRIETAIRE', 'LOCATAIRE')
            OR (public.get_user_role() = 'PROPRIETAIRE' AND bien_id IN (SELECT id FROM public.properties WHERE proprietaire_id = (SELECT proprietaire_id FROM public.profiles WHERE id = auth.uid())))
            OR (public.get_user_role() = 'LOCATAIRE' AND locataire_id = (SELECT locataire_id FROM public.profiles WHERE id = auth.uid()))
        )
    );

CREATE POLICY "rent_due_dates_mutation_policy" ON public.rent_due_dates
    FOR ALL TO authenticated
    USING (agency_id = public.get_user_agency_id() AND public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'GESTIONNAIRE', 'CAISSIER'))
    WITH CHECK (agency_id = public.get_user_agency_id() AND public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'GESTIONNAIRE', 'CAISSIER'));

-- Invoices & Items
CREATE POLICY "invoices_select_policy" ON public.invoices
    FOR SELECT TO authenticated
    USING (agency_id = public.get_user_agency_id());

CREATE POLICY "invoices_mutation_policy" ON public.invoices
    FOR ALL TO authenticated
    USING (agency_id = public.get_user_agency_id() AND public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'GESTIONNAIRE', 'CAISSIER'))
    WITH CHECK (agency_id = public.get_user_agency_id() AND public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'GESTIONNAIRE', 'CAISSIER'));

-- Disbursements (Reversements Bailleurs)
CREATE POLICY "disbursements_select_policy" ON public.disbursements
    FOR SELECT TO authenticated
    USING (
        agency_id = public.get_user_agency_id() AND (
            public.get_user_role() NOT IN ('PROPRIETAIRE', 'LOCATAIRE')
            OR (public.get_user_role() = 'PROPRIETAIRE' AND proprietaire_id = (SELECT proprietaire_id FROM public.profiles WHERE id = auth.uid()))
        )
    );

CREATE POLICY "disbursements_mutation_policy" ON public.disbursements
    FOR ALL TO authenticated
    USING (agency_id = public.get_user_agency_id() AND public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'CAISSIER'))
    WITH CHECK (agency_id = public.get_user_agency_id() AND public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'CAISSIER'));

-- Property Inspections (États des lieux)
CREATE POLICY "inspections_policy" ON public.property_inspections
    FOR ALL TO authenticated
    USING (agency_id = public.get_user_agency_id())
    WITH CHECK (agency_id = public.get_user_agency_id());

-- Audit Logs (Immuables : INSERT & SELECT uniquement)
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (agency_id = public.get_user_agency_id() AND public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'GESTIONNAIRE'));

CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (agency_id = public.get_user_agency_id());

-- Agency Settings
CREATE POLICY "agency_settings_policy" ON public.agency_settings
    FOR ALL TO authenticated
    USING (agency_id = public.get_user_agency_id())
    WITH CHECK (agency_id = public.get_user_agency_id() AND public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN'));

-- Documents & Notifications
CREATE POLICY "documents_policy" ON public.documents
    FOR ALL TO authenticated
    USING (agency_id = public.get_user_agency_id())
    WITH CHECK (agency_id = public.get_user_agency_id());

CREATE POLICY "notifications_policy" ON public.notifications
    FOR ALL TO authenticated
    USING (agency_id = public.get_user_agency_id())
    WITH CHECK (agency_id = public.get_user_agency_id());

-- ==============================================================================
-- CONFIGURATION SUPABASE STORAGE BUCKETS & POLICIES
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) VALUES 
('agency-logos', 'agency-logos', true),
('property-images', 'property-images', true),
('documents', 'documents', false),
('payment-proofs', 'payment-proofs', false),
('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for Authenticated Agency Users
CREATE POLICY "public_read_logos_images_avatars" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id IN ('agency-logos', 'property-images', 'avatars'));

CREATE POLICY "authenticated_upload_files" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id IN ('agency-logos', 'property-images', 'documents', 'payment-proofs', 'avatars'));

CREATE POLICY "authenticated_access_documents" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id IN ('documents', 'payment-proofs'));
