// ============================================================
// TYPES GLOBAUX — FITAL-IMMO
// ============================================================

export type UserRole = 
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'CAISSIER'
  | 'GESTIONNAIRE'
  | 'PROPRIETAIRE'
  | 'LOCATAIRE'
  | 'AGENT';

export type UserAccountStatus = 'actif' | 'suspendu' | 'desactive';

export interface UserAccount {
  id: string;
  agencyId: string;
  email: string;
  nom: string;
  prenom: string;
  telephone: string;
  role: UserRole;
  statut: UserAccountStatus;
  password?: string;
  permissions: string[];
  avatar?: string;
  proprietaireId?: string;
  locataireId?: string;
  organisation?: string;
  createdAt?: string;
  updatedAt?: string;
  derniereConnexion?: string;
}

export interface Agency {
  id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  ninea?: string;
  logoUrl?: string;
  status?: string;
  createdAt?: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'buildings'
  | 'units'
  | 'properties'
  | 'tenants'
  | 'owners'
  | 'contracts'
  | 'inspections'
  | 'maintenance'
  | 'payments'
  | 'recovery'
  | 'reminders'
  | 'invoices'
  | 'finance'
  | 'reports'
  | 'documents'
  | 'settings'
  | 'caisse'
  | 'pending-payments'
  | 'payment-methods'
  | 'payment-reports'
  | 'admin-control'
  | 'admin-users'
  |  'admin-journal'
  | 'archives'
  | 'activity-logs'
  | 'audit';

// ============================================================
// PROPRIÉTAIRES
// ============================================================
export interface Owner {
  id: string;
  ref?: string;
  nom: string;
  prenom: string;
  adresse?: string;
  telephone: string;
  email?: string;
  banque?: string;
  compteBancaire?: string;
  ninea?: string;
  tauxCommission?: number;
  statut?: 'Actif' | 'Inactif' | 'Archivé';
  mandatGerance?: string;
  observations?: string;
  totalBiens?: number;
  totalLoyersMensuels?: number;
}

// ============================================================
// IMMEUBLES (NOUVELLE HIÉRARCHIE)
// ============================================================
export type BuildingType = 
  | 'Immeuble'
  | 'Villa'
  | 'Résidence'
  | 'Cité'
  | 'Duplex'
  | 'Autre';

export type BuildingStatus = 'Actif' | 'Inactif' | 'En travaux';

export interface Building {
  id: string;
  agencyId?: string;
  proprietaireId: string;
  proprietaireNom?: string;
  nom: string;
  adresse?: string;
  quartier?: string;
  ville?: string;
  type: BuildingType;
  nombreEtages: number;
  description?: string;
  dateCreation?: string;
  statut: BuildingStatus;
  nbUnites?: number;
  nbUnitesOccupees?: number;
  nbUnitesVacantes?: number;
  loyerTotalMensuel?: number;
  unites?: Unit[];
}

// ============================================================
// ESPACES LOUABLES
// ============================================================
export type UnitType = 
  | 'Appartement'
  | 'Studio'
  | 'Chambre'
  | 'Salle de bain'
  | 'Magasin'
  | 'Bureau'
  | 'Terrasse'
  | 'Entrepôt'
  | 'Autre';

export type UnitStatus = 'Occupé' | 'Vacant' | 'Maintenance' | 'En litige';

export interface Unit {
  id: string;
  agencyId?: string;
  buildingId: string;
  buildingNom?: string;
  proprietaireId: string;
  proprietaireNom?: string;
  nom: string;
  type: UnitType;
  etage?: string;
  superficie?: number;
  nombrePieces?: number;
  loyerBase: number;
  charges: number;
  statut: UnitStatus;
  locataireActuelId?: string;
  locataireActuelNom?: string;
  description?: string;
  equipements?: string[];
  dateCreation?: string;
  building?: Building;
}

// ============================================================
// BIENS (ANCIEN SYSTÈME)
// ============================================================
export type PropertyType = 
  | 'Appartement'
  | 'Villa'
  | 'Magasin'
  | 'Bureau'
  | 'Immeuble'
  | 'Terrain'
  | 'Chambre'
  | 'Studio';

export type PropertyStatus = 'Occupé' | 'Vacant' | 'Maintenance' | 'En litige' | 'Archivé';

export interface Property {
  id: string;
  ref: string;
  nom: string;
  type: PropertyType;
  adresse: string;
  quartier: string;
  ville: string;
  proprietaireId: string;
  proprietaireNom?: string;
  tauxCommission?: number;
  loyerBase: number;
  charges: number;
  tvaApplicable?: boolean;
  statut: PropertyStatus;
  superficie?: number;
  nombrePieces?: number;
  pieces?: number;
  avatar?: string;
  equipements?: string[];
  description?: string;
  dateCreation?: string;
  locataireActuelNom?: string;
  loyerTotal?: number;
}

// ============================================================
// LOCATAIRES
// ============================================================
export type TenantStatus = 'À jour' | 'Retard' | 'Impayé' | 'Parti';

export interface Tenant {
  id: string;
  ref?: string;
  nom: string;
  prenom: string;
  telephone: string;
  email?: string;
  cni?: string;
  fonction?: string;
  profession?: string;
  employeur?: string;
  revenuMensuel?: number;
  statut: TenantStatus;
  scoreSolvabilite?: number;
  solvabiliteScore?: number;
  bienId: string;
  bienNom: string;
  proprietaireId?: string;
  dateEntree: string;
  dateSortie?: string;
  loyerMensuel: number;
  arrieresCumules?: number;
  joursRetard?: number;
  observations?: string;
  conjointNom?: string;
  conjointTelephone?: string;
}
// ============================================================
// CONTRATS DE BAIL
// ============================================================
export type ContractStatus = 'En cours' | 'Terminé' | 'Résilié' | 'Archivé';

export interface LeaseContract {
  id: string;
  ref: string;
  typeContrat: 'Habitation' | 'Commercial' | 'Professionnel' | 'Bail d\'habitation';
  locataireId: string;
  locataireNom: string;
  bienId: string;
  bienNom: string;
  proprietaireId: string;
  proprietaireNom: string;
  loyerBase: number;
  charges: number;
  tva?: number;
  tom?: number;
  tlv?: number;
  cautionLoyer?: number;
  cautionEau?: number;
  cautionElectricite?: number;
  cautionMontant?: number;
  cautionMois?: number;
  fraisAdhesion?: number;
  dateDebut: string;
  dateFin: string;
  typeReglement?: string;
  statut: ContractStatus;
}

// ============================================================
// PAIEMENTS
// ============================================================
export type PaymentStatus = 'Payé' | 'Impayé' | 'Partiel' | 'En attente';
export type ReceiptType = 'QUITTANCE' | 'RECU_ACOMPTE' | 'QUITTANCE_SOLDE';
export type PaymentMethod = 'Espèces' | 'Virement' | 'Chèque' | 'Mobile Money' | 'Wave' | 'Orange Money';
export type PaymentMethodCode = 'ESPECES' | 'WAVE' | 'ORANGE_MONEY' | 'VIREMENT' | 'CHEQUE' | 'FREE_MONEY' | 'AUTRE';
export type VerificationStatus = 'valide' | 'en_attente' | 'rejete';

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
  periode: string;
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
  verificationStatut?: VerificationStatus;
  numeroTransaction?: string;
  referenceTransaction?: string;
  transactionReference?: string;
  justificatifUrl?: string;
  datePaiement: string;
  dateEcheance?: string;
  dateValidation?: string;
  valideParId?: string;
  valideParNom?: string;
  motifRejet?: string;
  recuPar?: string;
  observation?: string;
  auteurId?: string;
  auteurNom?: string;
    dateHeurePaiement?: string;
  // ⬇️ NOUVEAU : Gestion Reçu / Quittance de Solde
  typeRecu?: ReceiptType;
  referencePaiementInitial?: string;
  montantInitialDu?: number;
}


