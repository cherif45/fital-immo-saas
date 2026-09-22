export type UserRole = 
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'CAISSIER'
  | 'GESTIONNAIRE'
  | 'PROPRIETAIRE'
  | 'LOCATAIRE'
  | 'AGENT';

export type UserAccountStatus = 'actif' | 'suspendu' | 'desactive';

export interface Agency {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  country?: string;
  ninea?: string;
  rcNumero?: string;
  logoUrl?: string;
  status: 'active' | 'suspended' | 'trial' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface RentDueDate {
  id: string;
  agencyId: string;
  contractId: string;
  locataireId: string;
  bienId: string;
  periode: string;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  remainingAmount: number;
  status: 'A_PAYER' | 'PARTIELLEMENT_PAYE' | 'PAYE' | 'EN_RETARD' | 'ANNULE';
  createdAt?: string;
  updatedAt?: string;
}

export interface UserAccount {
  id: string;
  agencyId?: string;
  email: string;
  password?: string;
  nom: string;
  prenom: string;
  telephone: string;
  role: UserRole;
  proprietaireId?: string; // If role === 'PROPRIETAIRE'
  locataireId?: string; // If role === 'LOCATAIRE'
  statut: UserAccountStatus;
  permissions: string[]; // Custom granular permissions
  avatar?: string;
  derniereConnexion?: string;
  organisation?: string;
  createdAt: string;
  updatedAt?: string;
}

export type PaymentMethodCode = 
  | 'ESPECES'
  | 'WAVE'
  | 'ORANGE_MONEY'
  | 'FREE_MONEY'
  | 'VIREMENT'
  | 'CHEQUE'
  | 'CARTE_BANCAIRE'
  | 'AUTRE';

export type PaymentMethodType = 'CASH' | 'MOBILE_MONEY' | 'BANK' | 'CARD' | 'OTHER';

export interface PaymentMethodConfig {
  id: string;
  nom?: string;
  libelle?: string;
  code: PaymentMethodCode;
  type?: PaymentMethodType;
  description: string;
  actif: boolean;
  parDefaut?: boolean;
  estParDefaut?: boolean;
  fraisPourcentage?: number;
  delaiValidationHeures?: number;
  numeroCompteOuTelephone?: string;
  banqueNom?: string;
  instructions?: string;
  config?: {
    numeroRecepteur?: string;
    nomCompte?: string;
    banque?: string;
    ribIban?: string;
    fraisPourcentage?: number;
    delaiValidationHeures?: number;
    instructions?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export type TransactionVerificationStatus = 'en_attente' | 'valide' | 'rejete' | 'confirme' | 'echoue' | 'annule';

export interface PaymentLineItem {
  id: string;
  moyenPaiementCode: PaymentMethodCode;
  moyenPaiementNom: string;
  montant: number;
  referenceTransaction?: string;
  numeroEmetteur?: string; // e.g. Wave / OM phone
  banque?: string;
  numeroCheque?: string;
  titulaireCheque?: string;
  justificatifUrl?: string;
  statut: TransactionVerificationStatus;
}

export type PropertyType = 
  | 'Appartement'
  | 'Villa'
  | 'Bureau'
  | 'Commerce'
  | 'Immeuble'
  | 'Studio'
  | 'Chambre'
  | 'Magasin'
  | 'Terrain';

export type PropertyStatus = 'Occupé' | 'Vacant' | 'Maintenance' | 'En litige';

export interface Property {
  id: string;
  ref: string;
  nom: string;
  type: PropertyType;
  adresse: string;
  quartier: string;
  ville: string;
  proprietaireId: string;
  proprietaireNom: string;
  tauxCommission: number; // e.g. 10 (%)
  loyerBase: number;
  charges: number;
  tvaApplicable: boolean;
  statut: PropertyStatus;
  superficie: number; // m²
  nombrePieces: number;
  pieces?: number;
  etage?: string;
  numeroPorte?: string;
  avatar: string;
  equipements: string[];
  description?: string;
  dateCreation: string;
  loyerTotal?: number;
  locataireActuelNom?: string;
}

export interface Owner {
  id: string;
  ref?: string;
  nom: string;
  prenom: string;
  adresse?: string;
  telephone: string;
  email: string;
  banque: string;
  compteBancaire: string;
  ninea?: string;
  tauxCommission: number; // e.g. 10%
  statut?: 'Actif' | 'Inactif';
  debutAffaires?: string;
  finAffaires?: string;
  mandatGerance: string;
  dateMandat?: string;
  observations?: string;
  totalBiens?: number;
  totalRevenusMensuels?: number;
  totalLoyersMensuels?: number;
}

export type TenantStatus = 'À jour' | 'Impayé' | 'Retard' | 'Archivé' | 'Résilié';

export interface Tenant {
  id: string;
  ref?: string;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  cni: string; // Carte Nationale d'Identité ou Passeport
  fonction?: string; // Profession
  profession?: string;
  employeur?: string;
  revenuMensuel?: number;
  raisonSociale?: string;
  conjointNom?: string;
  conjointProfession?: string;
  conjointTelephone?: string;
  statut: TenantStatus;
  scoreSolvabilite?: number; // 0-100
  solvabiliteScore?: number;
  bienId: string;
  bienNom: string;
  proprietaireId: string;
  dateEntree: string;
  dateSortie?: string;
  loyerMensuel: number;
  arrieresCumules: number;
  joursRetard: number;
  observations?: string;
}

export type RecoveryReminder = TenantReminder;

export interface LeaseContract {
  id: string;
  ref: string;
  typeContrat?: string;
  locataireId: string;
  locataireNom: string;
  bienId: string;
  bienNom: string;
  proprietaireId: string;
  proprietaireNom: string;
  loyerBase: number;
  loyerMensuel?: number;
  chargesDiverses?: number;
  charges?: number;
  tva: number; // Montant TVA
  tom: number; // Taxe d'ordures ménagères
  tlv: number; // Taxe sur les locaux
  loyerTTC?: number;
  cautionLoyer?: number;
  cautionMontant?: number;
  cautionMois?: number;
  cautionEau?: number;
  cautionElectricite?: number;
  avanceLoyer?: number;
  fraisAdhesion?: number;
  dateDebut: string;
  dateFin: string;
  typeReglement?: 'Mensuel' | 'Trimestriel' | 'Semestriel' | 'Annuel';
  statut: 'En cours' | 'À renouveler' | 'Résilié' | 'Expiré' | string;
  clausePenalitePourcentage?: number;
  dateSignature?: string;
}

export type PaymentMethod = 'Virement' | 'Mobile Money' | 'Espèces' | 'Chèque';
export type PaymentStatus = 'Payé' | 'Partiel' | 'Impayé' | 'En attente';

export type CashMovementType = 'ENTREE' | 'SORTIE' | 'ENCAISSEMENT' | 'DECAISSEMENT';

export interface CashMovement {
  id: string;
  reference?: string;
  ref?: string;
  type: CashMovementType;
  montant: number;
  description?: string;
  libelle?: string;
  motif?: string;
  categorie?: string;
  moyenPaiementCode: PaymentMethodCode;
  moyenPaiementNom?: string;
  paiementId?: string;
  userId?: string;
  userNom?: string;
  auteurId?: string;
  auteurNom?: string;
  caissierNom?: string;
  beneficiaire?: string;
  beneficiaireOuPayeur?: string;
  dateOperation?: string;
  dateHeure?: string;
  statut?: 'Validé' | 'Annulé' | string;
  justificatifRef?: string;
  createdAt?: string;
}

export interface CashClosing {
  id: string;
  reference?: string; // e.g. CLO-2026-05-31
  numero?: string;
  date?: string;
  dateCloture?: string;
  heureCloture?: string;
  caissierId: string;
  caissierNom: string;
  soldeInitial: number;
  totalEntreesEspeces: number;
  totalSortiesEspeces: number;
  soldeTheorique: number;
  soldeReel?: number;
  soldeReelCompte?: number;
  ecart?: number; // soldeReel - soldeTheorique (negatif = manquant, positif = surplus)
  ecartCaisse?: number;
  detailsComptage?: {
    billets10000: number;
    billets5000: number;
    billets2000: number;
    billets1000: number;
    billets500: number;
    pieces: number;
  };
  observations?: string;
  observation?: string;
  statut: 'Clôturé' | 'Validé par Responsable' | 'Brouillon' | 'CONFORME' | 'SURPLUS' | 'DEFICIT' | string;
  createdAt?: string;
}

export interface Payment {
  id: string;
  ref: string;
  quittanceNumero: string;
  locataireId: string;
  locataireNom: string;
  bienId: string;
  bienNom: string;
  proprietaireId: string;
  proprietaireNom: string;
  periode: string; // e.g. "Mai 2026"
  loyerBase: number;
  charges: number;
  tva: number;
  tom: number;
  penalites: number;
  indemnitesOccupation?: number;
  montantTotal: number;
  montantPaye: number;
  montantRestant: number;
  statut: PaymentStatus;
  modePaiement: PaymentMethod;
  moyenPaiementCode?: PaymentMethodCode;
  moyenPaiementId?: string;
  lignesPaiement?: PaymentLineItem[]; // Multi-payment support
  verificationStatut?: TransactionVerificationStatus;
  referenceTransaction?: string;
  transactionReference?: string;
  numeroTransaction?: string;
  justificatifUrl?: string;
  numeroTelephoneEmetteur?: string;
  banqueEmettrice?: string;
  motifRejet?: string;
  dateValidation?: string;
  valideParId?: string;
  valideParNom?: string;
  datePaiement: string;
  dateEcheance?: string;
  recuPar?: string;
  caissierId?: string;
  observation?: string;
  auteurId?: string;
  auteurNom?: string;
  dateHeurePaiement?: string;
}

export type ReminderLevel = 
  | 'Niveau 1: Courtois (J+3)'
  | 'Niveau 2: Modéré (J+10)'
  | 'Niveau 3: Ferme & Pénalités (J+15)'
  | 'Niveau 4: Mise en demeure juridique (J+25)';

export type ReminderChannel = 'WhatsApp' | 'SMS' | 'Email' | 'Courrier LRAR';

export interface TenantReminder {
  id: string;
  locataireId: string;
  locataireNom: string;
  telephone: string;
  email: string;
  bienNom: string;
  montantDu: number;
  penalites: number;
  joursRetard: number;
  typeRelance?: string;
  niveau: ReminderLevel;
  canal: ReminderChannel;
  message: string;
  statut: 'Envoyé' | 'En attente' | 'Brouillon';
  dateCreation: string;
  dateEnvoi?: string;
}

export interface InspectionItem {
  id?: string;
  composant?: string;
  nom?: string;
  etatEntree?: 'Très bon' | 'Bon' | 'Moyen' | 'Dégradé' | string;
  etatSortie?: 'Très bon' | 'Bon' | 'Moyen' | 'Dégradé' | string;
  etat?: string;
  coutReparationEstime?: number;
  observations?: string;
  commentaire?: string;
}

export interface PropertyInspection {
  id: string;
  ref?: string;
  bienId: string;
  bienNom: string;
  locataireId: string;
  locataireNom: string;
  type: 'Entrée' | 'Sortie' | string;
  date: string;
  dateInspection?: string;
  clefsRemises?: number;
  agentNom?: string;
  inspecteurNom?: string;
  etatGeneral?: string;
  remarques?: string;
  signe?: boolean;
  composants?: InspectionItem[];
  elements?: {
    nom: string;
    etat: string;
    commentaire: string;
    coutReparationEstime: number;
  }[];
  totalDegats?: number;
  coutDegradations?: number;
  retenueCaution?: number;
  montantRestitueCaution?: number;
  statut: 'Validé' | 'Signé' | 'Brouillon' | string;
  commentairesGeneraux?: string;
}

export type Inspection = PropertyInspection;

export interface OwnerDisbursement {
  id: string;
  ref: string;
  natureCharge?: string;
  montant?: number;
  loyersBruts?: number;
  depensesDeduites?: number;
  retenueTVA?: number;
  montantNetPaye?: number;
  modeReglement?: string;
  dateReglement?: string;
  referenceVirement?: string;
  date?: string;
  modePaiement?: PaymentMethod;
  periode: string;
  immeubleId?: string;
  immeubleNom?: string;
  proprietaireId: string;
  proprietaireNom: string;
  justificatifRef?: string;
  observation?: string;
  dateReversement?: string;
  montantBrut?: number;
  commissionAgence?: number;
  tvaCommission?: number;
  montantNet?: number;
  modeReversement?: string;
  statut?: string;
}

export interface OwnerPaymentSlip {
  id: string;
  numero: string;
  proprietaireId: string;
  proprietaireNom: string;
  periode: string;
  loyersBrutsRecouvres: number;
  tauxCommission: number;
  montantCommission: number;
  tvaCommission: number;
  chargesDeduites: number;
  netAReverser: number;
  modeReglement: PaymentMethod;
  dateVersement: string;
  statut: 'Versé' | 'En attente' | 'Brouillon';
  detailsBiens: {
    bienNom: string;
    locataireNom: string;
    loyerRecouvre: number;
    commission: number;
  }[];
}

export type MaintenanceStatus = 'Signalé' | 'En cours' | 'Planifié' | 'Terminé' | 'Traité et Réglé' | 'Annulé' | 'En attente';
export type MaintenanceImputation = 'Propriétaire' | 'Locataire' | 'Agence';
export type MaintenancePaymentStatus = 'Non réglé' | 'Réglé' | 'Déduit loyer' | 'Facturé locataire' | 'En attente facture';

export interface MaintenanceTicket {
  id: string;
  ref?: string;
  titre: string;
  bienId: string;
  bienNom: string;
  proprietaireId?: string;
  proprietaireNom?: string;
  locataireId?: string;
  locataireNom: string;
  priorite: 'Basse' | 'Moyenne' | 'Haute' | 'Urgente' | 'Faible';
  coutEstime: number;
  coutReel?: number;
  dateResolution?: string;
  technicienNom?: string;
  artisanNom?: string;
  prestataire?: string;
  imputableA?: MaintenanceImputation | string;
  dateSignalement: string;
  dateIntervention?: string;
  statut: MaintenanceStatus;
  statutReglement?: MaintenancePaymentStatus;
  modeReglement?: PaymentMethod | string;
  dateReglement?: string;
  factureArtisanRef?: string;
  regleParCaisse?: boolean;
  caisseMouvementId?: string;
  observationsReglement?: string;
  description: string;
}

export interface InvoiceLine {
  id: string;
  description: string;
  quantite: number;
  prixUnitaire: number;
  montant: number;
}

export interface Invoice {
  id: string;
  ref: string;
  numero?: string;
  periode?: string;
  montantTotal?: number;
  dateEmission?: string;
  type: 'Adhésion' | 'Travaux' | 'Frais de dossier' | 'Autre';
  proprietaireId?: string;
  proprietaireNom?: string;
  locataireId?: string;
  locataireNom?: string;
  bienId?: string;
  bienNom?: string;
  travauxId?: string;
  dateFacture: string;
  dateEcheance: string;
  sousTotal: number;
  taxes: number;
  total: number;
  statut: 'Émise' | 'Payée' | 'Brouillon' | 'Annulée';
  lignes: InvoiceLine[];
  notes?: string;
}

export interface CashVoucher {
  id: string;
  numero: string; // e.g. BCA-2026-0001
  proprietaireId: string;
  proprietaireNom: string;
  periode: string;
  loyersEncaisses: number;
  commissions: number;
  travaux: number;
  depenses: number;
  montantNet: number;
  montantEnLettres: string;
  modeReversement: PaymentMethod;
  dateEmission: string;
  statut: 'Émis' | 'Payé' | 'Annulé';
  observation?: string;
}

export interface NotificationItem {
  id: string | number;
  type: 'loyer_retard' | 'contrat_expiration' | 'bien_vacant' | 'travaux_urgent' | 'reversement' | 'PAIEMENT' | string;
  titre: string;
  message: string;
  date: string;
  lu: boolean;
  actionUrl?: ActiveTab;
}

export interface AuditLog {
  id: string;
  userNom?: string;
  action: string;
  module?: string;
  entityType?: string;
  entityRef?: string;
  details: string;
  date?: string;
  entite?: string;
  entiteId?: string;
  utilisateur?: string;
  createdAt?: string;
}

export interface AgencySettings {
  nomAgence: string;
  slogan: string;
  telephone: string;
  email: string;
  adresse: string;
  ville: string;
  pays: string;
  ninea: string;
  devise: string;
  tauxGeranceDefaut: number;
  penaliteDefaut: number;
  tvaTaux: number;
  prefixFacture: string;
  prefixQuittance: string;
  prefixPaiement: string;
  prefixContrat: string;
  prefixBonCaisse: string;
  // ⬇️ NOUVEAUX CHAMPS pour Mobile Money & Télécoms
  waveNumero?: string;
  orangeMoneyCode?: string;
  whatsappBusiness?: string;
  standardTelephone?: string;
}

export type ActiveTab = 
  | 'dashboard'
  | 'admin-control'
  | 'admin-journal'
  | 'users'
  | 'admin-users'
  | 'caisse'
  | 'pending-payments'
  | 'payment-methods'
  | 'payment-reports'
  | 'recovery'
  | 'reminders'
  | 'payments'
  | 'tenants'
  | 'properties'
  | 'owners'
  | 'contracts'
  | 'inspections'
  | 'finance'
  | 'invoices'
  | 'maintenance'
  | 'reports'
  | 'documents'
  | 'my-properties'
  | 'my-tenants'
  | 'my-rents'
  | 'my-disbursements'
  | 'my-works'
  | 'my-lease'
  | 'my-payments'
  | 'my-receipts'
  | 'my-dues'
export interface AgencyCommunication {
  id: string;
  agencyId?: string;
  destinataireType: 'Locataire' | 'Propriétaire' | 'Artisan' | 'Utilisateur' | 'Autre';
  destinataireId?: string;
  destinataireNom: string;
  telephone?: string;
  email?: string;
  canal: 'WhatsApp' | 'SMS' | 'Email' | 'Appel';
  objet: string;
  message: string;
  referenceDocument?: string;
  statut: 'Envoyé' | 'Délivré' | 'Consigné';
  auteurNom?: string;
  auteurId?: string;
  dateEnvoi: string;
  createdAt?: string;
}
