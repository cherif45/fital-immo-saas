import { createClient } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, supabaseUrl, supabaseAnonKey } from './client';
import { UserRole } from '../../types';
import {
  Property, Owner, Tenant, LeaseContract, Payment, TenantReminder, Inspection,
  MaintenanceTicket, OwnerDisbursement, Invoice, CashVoucher, NotificationItem,
  AuditLog, AgencySettings, UserAccount, PaymentMethodConfig, CashMovement,
  CashClosing, Agency, Building, Unit, OwnerDeduction, BulletinVersement,
} from '../../types';

export interface AppStateData {
  agency: Agency | null;
  properties: Property[];
  buildings: Building[];
  units: Unit[];
  owners: Owner[];
  tenants: Tenant[];
  contracts: LeaseContract[];
  payments: Payment[];
  reminders: TenantReminder[];
  inspections: Inspection[];
  maintenance: MaintenanceTicket[];
  disbursements: OwnerDisbursement[];
  invoices: Invoice[];
  cashVouchers: CashVoucher[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
  settings: AgencySettings;
  users: UserAccount[];
  paymentMethods: PaymentMethodConfig[];
  cashMovements: CashMovement[];
  cashClosings: CashClosing[];
  ownerDeductions?: OwnerDeduction[];
  bulletinVersements?: BulletinVersement[];
}

export const defaultSettings: AgencySettings = {
  nomAgence: 'FITAL-IMMO',
  slogan: 'Gestion Immobilière, Syndic & Recouvrement',
  telephone: '+221 33 820 00 00',
  email: 'contact@fital-immo.sn',
  adresse: 'Avenue Cheikh Anta Diop, Dakar',
  ville: 'Dakar',
  pays: 'Sénégal',
  ninea: '008920194 2V8',
  devise: 'FCFA',
  tauxGeranceDefaut: 10,
  penaliteDefaut: 10,
  tvaTaux: 18,
  prefixFacture: 'FAC-2026-',
  prefixQuittance: 'QUI-2026-',
  prefixPaiement: 'PAY-2026-',
  prefixContrat: 'BAIL-2026-',
  prefixBonCaisse: 'BCA-2026-',
  waveNumero: '+221 76 328 58 29',
  orangeMoneyCode: '784912',
  whatsappBusiness: '+221 77 845 20 10',
  standardTelephone: '+221 33 820 40 50',
};

export const defaultPaymentMethods: PaymentMethodConfig[] = [
  { id: 'pm-especes', code: 'ESPECES', libelle: 'Espèces (Caisse Agence)', description: 'Règlement au comptoir.', actif: true, parDefaut: true, estParDefaut: true, fraisPourcentage: 0, delaiValidationHeures: 0, instructions: 'Présentez-vous aux guichets.' },
  { id: 'pm-wave', code: 'WAVE', libelle: 'Wave Mobile Money', description: 'Paiement par QR Code.', actif: true, parDefaut: false, estParDefaut: false, fraisPourcentage: 0, delaiValidationHeures: 0, numeroCompteOuTelephone: '+221 76 328 58 29', instructions: 'Scannez le QR Code Wave.' },
  { id: 'pm-orange-money', code: 'ORANGE_MONEY', libelle: 'Orange Money (OM)', description: 'Paiement via USSD #144#.', actif: true, parDefaut: false, estParDefaut: false, fraisPourcentage: 0, delaiValidationHeures: 1, numeroCompteOuTelephone: '784912', instructions: 'Composez le code marchand.' },
  { id: 'pm-virement', code: 'VIREMENT', libelle: 'Virement Bancaire', description: 'Virement interbancaire.', actif: true, parDefaut: false, estParDefaut: false, fraisPourcentage: 0, delaiValidationHeures: 24, banqueNom: 'CBAO Attijariwafa Bank', instructions: 'Effectuez votre virement.' },
  { id: 'pm-cheque', code: 'CHEQUE', libelle: 'Chèque Certifié', description: 'Dépôt de chèque.', actif: true, parDefaut: false, estParDefaut: false, fraisPourcentage: 0, delaiValidationHeures: 48, instructions: 'Chèque certifié.' },
];

export function loadLocalCollection<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const raw = localStorage.getItem(`fital_immo_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(fallback)) {
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as unknown as T;
      } else if (parsed && typeof parsed === 'object') {
        return { ...fallback, ...parsed } as T;
      }
    }
  } catch (e) {
    console.warn(`[Supabase Service] Impossible de lire ${key}:`, e);
  }
  return fallback;
}

export function persistCollection<T>(key: string, data: T): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(`fital_immo_${key}`, JSON.stringify(data));
  } catch (err) {
    console.warn(`[Supabase Service] Impossible de persister ${key}:`, err);
  }
}

// ============================================================
// MAPPERS : BUILDINGS
// ============================================================
export function mapBuildingFromDb(r: any): Building {
  return {
    id: r.id,
    agencyId: r.agency_id || r.agencyId,
    proprietaireId: r.proprietaire_id || r.proprietaireId || '',
    proprietaireNom: r.proprietaire_nom || r.proprietaireNom,
    nom: r.nom || 'Immeuble',
    adresse: r.adresse || '',
    quartier: r.quartier || '',
    ville: r.ville || 'Dakar',
    type: r.type || 'Immeuble',
    nombreEtages: Number(r.nombre_etages ?? r.nombreEtages ?? 0),
    description: r.description || '',
    dateCreation: r.date_creation || r.dateCreation,
    statut: r.statut || 'Actif',
    nbUnites: Number(r.nb_unites ?? 0),
    nbUnitesOccupees: Number(r.nb_unites_occupees ?? 0),
    nbUnitesVacantes: Number(r.nb_unites_vacantes ?? 0),
    loyerTotalMensuel: Number(r.loyer_total_mensuel ?? 0),
  };
}

// ============================================================
// MAPPERS : UNITS
// ============================================================
export function mapUnitFromDb(r: any): Unit {
  return {
    id: r.id,
    agencyId: r.agency_id || r.agencyId,
    buildingId: r.building_id || r.buildingId || '',
    buildingNom: r.building_nom || r.buildingNom,
    proprietaireId: r.proprietaire_id || r.proprietaireId || '',
    proprietaireNom: r.proprietaire_nom || r.proprietaireNom,
    nom: r.nom || 'Espace',
    type: r.type || 'Appartement',
    etage: r.etage || '',
    superficie: Number(r.superficie ?? 0),
    nombrePieces: Number(r.nombre_pieces ?? r.nombrePieces ?? 1),
    loyerBase: Number(r.loyer_base ?? r.loyerBase ?? 0),
    charges: Number(r.charges ?? 0),
    statut: r.statut || 'Vacant',
    locataireActuelId: r.locataire_actuel_id || r.locataireActuelId,
    locataireActuelNom: r.locataire_actuel_nom || r.locataireActuelNom,
    description: r.description || '',
    equipements: r.equipements || [],
    dateCreation: r.created_at || r.dateCreation,
  };
}

// ============================================================
// MAPPERS : PROPERTIES
// ============================================================
export function mapPropertyFromDb(r: any): Property {
  return {
    id: r.id,
    ref: r.ref || `BIEN-${r.id.slice(0, 6)}`,
    nom: r.nom || 'Bien Immobilier',
    type: r.type || 'Appartement',
    adresse: r.adresse || '',
    quartier: r.quartier || 'Dakar',
    ville: r.ville || 'Dakar',
    proprietaireId: r.proprietaire_id || r.proprietaireId || '',
    proprietaireNom: r.proprietaire_nom || r.proprietaireNom || 'Propriétaire',
    tauxCommission: Number(r.taux_commission ?? r.tauxCommission ?? 10),
    loyerBase: Number(r.loyer_base ?? r.loyerBase ?? 0),
    charges: Number(r.charges ?? 0),
    tvaApplicable: Boolean(r.tva_applicable ?? r.tvaApplicable ?? false),
    statut: r.statut || 'Vacant',
    superficie: Number(r.superficie ?? 0),
    nombrePieces: Number(r.nombre_pieces ?? r.nombrePieces ?? 3),
    pieces: Number(r.pieces ?? r.nombre_pieces ?? 3),
    avatar: r.avatar || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80',
    equipements: r.equipements || ['Climatisation', 'Compteur Eau & Électricité', 'Sécurité 24/7'],
    description: r.description || '',
    dateCreation: r.created_at || r.dateCreation || new Date().toISOString().split('T')[0],
    locataireActuelNom: r.locataire_actuel_nom || r.locataireActuelNom,
  };
}

// ============================================================
// MAPPERS : OWNERS
// ============================================================
export function mapOwnerFromDb(r: any): Owner {
  return {
    id: r.id, ref: r.ref || `PRO-${r.id.slice(0, 6)}`,
    nom: r.nom || '', prenom: r.prenom || '', adresse: r.adresse || '',
    telephone: r.telephone || '', email: r.email || '',
    banque: r.banque || 'CBAO Attijariwafa',
    compteBancaire: r.compte_bancaire || r.compteBancaire || '',
    ninea: r.ninea || '',
    tauxCommission: Number(r.taux_commission ?? r.tauxCommission ?? 10),
    statut: r.statut || 'Actif',
    mandatGerance: r.mandat_gerance || r.mandatGerance || `MANDAT-${r.id.slice(0, 6)}`,
    observations: r.observations || '',
    totalBiens: Number(r.total_biens ?? r.totalBiens ?? 0),
    totalLoyersMensuels: Number(r.total_loyers_mensuels ?? r.totalLoyersMensuels ?? 0),
  };
}

// ============================================================
// MAPPERS : TENANTS
// ============================================================
export function mapTenantFromDb(r: any): Tenant {
  return {
    id: r.id, ref: r.ref || `LOC-${r.id.slice(0, 6)}`,
    nom: r.nom || '', prenom: r.prenom || '', telephone: r.telephone || '',
    email: r.email || '', cni: r.cni || '', fonction: r.fonction || '',
    profession: r.profession || r.fonction || '', employeur: r.employeur || '',
    revenuMensuel: Number(r.revenu_mensuel ?? r.revenuMensuel ?? 0),
    statut: r.statut || 'À jour',
    scoreSolvabilite: Number(r.score_solvabilite ?? r.scoreSolvabilite ?? 85),
    bienId: r.bien_id || r.bienId || '', bienNom: r.bien_nom || r.bienNom || '',
    proprietaireId: r.proprietaire_id || r.proprietaireId || '',
    dateEntree: r.date_entree || r.dateEntree || new Date().toISOString().split('T')[0],
    dateSortie: r.date_sortie || r.dateSortie,
    loyerMensuel: Number(r.loyer_mensuel ?? r.loyerMensuel ?? 0),
    arrieresCumules: Number(r.arrieres_cumules ?? r.arrieresCumules ?? 0),
    joursRetard: Number(r.jours_retard ?? r.joursRetard ?? 0),
    observations: r.observations || '',
  };
}

// ============================================================
// MAPPERS : CONTRACTS
// ============================================================
export function mapContractFromDb(r: any): LeaseContract {
  return {
    id: r.id, ref: r.ref || `BAIL-${r.id.slice(0, 6)}`,
    typeContrat: r.type_contrat || r.typeContrat || 'Habitation',
    locataireId: r.locataire_id || r.locataireId || '',
    locataireNom: r.locataire_nom || r.locataireNom || '',
    bienId: r.bien_id || r.bienId || '', bienNom: r.bien_nom || r.bienNom || '',
    proprietaireId: r.proprietaire_id || r.proprietaireId || '',
    proprietaireNom: r.proprietaire_nom || r.proprietaireNom || '',
    loyerBase: Number(r.loyer_base ?? r.loyerBase ?? 0),
    charges: Number(r.charges ?? 0), tva: Number(r.tva ?? 0),
    tom: Number(r.tom ?? 0), tlv: Number(r.tlv ?? 0),
    cautionLoyer: Number(r.caution_loyer ?? r.cautionLoyer ?? 0),
    cautionEau: Number(r.caution_eau ?? r.cautionEau ?? 0),
    cautionElectricite: Number(r.caution_electricite ?? r.cautionElectricite ?? 0),
    cautionMontant: Number(r.caution_montant ?? r.cautionMontant ?? 0),
    cautionMois: Number(r.caution_mois ?? r.cautionMois ?? 2),
    fraisAdhesion: Number(r.frais_adhesion ?? r.fraisAdhesion ?? 0),
    dateDebut: r.date_debut || r.dateDebut || '',
    dateFin: r.date_fin || r.dateFin || '',
    typeReglement: r.type_reglement || r.typeReglement || 'Mensuel',
    statut: r.statut || 'En cours',
  };
}

// ============================================================
// MAPPERS : PAYMENTS
// ============================================================
export function mapPaymentFromDb(r: any): Payment {
  return {
    id: r.id, ref: r.ref || `PAY-${r.id.slice(0, 6)}`,
    quittanceNumero: r.quittance_numero || r.quittanceNumero || `QUI-${r.id.slice(0, 6)}`,
    locataireId: r.locataire_id || r.locataireId || '',
    locataireNom: r.locataire_nom || r.locataireNom || '',
    bienId: r.bien_id || r.bienId || '', bienNom: r.bien_nom || r.bienNom || '',
    proprietaireId: r.proprietaire_id || r.proprietaireId || '',
    proprietaireNom: r.proprietaire_nom || r.proprietaireNom || '',
    periode: r.periode || 'Ce mois',
    loyerBase: Number(r.loyer_base ?? r.loyerBase ?? 0),
    charges: Number(r.charges ?? 0), tva: Number(r.tva ?? 0),
    tom: Number(r.tom ?? 0), penalites: Number(r.penalites ?? 0),
    montantTotal: Number(r.montant_total ?? r.montantTotal ?? 0),
    montantPaye: Number(r.montant_paye ?? r.montantPaye ?? 0),
    montantRestant: Number(r.montant_restant ?? r.montantRestant ?? 0),
    statut: r.statut || 'Payé',
    modePaiement: r.mode_paiement || r.modePaiement || 'Espèces',
    moyenPaiementCode: r.moyen_paiement_code || r.moyenPaiementCode || 'ESPECES',
    verificationStatut: r.verification_statut || r.verificationStatut || 'valide',
    referenceTransaction: r.reference_transaction || r.referenceTransaction || '',
    justificatifUrl: r.proof_url || r.justificatifUrl || '',
    datePaiement: r.date_paiement || r.datePaiement || new Date().toISOString().split('T')[0],
    dateEcheance: r.date_echeance || r.dateEcheance || '',
    recuPar: r.recu_par || r.recuPar || 'Service Gérance',
    observation: r.observation || '',
    auteurId: r.caissier_id || r.auteurId,
    auteurNom: r.caissier_nom || r.auteurNom,
    dateHeurePaiement: r.created_at || r.dateHeurePaiement,
    // ⬇️ NOUVEAU : Gestion Reçu / Quittance de Solde
    typeRecu: r.type_recu || r.typeRecu || 'QUITTANCE',
    referencePaiementInitial: r.reference_paiement_initial || r.referencePaiementInitial,
    montantInitialDu: Number(r.montant_initial_du ?? r.montantInitialDu ?? 0),
  };
}

// ============================================================
// MAPPERS : OWNER DEDUCTIONS
// ============================================================
export function mapOwnerDeductionFromDb(r: any): OwnerDeduction {
  return {
    id: r.id,
    agencyId: r.agency_id || r.agencyId,
    proprietaireId: r.proprietaire_id || r.proprietaireId,
    bulletinRef: r.bulletin_ref || r.bulletinRef,
    periode: r.periode || 'Ce mois',
    typeDeduction: r.type_deduction || r.typeDeduction || 'AUTRE',
    libelle: r.libelle || '',
    montant: Number(r.montant ?? 0),
    referenceDocument: r.reference_document || r.referenceDocument,
    dateDeduction: r.date_deduction || r.dateDeduction || new Date().toISOString().split('T')[0],
    notes: r.notes || '',
    createdAt: r.created_at || r.createdAt,
    updatedAt: r.updated_at || r.updatedAt,
  };
}

// ============================================================
// MAPPERS : BULLETIN VERSEMENTS
// ============================================================
export function mapBulletinVersementFromDb(r: any): BulletinVersement {
  return {
    id: r.id,
    agencyId: r.agency_id || r.agencyId,
    reference: r.reference || `BV-${r.id.slice(0, 6)}`,
    proprietaireId: r.proprietaire_id || r.proprietaireId,
    proprietaireNom: r.proprietaire_nom || r.proprietaireNom,
    periode: r.periode,
    tauxCommission: Number(r.taux_commission ?? r.tauxCommission ?? 10),
    totalLoyersBruts: Number(r.total_loyers_bruts ?? r.totalLoyersBruts ?? 0),
    totalCommission: Number(r.total_commission ?? r.totalCommission ?? 0),
    totalTvaCommission: Number(r.total_tva_commission ?? r.totalTvaCommission ?? 0),
    totalDecaissements: Number(r.total_decaissements ?? r.totalDecaissements ?? 0),
    totalEncaissements: Number(r.total_encaissements ?? r.totalEncaissements ?? 0),
    netAReverser: Number(r.net_a_reverser ?? r.netAReverser ?? 0),
    detailsBulletin: r.details_bulletin || r.detailsBulletin || {},
    statut: r.statut || 'Brouillon',
    dateValidation: r.date_validation || r.dateValidation,
    datePaiement: r.date_paiement || r.datePaiement,
    modeReglement: r.mode_reglement || r.modeReglement,
    referenceVirement: r.reference_virement || r.referenceVirement,
    notes: r.notes || '',
    createdAt: r.created_at || r.createdAt,
    updatedAt: r.updated_at || r.updatedAt,
  };
}

// ============================================================
// MAPPERS : CASH MOVEMENTS
// ============================================================
export function mapCashMovementFromDb(r: any): CashMovement {
  return {
    id: r.id, reference: r.reference || r.id,
    type: r.type,
    montant: Number(r.montant || 0),
    description: r.description || '',
    libelle: r.description || r.libelle || '',
    moyenPaiementCode: r.moyen_paiement_code || r.moyenPaiementCode || 'ESPECES',
    auteurNom: r.user_nom || r.auteurNom || 'Caissier',
    auteurId: r.user_id || r.auteurId,
    beneficiaire: r.beneficiaire || '',
    justificatifRef: r.justificatif_ref || r.justificatifRef || '',
    dateHeure: r.created_at || r.dateHeure || new Date().toISOString(),
    statut: r.statut || 'Validé',
  };
}

// ============================================================
// MAPPERS : CASH CLOSINGS
// ============================================================
export function mapCashClosingFromDb(r: any): CashClosing {
  return {
    id: r.id, reference: r.reference || r.id,
    dateCloture: r.date_cloture || r.dateCloture || new Date().toISOString().split('T')[0],
    caissierId: r.caissier_id || r.caissierId || '',
    caissierNom: r.caissier_nom || r.caissierNom || '',
    soldeInitial: Number(r.solde_initial ?? r.soldeInitial ?? 0),
    totalEntreesEspeces: Number(r.total_entrees_especes ?? r.totalEntreesEspeces ?? 0),
    totalSortiesEspeces: Number(r.total_sorties_especes ?? r.totalSortiesEspeces ?? 0),
    soldeTheorique: Number(r.solde_theorique ?? r.soldeTheorique ?? 0),
    soldeReel: Number(r.solde_reel ?? r.soldeReel ?? 0),
    ecart: Number(r.ecart ?? 0),
    detailsComptage: r.details_comptage || r.detailsComptage || {},
    observations: r.observations || '',
    statut: r.statut || 'Validé par Responsable',
  };
}

// ============================================================
// MAPPERS : INSPECTIONS
// ============================================================
export function mapInspectionFromDb(r: any): Inspection {
  return {
    id: r.id, ref: r.ref || `EDL-${r.id.slice(0, 6)}`,
    bienId: r.bien_id || r.bienId || '',
    bienNom: r.bien_nom || r.bienNom || 'Bien',
    locataireId: r.locataire_id || r.locataireId || '',
    locataireNom: r.locataire_nom || r.locataireNom || '',
    type: r.type || 'Entrée',
    date: r.date || r.date_inspection || new Date().toISOString().split('T')[0],
    agentNom: r.agent_nom || r.agentNom || 'Agent de gérance',
    inspecteurNom: r.inspecteur_nom || r.inspecteurNom || 'Agent de gérance',
    etatGeneral: r.etat_general || r.etatGeneral || 'Bon état',
    remarques: r.remarques || r.observations || '',
    statut: r.statut || 'Validé',
    signe: Boolean(r.signe ?? true),
  };
}

// ============================================================
// MAPPERS : MAINTENANCE
// ============================================================
export function mapMaintenanceFromDb(r: any): MaintenanceTicket {
  return {
    id: r.id, ref: r.ref || `TRV-${r.id.slice(0, 6)}`,
    bienId: r.bien_id || r.bienId || '',
    bienNom: r.bien_nom || r.bienNom || 'Bien',
    proprietaireId: r.proprietaire_id || r.proprietaireId,
    proprietaireNom: r.proprietaire_nom || r.proprietaireNom,
    locataireId: r.locataire_id || r.locataireId,
    locataireNom: r.locataire_nom || r.locataireNom || '',
    titre: r.titre || 'Signalement incident',
    description: r.description || '',
    priorite: r.priorite || 'Moyenne',
    statut: r.statut || 'Signalé',
    statutReglement: r.statut_reglement || r.statutReglement || 'Non réglé',
    modeReglement: r.mode_reglement || r.modeReglement,
    dateReglement: r.date_reglement || r.dateReglement,
    factureArtisanRef: r.facture_artisan_ref || r.factureArtisanRef,
    regleParCaisse: Boolean(r.regle_par_caisse ?? r.regleParCaisse ?? false),
    caisseMouvementId: r.caisse_mouvement_id || r.caisseMouvementId,
    observationsReglement: r.observations_reglement || r.observationsReglement,
    imputableA: r.imputable_a || r.imputableA || 'Propriétaire',
    coutEstime: Number(r.cout_estime ?? r.coutEstime ?? 0),
    coutReel: Number(r.cout_reel ?? r.coutReel ?? 0),
    dateSignalement: r.date_signalement || r.dateSignalement || new Date().toISOString().split('T')[0],
    dateIntervention: r.date_intervention || r.dateIntervention,
    dateResolution: r.date_resolution || r.dateResolution,
    prestataire: r.prestataire || '',
    artisanNom: r.artisan_nom || r.artisanNom,
  };
}

// ============================================================
// MAPPERS : DISBURSEMENTS
// ============================================================
export function mapDisbursementFromDb(r: any): OwnerDisbursement {
  return {
    id: r.id, ref: r.ref || `REV-${r.id.slice(0, 6)}`,
    proprietaireId: r.proprietaire_id || '',
    proprietaireNom: r.proprietaire_nom || 'Propriétaire',
    periode: r.periode || 'Ce mois',
    loyersBruts: Number(r.loyers_bruts_recouvres || 0),
    montantBrut: Number(r.loyers_bruts_recouvres || 0),
    tauxCommission: Number(r.taux_commission || 10),
    commissionAgence: Number(r.montant_commission || 0),
    tvaCommission: Number(r.tva_commission || 0),
    retenueTVA: Number(r.tva_commission || 0),
    depensesDeduites: Number(r.charges_deduites || 0),
    chargesDeduites: Number(r.charges_deduites || 0),
    montantNetPaye: Number(r.net_a_reverser || 0),
    montantNet: Number(r.net_a_reverser || 0),
    statut: r.statut || 'Effectué',
    modeReglement: r.mode_reglement || 'Virement',
    modeReversement: r.mode_reglement || 'Virement',
    dateReglement: r.date_versement || '',
    dateReversement: r.date_versement || '',
    referenceVirement: '',
  };
}

// ============================================================
// MAPPERS : INVOICES
// ============================================================
export function mapInvoiceFromDb(r: any): Invoice {
  const tot = Number(r.montant_total ?? r.total ?? 0);
  return {
    id: r.id, ref: r.ref || r.numero || `FAC-${r.id.slice(0, 6)}`,
    numero: r.numero || `FAC-${r.id.slice(0, 6)}`,
    type: r.type || 'Frais de dossier',
    locataireId: r.locataire_id || r.locataireId || '',
    locataireNom: r.locataire_nom || r.locataireNom || '',
    bienId: r.bien_id || r.bienId || '', bienNom: r.bien_nom || r.bienNom || '',
    periode: r.periode || 'Ce mois',
    dateFacture: r.date_facture || r.dateFacture || new Date().toISOString().split('T')[0],
    dateEmission: r.date_emission || r.dateEmission || new Date().toISOString().split('T')[0],
    dateEcheance: r.date_echeance || r.dateEcheance || new Date().toISOString().split('T')[0],
    sousTotal: Number(r.sous_total ?? r.sousTotal ?? tot),
    taxes: Number(r.taxes ?? 0), total: tot, montantTotal: tot,
    statut: r.statut || 'Émise', lignes: r.lignes || [],
  };
}

// ============================================================
// MAPPERS : REMINDERS
// ============================================================
export function mapReminderFromDb(r: any): TenantReminder {
  return {
    id: r.id, locataireId: r.locataire_id || r.locataireId || '',
    locataireNom: r.locataire_nom || r.locataireNom || '',
    telephone: r.telephone || '', email: r.email || '',
    bienNom: r.bien_nom || r.bienNom || 'Bien loué',
    montantDu: Number(r.montant_du ?? r.montantDu ?? 0),
    penalites: Number(r.penalites ?? 0),
    joursRetard: Number(r.jours_retard ?? r.joursRetard ?? 0),
    niveau: r.niveau || 'Niveau 1: Courtois (J+3)',
    canal: r.canal || 'SMS',
    typeRelance: r.type_relance || r.typeRelance || 'Courtoise',
    message: r.message || '', statut: r.statut || 'Envoyé',
    dateCreation: r.created_at || r.dateCreation || new Date().toISOString().split('T')[0],
    dateEnvoi: r.date_envoi || r.dateEnvoi,
  };
}

// ============================================================
// CHARGEMENT DE L'APPLICATION
// ============================================================
export async function loadFullApplicationData(agencyId?: string): Promise<AppStateData> {
  const localAgency = loadLocalCollection<Agency | null>('agency', null);
  const localProperties = loadLocalCollection<Property[]>('properties', []);
  const localBuildings = loadLocalCollection<Building[]>('buildings', []);
  const localUnits = loadLocalCollection<Unit[]>('units', []);
  const localOwners = loadLocalCollection<Owner[]>('owners', []);
  const localTenants = loadLocalCollection<Tenant[]>('tenants', []);
  const localContracts = loadLocalCollection<LeaseContract[]>('contracts', []);
  const localPayments = loadLocalCollection<Payment[]>('payments', []);
  const localReminders = loadLocalCollection<TenantReminder[]>('reminders', []);
  const localInspections = loadLocalCollection<Inspection[]>('inspections', []);
  const localMaintenance = loadLocalCollection<MaintenanceTicket[]>('maintenance', []);
  const localDisbursements = loadLocalCollection<OwnerDisbursement[]>('disbursements', []);
  const localInvoices = loadLocalCollection<Invoice[]>('invoices', []);
  const localCashVouchers = loadLocalCollection<CashVoucher[]>('cash_vouchers', []);
  const localNotifications = loadLocalCollection<NotificationItem[]>('notifications', []);
  const localAuditLogs = loadLocalCollection<AuditLog[]>('audit_logs', []);
  const localSettings = loadLocalCollection<AgencySettings>('settings', defaultSettings);
  const localUsers = loadLocalCollection<UserAccount[]>('users', []);
  const localPaymentMethods = loadLocalCollection<PaymentMethodConfig[]>('payment_methods', defaultPaymentMethods);
  const localCashMovements = loadLocalCollection<CashMovement[]>('cash_movements', []);
  const localCashClosings = loadLocalCollection<CashClosing[]>('cash_closings', []);
  const localOwnerDeductions = loadLocalCollection<OwnerDeduction[]>('owner_deductions', []);
  const localBulletinVersements = loadLocalCollection<BulletinVersement[]>('bulletin_versements', []);

  const state: AppStateData = {
    agency: localAgency, properties: localProperties,
    buildings: localBuildings, units: localUnits,
    owners: localOwners, tenants: localTenants, contracts: localContracts,
    payments: localPayments, reminders: localReminders, inspections: localInspections,
    maintenance: localMaintenance, disbursements: localDisbursements, invoices: localInvoices,
    cashVouchers: localCashVouchers, notifications: localNotifications, auditLogs: localAuditLogs,
    settings: localSettings, users: localUsers, paymentMethods: localPaymentMethods,
    cashMovements: localCashMovements, cashClosings: localCashClosings,
    ownerDeductions: localOwnerDeductions, bulletinVersements: localBulletinVersements,
  };

  if (!isSupabaseConfigured || !supabase) return state;

  try {
    const agencyFilter = (query: any) => (agencyId ? query.eq('agency_id', agencyId) : query);

    const [
      agencyRes, propsRes, ownersRes, tenantsRes, contractsRes, paymentsRes,
      cashMovRes, cashCloseRes, maintRes, inspRes, disbRes, invRes, remindRes,
      auditRes, notifRes, pmRes, settingsRes, usersRes, buildingsRes, unitsRes,
      deductionsRes, bulletinsRes,
    ] = await Promise.allSettled([
      agencyId ? supabase.from('agencies').select('*').eq('id', agencyId).maybeSingle() : Promise.resolve({ data: null }),
      agencyFilter(supabase.from('properties').select('*').is('deleted_at', null)),
      agencyFilter(supabase.from('owners').select('*').is('deleted_at', null)),
      agencyFilter(supabase.from('tenants').select('*').is('deleted_at', null)),
      agencyFilter(supabase.from('contracts').select('*')),
      agencyFilter(supabase.from('payments').select('*').is('deleted_at', null).order('created_at', { ascending: false })),
      agencyFilter(supabase.from('cash_movements').select('*').order('created_at', { ascending: false })),
      agencyFilter(supabase.from('cash_closings').select('*').order('created_at', { ascending: false })),
      agencyFilter(supabase.from('maintenance_tickets').select('*').order('created_at', { ascending: false })),
      agencyFilter(supabase.from('property_inspections').select('*').order('created_at', { ascending: false })),
      agencyFilter(supabase.from('disbursements').select('*').order('created_at', { ascending: false })),
      agencyFilter(supabase.from('invoices').select('*').order('created_at', { ascending: false })),
      agencyFilter(supabase.from('tenant_reminders').select('*').order('date_creation', { ascending: false })),
      agencyFilter(supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100)),
      agencyFilter(supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50)),
      agencyFilter(supabase.from('payment_methods_config').select('*')),
      agencyId ? supabase.from('agency_settings').select('*').eq('agency_id', agencyId).maybeSingle() : Promise.resolve({ data: null }),
      agencyFilter(supabase.from('profiles').select('*')),
      agencyFilter(supabase.from('buildings').select('*').order('created_at', { ascending: false })),
      agencyFilter(supabase.from('units').select('*').order('created_at', { ascending: false })),
      agencyFilter(supabase.from('owner_deductions').select('*').order('created_at', { ascending: false })),
      agencyFilter(supabase.from('bulletin_versements').select('*').order('created_at', { ascending: false })),
    ]);

    if (agencyRes.status === 'fulfilled' && agencyRes.value.data) {
      state.agency = agencyRes.value.data as unknown as Agency;
      persistCollection('agency', state.agency);
    }
    if (propsRes.status === 'fulfilled' && propsRes.value.data && propsRes.value.data.length > 0) {
      state.properties = propsRes.value.data.map(mapPropertyFromDb);
      persistCollection('properties', state.properties);
    }
    if (ownersRes.status === 'fulfilled' && ownersRes.value.data && ownersRes.value.data.length > 0) {
      state.owners = ownersRes.value.data.map(mapOwnerFromDb);
      persistCollection('owners', state.owners);
    }
    if (tenantsRes.status === 'fulfilled' && tenantsRes.value.data && tenantsRes.value.data.length > 0) {
      state.tenants = tenantsRes.value.data.map(mapTenantFromDb);
      persistCollection('tenants', state.tenants);
    }
    if (contractsRes.status === 'fulfilled' && contractsRes.value.data && contractsRes.value.data.length > 0) {
      state.contracts = contractsRes.value.data.map(mapContractFromDb);
      persistCollection('contracts', state.contracts);
    }
    if (paymentsRes.status === 'fulfilled' && paymentsRes.value.data && paymentsRes.value.data.length > 0) {
      state.payments = paymentsRes.value.data.map(mapPaymentFromDb);
      persistCollection('payments', state.payments);
    }
    if (cashMovRes.status === 'fulfilled' && cashMovRes.value.data && cashMovRes.value.data.length > 0) {
      state.cashMovements = cashMovRes.value.data.map(mapCashMovementFromDb);
      persistCollection('cash_movements', state.cashMovements);
    }
    if (cashCloseRes.status === 'fulfilled' && cashCloseRes.value.data && cashCloseRes.value.data.length > 0) {
      state.cashClosings = cashCloseRes.value.data.map(mapCashClosingFromDb);
      persistCollection('cash_closings', state.cashClosings);
    }
    if (maintRes.status === 'fulfilled' && maintRes.value.data && maintRes.value.data.length > 0) {
      state.maintenance = maintRes.value.data.map(mapMaintenanceFromDb);
      persistCollection('maintenance', state.maintenance);
    }
    if (inspRes.status === 'fulfilled' && inspRes.value.data && inspRes.value.data.length > 0) {
      state.inspections = inspRes.value.data.map(mapInspectionFromDb);
      persistCollection('inspections', state.inspections);
    }
    if (disbRes.status === 'fulfilled' && disbRes.value.data && disbRes.value.data.length > 0) {
      state.disbursements = disbRes.value.data.map(mapDisbursementFromDb);
      persistCollection('disbursements', state.disbursements);
    }
    if (invRes.status === 'fulfilled' && invRes.value.data && invRes.value.data.length > 0) {
      state.invoices = invRes.value.data.map(mapInvoiceFromDb);
      persistCollection('invoices', state.invoices);
    }
    if (remindRes.status === 'fulfilled' && remindRes.value.data && remindRes.value.data.length > 0) {
      state.reminders = remindRes.value.data.map(mapReminderFromDb);
      persistCollection('reminders', state.reminders);
    }
    if (auditRes.status === 'fulfilled' && auditRes.value.data && auditRes.value.data.length > 0) {
      state.auditLogs = auditRes.value.data as unknown as AuditLog[];
      persistCollection('audit_logs', state.auditLogs);
    }
    if (notifRes.status === 'fulfilled' && notifRes.value.data && notifRes.value.data.length > 0) {
      state.notifications = notifRes.value.data as unknown as NotificationItem[];
      persistCollection('notifications', state.notifications);
    }
    if (pmRes.status === 'fulfilled' && pmRes.value.data && pmRes.value.data.length > 0) {
      state.paymentMethods = pmRes.value.data as unknown as PaymentMethodConfig[];
      persistCollection('payment_methods', state.paymentMethods);
    }

    if (buildingsRes.status === 'fulfilled' && buildingsRes.value.data && buildingsRes.value.data.length > 0) {
      state.buildings = buildingsRes.value.data.map(mapBuildingFromDb);
      persistCollection('buildings', state.buildings);
    }

    if (unitsRes.status === 'fulfilled' && unitsRes.value.data && unitsRes.value.data.length > 0) {
      state.units = unitsRes.value.data.map(mapUnitFromDb);
      persistCollection('units', state.units);
    }

    if (deductionsRes.status === 'fulfilled' && deductionsRes.value.data && deductionsRes.value.data.length > 0) {
      state.ownerDeductions = deductionsRes.value.data.map(mapOwnerDeductionFromDb);
      persistCollection('owner_deductions', state.ownerDeductions);
    }

    if (bulletinsRes.status === 'fulfilled' && bulletinsRes.value.data && bulletinsRes.value.data.length > 0) {
      state.bulletinVersements = bulletinsRes.value.data.map(mapBulletinVersementFromDb);
      persistCollection('bulletin_versements', state.bulletinVersements);
    }

    if (settingsRes.status === 'fulfilled' && settingsRes.value.data) {
      const dbSettings = settingsRes.value.data;
      state.settings = {
        ...defaultSettings,
        nomAgence: dbSettings.nom_agence || defaultSettings.nomAgence,
        slogan: dbSettings.slogan || defaultSettings.slogan,
        telephone: dbSettings.telephone || defaultSettings.telephone,
        email: dbSettings.email || defaultSettings.email,
        adresse: dbSettings.adresse || defaultSettings.adresse,
        ville: dbSettings.ville || defaultSettings.ville,
        pays: dbSettings.pays || defaultSettings.pays,
        ninea: dbSettings.ninea || defaultSettings.ninea,
        devise: dbSettings.devise || defaultSettings.devise,
        tauxGeranceDefaut: Number(dbSettings.taux_gerance_defaut ?? defaultSettings.tauxGeranceDefaut),
        penaliteDefaut: Number(dbSettings.penalite_defaut ?? defaultSettings.penaliteDefaut),
        tvaTaux: Number(dbSettings.tva_taux ?? defaultSettings.tvaTaux),
        prefixFacture: dbSettings.prefix_facture || defaultSettings.prefixFacture,
        prefixQuittance: dbSettings.prefix_quittance || defaultSettings.prefixQuittance,
        prefixPaiement: dbSettings.prefix_paiement || defaultSettings.prefixPaiement,
        prefixContrat: dbSettings.prefix_contrat || defaultSettings.prefixContrat,
        prefixBonCaisse: dbSettings.prefix_bon_caisse || defaultSettings.prefixBonCaisse,
        waveNumero: dbSettings.wave_numero || localSettings.waveNumero || defaultSettings.waveNumero,
        orangeMoneyCode: dbSettings.orange_money_code || localSettings.orangeMoneyCode || defaultSettings.orangeMoneyCode,
        whatsappBusiness: dbSettings.whatsapp_business || localSettings.whatsappBusiness || defaultSettings.whatsappBusiness,
        standardTelephone: dbSettings.standard_telephone || localSettings.standardTelephone || defaultSettings.standardTelephone,
      };
      persistCollection('settings', state.settings);
    }

    if (usersRes.status === 'fulfilled' && usersRes.value.data && usersRes.value.data.length > 0) {
      state.users = usersRes.value.data.map((p: any) => ({
        id: p.id, agencyId: p.agency_id, email: p.email, nom: p.nom, prenom: p.prenom,
        telephone: p.telephone, role: p.role, statut: p.statut,
        permissions: p.permissions || [], avatar: p.avatar_url,
        proprietaireId: p.proprietaire_id, locataireId: p.locataire_id,
        derniereConnexion: p.derniere_connexion,
        organisation: state.agency?.name || 'FITAL-IMMO',
        createdAt: p.created_at, updatedAt: p.updated_at,
      }));
      persistCollection('users', state.users);
    }
  } catch (err) {
    console.error('Erreur synchronisation Supabase:', err);
  }

  return state;
}

// ============================================================
// FETCH USER PROFILE
// ============================================================
export async function fetchUserProfile(userId: string): Promise<UserAccount | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data: profile, error } = await supabase
      .from('profiles').select('*, agencies(name, slug, logo_url)')
      .eq('id', userId).maybeSingle();
    if (error || !profile) { console.warn('Profil non trouvé:', error); return null; }
    return {
      id: profile.id, agencyId: profile.agency_id, email: profile.email,
      nom: profile.nom, prenom: profile.prenom, telephone: profile.telephone,
      role: profile.role, statut: profile.statut, permissions: profile.permissions || [],
      avatar: profile.avatar_url, proprietaireId: profile.proprietaire_id,
      locataireId: profile.locataire_id, derniereConnexion: profile.derniere_connexion,
      organisation: profile.agencies?.name || 'FITAL-IMMO',
      createdAt: profile.created_at, updatedAt: profile.updated_at,
    };
  } catch (e) { console.error('Erreur fetchUserProfile:', e); return null; }
}

// ============================================================
// AUDIT LOG
// ============================================================
export async function logSystemAudit(log: Partial<AuditLog>, agencyId?: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !agencyId) return;
  try {
    await supabase.from('audit_logs').insert([{
      agency_id: agencyId,
      user_nom: log.userNom || log.utilisateur || 'Système',
      action: log.action || 'ACTION',
      module: log.module || log.entite || 'SYSTÈME',
      entity_type: log.entityType || log.entite || 'GENERAL',
      entity_ref: log.entityRef || log.entiteId || 'N/A',
      details: log.details || '',
    }]);
  } catch (e) { console.warn('Erreur insertion audit log:', e); }
}

async function recordExists(table: string, id: string, agencyId: string): Promise<boolean> {
  const { data } = await supabase!.from(table).select('id').eq('id', id).eq('agency_id', agencyId).maybeSingle();
  return !!data;
}

// ============================================================
// CRUD : BUILDINGS
// ============================================================
export async function saveBuildingToDb(building: Partial<Building>, agencyId: string): Promise<{ success: boolean; data?: Building; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: true, data: building as Building };
  try {
    const record = {
      agency_id: agencyId,
      proprietaire_id: building.proprietaireId,
      nom: building.nom,
      adresse: building.adresse || '',
      quartier: building.quartier || '',
      ville: building.ville || 'Dakar',
      type: building.type || 'Immeuble',
      nombre_etages: building.nombreEtages || 0,
      description: building.description || '',
      statut: building.statut || 'Actif',
      updated_at: new Date().toISOString(),
    };
    const exists = building.id ? await recordExists('buildings', building.id, agencyId) : false;
    if (exists) {
      const { data, error } = await supabase.from('buildings').update(record).eq('id', building.id).eq('agency_id', agencyId).select().single();
      if (error) throw error;
      return { success: true, data: mapBuildingFromDb(data) };
    } else {
      const { data, error } = await supabase.from('buildings').insert([record]).select().single();
      if (error) throw error;
      return { success: true, data: mapBuildingFromDb(data) };
    }
  } catch (err: any) {
    console.error('Erreur sauvegarde immeuble:', err);
    return { success: false, error: err.message || 'Impossible d\'enregistrer l\'immeuble.' };
  }
}

export async function deleteBuildingFromDb(buildingId: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: true };
  try {
    const { error } = await supabase.from('buildings').delete().eq('id', buildingId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Erreur suppression immeuble:', err);
    return { success: false, error: err.message };
  }
}

// ============================================================
// CRUD : UNITS
// ============================================================
export async function saveUnitToDb(unit: Partial<Unit>, agencyId: string): Promise<{ success: boolean; data?: Unit; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: true, data: unit as Unit };
  try {
    const record = {
      agency_id: agencyId,
      building_id: unit.buildingId,
      proprietaire_id: unit.proprietaireId,
      nom: unit.nom,
      type: unit.type || 'Appartement',
      etage: unit.etage || '',
      superficie: unit.superficie || 0,
      nombre_pieces: unit.nombrePieces || 1,
      loyer_base: unit.loyerBase || 0,
      charges: unit.charges || 0,
      statut: unit.statut || 'Vacant',
      locataire_actuel_id: unit.locataireActuelId || null,
      description: unit.description || '',
      equipements: unit.equipements || [],
      updated_at: new Date().toISOString(),
    };
    const exists = unit.id ? await recordExists('units', unit.id, agencyId) : false;
    if (exists) {
      const { data, error } = await supabase.from('units').update(record).eq('id', unit.id).eq('agency_id', agencyId).select().single();
      if (error) throw error;
      return { success: true, data: mapUnitFromDb(data) };
    } else {
      const { data, error } = await supabase.from('units').insert([record]).select().single();
      if (error) throw error;
      return { success: true, data: mapUnitFromDb(data) };
    }
  } catch (err: any) {
    console.error('Erreur sauvegarde espace:', err);
    return { success: false, error: err.message || 'Impossible d\'enregistrer l\'espace.' };
  }
}

export async function deleteUnitFromDb(unitId: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: true };
  try {
    const { error } = await supabase.from('units').delete().eq('id', unitId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Erreur suppression espace:', err);
    return { success: false, error: err.message };
  }
}

// ============================================================
// CRUD : OWNER DEDUCTIONS
// ============================================================
export async function saveOwnerDeductionToDb(deduction: Partial<OwnerDeduction>, agencyId: string): Promise<{ success: boolean; data?: OwnerDeduction; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: true, data: deduction as OwnerDeduction };
  try {
    const record = {
      agency_id: agencyId,
      proprietaire_id: deduction.proprietaireId,
      bulletin_ref: deduction.bulletinRef || null,
      periode: deduction.periode,
      type_deduction: deduction.typeDeduction || 'AUTRE',
      libelle: deduction.libelle,
      montant: deduction.montant || 0,
      reference_document: deduction.referenceDocument || null,
      date_deduction: deduction.dateDeduction || new Date().toISOString().split('T')[0],
      notes: deduction.notes || '',
      updated_at: new Date().toISOString(),
    };
    const exists = deduction.id ? await recordExists('owner_deductions', deduction.id, agencyId) : false;
    if (exists) {
      const { data, error } = await supabase.from('owner_deductions').update(record).eq('id', deduction.id).eq('agency_id', agencyId).select().single();
      if (error) throw error;
      return { success: true, data: mapOwnerDeductionFromDb(data) };
    } else {
      const { data, error } = await supabase.from('owner_deductions').insert([record]).select().single();
      if (error) throw error;
      return { success: true, data: mapOwnerDeductionFromDb(data) };
    }
  } catch (err: any) {
    console.error('Erreur sauvegarde déduction:', err);
    return { success: false, error: err.message || 'Impossible d\'enregistrer la déduction.' };
  }
}

export async function deleteOwnerDeductionFromDb(deductionId: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: true };
  try {
    const { error } = await supabase.from('owner_deductions').delete().eq('id', deductionId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Erreur suppression déduction:', err);
    return { success: false, error: err.message };
  }
}

// ============================================================
// CRUD : BULLETIN VERSEMENTS
// ============================================================
export async function saveBulletinVersementToDb(bulletin: Partial<BulletinVersement>, agencyId: string): Promise<{ success: boolean; data?: BulletinVersement; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: true, data: bulletin as BulletinVersement };
  try {
    const record = {
      agency_id: agencyId,
      reference: bulletin.reference,
      proprietaire_id: bulletin.proprietaireId,
      proprietaire_nom: bulletin.proprietaireNom || null,
      periode: bulletin.periode,
      taux_commission: bulletin.tauxCommission || 10,
      total_loyers_bruts: bulletin.totalLoyersBruts || 0,
      total_commission: bulletin.totalCommission || 0,
      total_tva_commission: bulletin.totalTvaCommission || 0,
      total_decaissements: bulletin.totalDecaissements || 0,
      total_encaissements: bulletin.totalEncaissements || 0,
      net_a_reverser: bulletin.netAReverser || 0,
      details_bulletin: bulletin.detailsBulletin || {},
      statut: bulletin.statut || 'Brouillon',
      date_validation: bulletin.dateValidation || null,
      date_paiement: bulletin.datePaiement || null,
      mode_reglement: bulletin.modeReglement || null,
      reference_virement: bulletin.referenceVirement || null,
      notes: bulletin.notes || '',
      updated_at: new Date().toISOString(),
    };
    const exists = bulletin.id ? await recordExists('bulletin_versements', bulletin.id, agencyId) : false;
    if (exists) {
      const { data, error } = await supabase.from('bulletin_versements').update(record).eq('id', bulletin.id).eq('agency_id', agencyId).select().single();
      if (error) throw error;
      return { success: true, data: mapBulletinVersementFromDb(data) };
    } else {
      const { data, error } = await supabase.from('bulletin_versements').insert([record]).select().single();
      if (error) throw error;
      return { success: true, data: mapBulletinVersementFromDb(data) };
    }
  } catch (err: any) {
    console.error('Erreur sauvegarde bulletin:', err);
    return { success: false, error: err.message || 'Impossible d\'enregistrer le bulletin.' };
  }
}

// ============================================================
// CRUD : PROPRIÉTÉS
// ============================================================
export async function savePropertyToDb(property: Partial<Property>, agencyId: string): Promise<{ success: boolean; data?: Property; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: true, data: property as Property };
  try {
    const record = {
      agency_id: agencyId, ref: property.ref || `BIEN-${Date.now()}`,
      nom: property.nom, type: property.type, adresse: property.adresse,
      quartier: property.quartier || 'Dakar', ville: property.ville || 'Dakar',
      proprietaire_id: property.proprietaireId, loyer_base: property.loyerBase,
      charges: property.charges || 0, tva_applicable: property.tvaApplicable || false,
      statut: property.statut || 'Vacant', superficie: property.superficie || 0,
      nombre_pieces: property.nombrePieces || 3, description: property.description || '',
    };
    const exists = property.id ? await recordExists('properties', property.id, agencyId) : false;
    if (exists) {
      const { data, error } = await supabase.from('properties').update(record).eq('id', property.id).eq('agency_id', agencyId).select().single();
      if (error) throw error;
      return { success: true, data: data as unknown as Property };
    } else {
      const { data, error } = await supabase.from('properties').insert([record]).select().single();
      if (error) throw error;
      return { success: true, data: data as unknown as Property };
    }
  } catch (err: any) {
    console.error('Erreur sauvegarde propriété:', err);
    return { success: false, error: err.message || 'Impossible d\'enregistrer le bien immobilier.' };
  }
}

// ============================================================
// CRUD : PROPRIÉTAIRES
// ============================================================
export async function saveOwnerToDb(owner: Partial<Owner>, agencyId: string): Promise<{ success: boolean; data?: Owner; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: true, data: owner as Owner };
  try {
    const record = {
      agency_id: agencyId, ref: owner.ref || `PRO-${Date.now()}`,
      nom: owner.nom, prenom: owner.prenom, telephone: owner.telephone,
      email: owner.email, adresse: owner.adresse || '',
      banque: owner.banque || 'CBAO Attijariwafa',
      compte_bancaire: owner.compteBancaire || '',
      mandat_gerance: owner.mandatGerance || `MANDAT-${Date.now()}`,
      taux_commission: owner.tauxCommission ?? 10,
      statut: owner.statut || 'Actif', observations: owner.observations || '',
    };
    const exists = owner.id ? await recordExists('owners', owner.id, agencyId) : false;
    if (exists) {
      const { data, error } = await supabase.from('owners').update(record).eq('id', owner.id).eq('agency_id', agencyId).select().single();
      if (error) throw error;
      return { success: true, data: data as unknown as Owner };
    } else {
      const { data, error } = await supabase.from('owners').insert([record]).select().single();
      if (error) throw error;
      return { success: true, data: data as unknown as Owner };
    }
  } catch (err: any) {
    console.error('Erreur sauvegarde propriétaire:', err);
    return { success: false, error: err.message || 'Impossible d\'enregistrer le propriétaire.' };
  }
}

// ============================================================
// CRUD : LOCATAIRES
// ============================================================
export async function saveTenantToDb(tenant: Partial<Tenant>, agencyId: string): Promise<{ success: boolean; data?: Tenant; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: true, data: tenant as Tenant };
  try {
    const record = {
      agency_id: agencyId, ref: tenant.ref || `LOC-${Date.now()}`,
      nom: tenant.nom, prenom: tenant.prenom, telephone: tenant.telephone,
      email: tenant.email, cni: tenant.cni || '', fonction: tenant.fonction || '',
      employeur: tenant.employeur || '', revenu_mensuel: tenant.revenuMensuel || 0,
      statut: tenant.statut || 'À jour', score_solvabilite: tenant.scoreSolvabilite || 85,
      bien_id: tenant.bienId || null, proprietaire_id: tenant.proprietaireId || null,
      date_entree: tenant.dateEntree || new Date().toISOString().split('T')[0],
      date_sortie: tenant.dateSortie || null,
      loyer_mensuel: tenant.loyerMensuel || 0,
      arrieres_cumules: tenant.arrieresCumules || 0,
      jours_retard: tenant.joursRetard || 0, observations: tenant.observations || '',
    };
    const exists = tenant.id ? await recordExists('tenants', tenant.id, agencyId) : false;
    if (exists) {
      const { data, error } = await supabase.from('tenants').update(record).eq('id', tenant.id).eq('agency_id', agencyId).select().single();
      if (error) throw error;
      return { success: true, data: data as unknown as Tenant };
    } else {
      const { data, error } = await supabase.from('tenants').insert([record]).select().single();
      if (error) throw error;
      return { success: true, data: data as unknown as Tenant };
    }
  } catch (err: any) {
    console.error('Erreur sauvegarde locataire:', err);
    return { success: false, error: err.message || 'Impossible d\'enregistrer le locataire.' };
  }
}

// ============================================================
// CRUD : CONTRATS
// ============================================================
export async function saveContractToDb(contract: Partial<LeaseContract>, agencyId: string): Promise<{ success: boolean; data?: LeaseContract; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: true, data: contract as LeaseContract };
  try {
    const record = {
      agency_id: agencyId, ref: contract.ref || `BAIL-${Date.now()}`,
      type_contrat: contract.typeContrat || 'Habitation',
      locataire_id: contract.locataireId, bien_id: contract.bienId,
      proprietaire_id: contract.proprietaireId, loyer_base: contract.loyerBase,
      charges: contract.charges || 0, caution_loyer: contract.cautionLoyer || 0,
      caution_eau: contract.cautionEau || 0, caution_electricite: contract.cautionElectricite || 0,
      frais_adhesion: contract.fraisAdhesion || 0, date_debut: contract.dateDebut,
      date_fin: contract.dateFin, type_reglement: contract.typeReglement || 'Mensuel',
      jour_echeance: 5, statut: contract.statut || 'En cours',
    };
    const exists = contract.id ? await recordExists('contracts', contract.id, agencyId) : false;
    if (exists) {
      const { data, error } = await supabase.from('contracts').update(record).eq('id', contract.id).eq('agency_id', agencyId).select().single();
      if (error) throw error;
      return { success: true, data: data as unknown as LeaseContract };
    } else {
      const { data, error } = await supabase.from('contracts').insert([record]).select().single();
      if (error) throw error;
      return { success: true, data: data as unknown as LeaseContract };
    }
  } catch (err: any) {
    console.error('Erreur sauvegarde contrat:', err);
    return { success: false, error: err.message || 'Impossible d\'enregistrer le contrat.' };
  }
}

// ============================================================
// CRUD : PAIEMENTS
// ============================================================
export async function savePaymentToDb(payment: Partial<Payment>, agencyId: string, authorId?: string): Promise<{ success: boolean; data?: Payment; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: true, data: payment as Payment };
  try {
    const record = {
      agency_id: agencyId, ref: payment.ref || `PAY-${Date.now()}`,
      quittance_numero: payment.quittanceNumero || `QUI-${Date.now()}`,
      locataire_id: payment.locataireId, bien_id: payment.bienId,
      proprietaire_id: payment.proprietaireId, periode: payment.periode,
      loyer_base: payment.loyerBase, charges: payment.charges || 0,
      tva: payment.tva || 0, tom: payment.tom || 0, penalites: payment.penalites || 0,
      montant_total: payment.montantTotal, montant_paye: payment.montantPaye,
      montant_restant: payment.montantRestant || 0, statut: payment.statut || 'Payé',
      mode_paiement: payment.modePaiement,
      moyen_paiement_code: payment.moyenPaiementCode || 'ESPECES',
      verification_statut: payment.verificationStatut || 'valide',
      reference_transaction: payment.referenceTransaction || null,
      proof_url: payment.justificatifUrl || null,
      date_paiement: payment.datePaiement || new Date().toISOString().split('T')[0],
      date_echeance: payment.dateEcheance || new Date().toISOString().split('T')[0],
      recu_par: payment.recuPar || 'Service Gérance',
      caissier_id: authorId || null, observation: payment.observation || '',
      // ⬇️ NOUVEAU : Gestion Reçu / Quittance de Solde
      type_recu: payment.typeRecu || 'QUITTANCE',
      reference_paiement_initial: payment.referencePaiementInitial || null,
      montant_initial_du: payment.montantInitialDu || 0,
    };
    const exists = payment.id ? await recordExists('payments', payment.id, agencyId) : false;
    if (exists) {
      const { data, error } = await supabase.from('payments').update(record).eq('id', payment.id).eq('agency_id', agencyId).select().single();
      if (error) throw error;
      return { success: true, data: data as unknown as Payment };
    } else {
      const { data, error } = await supabase.from('payments').insert([record]).select().single();
      if (error) throw error;
      return { success: true, data: data as unknown as Payment };
    }
  } catch (err: any) {
    console.error('Erreur enregistrement paiement:', err);
    return { success: false, error: err.message || 'Impossible d\'enregistrer le paiement.' };
  }
}

export async function validatePendingPaymentInDb(paymentId: string, agencyId: string, validatedBy: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: true };
  try {
    const { error } = await supabase.from('payments').update({
      statut: 'Payé', verification_statut: 'valide', validated_by: validatedBy,
      updated_at: new Date().toISOString(),
    }).eq('id', paymentId).eq('agency_id', agencyId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) { console.error('Erreur validation paiement:', err); return { success: false, error: err.message }; }
}

export async function rejectPendingPaymentInDb(paymentId: string, agencyId: string, motif?: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: true };
  try {
    const { error } = await supabase.from('payments').update({
      statut: 'Impayé', verification_statut: 'rejete',
      observation: motif || 'Paiement rejeté par le responsable de caisse',
      updated_at: new Date().toISOString(),
    }).eq('id', paymentId).eq('agency_id', agencyId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) { console.error('Erreur rejet paiement:', err); return { success: false, error: err.message }; }
}

// ============================================================
// CRUD : CAISSE
// ============================================================
export async function saveCashMovementToDb(movement: Partial<CashMovement>, agencyId: string, authorId?: string): Promise<{ success: boolean; data?: CashMovement; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: true, data: movement as CashMovement };
  try {
    const record = {
      agency_id: agencyId,
      reference: movement.id?.startsWith('csh-') ? movement.id : `CSH-${Date.now()}`,
      type: movement.type, montant: movement.montant,
      description: movement.libelle || movement.motif || 'Mouvement de caisse',
      moyen_paiement_code: movement.moyenPaiementCode || 'ESPECES',
      user_id: authorId || null, user_nom: movement.auteurNom || 'Caissier',
      beneficiaire: movement.beneficiaire || null,
      justificatif_ref: movement.justificatifRef || null, statut: 'Validé',
    };
    const { data, error } = await supabase.from('cash_movements').insert([record]).select().single();
    if (error) throw error;
    return { success: true, data: data as unknown as CashMovement };
  } catch (err: any) { console.error('Erreur enregistrement mouvement caisse:', err); return { success: false, error: err.message }; }
}

export async function saveCashClosingToDb(closing: Partial<CashClosing>, agencyId: string, caissierId: string, caissierNom: string): Promise<{ success: boolean; data?: CashClosing; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: true, data: closing as CashClosing };
  try {
    const record = {
      agency_id: agencyId, reference: `CLO-${Date.now()}`,
      date_cloture: closing.dateCloture || new Date().toISOString().split('T')[0],
      caissier_id: caissierId, caissier_nom: caissierNom,
      solde_initial: closing.soldeInitial || 0,
      total_entrees_especes: closing.totalEntreesEspeces || 0,
      total_sorties_especes: closing.totalSortiesEspeces || 0,
      solde_theorique: closing.soldeTheorique || 0,
      solde_reel: closing.soldeReel || 0, ecart: closing.ecart || 0,
      details_comptage: closing.detailsComptage || {},
      observations: closing.observations || '',
      statut: closing.statut || 'Validé par Responsable',
    };
    const { data, error } = await supabase.from('cash_closings').insert([record]).select().single();
    if (error) throw error;
    return { success: true, data: data as unknown as CashClosing };
  } catch (err: any) { console.error('Erreur enregistrement clôture:', err); return { success: false, error: err.message }; }
}

// ============================================================
// CRUD : MAINTENANCE
// ============================================================
export async function saveMaintenanceToDb(ticket: Partial<MaintenanceTicket>, agencyId: string): Promise<{ success: boolean; data?: MaintenanceTicket; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: true, data: ticket as MaintenanceTicket };
  try {
    const record: any = {
      agency_id: agencyId, bien_id: ticket.bienId, bien_nom: ticket.bienNom,
      proprietaire_id: ticket.proprietaireId || null, proprietaire_nom: ticket.proprietaireNom || null,
      locataire_id: ticket.locataireId || null, locataire_nom: ticket.locataireNom || '',
      titre: ticket.titre || 'Signalement incident', description: ticket.description || '',
      priorite: ticket.priorite || 'Moyenne', statut: ticket.statut || 'Signalé',
      statut_reglement: ticket.statutReglement || 'Non réglé',
      mode_reglement: ticket.modeReglement || null,
      date_reglement: ticket.dateReglement || null,
      facture_artisan_ref: ticket.factureArtisanRef || null,
      regle_par_caisse: ticket.regleParCaisse || false,
      caisse_mouvement_id: ticket.caisseMouvementId || null,
      observations_reglement: ticket.observationsReglement || null,
      imputable_a: ticket.imputableA || 'Propriétaire',
      cout_estime: ticket.coutEstime || 0, cout_reel: ticket.coutReel || 0,
      date_signalement: ticket.dateSignalement || new Date().toISOString().split('T')[0],
      date_intervention: ticket.dateIntervention || null,
      date_resolution: ticket.dateResolution || null,
      prestataire: ticket.prestataire || null,
      artisan_nom: ticket.artisanNom || null,
      updated_at: new Date().toISOString(),
    };
    if (ticket.ref) record.ref = ticket.ref;
    const exists = ticket.id ? await recordExists('maintenance_tickets', ticket.id, agencyId) : false;
    if (exists) {
      const { data, error } = await supabase.from('maintenance_tickets').update(record).eq('id', ticket.id).select().single();
      if (error) throw error;
      return { success: true, data: mapMaintenanceFromDb(data) };
    } else {
      if (!record.ref) record.ref = `TRV-${Date.now().toString().slice(-6)}`;
      const { data, error } = await supabase.from('maintenance_tickets').insert([record]).select().single();
      if (error) throw error;
      return { success: true, data: mapMaintenanceFromDb(data) };
    }
  } catch (err: any) { console.warn('Sync ticket:', err); return { success: false, error: err.message }; }
}

// ============================================================
// CRUD : INSPECTIONS
// ============================================================
export async function saveInspectionToDb(insp: Partial<Inspection>, agencyId: string): Promise<{ success: boolean; data?: Inspection; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: true, data: insp as Inspection };
  try {
    const record = {
      agency_id: agencyId, ref: insp.ref || `EDL-${Date.now()}`,
      bien_id: insp.bienId, locataire_id: insp.locataireId,
      type: insp.type || 'Entrée',
      date_inspection: insp.date || new Date().toISOString().split('T')[0],
      clefs_remises: 3,
      agent_nom: insp.agentNom || insp.inspecteurNom || 'Agent FITAL-IMMO',
      elements: insp.elements || [], total_degats: insp.coutDegradations || 0,
      retenue_caution: insp.retenueCaution || 0,
      montant_restitue_caution: insp.montantRestitueCaution || 0,
      statut: insp.statut || 'Validé',
      commentaires_generaux: insp.commentairesGeneraux || insp.remarques || '',
    };
    const exists = insp.id ? await recordExists('property_inspections', insp.id, agencyId) : false;
    if (exists) {
      const { data, error } = await supabase.from('property_inspections').update(record).eq('id', insp.id).select().single();
      if (error) throw error;
      return { success: true, data: mapInspectionFromDb(data) };
    } else {
      const { data, error } = await supabase.from('property_inspections').insert([record]).select().single();
      if (error) throw error;
      return { success: true, data: mapInspectionFromDb(data) };
    }
  } catch (err: any) { console.warn('Sync inspection:', err); return { success: false, error: err.message }; }
}

// ============================================================
// CRUD : REVERSEMENTS
// ============================================================
export async function saveDisbursementToDb(disb: Partial<OwnerDisbursement>, agencyId: string): Promise<{ success: boolean; data?: OwnerDisbursement; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: true, data: disb as OwnerDisbursement };
  try {
    const record = {
      agency_id: agencyId, ref: disb.ref || `REV-${Date.now()}`,
      proprietaire_id: disb.proprietaireId, periode: disb.periode || 'Ce mois',
      loyers_bruts_recouvres: disb.loyersBruts || disb.montantBrut || 0,
      taux_commission: disb.tauxCommission || 10,
      montant_commission: disb.commissionAgence || 0,
      tva_commission: disb.retenueTVA || disb.tvaCommission || 0,
      charges_deduites: disb.depensesDeduites || 0,
      net_a_reverser: disb.montantNetPaye || disb.montantNet || 0,
      mode_reglement: disb.modeReglement || disb.modeReversement || 'Virement',
      date_versement: disb.dateReglement || disb.dateReversement || new Date().toISOString().split('T')[0],
      statut: disb.statut || 'Effectué',
    };
    const exists = disb.id ? await recordExists('disbursements', disb.id, agencyId) : false;
    if (exists) {
      const { data, error } = await supabase.from('disbursements').update(record).eq('id', disb.id).eq('agency_id', agencyId).select().single();
      if (error) throw error;
      return { success: true, data: mapDisbursementFromDb(data) };
    } else {
      const { data, error } = await supabase.from('disbursements').insert([record]).select().single();
      if (error) throw error;
      return { success: true, data: mapDisbursementFromDb(data) };
    }
  } catch (err: any) { console.warn('Sync reversement:', err); return { success: false, error: err.message }; }
}

// ============================================================
// CRUD : FACTURES
// ============================================================
export async function saveInvoiceToDb(inv: Partial<Invoice>, agencyId: string): Promise<{ success: boolean; data?: Invoice; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: true, data: inv as Invoice };
  try {
    const record = {
      agency_id: agencyId, ref: inv.ref || inv.numero || `FAC-${Date.now()}`,
      type: inv.type || 'Frais de dossier',
      proprietaire_id: inv.proprietaireId || null,
      locataire_id: inv.locataireId || null,
      bien_id: inv.bienId || null,
      date_facture: inv.dateFacture || new Date().toISOString().split('T')[0],
      date_echeance: inv.dateEcheance || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      sous_total: inv.sousTotal || inv.montantTotal || 0,
      taxes: inv.taxes || 0, total: inv.total || inv.montantTotal || 0,
      statut: inv.statut || 'Émise', lignes: inv.lignes || [],
    };
    const exists = inv.id ? await recordExists('invoices', inv.id, agencyId) : false;
    if (exists) {
      const { data, error } = await supabase.from('invoices').update(record).eq('id', inv.id).select().single();
      if (error) throw error;
      return { success: true, data: mapInvoiceFromDb(data) };
    } else {
      const { data, error } = await supabase.from('invoices').insert([record]).select().single();
      if (error) throw error;
      return { success: true, data: mapInvoiceFromDb(data) };
    }
  } catch (err: any) { console.warn('Sync facture:', err); return { success: false, error: err.message }; }
}

// ============================================================
// CRUD : RELANCES
// ============================================================
export async function saveReminderToDb(rem: Partial<TenantReminder>, agencyId: string): Promise<{ success: boolean; data?: TenantReminder; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: true, data: rem as TenantReminder };
  try {
    const record = {
      agency_id: agencyId, locataire_id: rem.locataireId,
      locataire_nom: rem.locataireNom, telephone: rem.telephone,
      montant_du: rem.montantDu, jours_retard: rem.joursRetard,
      date_envoi: rem.dateEnvoi, canal: rem.canal,
      niveau: rem.niveau || 'Niveau 1', message: rem.message,
      statut: rem.statut,
    };
    const { data, error } = await supabase.from('tenant_reminders').insert([record]).select().single();
    if (error) throw error;
    return { success: true, data: mapReminderFromDb(data) };
  } catch (err: any) { console.warn('Sync relance:', err); return { success: false, error: err.message }; }
}

// ============================================================
// CRUD : PARAMÈTRES
// ============================================================
export async function saveSettingsToDb(settings: AgencySettings, agencyId?: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase || !agencyId) return { success: true };
  try {
    const record = {
      agency_id: agencyId,
      nom_agence: settings.nomAgence,
      slogan: settings.slogan,
      telephone: settings.telephone,
      email: settings.email,
      adresse: settings.adresse,
      ville: settings.ville,
      pays: settings.pays,
      ninea: settings.ninea,
      devise: settings.devise,
      taux_gerance_defaut: settings.tauxGeranceDefaut,
      penalite_defaut: settings.penaliteDefaut,
      tva_taux: settings.tvaTaux,
      prefix_facture: settings.prefixFacture,
      prefix_quittance: settings.prefixQuittance,
      prefix_paiement: settings.prefixPaiement,
      prefix_contrat: settings.prefixContrat,
      prefix_bon_caisse: settings.prefixBonCaisse,
      wave_numero: settings.waveNumero || null,
      orange_money_code: settings.orangeMoneyCode || null,
      whatsapp_business: settings.whatsappBusiness || null,
      standard_telephone: settings.standardTelephone || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('agency_settings').upsert(record, { onConflict: 'agency_id' });
    if (error) throw error;
    return { success: true };
  } catch (err: any) { console.warn('Sync parametres:', err); return { success: false, error: err.message }; }
}

export async function savePaymentMethodToDb(method: PaymentMethodConfig, agencyId?: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: true };
  try {
    const { error } = await supabase.from('payment_methods_config').upsert({ agency_id: agencyId || null, ...method });
    if (error) throw error;
    return { success: true };
  } catch (err: any) { console.warn('Sync moyen paiement:', err); return { success: false, error: err.message }; }
}

export async function saveUserToDb(user: UserAccount, agencyId?: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: true };
  if (!user.id || user.id.startsWith('user-') || user.id.startsWith('usr-')) {
    return { success: false, error: 'Compte local uniquement.' };
  }
  try {
    const { error } = await supabase.from('profiles').upsert({
      id: user.id, agency_id: agencyId || user.agencyId || null,
      email: user.email, nom: user.nom, prenom: user.prenom,
      telephone: user.telephone, role: user.role, statut: user.statut,
      permissions: user.permissions, avatar_url: user.avatar,
      proprietaire_id: user.proprietaireId || null,
      locataire_id: user.locataireId || null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return { success: true };
  } catch (err: any) { console.warn('Sync profil:', err); return { success: false, error: err.message }; }
}

// ============================================================
// STORAGE
// ============================================================
export async function uploadFileToSupabaseStorage(
  bucket: 'agency-logos' | 'property-images' | 'documents' | 'payment-proofs' | 'avatars',
  filePath: string, file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: false, error: 'Supabase Storage non configuré.' };
  try {
    const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, { cacheControl: '3600', upsert: true });
    if (error) throw error;
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return { success: true, url: publicUrlData.publicUrl };
  } catch (err: any) { console.error('Erreur upload:', err); return { success: false, error: err.message }; }
}

// ============================================================
// AUTH / SESSION
// ============================================================
export async function changeUserPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: true };
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return { success: true };
  } catch (err: any) { console.error('Erreur changement mot de passe:', err); return { success: false, error: err.message }; }
}

export async function signOutSession(): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try { await supabase.auth.signOut(); } catch (err) { console.error('Erreur signOut:', err); }
  }
  localStorage.removeItem('fital_immo_session');
  localStorage.removeItem('fital_immo_user');
}

export async function getAuthSession() {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) { console.warn('Erreur getSession:', error); return null; }
    return data.session;
  } catch (err) { console.warn('Erreur verification session:', err); return null; }
}

export async function softDeleteRecord(
  table: 'properties' | 'owners' | 'tenants' | 'contracts' | 'invoices', id: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: true };
  try {
    const { error } = await supabase.from(table).update({ statut: 'Archivé' }).eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) { console.error(`Erreur archivage ${table}:`, err); return { success: false, error: err.message }; }
}

// ============================================================
// AGENCES
// ============================================================
export async function getOrCreateDefaultAgency(): Promise<Agency | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data: existing, error: fetchError } = await supabase.from('agencies').select('*').eq('slug', 'fital-immo').maybeSingle();
    if (fetchError && fetchError.code !== 'PGRST116') console.warn('Erreur lecture agence:', fetchError);
    if (existing) { persistCollection('agency', existing as unknown as Agency); return existing as unknown as Agency; }
    const { data: created, error: insertError } = await supabase.from('agencies').insert([{
      name: defaultSettings.nomAgence, slug: 'fital-immo',
      email: defaultSettings.email, phone: defaultSettings.telephone,
      address: defaultSettings.adresse, city: defaultSettings.ville,
      country: defaultSettings.pays, ninea: defaultSettings.ninea, status: 'active',
    }]).select().single();
    if (insertError) {
      const { data: retry } = await supabase.from('agencies').select('*').limit(1).maybeSingle();
      if (retry) { persistCollection('agency', retry as unknown as Agency); return retry as unknown as Agency; }
      console.warn('Impossible de créer l\'agence:', insertError); return null;
    }
    persistCollection('agency', created as unknown as Agency);
    return created as unknown as Agency;
  } catch (err) { console.error('getOrCreateDefaultAgency:', err); return null; }
}

export async function bootstrapAdminProfile(
  authUserId: string, email: string,
  overrides?: Partial<Pick<UserAccount, 'nom' | 'prenom' | 'telephone' | 'role'>>
): Promise<UserAccount | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const agency = await getOrCreateDefaultAgency();
  if (!agency) return null;
  const profileRecord = {
    id: authUserId, agency_id: agency.id, email: email.trim().toLowerCase(),
    nom: overrides?.nom || 'ADMINISTRATEUR', prenom: overrides?.prenom || 'FITAL',
    telephone: overrides?.telephone || defaultSettings.telephone,
    role: (overrides?.role || 'ADMIN') as UserRole,
    statut: 'actif' as const, permissions: ['*'],
  };
  const { error } = await supabase.from('profiles').insert([profileRecord]);
  if (error) { console.warn('bootstrapAdminProfile:', error); return null; }
  return {
    id: authUserId, agencyId: agency.id, email: profileRecord.email,
    nom: profileRecord.nom, prenom: profileRecord.prenom,
    telephone: profileRecord.telephone, role: profileRecord.role,
    statut: 'actif', permissions: ['*'], organisation: agency.name,
    createdAt: new Date().toISOString(), derniereConnexion: 'À l\'instant',
  };
}

// ============================================================
// CRÉATION DE COMPTE UTILISATEUR
// ============================================================
export interface CreateUserAccountParams {
  email: string; password: string; nom: string; prenom: string;
  telephone: string; role: UserRole; agencyId: string;
  permissions?: string[]; proprietaireId?: string; locataireId?: string;
  organisation?: string; avatar?: string;
}

export async function createUserAccountInSupabase(
  params: CreateUserAccountParams
): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  if (!isSupabaseConfigured || !supabase || !supabaseUrl || !supabaseAnonKey) {
    return { success: false, error: 'Supabase n\'est pas configuré.' };
  }
  const cleanEmail = params.email.trim().toLowerCase();
  const ephemeralClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  try {
    const { data: signUpData, error: signUpError } = await ephemeralClient.auth.signUp({
      email: cleanEmail, password: params.password,
      options: { data: { nom: params.nom, prenom: params.prenom, role: params.role } },
    });
    if (signUpError) {
      if (signUpError.message?.toLowerCase().includes('already registered')) {
        return { success: false, error: 'Cet email est déjà enregistré dans Supabase Auth.' };
      }
      return { success: false, error: signUpError.message };
    }
    const authUser = signUpData.user;
    if (!authUser?.id) return { success: false, error: 'Compte Auth créé mais confirmation email requise.' };
    const { error: profileError } = await supabase.from('profiles').insert([{
      id: authUser.id, agency_id: params.agencyId, email: cleanEmail,
      nom: params.nom.toUpperCase(), prenom: params.prenom,
      telephone: params.telephone, role: params.role, statut: 'actif',
      permissions: params.permissions || [],
      proprietaire_id: params.proprietaireId || null,
      locataire_id: params.locataireId || null,
      avatar_url: params.avatar || null,
    }]);
    if (profileError) return { success: false, error: `Compte Auth créé mais profil refusé : ${profileError.message}.` };
    const userAccount: UserAccount = {
      id: authUser.id, agencyId: params.agencyId, email: cleanEmail,
      nom: params.nom.toUpperCase(), prenom: params.prenom,
      telephone: params.telephone, role: params.role, statut: 'actif',
      permissions: params.permissions || [],
      proprietaireId: params.proprietaireId, locataireId: params.locataireId,
      organisation: params.organisation || defaultSettings.nomAgence,
      avatar: params.avatar, createdAt: new Date().toISOString(),
      derniereConnexion: 'Jamais connecté',
    };
    return { success: true, user: userAccount };
  } catch (err: any) {
    console.error('createUserAccountInSupabase:', err);
    return { success: false, error: err?.message || 'Erreur inconnue.' };
  }
}

export async function fetchAgencyUsers(agencyId?: string): Promise<UserAccount[]> {
  if (!isSupabaseConfigured || !supabase || !agencyId) return [];
  try {
    const { data, error } = await supabase.from('profiles').select('*, agencies(name)').eq('agency_id', agencyId).order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((p: any) => ({
      id: p.id, agencyId: p.agency_id, email: p.email,
      nom: p.nom, prenom: p.prenom, telephone: p.telephone,
      role: p.role, statut: p.statut, permissions: p.permissions || [],
      avatar: p.avatar_url, proprietaireId: p.proprietaire_id, locataireId: p.locataire_id,
      derniereConnexion: p.derniere_connexion,
      organisation: p.agencies?.name || defaultSettings.nomAgence,
      createdAt: p.created_at, updatedAt: p.updated_at,
    }));
  } catch (err) { console.warn('fetchAgencyUsers:', err); return []; }
}