// ============================================================
// DÉDUCTIONS PROPRIÉTAIRE (NOUVEAU)
// ============================================================
export type DeductionType = 'FACTURE' | 'PRET' | 'CREDIT' | 'REQUISITION' | 'AUTRE';

export interface OwnerDeduction {
  id: string;
  agencyId?: string;
  proprietaireId: string;
  bulletinRef?: string;
  periode: string;
  typeDeduction: DeductionType;
  libelle: string;
  montant: number;
  referenceDocument?: string;
  dateDeduction: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================
// BULLETIN DE VERSEMENT (NOUVEAU)
// ============================================================
export type BulletinStatus = 'Brouillon' | 'Validé' | 'Payé' | 'Archivé';

export interface BulletinVersement {
  id: string;
  agencyId?: string;
  reference: string;
  proprietaireId: string;
  proprietaireNom?: string;
  periode: string;
  tauxCommission: number;
  totalLoyersBruts: number;
  totalCommission: number;
  totalTvaCommission: number;
  totalDecaissements: number;
  totalEncaissements: number;
  netAReverser: number;
  detailsBulletin?: any;
  statut: BulletinStatus;
  dateValidation?: string;
  datePaiement?: string;
  modeReglement?: string;
  referenceVirement?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================
// REVERSEMENTS
// ============================================================
export interface OwnerDisbursement {
  id: string;
  ref: string;
  proprietaireId: string;
  proprietaireNom: string;
  periode: string;
  loyersBruts: number;
  montantBrut: number;
  tauxCommission: number;
  commissionAgence: number;
  tvaCommission?: number;
  retenueTVA?: number;
  depensesDeduites?: number;
  chargesDeduites?: number;
  montantNetPaye: number;
  montantNet: number;
  statut: string;
  modeReglement?: string;
  modeReversement?: string;
  dateReglement?: string;
  dateReversement?: string;
  referenceVirement?: string;
}

// ============================================================
// INSPECTIONS (ÉTATS DES LIEUX)
// ============================================================
export type InspectionType = 'Entrée' | 'Sortie' | 'Périodique';
export type InspectionStatus = 'Brouillon' | 'Validé' | 'Signé' | 'Archivé';

export interface InspectionElement {
  id: string;
  piece: string;
  element: string;
  etat: 'Bon' | 'Moyen' | 'Mauvais' | 'Neuf';
  observation?: string;
  coutDegradation?: number;
}

export interface Inspection {
  id: string;
  ref?: string;
  bienId: string;
  bienNom: string;
  locataireId: string;
  locataireNom: string;
  type: InspectionType;
  date: string;
  agentNom?: string;
  inspecteurNom?: string;
  etatGeneral?: string;
  elements?: InspectionElement[];
  coutDegradations?: number;
  totalDegats?: number;
  retenueCaution?: number;
  montantRestitueCaution?: number;
  commentairesGeneraux?: string;
  remarques?: string;
  statut: InspectionStatus;
  signe?: boolean;
}

// ============================================================
// MAINTENANCE
// ============================================================
export type MaintenanceStatus = 'Signalé' | 'En attente' | 'Planifié' | 'En cours' | 'Traité et Réglé' | 'Terminé';
export type MaintenancePriority = 'Faible' | 'Moyenne' | 'Haute' | 'Urgente';
export type MaintenanceImputation = 'Propriétaire' | 'Locataire' | 'Agence';
export type MaintenancePaymentStatus = 'Non réglé' | 'Réglé' | 'Partiellement réglé';

export interface MaintenanceTicket {
  id: string;
  ref?: string;
  bienId: string;
  bienNom: string;
  proprietaireId?: string;
  proprietaireNom?: string;
  locataireId?: string;
  locataireNom?: string;
  titre: string;
  description: string;
  priorite: MaintenancePriority;
  statut: MaintenanceStatus;
  statutReglement?: MaintenancePaymentStatus;
  modeReglement?: string;
  dateReglement?: string;
  factureArtisanRef?: string;
  regleParCaisse?: boolean;
  caisseMouvementId?: string;
  observationsReglement?: string;
  imputableA?: MaintenanceImputation;
  coutEstime: number;
  coutReel?: number;
  dateSignalement: string;
  dateIntervention?: string;
  dateResolution?: string;
  prestataire?: string;
  artisanNom?: string;
}

// ============================================================
// RAPPELS
// ============================================================
export type ReminderLevel = 
  | 'Niveau 1: Courtois (J+3)'
  | 'Niveau 2: Ferme (J+10)'
  | 'Niveau 3: Mise en demeure (J+20)'
  | 'Niveau 4: Contentieux (J+30)';

export type ReminderChannel = 'SMS' | 'WhatsApp' | 'Email' | 'Courrier';
export type ReminderStatus = 'En attente' | 'Envoyé' | 'Lu' | 'Échec';

export interface TenantReminder {
  id: string;
  locataireId: string;
  locataireNom: string;
  telephone: string;
  email?: string;
  bienNom: string;
  montantDu: number;
  penalites?: number;
  joursRetard: number;
  niveau: ReminderLevel;
  canal: ReminderChannel;
  typeRelance?: string;
  message: string;
  statut: ReminderStatus;
  dateCreation: string;
  dateEnvoi?: string;
}

// ============================================================
// FACTURES
// ============================================================
export type InvoiceStatus = 'Émise' | 'Payée' | 'Annulée' | 'En retard';

export interface InvoiceLine {
  description: string;
  quantite: number;
  prixUnitaire: number;
  montant: number;
}

export interface Invoice {
  id: string;
  ref: string;
  numero: string;
  type: string;
  locataireId?: string;
  locataireNom?: string;
  proprietaireId?: string;
  proprietaireNom?: string;
  bienId?: string;
  bienNom?: string;
  periode?: string;
  dateFacture?: string;
  dateEmission?: string;
  dateEcheance?: string;
  sousTotal?: number;
  taxes?: number;
  total: number;
  montantTotal?: number;
  statut: InvoiceStatus;
  lignes?: InvoiceLine[];
}

// ============================================================
// CAISSE
// ============================================================
export type CashMovementType = 'ENTREE' | 'SORTIE' | 'ENCAISSEMENT' | 'DECAISSEMENT';
export type CashMovementCategory = 'ENCAISSEMENT_LOYER' | 'DEPENSE_MENUE' | 'AVANCE_PROPRIETAIRE' | 'APPORT_FOND' | 'AUTRE';

export interface CashMovement {
  id: string;
  reference?: string;
  ref?: string;
  type: CashMovementType;
  categorie?: CashMovementCategory;
  montant: number;
  description?: string;
  libelle?: string;
  motif?: string;
  moyenPaiementCode?: PaymentMethodCode;
  beneficiaire?: string;
  beneficiaireOuPayeur?: string;
  justificatifRef?: string;
  dateOperation?: string;
  dateHeure?: string;
  statut?: string;
  userId?: string;
  userNom?: string;
  auteurId?: string;
  auteurNom?: string;
  caissierNom?: string;
  createdAt?: string;
}

export interface CashClosing {
  id: string;
  reference?: string;
  numero?: string;
  date?: string;
  dateCloture?: string;
  heureCloture?: string;
  soldeInitial?: number;
  totalEntreesEspeces?: number;
  totalSortiesEspeces?: number;
  soldeTheorique?: number;
  soldeReel?: number;
  soldeReelCompte?: number;
  ecart?: number;
  ecartCaisse?: number;
  statut?: string;
  caissierId?: string;
  caissierNom?: string;
  observations?: string;
  observation?: string;
  detailsComptage?: any;
  createdAt?: string;
}

// ============================================================
// BONS DE CAISSE
// ============================================================
export interface CashVoucher {
  id: string;
  ref: string;
  proprietaireId: string;
  proprietaireNom: string;
  montantNet: number;
  loyersBruts: number;
  commission: number;
  periode: string;
  dateEmission: string;
  statut: string;
  modeReglement?: string;
  referenceVirement?: string;
}

// ============================================================
// NOTIFICATIONS
// ============================================================
export interface NotificationItem {
  id: string;
  titre: string;
  message: string;
  type: string;
  lu: boolean;
  date: string;
  actionUrl?: string;
}

// ============================================================
// AUDIT LOGS
// ============================================================
export interface AuditLog {
  id: string;
  action: string;
  entite: string;
  entiteId?: string;
  utilisateur: string;
  userNom?: string;
  module?: string;
  entityRef?: string;
  entityType?: string;
  details: string;
  date?: string;
  createdAt: string;
}

// ============================================================
// PARAMÈTRES AGENCE
// ============================================================
export interface AgencySettings {
  nomAgence: string;
  slogan?: string;
  telephone: string;
  email: string;
  adresse: string;
  ville: string;
  pays: string;
  ninea?: string;
  devise: string;
  tauxGeranceDefaut: number;
  penaliteDefaut: number;
  tvaTaux: number;
  prefixFacture: string;
  prefixQuittance: string;
  prefixPaiement: string;
  prefixContrat: string;
  prefixBonCaisse: string;
  waveNumero?: string;
  orangeMoneyCode?: string;
  whatsappBusiness?: string;
  standardTelephone?: string;
  logoUrl?: string;
  siteWeb?: string;
}

// ============================================================
// MOYENS DE PAIEMENT
// ============================================================
export interface PaymentMethodConfig {
  id: string;
  code: PaymentMethodCode;
  libelle?: string;
  nom?: string;
  description?: string;
  actif: boolean;
  parDefaut?: boolean;
  estParDefaut?: boolean;
  fraisPourcentage?: number;
  delaiValidationHeures?: number;
  numeroCompteOuTelephone?: string;
  banqueNom?: string;
  instructions?: string;
  config?: any;
}

// ============================================================
// ARCHIVES (NOUVEAU)
// ============================================================
export interface ArchiveRecord {
  id: string;
  agencyId: string;
  entityType: 'tenant' | 'owner' | 'property' | 'building' | 'unit' | 'contract' | 'payment' | 'inspection' | 'maintenance' | 'invoice' | 'bulletin';
  entityId: string;
  entityRef?: string;
  entityNom?: string;
  data: any;
  archivedAt: string;
  archivedBy?: string;
  reason?: string;
}

// ============================================================
// ACTIVITÉS (NOUVEAU - pour recherche par date)
// ============================================================
export interface ActivityLog {
  id: string;
  agencyId: string;
  userId?: string;
  userNom?: string;
  activityType: 'PAYMENT' | 'CONTRACT' | 'TENANT_CREATED' | 'TENANT_EXIT' | 'MAINTENANCE' | 'INSPECTION' | 'DISBURSEMENT' | 'CASH_MOVEMENT' | 'REMINDER' | 'OTHER';
  entityType?: string;
  entityId?: string;
  entityRef?: string;
  title: string;
  description?: string;
  montant?: number;
  activityDate: string;
  activityHour?: string;
  metadata?: any;
  createdAt: string;
}

// ============================================================
// DONNÉES DE L'APPLICATION
// ============================================================
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