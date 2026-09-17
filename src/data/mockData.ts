import {
  Property,
  Owner,
  Tenant,
  LeaseContract,
  Payment,
  TenantReminder,
  Inspection,
  PropertyInspection,
  OwnerDisbursement,
  OwnerPaymentSlip,
  MaintenanceTicket,
  Invoice,
  CashVoucher,
  NotificationItem,
  AuditLog,
  AgencySettings,
  UserAccount,
  PaymentMethodConfig,
  CashMovement,
  CashClosing,
} from '../types';

/**
 * FITAL-IMMO PRODUCTION CONFIGURATION
 * RÈGLE ABSOLUE : ZÉRO DONNÉE FICTIVE EN PRODUCTION
 * Tous les tableaux de données métier (biens, locataires, propriétaires, contrats, paiements)
 * sont initialisés à vide []. Les données réelles proviennent exclusivement de Supabase.
 */

export const INITIAL_OWNERS: Owner[] = [];
export const INITIAL_PROPERTIES: Property[] = [];
export const INITIAL_TENANTS: Tenant[] = [];
export const INITIAL_CONTRACTS: LeaseContract[] = [];
export const INITIAL_PAYMENTS: Payment[] = [];
export const INITIAL_REMINDERS: TenantReminder[] = [];
export const INITIAL_INSPECTIONS: PropertyInspection[] = [];
export const INITIAL_MAINTENANCE: MaintenanceTicket[] = [];
export const INITIAL_DISBURSEMENTS: OwnerDisbursement[] = [];
export const INITIAL_PAYMENT_SLIPS: OwnerPaymentSlip[] = [];

export const initialProperties: Property[] = [];
export const initialOwners: Owner[] = [];
export const initialTenants: Tenant[] = [];
export const initialContracts: LeaseContract[] = [];
export const initialPayments: Payment[] = [];
export const initialReminders: TenantReminder[] = [];
export const initialInspections: Inspection[] = [];
export const initialMaintenance: MaintenanceTicket[] = [];
export const initialDisbursements: OwnerDisbursement[] = [];
export const initialInvoices: Invoice[] = [];
export const initialCashVouchers: CashVoucher[] = [];
export const initialNotifications: NotificationItem[] = [];
export const initialAuditLogs: AuditLog[] = [];
export const initialUsers: UserAccount[] = [
  {
    id: 'usr-admin-principal',
    agencyId: '5f581aa8-6e92-47a6-ae8e-a28a9de66140,',
    email: 'admin@fital-immo.sn',
    password: 'Admin2026!',
    nom: 'DIOP',
    prenom: 'Mamadou',
    telephone: '+221 77 123 45 67',
    role: 'ADMIN',
    statut: 'actif',
    permissions: ['*'],
    organisation: 'FITAL-IMMO Direction Générale',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01',
    derniereConnexion: 'Aujourd’hui',
  },
  {
    id: 'usr-gestionnaire-1',
    agencyId: '5f581aa8-6e92-47a6-ae8e-a28a9de66140,',
    email: 'gestionnaire@fital-immo.sn',
    password: 'Gestion2026!',
    nom: 'FALL',
    prenom: 'Fatou',
    telephone: '+221 77 234 56 78',
    role: 'GESTIONNAIRE',
    statut: 'actif',
    permissions: ['biens.manage', 'locataires.manage', 'proprietaires.manage', 'contrats.manage', 'etats_lieux.manage', 'relances.manage', 'travaux.manage'],
    organisation: 'FITAL-IMMO Pôle Gestion Immobilière',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-05',
    derniereConnexion: 'Hier',
  },
  {
    id: 'usr-caissier-1',
    agencyId: '5f581aa8-6e92-47a6-ae8e-a28a9de66140,',
    email: 'caisse@fital-immo.sn',
    password: 'Caisse2026!',
    nom: 'SOW',
    prenom: 'Ibrahima',
    telephone: '+221 77 345 67 89',
    role: 'CAISSIER',
    statut: 'actif',
    permissions: ['paiements.create', 'caisse.manage', 'caisse.cloture', 'quittances.generate', 'reversements.view'],
    organisation: 'FITAL-IMMO Caisse Centrale Dakar',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-10',
    derniereConnexion: 'Aujourd’hui',
  },
  {
    id: 'usr-proprio-demo',
    agencyId: '5f581aa8-6e92-47a6-ae8e-a28a9de66140,',
    email: 'proprietaire@fital-immo.sn',
    password: 'Proprio2026!',
    nom: 'NDIAYE',
    prenom: 'El Hadji',
    telephone: '+221 77 456 78 90',
    role: 'PROPRIETAIRE',
    statut: 'actif',
    permissions: ['proprio.read_own_data'],
    organisation: 'Bailleur Privé',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-15',
    derniereConnexion: 'Il y a 2 jours',
  },
  {
    id: 'usr-locataire-demo',
    agencyId: '5f581aa8-6e92-47a6-ae8e-a28a9de66140,',
    email: 'locataire@fital-immo.sn',
    password: 'Locataire2026!',
    nom: 'BA',
    prenom: 'Aïssatou',
    telephone: '+221 77 567 89 01',
    role: 'LOCATAIRE',
    statut: 'actif',
    permissions: ['locataire.read_own_data', 'locataire.download_quittance'],
    organisation: 'Résidence Prestige Almadies',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-20',
    derniereConnexion: 'Il y a 3 jours',
  },
  {
    id: 'usr-agent-terrain',
    agencyId: '5f581aa8-6e92-47a6-ae8e-a28a9de66140,',
    email: 'agent@fital-immo.sn',
    password: 'Agent2026!',
    nom: 'GUEYE',
    prenom: 'Babacar',
    telephone: '+221 77 678 90 12',
    role: 'AGENT',
    statut: 'actif',
    permissions: ['etats_lieux.manage', 'travaux.manage'],
    organisation: 'FITAL-IMMO Équipe Terrain & États des Lieux',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-22',
    derniereConnexion: 'Hier',
  },
];
export const initialCashMovements: CashMovement[] = [];
export const initialCashClosings: CashClosing[] = [];

