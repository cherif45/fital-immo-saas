-- ==============================================================================
-- FITAL-IMMO : SCHEMA COMPLET POSTGRESQL / SUPABASE (PROMPT V2)
-- Architecture Immobilière Professionnelle Complète
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ROLES & PERMISSIONS
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- 3. PROFILES UTILISATEURS
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  telephone TEXT,
  avatar_url TEXT,
  role_id UUID REFERENCES roles(id),
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PROPRIETAIRES
CREATE TABLE IF NOT EXISTS proprietaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT,
  telephone TEXT NOT NULL,
  telephone_secondaire TEXT,
  email TEXT,
  adresse TEXT,
  ville TEXT DEFAULT 'Dakar',
  type_piece TEXT,
  numero_piece TEXT,
  date_naissance DATE,
  profession TEXT,
  banque TEXT,
  compte_bancaire TEXT,
  taux_gerance NUMERIC(5,2) DEFAULT 10.00,
  mode_reversement TEXT DEFAULT 'Virement',
  mandat_gerance TEXT,
  notes TEXT,
  statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif', 'archive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 5. BIENS IMMOBILIERS
CREATE TABLE IF NOT EXISTS biens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  proprietaire_id UUID NOT NULL REFERENCES proprietaires(id) ON DELETE RESTRICT,
  nom TEXT NOT NULL,
  type_bien TEXT NOT NULL CHECK (type_bien IN ('appartement', 'maison', 'villa', 'studio', 'immeuble', 'local commercial', 'bureau', 'terrain', 'autre')),
  adresse TEXT NOT NULL,
  quartier TEXT,
  ville TEXT DEFAULT 'Dakar',
  description TEXT,
  superficie NUMERIC(10,2),
  nombre_pieces INTEGER DEFAULT 3,
  nombre_chambres INTEGER DEFAULT 2,
  nombre_salles_bain INTEGER DEFAULT 1,
  loyer_base NUMERIC(15,2) NOT NULL CHECK (loyer_base >= 0),
  charges NUMERIC(15,2) DEFAULT 0 CHECK (charges >= 0),
  taxes NUMERIC(15,2) DEFAULT 0 CHECK (taxes >= 0),
  depot_garantie NUMERIC(15,2) DEFAULT 0,
  statut TEXT DEFAULT 'vacant' CHECK (statut IN ('vacant', 'occupe', 'reserve', 'maintenance', 'indisponible')),
  date_acquisition DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 6. PHOTOS DES BIENS
CREATE TABLE IF NOT EXISTS bien_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bien_id UUID NOT NULL REFERENCES biens(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  ordre INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. LOCATAIRES
CREATE TABLE IF NOT EXISTS locataires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  telephone TEXT NOT NULL,
  telephone_secondaire TEXT,
  email TEXT,
  adresse TEXT,
  ville TEXT DEFAULT 'Dakar',
  type_piece TEXT DEFAULT 'CNI',
  numero_piece TEXT,
  profession TEXT,
  employeur TEXT,
  revenu_mensuel NUMERIC(15,2),
  contact_urgence_nom TEXT,
  contact_urgence_telephone TEXT,
  statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'sortant', 'ancien', 'suspendu')),
  score_solvabilite INTEGER DEFAULT 85,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 8. CONTRATS DE BAIL
CREATE TABLE IF NOT EXISTS contrats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  proprietaire_id UUID NOT NULL REFERENCES proprietaires(id) ON DELETE RESTRICT,
  bien_id UUID NOT NULL REFERENCES biens(id) ON DELETE RESTRICT,
  locataire_id UUID NOT NULL REFERENCES locataires(id) ON DELETE RESTRICT,
  type_contrat TEXT DEFAULT 'Bail d''habitation',
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  loyer NUMERIC(15,2) NOT NULL CHECK (loyer >= 0),
  charges NUMERIC(15,2) DEFAULT 0 CHECK (charges >= 0),
  taxes NUMERIC(15,2) DEFAULT 0,
  depot_garantie NUMERIC(15,2) DEFAULT 0,
  frequence_paiement TEXT DEFAULT 'Mensuel',
  jour_echeance INTEGER DEFAULT 5,
  conditions TEXT,
  taux_gerance NUMERIC(5,2) DEFAULT 10.00,
  statut TEXT DEFAULT 'actif' CHECK (statut IN ('brouillon', 'actif', 'expire', 'resilie', 'archive')),
  date_resiliation DATE,
  motif_resiliation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ÉCHÉANCES DE LOYERS