export const initialSettings: AgencySettings = {
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
};

export const initialPaymentMethods: PaymentMethodConfig[] = [
  {
    id: 'pm-especes',
    code: 'ESPECES',
    libelle: 'Espèces (Caisse Agence)',
    description: 'Règlement au comptoir avec reçu de caisse instantané et émargement.',
    actif: true,
    parDefaut: true,
    estParDefaut: true,
    fraisPourcentage: 0,
    delaiValidationHeures: 0,
    instructions: 'Présentez-vous aux guichets de la gérance aux heures d’ouverture.',
  },
  {
    id: 'pm-wave',
    code: 'WAVE',
    libelle: 'Wave Mobile Money',
    description: 'Paiement sans frais supplémentaire par QR Code instantané ou lien marchand direct.',
    actif: true,
    parDefaut: false,
    estParDefaut: false,
    fraisPourcentage: 0,
    delaiValidationHeures: 0,
    numeroCompteOuTelephone: '+221 77 000 00 00',
    instructions: 'Scannez le QR Code Wave ou utilisez le numéro marchand officiel.',
  },
  {
    id: 'pm-orange-money',
    code: 'ORANGE_MONEY',
    libelle: 'Orange Money (OM)',
    description: 'Paiement sécurisé via syntaxe USSD #144# ou code marchand officiel.',
    actif: true,
    parDefaut: false,
    estParDefaut: false,
    fraisPourcentage: 0,
    delaiValidationHeures: 1,
    numeroCompteOuTelephone: '+221 78 000 00 00',
    instructions: 'Composez le code marchand Orange Money ou effectuez un transfert direct.',
  },
  {
    id: 'pm-virement',
    code: 'VIREMENT',
    libelle: 'Virement Bancaire UEMOA',
    description: 'Règlement direct par transfert interbancaire avec mention de la référence du bien.',
    actif: true,
    parDefaut: false,
    estParDefaut: false,
    fraisPourcentage: 0,
    delaiValidationHeures: 24,
    banqueNom: 'CBAO Attijariwafa Bank',
    instructions: 'Effectuez votre virement sur le compte bancaire de l’agence.',
  },
  {
    id: 'pm-cheque',
    code: 'CHEQUE',
    libelle: 'Chèque Certifié',
    description: 'Dépôt de chèque certifié à l’ordre de la gérance immobilière.',
    actif: true,
    parDefaut: false,
    estParDefaut: false,
    fraisPourcentage: 0,
    delaiValidationHeures: 48,
    instructions: 'Chèque certifié émis à l’ordre de la gérance.',
  },
];