CREATE TABLE IF NOT EXISTS echeances_loyer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrat_id UUID NOT NULL REFERENCES contrats(id) ON DELETE CASCADE,
  periode DATE NOT NULL, -- e.g. 2026-08-01
  date_echeance DATE NOT NULL,
  loyer NUMERIC(15,2) NOT NULL,
  charges NUMERIC(15,2) DEFAULT 0,
  taxes NUMERIC(15,2) DEFAULT 0,
  penalites NUMERIC(15,2) DEFAULT 0,
  montant_du NUMERIC(15,2) NOT NULL,
  montant_paye NUMERIC(15,2) DEFAULT 0,
  reste NUMERIC(15,2) NOT NULL,
  statut TEXT DEFAULT 'a_payer' CHECK (statut IN ('a_payer', 'partiellement_paye', 'paye', 'en_retard', 'annule')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. PAIEMENTS & QUITTANCES
CREATE TABLE IF NOT EXISTS paiements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  echeance_id UUID REFERENCES echeances_loyer(id) ON DELETE SET NULL,
  contrat_id UUID NOT NULL REFERENCES contrats(id) ON DELETE RESTRICT,
  proprietaire_id UUID NOT NULL REFERENCES proprietaires(id) ON DELETE RESTRICT,
  locataire_id UUID NOT NULL REFERENCES locataires(id) ON DELETE RESTRICT,
  bien_id UUID NOT NULL REFERENCES biens(id) ON DELETE RESTRICT,
  montant NUMERIC(15,2) NOT NULL CHECK (montant > 0),
  date_paiement TIMESTAMPTZ DEFAULT NOW(),
  mode_paiement TEXT NOT NULL CHECK (mode_paiement IN ('especes', 'wave', 'orange_money', 'virement', 'cheque', 'autre')),
  reference_transaction TEXT,
  quittance_numero TEXT,
  recu_par_nom TEXT DEFAULT 'Service Caisse',
  commentaire TEXT,
  enregistre_par UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. PENALITES
CREATE TABLE IF NOT EXISTS penalites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  echeance_id UUID NOT NULL REFERENCES echeances_loyer(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'retard',
  mode_calcul TEXT DEFAULT 'pourcentage' CHECK (mode_calcul IN ('fixe', 'pourcentage')),
  valeur NUMERIC(10,2) DEFAULT 10.00,
  montant NUMERIC(15,2) NOT NULL,
  date_application DATE DEFAULT CURRENT_DATE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. ÉTATS DES LIEUX
CREATE TABLE IF NOT EXISTS etats_des_lieux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  bien_id UUID NOT NULL REFERENCES biens(id) ON DELETE RESTRICT,
  locataire_id UUID NOT NULL REFERENCES locataires(id) ON DELETE RESTRICT,
  contrat_id UUID REFERENCES contrats(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('entree', 'sortie')),
  date_etat DATE NOT NULL DEFAULT CURRENT_DATE,
  agent_nom TEXT NOT NULL,
  observations TEXT,
  compteurs JSONB DEFAULT '{"eau": 0, "electricite_sodeci_woyofal": 0}'::jsonb,
  cout_total_degradations NUMERIC(15,2) DEFAULT 0,
  retenue_caution NUMERIC(15,2) DEFAULT 0,
  montant_restitue_caution NUMERIC(15,2) DEFAULT 0,
  statut TEXT DEFAULT 'valide' CHECK (statut IN ('brouillon', 'valide', 'signe', 'archive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS etat_des_lieux_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etat_des_lieux_id UUID NOT NULL REFERENCES etats_des_lieux(id) ON DELETE CASCADE,
  piece TEXT NOT NULL,
  element TEXT NOT NULL,
  etat TEXT NOT NULL,
  cout_reparation_estime NUMERIC(15,2) DEFAULT 0,
  observation TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. TRAVAUX & INTERVENTIONS
CREATE TABLE IF NOT EXISTS travaux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  bien_id UUID NOT NULL REFERENCES biens(id) ON DELETE RESTRICT,
  proprietaire_id UUID NOT NULL REFERENCES proprietaires(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  categorie TEXT DEFAULT 'Plomberie',
  priorite TEXT DEFAULT 'Moyenne' CHECK (priorite IN ('Basse', 'Moyenne', 'Haute', 'Urgente')),
  prestataire TEXT,
  telephone_prestataire TEXT,
  date_demande DATE DEFAULT CURRENT_DATE,
  date_debut DATE,
  date_fin DATE,
  cout_estime NUMERIC(15,2) DEFAULT 0,
  cout_reel NUMERIC(15,2) DEFAULT 0,
  statut TEXT DEFAULT 'demande' CHECK (statut IN ('demande', 'valide', 'en_cours', 'termine', 'annule')),
  commentaire TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. FACTURES (Adhésions, Travaux, Frais de dossier)
CREATE TABLE IF NOT EXISTS factures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('adhesion', 'travaux', 'frais_dossier', 'autre')),
  proprietaire_id UUID REFERENCES proprietaires(id) ON DELETE RESTRICT,
  locataire_id UUID REFERENCES locataires(id) ON DELETE RESTRICT,
  bien_id UUID REFERENCES biens(id) ON DELETE RESTRICT,
  travaux_id UUID REFERENCES travaux(id) ON DELETE SET NULL,
  date_facture DATE NOT NULL DEFAULT CURRENT_DATE,
  date_echeance DATE,
  sous_total NUMERIC(15,2) NOT NULL,
  taxes NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) NOT NULL,
  statut TEXT DEFAULT 'emise' CHECK (statut IN ('brouillon', 'emise', 'payee', 'annulee')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facture_lignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id UUID NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantite NUMERIC(10,2) DEFAULT 1,
  prix_unitaire NUMERIC(15,2) NOT NULL,
  montant NUMERIC(15,2) NOT NULL
);

-- 15. ENCAISSEMENTS MENSUELS PROPRIÉTAIRES
CREATE TABLE IF NOT EXISTS encaissements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  proprietaire_id UUID NOT NULL REFERENCES proprietaires(id) ON DELETE RESTRICT,
  periode DATE NOT NULL,
  montant_loyers NUMERIC(15,2) DEFAULT 0,
  montant_charges NUMERIC(15,2) DEFAULT 0,
  montant_penalites NUMERIC(15,2) DEFAULT 0,
  montant_total NUMERIC(15,2) NOT NULL,
  commission_gerance NUMERIC(15,2) NOT NULL,
  tva_commission NUMERIC(15,2) DEFAULT 0,
  depenses NUMERIC(15,2) DEFAULT 0,
  travaux NUMERIC(15,2) DEFAULT 0,
  montant_net NUMERIC(15,2) NOT NULL,
  statut TEXT DEFAULT 'calcule' CHECK (statut IN ('calcule', 'valide', 'reverse', 'cloture')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. REVERSEMENTS & BONS DE CAISSE (BCA)
CREATE TABLE IF NOT EXISTS reversements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  bon_caisse_numero TEXT,
  proprietaire_id UUID NOT NULL REFERENCES proprietaires(id) ON DELETE RESTRICT,
  encaissement_id UUID REFERENCES encaissements(id) ON DELETE SET NULL,
  date_reversement DATE NOT NULL DEFAULT CURRENT_DATE,
  montant NUMERIC(15,2) NOT NULL CHECK (montant >= 0),
  mode_paiement TEXT DEFAULT 'Virement',
  reference_transaction TEXT,
  statut TEXT DEFAULT 'effectue' CHECK (statut IN ('en_attente', 'effectue', 'annule')),
  commentaire TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. DOCUMENTS & STOCKAGE SUPABASE
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  type_document TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  proprietaire_id UUID REFERENCES proprietaires(id) ON DELETE SET NULL,
  bien_id UUID REFERENCES biens(id) ON DELETE SET NULL,
  locataire_id UUID REFERENCES locataires(id) ON DELETE SET NULL,
  contrat_id UUID REFERENCES contrats(id) ON DELETE SET NULL,
  paiement_id UUID REFERENCES paiements(id) ON DELETE SET NULL,
  travaux_id UUID REFERENCES travaux(id) ON DELETE SET NULL,
  facture_id UUID REFERENCES factures(id) ON DELETE SET NULL,
  taille INTEGER,
  mime_type TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. NOTIFICATIONS INTERNES
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  titre TEXT NOT NULL,
  message TEXT NOT NULL,
  lu BOOLEAN DEFAULT false,
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  user_nom TEXT DEFAULT 'Admin Gérance',
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. PARAMETRES DE L'AGENCE
CREATE TABLE IF NOT EXISTS parametres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_agence TEXT DEFAULT 'FITAL-IMMO',
  slogan TEXT DEFAULT 'Excellence & Rigueur en Gestion Immobilière',
  logo_url TEXT,
  telephone TEXT DEFAULT '+221 33 800 00 00',
  email TEXT DEFAULT 'contact@fital-immo.sn',
  adresse TEXT DEFAULT 'Route des Almadies, Immeuble Prestige',
  ville TEXT DEFAULT 'Dakar',
  pays TEXT DEFAULT 'Sénégal',
  ninea TEXT DEFAULT '008945213 2V3',
  devise TEXT DEFAULT 'FCFA',
  taux_gerance_defaut NUMERIC(5,2) DEFAULT 10.00,
  penalite_defaut NUMERIC(5,2) DEFAULT 10.00,
  tva_taux NUMERIC(5,2) DEFAULT 18.00,
  prefix_facture TEXT DEFAULT 'FAC-2026-',
  prefix_quittance TEXT DEFAULT 'QUI-2026-',
  prefix_paiement TEXT DEFAULT 'PAY-2026-',
  prefix_contrat TEXT DEFAULT 'CTR-2026-',
  prefix_bon_caisse TEXT DEFAULT 'BCA-2026-',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES DE PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_proprietaires_ref ON proprietaires(reference);
CREATE INDEX IF NOT EXISTS idx_biens_proprio ON biens(proprietaire_id);
CREATE INDEX IF NOT EXISTS idx_biens_statut ON biens(statut);
CREATE INDEX IF NOT EXISTS idx_contrats_bien ON contrats(bien_id);
CREATE INDEX IF NOT EXISTS idx_contrats_locataire ON contrats(locataire_id);
CREATE INDEX IF NOT EXISTS idx_echeances_contrat ON echeances_loyer(contrat_id);
CREATE INDEX IF NOT EXISTS idx_echeances_statut ON echeances_loyer(statut);
CREATE INDEX IF NOT EXISTS idx_echeances_periode ON echeances_loyer(periode);
CREATE INDEX IF NOT EXISTS idx_paiements_locataire ON paiements(locataire_id);
CREATE INDEX IF NOT EXISTS idx_paiements_date ON paiements(date_paiement);
CREATE INDEX IF NOT EXISTS idx_travaux_bien ON travaux(bien_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);

-- ==============================================================================
-- VUES ANALYTIQUES POUR RAPPORTS
-- ==============================================================================
CREATE OR REPLACE VIEW vue_loyers_impayes AS
SELECT 
  e.id AS echeance_id,
  e.periode,
  e.date_echeance,
  e.montant_du,
  e.montant_paye,
  e.reste,
  e.penalites,
  (CURRENT_DATE - e.date_echeance) AS jours_retard,
  l.id AS locataire_id,
  l.nom || ' ' || l.prenom AS locataire_nom,
  l.telephone AS locataire_telephone,
  b.id AS bien_id,
  b.nom AS bien_nom,
  p.id AS proprietaire_id,
  p.nom || ' ' || COALESCE(p.prenom, '') AS proprietaire_nom
FROM echeances_loyer e
JOIN contrats c ON e.contrat_id = c.id
JOIN locataires l ON c.locataire_id = l.id
JOIN biens b ON c.bien_id = b.id
JOIN proprietaires p ON c.proprietaire_id = p.id
WHERE e.statut IN ('en_retard', 'partiellement_paye', 'a_payer') AND e.reste > 0;

CREATE OR REPLACE VIEW vue_biens_vacants AS
SELECT 
  b.id,
  b.reference,
  b.nom,
  b.type_bien,
  b.adresse,
  b.quartier,
  b.loyer_base,
  b.charges,
  (b.loyer_base + b.charges) AS loyer_total,
  p.nom || ' ' || COALESCE(p.prenom, '') AS proprietaire_nom,
  p.telephone AS proprietaire_telephone
FROM biens b
JOIN proprietaires p ON b.proprietaire_id = p.id
WHERE b.statut = 'vacant';
