import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Coins,
  Menu as MenuIcon,
} from 'lucide-react';
import { ResetPasswordView } from './components/ResetPasswordView';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { DashboardView } from './components/DashboardView';
import { RecoveryTrackerView } from './components/RecoveryTrackerView';
import { AutomatedRemindersView } from './components/AutomatedRemindersView';
import { PaymentsView } from './components/PaymentsView';
import { PropertiesView } from './components/PropertiesView';
import { BuildingsView } from './components/BuildingsView';
import { UnitsView } from './components/UnitsView';
import { TenantsView } from './components/TenantsView';
import { OwnersView } from './components/OwnersView';
import { ContractsView } from './components/ContractsView';
import { InspectionsView } from './components/InspectionsView';
import { MaintenanceView } from './components/MaintenanceView';
import { FinanceView } from './components/FinanceView';
import { DocumentsView } from './components/DocumentsView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { InvoicesView } from './components/InvoicesView';
import { ReceiptModal } from './components/ReceiptModal';
import { PaymentBulletinModal } from './components/PaymentBulletinModal';
import { CashVoucherModal } from './components/CashVoucherModal';
import { NewTenantWizardModal } from './components/NewTenantWizardModal';
import { TenantExitModal } from './components/TenantExitModal';
import { UserProfileModal } from './components/UserProfileModal';
import { MobileMoneyPaymentModal } from './components/MobileMoneyPaymentModal';
import { QuickCommsModal } from './components/QuickCommsModal';
import { AdminControlCenterView } from './components/AdminControlCenterView';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { AdminActivityJournalView } from './components/AdminActivityJournalView';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { AdminUsersView } from './components/AdminUsersView';
import { CashierDashboardView } from './components/CashierDashboardView';
import { OwnerDashboardView } from './components/OwnerDashboardView';
import { TenantDashboardView } from './components/TenantDashboardView';
import { AgentDashboardView } from './components/AgentDashboardView';
import { ManagerDashboardView } from './components/ManagerDashboardView';
import { CashRegisterView } from './components/CashRegisterView';
import { PendingPaymentsView } from './components/PendingPaymentsView';
import { PaymentMethodsConfigView } from './components/PaymentMethodsConfigView';
import { PaymentMethodReportsView } from './components/PaymentMethodReportsView';
import { LoginView } from './components/LoginView';
import { OwnerBulletinModal } from './components/OwnerBulletinModal';
import { PaymentReceiptModal } from './components/PaymentReceiptModal';
import { ArchiveView } from './components/ArchiveView';
import { ActivityLogView } from './components/ActivityLogView';
import { PenaltiesView } from './components/PenaltiesView';
import { supabase, isSupabaseConfigured } from './lib/supabase/client';
import { formatNumber } from './lib/utils';
import {
  ActiveTab,
  Property,
  Building,
  Unit,
  Owner,
  Tenant,
  LeaseContract,
  Payment,
  TenantReminder,
  Inspection,
  MaintenanceTicket,
  OwnerDisbursement,
  Invoice,
  CashVoucher,
  NotificationItem,
  AuditLog,
  AgencySettings,
  UserAccount,
  PaymentMethodConfig,
  CashMovement,
  CashClosing,
  OwnerDeduction,
  BulletinVersement,
  ArchiveRecord,
  ActivityLog,
  Penalty,
  OwnerCharge,
} from './types';
import {
  initialProperties,
  initialOwners,
  initialTenants,
  initialContracts,
  initialPayments,
  initialReminders,
  initialInspections,
  initialMaintenance,
  initialDisbursements,
  initialInvoices,
  initialCashVouchers,
  initialNotifications,
  initialAuditLogs,
  initialSettings,
  initialUsers,
  initialPaymentMethods,
  initialCashMovements,
  initialCashClosings,
} from './data/mockData';
import {
  loadFullApplicationData,
  loadLocalCollection,
  persistCollection,
  logSystemAudit,
  signOutSession,
  getAuthSession,
  savePropertyToDb,
  saveOwnerToDb,
  saveTenantToDb,
  saveContractToDb,
  savePaymentToDb,
  validatePendingPaymentInDb,
  rejectPendingPaymentInDb,
  softDeleteRecord,
  saveCashMovementToDb,
  saveCashClosingToDb,
  saveMaintenanceToDb,
  saveInspectionToDb,
  saveDisbursementToDb,
  saveInvoiceToDb,
  saveReminderToDb,
  saveSettingsToDb,
  savePaymentMethodToDb,
  saveUserToDb,
  createUserAccountInSupabase,
  getOrCreateDefaultAgency,
  fetchAgencyUsers,
  saveBuildingToDb,
  deleteBuildingFromDb,
  saveUnitToDb,
  deleteUnitFromDb,
  saveOwnerDeductionToDb,
  deleteOwnerDeductionFromDb,
  saveBulletinVersementToDb,
  saveArchiveToDb,
  saveActivityLogToDb,
  savePenaltyToDb,
  deletePenaltyFromDb,
} from './lib/supabase/service';

// 🆕 Force le nettoyage du cache si la version change
const APP_VERSION = '3.0.4'; // était 2.0.0 // ← Changez à chaque mise à jour majeure
const storedVersion = localStorage.getItem('fital_immo_version');

if (storedVersion !== APP_VERSION) {
  console.log('🔄 Nouvelle version détectée, nettoyage du cache...');
  // Nettoyer les clés de cache (mais garder la session auth)
  const keysToKeep = ['fital_immo_user'];
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('fital_immo_') && !keysToKeep.includes(key)) {
      localStorage.removeItem(key);
    }
  });
  localStorage.setItem('fital_immo_version', APP_VERSION);
}

const FALLBACK_AGENCY_ID = '5f581aa8-6e92-47a6-ae8e-a28a9de66140';

export default function App() {
  const [users, setUsers] = useState<UserAccount[]>(() => loadLocalCollection('users', initialUsers));
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = loadLocalCollection<UserAccount | null>('current_user', null);
    if (saved) return saved;
    try {
      const raw = localStorage.getItem('fital_immo_user');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  });
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isResetPasswordMode, setIsResetPasswordMode] = useState(false);

  const [properties, setProperties] = useState<Property[]>(() => loadLocalCollection('properties', initialProperties));
  const [buildings, setBuildings] = useState<Building[]>(() => loadLocalCollection('buildings', []));
  const [units, setUnits] = useState<Unit[]>(() => loadLocalCollection('units', []));
  const [owners, setOwners] = useState<Owner[]>(() => loadLocalCollection('owners', initialOwners));
  const [tenants, setTenants] = useState<Tenant[]>(() => loadLocalCollection('tenants', initialTenants));
  const [contracts, setContracts] = useState<LeaseContract[]>(() => loadLocalCollection('contracts', initialContracts));
  const [payments, setPayments] = useState<Payment[]>(() => loadLocalCollection('payments', initialPayments));
  const [reminders, setReminders] = useState<TenantReminder[]>(() => loadLocalCollection('reminders', initialReminders));
  const [inspections, setInspections] = useState<Inspection[]>(() => loadLocalCollection('inspections', initialInspections));
  const [maintenance, setMaintenance] = useState<MaintenanceTicket[]>(() => loadLocalCollection('maintenance', initialMaintenance));
  const [disbursements, setDisbursements] = useState<OwnerDisbursement[]>(() => loadLocalCollection('disbursements', initialDisbursements));
  const [invoices, setInvoices] = useState<Invoice[]>(() => loadLocalCollection('invoices', initialInvoices));
  const [cashVouchers, setCashVouchers] = useState<CashVoucher[]>(() => loadLocalCollection('cash_vouchers', initialCashVouchers));
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => loadLocalCollection('notifications', initialNotifications));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => loadLocalCollection('audit_logs', initialAuditLogs));
  const [settings, setSettings] = useState<AgencySettings>(() => loadLocalCollection('settings', initialSettings));
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>(() => loadLocalCollection('payment_methods', initialPaymentMethods));
  const [cashMovements, setCashMovements] = useState<CashMovement[]>(() => loadLocalCollection('cash_movements', initialCashMovements));
  const [cashClosings, setCashClosings] = useState<CashClosing[]>(() => loadLocalCollection('cash_closings', initialCashClosings));
  const [ownerDeductions, setOwnerDeductions] = useState<OwnerDeduction[]>(() => loadLocalCollection('owner_deductions', []));
  const [bulletinsVersements, setBulletinsVersements] = useState<BulletinVersement[]>(() => loadLocalCollection('bulletin_versements', []));
  const [archives, setArchives] = useState<ArchiveRecord[]>(() => loadLocalCollection('archives', []));
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => loadLocalCollection('activity_logs', []));
  const [penalties, setPenalties] = useState<Penalty[]>(() => loadLocalCollection('penalties', []));
  const [ownerCharges, setOwnerCharges] = useState<OwnerCharge[]>(() => loadLocalCollection('owner_charges', []));

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    const now = new Date();
    return now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState<boolean>(false);
  const [receiptModalPayment, setReceiptModalPayment] = useState<Payment | null>(null);
  const [ownerSlipModalOwner, setOwnerSlipModalOwner] = useState<Owner | null>(null);
  const [ownerBulletinModalOwner, setOwnerBulletinModalOwner] = useState<Owner | null>(null);
  const [cashVoucherModalOwner, setCashVoucherModalOwner] = useState<Owner | null>(null);
  const [isNewPaymentModalOpen, setIsNewPaymentModalOpen] = useState<boolean>(false);
  const [isNewPropertyModalOpen, setIsNewPropertyModalOpen] = useState<boolean>(false);
  const [isNewTenantWizardOpen, setIsNewTenantWizardOpen] = useState<boolean>(false);
  const [tenantExitTarget, setTenantExitTarget] = useState<Tenant | null>(null);
  const [initialTenantForPayment, setInitialTenantForPayment] = useState<Tenant | null>(null);
  const [mobileMoneyModalConfig, setMobileMoneyModalConfig] = useState<{
    isOpen: boolean;
    tenantName?: string;
    tenantPhone?: string;
    propertyNom?: string;
    amount?: number;
    period?: string;
    reference?: string;
    tenantId?: string;
  } | null>(null);
  const [quickCommsModalConfig, setQuickCommsModalConfig] = useState<{
    isOpen: boolean;
    recipientName?: string;
    recipientPhone?: string;
    recipientRole?: string;
    propertyNom?: string;
    dueAmount?: number;
    daysLate?: number;
  } | null>(null);

  // useEffect 1 : Reset password
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token') || hash.includes('type=recovery')) {
      setIsResetPasswordMode(true);
    }
  }, []);

  // useEffect 2 : Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // useEffect 3 : Session auth (CORRIGÉ)
useEffect(() => {
  getAuthSession().then(async (session) => {
    try {
      if (session?.user && supabase) {
        // 🆕 Attendre un peu que la session soit établie
        await new Promise((resolve) => setTimeout(resolve, 300));

        // 1. Charger le profil SANS la jointure
        let { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        // 🆕 Si non trouvé, réessayer
        if (!profile) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          const retry = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          profile = retry.data;
        }

        if (profile) {
          // 2. Charger l'agence séparément
          let agencyData = null;
          if (profile.agency_id) {
            const { data: agency } = await supabase
              .from('agencies')
              .select('name, slug, status')
              .eq('id', profile.agency_id)
              .maybeSingle();
            agencyData = agency;
          }

          const userAccount: UserAccount = {
            id: session.user.id,
            agencyId: profile.agency_id || FALLBACK_AGENCY_ID,
            email: session.user.email || '',
            nom: profile.nom || 'Administrateur',
            prenom: profile.prenom || '',
            telephone: profile.telephone || '',
            role: (profile.role as any) || 'ADMIN',
            statut: profile.statut || 'actif',
            permissions: profile.permissions || ['ALL'],
            organisation: agencyData?.name || 'FITAL-IMMO Agence',
            createdAt: session.user.created_at || new Date().toISOString(),
          };
          setCurrentUser(userAccount);
          persistCollection('current_user', userAccount);
          setUsers((prev) => (prev.some((u) => u.id === userAccount.id) ? prev : [userAccount, ...prev]));
        }
      } else {
        const localUserJson = localStorage.getItem('fital_immo_user');
        if (localUserJson) {
          try {
            const parsed = JSON.parse(localUserJson);
            if (parsed && parsed.id) {
              setCurrentUser(parsed);
              persistCollection('current_user', parsed);
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn('Erreur verification session auth:', err);
    } finally {
      setIsAuthLoading(false);
    }
  });
}, []);

  // useEffect 4 : Chargement données (CORRIGÉ - fiable sur mobile)
useEffect(() => {
  if (!currentUser?.agencyId || currentUser.agencyId.trim() === '') {
    console.log('⏳ En attente de l\'agencyId...');
    return;
  }

  console.log('📥 Chargement des données pour:', currentUser.agencyId);

  let cancelled = false;

  const timer = setTimeout(async () => {
    if (cancelled) return;
    try {
      const data = await loadFullApplicationData(currentUser.agencyId);
      if (cancelled) return;

      console.log('✅ Données chargées:', {
        properties: data.properties?.length,
        buildings: data.buildings?.length,
        units: data.units?.length,
        owners: data.owners?.length,
        tenants: data.tenants?.length,
      });

      // Assignation systématique (vide ou non)
      setProperties(data.properties || []);
      setBuildings(data.buildings || []);
      setUnits(data.units || []);
      setOwners(data.owners || []);
      setTenants(data.tenants || []);
      setContracts(data.contracts || []);
      setPayments(data.payments || []);
      setReminders(data.reminders || []);
      setInspections(data.inspections || []);
      setMaintenance(data.maintenance || []);
      setDisbursements(data.disbursements || []);
      setInvoices(data.invoices || []);
      setCashVouchers(data.cashVouchers || []);
      setNotifications(data.notifications || []);
      setAuditLogs(data.auditLogs || []);
      setUsers(data.users || []);
      setCashMovements(data.cashMovements || []);
      setCashClosings(data.cashClosings || []);
      setPaymentMethods(data.paymentMethods || []);
      if (data.settings) setSettings(data.settings);
      setOwnerDeductions(data.ownerDeductions || []);
      setBulletinsVersements(data.bulletinVersements || []);
      setArchives(data.archives || []);
      setActivityLogs(data.activityLogs || []);
      setPenalties(data.penalties || []);
      setOwnerCharges(data.ownerCharges || []);
    } catch (err) {
      console.error('❌ Erreur chargement:', err);
    }
  }, 400);

  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
}, [currentUser?.agencyId, currentUser?.id]);

  const handleSignOut = async () => {
    await signOutSession();
    try {
      localStorage.removeItem('fital_immo_user');
      localStorage.removeItem('fital_immo_current_user');
    } catch (e) {}
    setCurrentUser(null);
    setIsProfileModalOpen(false);
  };

  const handleTriggerAuditLog = (action: string, module: string, details: string, entityRef?: string) => {
    const userLabel = currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Système';
    const userRole = currentUser ? currentUser.role : 'SYSTÈME';
    const newLog: AuditLog = {
      id: crypto.randomUUID(),
      action, entite: module, entiteId: entityRef || 'SYSTÈME',
      utilisateur: `${userLabel} (${userRole})`,
      userNom: userLabel, module, entityRef, details,
      date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    logSystemAudit(newLog, currentUser?.agencyId);
};

    const checkAccessPermission = (tab: ActiveTab, user: UserAccount): boolean => {
    // 👑 SUPER_ADMIN_SAAS : accès uniquement à sa page
    if (user.role === 'SUPER_ADMIN_SAAS') {
      return tab === 'saas-admin' || tab === 'dashboard';
    }
    
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return true;
    if (tab === 'archives' || tab === 'activity-logs') {
      return ['ADMIN', 'SUPER_ADMIN', 'GESTIONNAIRE'].includes(user.role);
    }
    if (tab === 'penalties') {
      return ['ADMIN', 'SUPER_ADMIN', 'GESTIONNAIRE', 'CAISSIER'].includes(user.role);
    }
    if (user.role === 'CAISSIER') {
      return ['dashboard', 'caisse', 'pending-payments', 'payments', 'payment-reports', 'tenants', 'buildings', 'units', 'finance', 'documents'].includes(tab);
    }
              if (user.role === 'PROPRIETAIRE') {
      // 🔒 RESTRICTION STRICTE : le propriétaire voit uniquement ses biens, locataires (noms), reversements
      return ['dashboard', 'buildings', 'units', 'tenants', 'finance'].includes(tab);
    }
    if (user.role === 'LOCATAIRE') {
      return ['dashboard', 'payments', 'maintenance'].includes(tab);
    }
    if (user.role === 'AGENT') {
      return ['dashboard', 'inspections', 'properties', 'buildings', 'units', 'maintenance', 'recovery'].includes(tab);
    }
    if (user.role === 'GESTIONNAIRE') {
      return ['dashboard', 'owners', 'properties', 'buildings', 'units', 'tenants', 'contracts', 'inspections', 'recovery', 'reminders', 'maintenance', 'documents', 'finance', 'archives', 'activity-logs', 'penalties'].includes(tab);
    }
    return false;
  };

  const handleSwitchUser = (newUser: UserAccount) => {
    setCurrentUser(newUser);
    persistCollection('current_user', newUser);
    localStorage.setItem('fital_immo_user', JSON.stringify(newUser));
    if (!checkAccessPermission(activeTab, newUser)) setActiveTab('dashboard');
  };

  const handleSafeTabChange = (targetTab: ActiveTab) => {
    if (currentUser && checkAccessPermission(targetTab, currentUser)) {
      setActiveTab(targetTab);
    } else {
      setActiveTab('dashboard');
    }
  };

  // ============================================================
  // HANDLERS : BUILDINGS
  // ============================================================
  const handleAddBuilding = (newBuilding: Building) => {
    setBuildings((prev) => { const next = [newBuilding, ...prev]; persistCollection('buildings', next); return next; });
    if (currentUser?.agencyId) saveBuildingToDb(newBuilding, currentUser.agencyId).catch(console.warn);
  };
  const handleUpdateBuilding = (updatedBuilding: Building) => {
    setBuildings((prev) => { const next = prev.map((b) => (b.id === updatedBuilding.id ? updatedBuilding : b)); persistCollection('buildings', next); return next; });
    if (currentUser?.agencyId) saveBuildingToDb(updatedBuilding, currentUser.agencyId).catch(console.warn);
  };
  const handleDeleteBuilding = (buildingId: string) => {
    setBuildings((prev) => { const next = prev.filter((b) => b.id !== buildingId); persistCollection('buildings', next); return next; });
    setUnits((prev) => { const next = prev.filter((u) => u.buildingId !== buildingId); persistCollection('units', next); return next; });
    deleteBuildingFromDb(buildingId).catch(console.warn);
  };

  // ============================================================
  // HANDLERS : UNITS
  // ============================================================
  const handleAddUnit = (newUnit: Unit) => {
    setUnits((prev) => { const next = [newUnit, ...prev]; persistCollection('units', next); return next; });
    if (currentUser?.agencyId) saveUnitToDb(newUnit, currentUser.agencyId).catch(console.warn);
  };
  const handleUpdateUnit = (updatedUnit: Unit) => {
    setUnits((prev) => { const next = prev.map((u) => (u.id === updatedUnit.id ? updatedUnit : u)); persistCollection('units', next); return next; });
    if (currentUser?.agencyId) saveUnitToDb(updatedUnit, currentUser.agencyId).catch(console.warn);
  };
  const handleDeleteUnit = (unitId: string) => {
    setUnits((prev) => { const next = prev.filter((u) => u.id !== unitId); persistCollection('units', next); return next; });
    deleteUnitFromDb(unitId).catch(console.warn);
  };

  // ============================================================
  // HANDLERS : PENALTIES
  // ============================================================
  const handleAddPenalty = (penalty: Penalty) => {
    setPenalties((prev) => { const next = [penalty, ...prev]; persistCollection('penalties', next); return next; });
    if (currentUser?.agencyId) savePenaltyToDb(penalty, currentUser.agencyId).catch(console.warn);
  };
  const handleDeletePenalty = (penaltyId: string) => {
    setPenalties((prev) => { const next = prev.filter((p) => p.id !== penaltyId); persistCollection('penalties', next); return next; });
    deletePenaltyFromDb(penaltyId).catch(console.warn);
  };
  const handleUpdatePenalty = (penalty: Penalty) => {
    setPenalties((prev) => { const next = prev.map((p) => (p.id === penalty.id ? penalty : p)); persistCollection('penalties', next); return next; });
  };

  // ============================================================
  // HANDLERS : ARCHIVES & ACTIVITY
  // ============================================================
  const handleArchiveRecord = (archive: ArchiveRecord) => {
    setArchives((prev) => { const next = [archive, ...prev]; persistCollection('archives', next); return next; });
    if (currentUser?.agencyId) saveArchiveToDb(archive, currentUser.agencyId).catch(console.warn);
  };
  const handleLogActivity = (activity: ActivityLog) => {
  console.log('📝 handleLogActivity REÇU:', activity.title);
  setActivityLogs((prev) => {
    const next = [activity, ...prev];
    persistCollection('activity_logs', next);
    return next;
  });
  if (currentUser?.agencyId) {
    saveActivityLogToDb(activity, currentUser.agencyId).catch(console.warn);
  }
};

  // ============================================================
  // HANDLERS : OWNER DEDUCTIONS
  // ============================================================
  const handleAddOwnerDeduction = (deduction: OwnerDeduction) => {
    setOwnerDeductions((prev) => { const next = [deduction, ...prev]; persistCollection('owner_deductions', next); return next; });
    if (currentUser?.agencyId) saveOwnerDeductionToDb(deduction, currentUser.agencyId).catch(console.warn);
  };
  const handleDeleteOwnerDeduction = (deductionId: string) => {
    setOwnerDeductions((prev) => { const next = prev.filter((d) => d.id !== deductionId); persistCollection('owner_deductions', next); return next; });
    deleteOwnerDeductionFromDb(deductionId).catch(console.warn);
  };

  // ============================================================
  // HANDLERS : BULLETINS
  // ============================================================
    const handleSaveBulletinVersement = (bulletin: BulletinVersement) => {
    const enrichedBulletin: BulletinVersement = {
      ...bulletin,
      createdById: bulletin.createdById || currentUser?.id,
      createdByNom: bulletin.createdByNom || (currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Système'),
      createdByRole: bulletin.createdByRole || currentUser?.role,
    };
    setBulletinsVersements((prev) => {
      const existing = prev.findIndex((b) => b.id === enrichedBulletin.id);
      const next = existing >= 0 ? prev.map((b) => (b.id === enrichedBulletin.id ? enrichedBulletin : b)) : [enrichedBulletin, ...prev];
      persistCollection('bulletin_versements', next);
      return next;
    });
    if (currentUser?.agencyId) saveBulletinVersementToDb(enrichedBulletin, currentUser.agencyId).catch(console.warn);
  };
  // ============================================================
  // HANDLERS : PAIEMENTS
  // ============================================================
       const handleAddPayment = (newPayment: Payment) => {
    // 🛡️ ANTI-DOUBLON NIVEAU 2 : blocage central AVANT toute création
    const existingPaid = payments.find(
      (p) =>
        p.locataireId === newPayment.locataireId &&
        p.periode === newPayment.periode &&
        p.statut === 'Payé'
    );

    if (existingPaid) {
      alert(
        `⛔ DOUBLON DÉTECTÉ — Paiement refusé\n\n` +
        `Un paiement de ${formatNumber(existingPaid.montantPaye)} FCFA existe déjà pour ce locataire (${existingPaid.periode}).\n\n` +
        `Quittance : ${existingPaid.quittanceNumero}\n` +
        `Date : ${existingPaid.datePaiement}\n\n` +
        `Pour éviter un double encaissement, ce paiement est bloqué.`
      );
      handleTriggerAuditLog(
        'PAYMENT_BLOCKED_DUPLICATE',
        'Paiements',
        `Tentative bloquée : ${newPayment.locataireNom} - ${newPayment.periode} - ${formatNumber(newPayment.montantPaye)} FCFA`,
        newPayment.quittanceNumero
      );
      return;
    }

    const existingPending = payments.find(
      (p) =>
        p.locataireId === newPayment.locataireId &&
        p.periode === newPayment.periode &&
        p.verificationStatut === 'en_attente'
    );

    if (existingPending) {
      alert(
        `⏳ Paiement déjà en attente\n\n` +
        `Un paiement de ${formatNumber(existingPending.montantPaye)} FCFA est déjà en attente de validation pour ce locataire.\n\n` +
        `Veuillez d'abord valider ou rejeter ce paiement avant d'en créer un nouveau.`
      );
      return;
    }

    // ✅ Pas de doublon → procéder normalement
    const enrichedPayment: Payment = {
      ...newPayment,
      createdById: newPayment.createdById || currentUser?.id,
      createdByNom: newPayment.createdByNom || (currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Système'),
      createdByRole: newPayment.createdByRole || currentUser?.role,
    };
    setPayments((prev) => { const next = [enrichedPayment, ...prev]; persistCollection('payments', next); return next; });
    if (currentUser?.agencyId) savePaymentToDb(enrichedPayment, currentUser.agencyId, currentUser.id).catch(console.warn);
    if (newPayment.modePaiement === 'Espèces' || newPayment.moyenPaiementCode === 'ESPECES') {
      const newCashEntry: CashMovement = {
        id: crypto.randomUUID(),
        type: 'ENCAISSEMENT',
        montant: newPayment.montantPaye,
        libelle: `Encaissement loyer ${newPayment.periode} - ${newPayment.locataireNom}`,
        dateHeure: new Date().toISOString().replace('T', ' ').substring(0, 16),
        auteurId: currentUser?.id,
        auteurNom: currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Système',
        justificatifRef: newPayment.quittanceNumero,
        moyenPaiementCode: 'ESPECES',
      };
      setCashMovements((prev) => { const next = [newCashEntry, ...prev]; persistCollection('cash_movements', next); return next; });
      if (currentUser?.agencyId) saveCashMovementToDb(newCashEntry, currentUser.agencyId).catch(console.warn);
    }

        setTenants((prev) => {
      const next = prev.map((t) => {
        if (t.id !== newPayment.locataireId) return t;

        const total = newPayment.montantTotal || 0;
        const paye = newPayment.montantPaye || 0;
        const percent = total > 0 ? (paye / total) * 100 : 0;

        // Option B : >= 50% = À jour
        let newStatut: 'À jour' | 'Retard' | 'Impayé';
        if (percent >= 100) {
          newStatut = 'À jour';
        } else if (percent >= 50) {
          newStatut = 'À jour'; // ACOMPTE accepté
        } else if (percent > 0) {
          newStatut = 'Retard';
        } else {
          newStatut = 'Impayé';
        }

        return {
          ...t,
          statut: newStatut,
          joursRetard: newStatut === 'À jour' ? 0 : t.joursRetard,
          arrieresCumules: Math.max(0, total - paye),
        };
      });
      persistCollection('tenants', next);
      return next;
    });

        // LOG ACTIVITÉ — toujours, même sans agencyId
    const activityEntry: ActivityLog = {
      id: crypto.randomUUID(),
      agencyId: currentUser?.agencyId || 'local',
      userId: currentUser?.id,
      userNom: currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Système',
      activityType: 'PAYMENT',
      entityType: 'payment',
      entityId: newPayment.id,
      entityRef: newPayment.quittanceNumero,
      title: `Paiement ${newPayment.statut} — ${newPayment.locataireNom}`,
      description: `${formatNumber(newPayment.montantPaye)} FCFA pour ${newPayment.bienNom}`,
      montant: newPayment.montantPaye,
      activityDate: new Date().toISOString().split('T')[0],
      activityHour: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
    };
    handleLogActivity(activityEntry);
    console.log('🔥 LOG ACTIVITÉ ENVOYÉ:', activityEntry.title);

    // MESSAGE DE SUCCÈS
    alert(`✅ Paiement enregistré !\n\nQuittance : ${newPayment.quittanceNumero}\nMontant : ${formatNumber(newPayment.montantPaye)} FCFA\nLocataire : ${newPayment.locataireNom}`);
  };

  const handleOpenMobileMoney = (tenant?: Tenant, amount?: number) => {
    const t = tenant || tenants[0];
    setMobileMoneyModalConfig({
      isOpen: true,
      tenantName: t ? `${t.prenom} ${t.nom}` : 'Client FITAL-IMMO',
      tenantPhone: t?.telephone || '+221 77 845 20 10',
      propertyNom: t?.bienNom || 'Résidence FITAL-IMMO',
      amount: amount || t?.arrieresCumules || t?.loyerMensuel || 250000,
      period: selectedPeriod,
      reference: `LOY-${(t?.nom || 'CLI').slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}`,
      tenantId: t?.id,
    });
  };

  const handleOpenQuickComms = (contact?: { name: string; phone: string; role?: string; propertyNom?: string; amount?: number; daysLate?: number; }) => {
    if (contact) {
      setQuickCommsModalConfig({ isOpen: true, recipientName: contact.name, recipientPhone: contact.phone, recipientRole: contact.role || 'Locataire', propertyNom: contact.propertyNom, dueAmount: contact.amount, daysLate: contact.daysLate });
    } else {
      const lateTenant = tenants.find((t) => t.statut === 'Retard') || tenants[0];
      setQuickCommsModalConfig({ isOpen: true, recipientName: lateTenant ? `${lateTenant.prenom} ${lateTenant.nom}` : 'Locataire FITAL-IMMO', recipientPhone: lateTenant?.telephone || '+221 77 845 20 10', recipientRole: 'Locataire', propertyNom: lateTenant?.bienNom || 'Logement Dakar', dueAmount: lateTenant?.arrieresCumules || lateTenant?.loyerMensuel || 150000, daysLate: lateTenant?.joursRetard || 0 });
    }
  };

    const handleConfirmMobileMoneyPayment = (amount: number, method: string, transactionId: string) => {
    const tId = mobileMoneyModalConfig?.tenantId;
    const tenant = tenants.find((t) => t.id === tId) || tenants[0];
    const property = properties.find((p) => p.id === tenant?.bienId);
    const owner = owners.find((o) => o.id === (property?.proprietaireId || tenant?.proprietaireId));
    if (!tenant || !property) { alert('❌ Impossible de valider le paiement : locataire ou bien introuvable.'); return; }

    // 🛡️ ANTI-DOUBLON AVANT CRÉATION
    const existingPayment = payments.find(
      (p) =>
        p.locataireId === tenant.id &&
        p.periode === selectedPeriod &&
        p.statut === 'Payé'
    );

    if (existingPayment) {
      alert(
        `⛔ PAIEMENT DÉJÀ ENREGISTRÉ\n\n` +
        `Un paiement de ${formatNumber(existingPayment.montantPaye)} FCFA existe déjà pour ${tenant.prenom} ${tenant.nom} (${selectedPeriod}).\n\n` +
        `Quittance : ${existingPayment.quittanceNumero}\n\n` +
        `Impossible de créer un doublon.`
      );
      setMobileMoneyModalConfig(null);
      return;
    }

    const pendingPayment = payments.find(
      (p) =>
        p.locataireId === tenant.id &&
        p.periode === selectedPeriod &&
        p.verificationStatut === 'en_attente'
    );

    if (pendingPayment) {
      alert(
        `⏳ PAIEMENT EN ATTENTE\n\n` +
        `Un paiement de ${formatNumber(pendingPayment.montantPaye)} FCFA est déjà en attente de validation.\n\n` +
        `Veuillez d'abord valider ou rejeter ce paiement.`
      );
      setMobileMoneyModalConfig(null);
      return;
    }

    // ✅ Aucun doublon → créer le paiement
    const newPayment: Payment = {
      id: crypto.randomUUID(),
      ref: transactionId || `PAY-MM-${Date.now().toString().slice(-6)}`,
      quittanceNumero: `QUITT-2026-${Math.floor(100 + Math.random() * 900)}`,
      locataireId: tenant.id,
      locataireNom: `${tenant.prenom} ${tenant.nom}`,
      bienId: property.id,
      bienNom: property.nom,
      proprietaireId: owner?.id || '',
      proprietaireNom: owner ? `${owner.prenom} ${owner.nom}` : 'Propriétaire',
      periode: selectedPeriod, // Toujours le mois actuel standardisé
      loyerBase: amount, charges: 0, tva: 0, tom: 0, penalites: 0,
      montantTotal: amount, montantPaye: amount, montantRestant: 0,
      modePaiement: 'Mobile Money',
      moyenPaiementCode: method === 'WAVE' ? 'WAVE' : 'ORANGE_MONEY',
      numeroTransaction: transactionId,
      datePaiement: new Date().toISOString().split('T')[0],
      statut: 'Payé',
      observation: `Règlement via ${method === 'WAVE' ? 'Wave' : 'Orange Money'} (Tx: ${transactionId})`,
      auteurId: currentUser?.id,
      auteurNom: currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Système',
      dateHeurePaiement: new Date().toISOString().replace('T', ' ').substring(0, 16),
      typeRecu: 'QUITTANCE',
    };
    handleAddPayment(newPayment);
    setMobileMoneyModalConfig(null);
  };

  const handleValidatePendingPayment = (paymentId: string) => {
    setPayments((prev) => {
      const next = prev.map((p) => p.id === paymentId ? { ...p, verificationStatut: 'valide' as const, statut: 'Payé' as const, dateValidation: new Date().toISOString().split('T')[0], valideParId: currentUser?.id, valideParNom: currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Système' } : p);
      persistCollection('payments', next);
      return next;
    });
    if (currentUser?.agencyId) validatePendingPaymentInDb(paymentId, currentUser.agencyId, currentUser.id).catch(console.warn);
  };

  const handleRejectPendingPayment = (paymentId: string, reason: string) => {
    setPayments((prev) => {
      const next = prev.map((p) => p.id === paymentId ? { ...p, verificationStatut: 'rejete' as const, statut: 'Impayé' as const, motifRejet: reason } : p);
      persistCollection('payments', next);
      return next;
    });
    if (currentUser?.agencyId) rejectPendingPaymentInDb(paymentId, currentUser.agencyId, reason).catch(console.warn);
  };

   const handleAddCashMovement = (mov: CashMovement) => {
    const enrichedMov: CashMovement = {
      ...mov,
      createdById: mov.createdById || currentUser?.id,
      createdByNom: mov.createdByNom || (currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Système'),
      createdByRole: mov.createdByRole || currentUser?.role,
    };
    setCashMovements((prev) => { const next = [enrichedMov, ...prev]; persistCollection('cash_movements', next); return next; });
    if (currentUser?.agencyId) saveCashMovementToDb(enrichedMov, currentUser.agencyId).catch(console.warn);
  };

  const handleAddCashClosing = (cls: CashClosing) => {
    setCashClosings((prev) => { const next = [cls, ...prev]; persistCollection('cash_closings', next); return next; });
    if (currentUser?.agencyId) saveCashClosingToDb(cls, currentUser.agencyId, currentUser.id, `${currentUser.prenom} ${currentUser.nom}`).catch(console.warn);
  };

  const handleUpdatePaymentMethod = (method: PaymentMethodConfig) => {
    setPaymentMethods((prev) => { const next = prev.map((m) => (m.id === method.id ? method : m)); persistCollection('payment_methods', next); return next; });
    savePaymentMethodToDb(method, currentUser?.agencyId).catch(console.warn);
  };

  const handleAddPaymentMethod = (method: PaymentMethodConfig) => {
    setPaymentMethods((prev) => { const next = [...prev, method]; persistCollection('payment_methods', next); return next; });
    savePaymentMethodToDb(method, currentUser?.agencyId).catch(console.warn);
  };

  const handleAddUser = async (user: UserAccount): Promise<{ success: boolean; error?: string }> => {
    let agencyId = currentUser?.agencyId;
    if (isSupabaseConfigured && supabase && (!agencyId || agencyId.startsWith('agency-'))) {
      const agency = await getOrCreateDefaultAgency();
      if (agency) agencyId = agency.id;
    }
    if (isSupabaseConfigured && agencyId && !agencyId.startsWith('agency-')) {
      const result = await createUserAccountInSupabase({
        email: user.email, password: user.password || `Pass${Date.now()}!`,
        nom: user.nom, prenom: user.prenom, telephone: user.telephone,
        role: user.role, agencyId, permissions: user.permissions,
        proprietaireId: user.proprietaireId, locataireId: user.locataireId,
        organisation: user.organisation, avatar: user.avatar,
      });
      if (result.success && result.user) {
        setUsers((prev) => { const next = [result.user!, ...prev.filter((u) => u.email !== user.email)]; persistCollection('users', next); return next; });
        return { success: true };
      }
      return { success: false, error: result.error };
    }
    setUsers((prev) => { const next = [user, ...prev]; persistCollection('users', next); return next; });
    return { success: true, error: isSupabaseConfigured ? undefined : 'Compte local.' };
  };

  const handleAddProperty = (newProperty: Property) => {
    setProperties((prev) => { const next = [newProperty, ...prev]; persistCollection('properties', next); return next; });
    if (currentUser?.agencyId) savePropertyToDb(newProperty, currentUser.agencyId).catch(console.warn);
  };
  const handleUpdateProperty = (updatedProperty: Property) => {
    setProperties((prev) => { const next = prev.map((p) => (p.id === updatedProperty.id ? updatedProperty : p)); persistCollection('properties', next); return next; });
    if (currentUser?.agencyId) savePropertyToDb(updatedProperty, currentUser.agencyId).catch(console.warn);
  };
  const handleDeleteProperty = (propertyId: string) => {
    setProperties((prev) => { const next = prev.filter((p) => p.id !== propertyId); persistCollection('properties', next); return next; });
    softDeleteRecord('properties', propertyId).catch(console.warn);
  };

   const handleAddContract = (newContract: LeaseContract) => {
    const enrichedContract: LeaseContract = {
      ...newContract,
      createdById: newContract.createdById || currentUser?.id,
      createdByNom: newContract.createdByNom || (currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Système'),
      createdByRole: newContract.createdByRole || currentUser?.role,
    };
    setContracts((prev) => { const next = [enrichedContract, ...prev]; persistCollection('contracts', next); return next; });
    if (currentUser?.agencyId) saveContractToDb(enrichedContract, currentUser.agencyId).catch(console.warn);
  };
  const handleUpdateContract = (updatedContract: LeaseContract) => {
    setContracts((prev) => { const next = prev.map((c) => (c.id === updatedContract.id ? updatedContract : c)); persistCollection('contracts', next); return next; });
    if (currentUser?.agencyId) saveContractToDb(updatedContract, currentUser.agencyId).catch(console.warn);
  };

        const handleAddTenant = (newTenant: Tenant) => {
    // 🛡️ ANTI-DOUBLON : vérifier que le bien n'est pas déjà occupé
    const existingUnit = units.find((u) => u.id === newTenant.bienId);
    const existingProp = properties.find((p) => p.id === newTenant.bienId);

    if (existingUnit && existingUnit.statut === 'Occupé' && existingUnit.locataireActuelId !== newTenant.id) {
      alert(`⛔ Le bien ${existingUnit.nom} est déjà occupé.`);
      return;
    }
    if (existingProp && existingProp.statut === 'Occupé' && existingProp.locataireActuelNom && existingProp.locataireActuelNom !== `${newTenant.prenom} ${newTenant.nom}`) {
      alert(`⛔ Le bien ${existingProp.nom} est déjà occupé.`);
      return;
    }

    // 🛡️ ANTI-DOUBLON : vérifier que le locataire n'occupe pas déjà un autre bien
    const existingActiveLease = tenants.find(
      (t) => 
        t.nom?.toLowerCase() === newTenant.nom?.toLowerCase() &&
        t.prenom?.toLowerCase() === newTenant.prenom?.toLowerCase() &&
        t.cni === newTenant.cni &&
        t.bienId !== newTenant.bienId &&
        !t.dateSortie
    );

    if (existingActiveLease) {
      alert(
        `⛔ LOCATAIRE DÉJÀ ACTIF\n\n` +
        `${newTenant.prenom} ${newTenant.nom} (CNI : ${newTenant.cni}) occupe déjà : ${existingActiveLease.bienNom}`
      );
      return;
    }

    // ✅ Pas de doublon → procéder normalement
    setTenants((prev) => { const next = [newTenant, ...prev]; persistCollection('tenants', next); return next; });
    if (currentUser?.agencyId) saveTenantToDb(newTenant, currentUser.agencyId).catch(console.warn);
    
    if (newTenant.bienId) {
      // Vérifier si c'est une PROPERTY
      const existingProp = properties.find((p) => p.id === newTenant.bienId);
      if (existingProp) {
        setProperties((prev) => {
          const next = prev.map((p) => {
            if (p.id === newTenant.bienId) {
              const updatedP = { ...p, statut: 'Occupé' as const, locataireActuelNom: `${newTenant.prenom} ${newTenant.nom}`, locataireActuelId: newTenant.id };
              if (currentUser?.agencyId) savePropertyToDb(updatedP, currentUser.agencyId).catch(console.warn);
              return updatedP;
            }
            return p;
          });
          persistCollection('properties', next);
          return next;
        });
        return;
      }
      
      // Sinon, vérifier si c'est une UNIT
      const existingUnit = units.find((u) => u.id === newTenant.bienId);
      if (existingUnit) {
        setUnits((prev) => {
          const next = prev.map((u) => {
            if (u.id === newTenant.bienId) {
              const updatedU = { 
                ...u, 
                statut: 'Occupé' as const, 
                locataireActuelId: newTenant.id,
                locataireActuelNom: `${newTenant.prenom} ${newTenant.nom}` 
              };
              if (currentUser?.agencyId) saveUnitToDb(updatedU, currentUser.agencyId).catch(console.warn);
              return updatedU;
            }
            return u;
          });
          persistCollection('units', next);
          return next;
        });
      }
    }
  };

   const handleCompleteNewTenantWizard = async (data: { tenant: Tenant; contract: LeaseContract; inspection: Inspection; }) => {
  if (!currentUser?.agencyId || !supabase) return;

  // 🛡️ ANTI-DOUBLON 1 : Le bien est-il déjà occupé ?
  const existingUnit = units.find((u) => u.id === data.tenant.bienId);
  const existingProp = properties.find((p) => p.id === data.tenant.bienId);

  if (existingUnit && existingUnit.statut === 'Occupé') {
    alert(
      `⛔ CE BIEN EST DÉJÀ OCCUPÉ\n\n` +
      `L'unité ${existingUnit.nom} est déjà louée par ${existingUnit.locataireActuelNom || 'un autre locataire'}.\n\n` +
      `Veuillez d'abord enregistrer la sortie de ce locataire avant d'en créer un nouveau.`
    );
    return;
  }
  if (existingProp && existingProp.statut === 'Occupé') {
    alert(
      `⛔ CE BIEN EST DÉJÀ OCCUPÉ\n\n` +
      `Le bien ${existingProp.nom} est déjà loué par ${existingProp.locataireActuelNom || 'un autre locataire'}.\n\n` +
      `Veuillez d'abord enregistrer la sortie de ce locataire avant d'en créer un nouveau.`
    );
    return;
  }

  // 🛡️ ANTI-DOUBLON 2 : Ce locataire occupe-t-il déjà un autre bien ?
  const existingActiveLease = tenants.find(
    (t) => 
      t.nom?.toLowerCase() === data.tenant.nom?.toLowerCase() &&
      t.prenom?.toLowerCase() === data.tenant.prenom?.toLowerCase() &&
      t.cni === data.tenant.cni &&
      t.bienId !== data.tenant.bienId &&
      !t.dateSortie
  );

  if (existingActiveLease) {
    alert(
      `⛔ LOCATAIRE DÉJÀ ACTIF\n\n` +
      `${data.tenant.prenom} ${data.tenant.nom} (CNI : ${data.tenant.cni}) occupe déjà :\n` +
      `${existingActiveLease.bienNom}\n\n` +
      `Un locataire ne peut occuper qu'un seul bien à la fois.\n\n` +
      `Si c'est une erreur, enregistrez d'abord sa sortie de l'autre bien.`
    );
    return;
  }

  // ✅ Pas de doublon → procéder normalement
  const tenantResult = await saveTenantToDb(data.tenant, currentUser.agencyId);
  if (!tenantResult.success) { 
    alert('Erreur création locataire : ' + tenantResult.error); 
    return; 
  }
  const realTenantId = tenantResult.data?.id || data.tenant.id;
  const tenantToSave = { ...data.tenant, id: realTenantId };
  const contractToSave = { ...data.contract, locataireId: realTenantId };
  const inspectionToSave = { ...data.inspection, locataireId: realTenantId };

  await saveContractToDb(contractToSave, currentUser.agencyId);
  await saveInspectionToDb(inspectionToSave, currentUser.agencyId);

  // Mettre à jour UNIT ou PROPERTY
  if (existingUnit) {
    const updatedU = {
      ...existingUnit,
      statut: 'Occupé' as const,
      locataireActuelId: realTenantId,
      locataireActuelNom: `${data.tenant.prenom} ${data.tenant.nom}`,
    };
    await saveUnitToDb(updatedU, currentUser.agencyId);
    setUnits((prev) => prev.map((u) => (u.id === updatedU.id ? updatedU : u)));
    } else if (existingProp) {
    const updatedP = {
      ...existingProp,
      statut: 'Occupé' as const,
      locataireActuelNom: `${data.tenant.prenom} ${data.tenant.nom}`,
      locataireActuelId: realTenantId,
    };
    await savePropertyToDb(updatedP, currentUser.agencyId);
    setProperties((prev) => prev.map((p) => (p.id === updatedP.id ? updatedP : p)));
  }

  setTenants((prev) => [tenantToSave, ...prev]);
  setContracts((prev) => [contractToSave, ...prev]);
  setInspections((prev) => [inspectionToSave, ...prev]);
};

    const handleCompleteTenantExit = async (data: { tenantId: string; bienId: string; dateSortie: string; inspection: Inspection; retenueCaution: number; restitutionCaution: number; }) => {
    if (!currentUser?.agencyId) return;

    // 1. Locataire — sauvegarder en DB
    const tenantToUpdate = tenants.find((t) => t.id === data.tenantId);
    if (tenantToUpdate) {
      const updatedTenant = {
        ...tenantToUpdate,
        statut: 'À jour' as const,
        dateSortie: data.dateSortie,
      };
      const res = await saveTenantToDb(updatedTenant, currentUser.agencyId);
      if (res.success) {
        setTenants((prev) => prev.map((t) => (t.id === data.tenantId ? updatedTenant : t)));
      }
    }

    // 2. Bien ou Unit — sauvegarder en DB
    const property = properties.find((p) => p.id === data.bienId);
    const unit = units.find((u) => u.id === data.bienId);

        if (property) {
      const updatedProp = { ...property, statut: 'Vacant' as const, locataireActuelNom: undefined, locataireActuelId: undefined };
      const res = await savePropertyToDb(updatedProp, currentUser.agencyId);
      if (res.success) {
        setProperties((prev) => prev.map((p) => (p.id === data.bienId ? updatedProp : p)));
      }
    } else if (unit) {
      const updatedUnit = { ...unit, statut: 'Vacant' as const, locataireActuelId: undefined, locataireActuelNom: undefined };
      const res = await saveUnitToDb(updatedUnit, currentUser.agencyId);
      if (res.success) {
        setUnits((prev) => prev.map((u) => (u.id === data.bienId ? updatedUnit : u)));
      }
    }

    // 3. Inspection — sauvegarder en DB
    const inspRes = await saveInspectionToDb(data.inspection, currentUser.agencyId);
    if (inspRes.success && inspRes.data) {
      setInspections((prev) => [inspRes.data!, ...prev]);
    } else {
      setInspections((prev) => [data.inspection, ...prev]);
    }
  };

  const handleAddOwner = (newOwner: Owner) => {
    setOwners((prev) => { const next = [newOwner, ...prev]; persistCollection('owners', next); return next; });
    if (currentUser?.agencyId) saveOwnerToDb(newOwner, currentUser.agencyId).catch(console.warn);
  };
  const handleAddReminder = (newReminder: TenantReminder) => {
    setReminders((prev) => { const next = [newReminder, ...prev]; persistCollection('reminders', next); return next; });
    if (currentUser?.agencyId) saveReminderToDb(newReminder, currentUser.agencyId).catch(console.warn);
  };
  
   const handleAddInspection = (newInspection: Inspection) => {
    const enrichedInspection: Inspection = {
      ...newInspection,
      createdById: newInspection.createdById || currentUser?.id,
      createdByNom: newInspection.createdByNom || (currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Système'),
      createdByRole: newInspection.createdByRole || currentUser?.role,
    };
    setInspections((prev) => { const next = [enrichedInspection, ...prev]; persistCollection('inspections', next); return next; });
    if (currentUser?.agencyId) saveInspectionToDb(enrichedInspection, currentUser.agencyId).catch(console.warn);
  };
  const handleAddTicket = (newTicket: MaintenanceTicket) => {
    const enrichedTicket: MaintenanceTicket = {
      ...newTicket,
      createdById: newTicket.createdById || currentUser?.id,
      createdByNom: newTicket.createdByNom || (currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Système'),
      createdByRole: newTicket.createdByRole || currentUser?.role,
    };
    setMaintenance((prev) => { const next = [enrichedTicket, ...prev]; persistCollection('maintenance', next); return next; });
    if (currentUser?.agencyId) saveMaintenanceToDb(enrichedTicket, currentUser.agencyId).catch(console.warn);
  };
  const handleUpdateTicket = (updatedTicket: MaintenanceTicket) => {
    setMaintenance((prev) => { const next = prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t)); persistCollection('maintenance', next); return next; });
    if (currentUser?.agencyId) saveMaintenanceToDb(updatedTicket, currentUser.agencyId).catch(console.warn);
  };
  const handleAddDisbursement = (newDisbursement: OwnerDisbursement) => {
    const enrichedDisbursement: OwnerDisbursement = {
      ...newDisbursement,
      createdById: newDisbursement.createdById || currentUser?.id,
      createdByNom: newDisbursement.createdByNom || (currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Système'),
      createdByRole: newDisbursement.createdByRole || currentUser?.role,
    };
    setDisbursements((prev) => { const next = [enrichedDisbursement, ...prev]; persistCollection('disbursements', next); return next; });
    if (currentUser?.agencyId) saveDisbursementToDb(enrichedDisbursement, currentUser.agencyId).catch(console.warn);
  };
   const handleAddInvoice = (newInvoice: Invoice) => {
    const enrichedInvoice: Invoice = {
      ...newInvoice,
      createdById: newInvoice.createdById || currentUser?.id,
      createdByNom: newInvoice.createdByNom || (currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Système'),
      createdByRole: newInvoice.createdByRole || currentUser?.role,
    };
    setInvoices((prev) => { const next = [enrichedInvoice, ...prev]; persistCollection('invoices', next); return next; });
    if (currentUser?.agencyId) saveInvoiceToDb(enrichedInvoice, currentUser.agencyId).catch(console.warn);
  };
  const handleSaveSettings = (newSettings: AgencySettings) => {
    setSettings(newSettings);
    persistCollection('settings', newSettings);
    if (currentUser?.agencyId) saveSettingsToDb(newSettings, currentUser.agencyId).catch(console.warn);
  };
  const handleOpenQuickReminder = (tenant: Tenant) => { setActiveTab('reminders'); };
  const handleOpenNewPaymentForTenant = (tenant?: Tenant) => {
  if (tenant) {
    setInitialTenantForPayment(tenant);
  } else {
    setInitialTenantForPayment(null);
  }
  setIsNewPaymentModalOpen(true);
  setActiveTab('payments');
};
  const handleOpenBulletinVersement = (owner: Owner) => { setOwnerBulletinModalOwner(owner); };

  const unpaidCount = tenants.filter((t) => t.statut === 'Impayé' || t.statut === 'Retard').length;
  const pendingPaymentsCount = payments.filter((p) => p.verificationStatut === 'en_attente').length;

  // SCOPED DATA
    const scopedProperties = (() => {
    if (currentUser?.role === 'PROPRIETAIRE') return properties.filter((p) => p.proprietaireId === currentUser.proprietaireId);
    if (currentUser?.role === 'LOCATAIRE') { 
      const myTenant = tenants.find((t) => t.id === currentUser.locataireId); 
      return myTenant ? properties.filter((p) => p.id === myTenant.bienId) : []; 
    }
    return properties;
  })();

  // Pour le propriétaire, les "biens" incluent properties + units
  const scopedPropertiesOrUnits = (() => {
    if (currentUser?.role === 'PROPRIETAIRE') {
      return properties.filter((p) => p.proprietaireId === currentUser.proprietaireId);
    }
    return properties;
  })();
  const scopedBuildings = (() => {
    if (currentUser?.role === 'PROPRIETAIRE') return buildings.filter((b) => b.proprietaireId === currentUser.proprietaireId);
    return buildings;
  })();
  const scopedUnits = (() => {
    if (currentUser?.role === 'PROPRIETAIRE') return units.filter((u) => u.proprietaireId === currentUser.proprietaireId);
    if (currentUser?.role === 'LOCATAIRE') { const myTenant = tenants.find((t) => t.id === currentUser.locataireId); if (myTenant) return units.filter((u) => u.buildingId === myTenant.bienId || u.locataireActuelId === myTenant.id); }
    return units;
  })();
        const scopedTenants = (() => {
    if (currentUser?.role === 'PROPRIETAIRE') {
      // Inclure les biens (properties) ET les espaces (units) du propriétaire
      const myProps = properties.filter((p) => p.proprietaireId === currentUser.proprietaireId);
      const myUnits = units.filter((u) => u.proprietaireId === currentUser.proprietaireId);
      const myBienIds = [...myProps.map((p) => p.id), ...myUnits.map((u) => u.id)];
      const filtered = tenants.filter((t) => myBienIds.includes(t.bienId) || t.proprietaireId === currentUser.proprietaireId);
      
      // 🔒 ANONYMISATION : on ne transmet que le nom, pas les infos perso/statut
      return filtered.map((t) => ({
        ...t,
        telephone: '',
        email: '',
        cni: '',
        typePiece: undefined,
        profession: '',
        employeur: '',
        revenuMensuel: 0,
        statut: 'À jour' as const,   // Neutralise le statut
        joursRetard: 0,
        arrieresCumules: 0,
        observations: '',
        conjointNom: '',
        conjointTelephone: '',
      }));
    }
    if (currentUser?.role === 'LOCATAIRE') return tenants.filter((t) => t.id === currentUser.locataireId);
    return tenants;
  })();
   const scopedPayments = (() => {
    if (currentUser?.role === 'PROPRIETAIRE') return []; // 🔒 Le propriétaire ne voit AUCUN paiement
    if (currentUser?.role === 'LOCATAIRE') return payments.filter((p) => p.locataireId === currentUser.locataireId);
    if (currentUser?.role === 'AGENT') return [];
    return payments;
  })();
  const scopedContracts = (() => {
    if (currentUser?.role === 'PROPRIETAIRE') return contracts.filter((c) => c.proprietaireId === currentUser.proprietaireId);
    if (currentUser?.role === 'LOCATAIRE') return contracts.filter((c) => c.locataireId === currentUser.locataireId);
    return contracts;
  })();
    const scopedInspections = (() => {
    if (currentUser?.role === 'PROPRIETAIRE') {
      const myProps = properties.filter((p) => p.proprietaireId === currentUser.proprietaireId);
      const myUnits = units.filter((u) => u.proprietaireId === currentUser.proprietaireId);
      const myBienIds = [...myProps.map((p) => p.id), ...myUnits.map((u) => u.id)];
      return inspections.filter((i) => myBienIds.includes(i.bienId));
    }
    if (currentUser?.role === 'LOCATAIRE') return inspections.filter((i) => i.locataireId === currentUser.locataireId);
    return inspections;
  })();
   const scopedMaintenance = (() => {
    if (currentUser?.role === 'PROPRIETAIRE') {
      const myProps = properties.filter((p) => p.proprietaireId === currentUser.proprietaireId);
      const myUnits = units.filter((u) => u.proprietaireId === currentUser.proprietaireId);
      const myBienIds = [...myProps.map((p) => p.id), ...myUnits.map((u) => u.id)];
      return maintenance.filter((m) => myBienIds.includes(m.bienId));
    }
    if (currentUser?.role === 'LOCATAIRE') { const myTenant = tenants.find((t) => t.id === currentUser.locataireId); return myTenant ? maintenance.filter((m) => m.bienId === myTenant.bienId) : []; }
    return maintenance;
  })();
  const scopedDisbursements = (() => {
    if (currentUser?.role === 'PROPRIETAIRE') return disbursements.filter((d) => d.proprietaireId === currentUser.proprietaireId);
    if (currentUser?.role === 'AGENT' || currentUser?.role === 'LOCATAIRE') return [];
    return disbursements;
  })();
  
  if (isResetPasswordMode) {
    return (
      <ResetPasswordView
        onSuccess={() => {
          setIsResetPasswordMode(false);
          window.location.hash = '';
        }}
      />
    );
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#0A111D] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#C9A96E]/30 border-t-[#C9A96E] rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#A8B4C4] font-medium tracking-wide">Chargement sécurisé de FITAL-IMMO...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginView
        availableUsers={users}
        onLoginSuccess={async (user) => {
          let resolvedUser = user;
          if (isSupabaseConfigured && user.agencyId && !user.agencyId.startsWith('agency-')) {
            const cloudUsers = await fetchAgencyUsers(user.agencyId);
            if (cloudUsers.length > 0) {
              setUsers(cloudUsers);
              persistCollection('users', cloudUsers);
            }
          } else if (isSupabaseConfigured) {
            const agency = await getOrCreateDefaultAgency();
            if (agency) {
              resolvedUser = { ...user, agencyId: agency.id };
            }
          }
          setCurrentUser(resolvedUser);
          persistCollection('current_user', resolvedUser);
          localStorage.setItem('fital_immo_user', JSON.stringify(resolvedUser));
          setUsers((prev) => {
            const next = prev.some((u) => u.id === resolvedUser.id) ? prev : [resolvedUser, ...prev];
            persistCollection('users', next);
            return next;
          });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0A111D] text-[#F0EDE8] flex font-sans antialiased selection:bg-[#C9A96E]/30 selection:text-[#E8D5B0]">
          <Sidebar
        activeTab={activeTab}
        setActiveTab={handleSafeTabChange}
        unpaidCount={unpaidCount}
        settings={settings}
        urgentMaintenanceCount={maintenance.filter((m) => m.priorite === 'Urgente').length}
        currentUser={{
          ...currentUser,
          __ownerBuildingsCount: currentUser.role === 'PROPRIETAIRE'
            ? buildings.filter((b) => b.proprietaireId === currentUser.proprietaireId).length
            : buildings.length,
          __ownerUnitsCount: currentUser.role === 'PROPRIETAIRE'
            ? units.filter((u) => u.proprietaireId === currentUser.proprietaireId).length
            : units.length,
        } as any}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        pendingPaymentsCount={pendingPaymentsCount}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        <Topbar
          activeTab={activeTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenNewPayment={() => handleOpenNewPaymentForTenant()}
          onOpenNewProperty={() => setIsNewPropertyModalOpen(true)}
          onOpenNewTenant={() => setIsNewTenantWizardOpen(true)}
          onOpenReminders={() => handleSafeTabChange('reminders')}
          selectedPeriod={selectedPeriod}
          setSelectedPeriod={setSelectedPeriod}
          unpaidCount={unpaidCount}
          currentUser={currentUser}
          allUsers={users}
          onSwitchUser={handleSwitchUser}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onSignOut={handleSignOut}
          notificationsList={notifications}
          onToggleMobileMenu={() => setIsMobileSidebarOpen((prev) => !prev)}
          onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
          onOpenQuickComms={() => handleOpenQuickComms()}
          onOpenMobileMoney={() => handleOpenMobileMoney()}
        />

        <main className="flex-1 p-3.5 sm:p-5 md:p-8 pb-24 md:pb-8 max-w-[1600px] w-full mx-auto">
          {activeTab === 'dashboard' && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') && (
            <DashboardView
              properties={properties}
              tenants={tenants}
              payments={payments}
              maintenance={maintenance}
              setActiveTab={handleSafeTabChange}
              onOpenReceipt={(payment) => setReceiptModalPayment(payment)}
              onOpenQuickReminder={handleOpenQuickReminder}
              onOpenNewPayment={() => handleOpenNewPaymentForTenant()}
              onOpenNewProperty={() => setIsNewPropertyModalOpen(true)}
              selectedPeriod={selectedPeriod}
              setSelectedPeriod={setSelectedPeriod}
            />
          )}

          {activeTab === 'dashboard' && currentUser.role === 'CAISSIER' && (
            <CashierDashboardView
              payments={payments}
              tenants={tenants}
              owners={owners}
              cashMovements={cashMovements}
              cashClosings={cashClosings}
              paymentMethods={paymentMethods}
              onOpenNewPayment={() => handleOpenNewPaymentForTenant()}
              onOpenReceipt={(payment) => setReceiptModalPayment(payment)}
              setActiveTab={handleSafeTabChange}
            />
          )}

          {activeTab === 'dashboard' && currentUser.role === 'PROPRIETAIRE' && (
            <OwnerDashboardView
              currentUser={currentUser}
              owner={owners.find((o) => o.id === currentUser.proprietaireId) || owners[0]}
              properties={scopedProperties}
              tenants={scopedTenants}
              payments={scopedPayments}
              maintenance={scopedMaintenance}
              disbursements={scopedDisbursements}
              cashVouchers={cashVouchers.filter((v) => v.proprietaireId === currentUser.proprietaireId || !currentUser.proprietaireId)}
              onOpenReceipt={(payment) => setReceiptModalPayment(payment)}
              onOpenOwnerSlip={(owner) => setOwnerSlipModalOwner(owner)}
            />
          )}

          {activeTab === 'dashboard' && currentUser.role === 'LOCATAIRE' && (
            <TenantDashboardView
              currentUser={currentUser}
              tenant={tenants.find((t) => t.id === currentUser.locataireId) || tenants[0]}
              property={properties.find((p) => p.id === (currentUser.bienId || tenants.find((t) => t.id === currentUser.locataireId)?.bienId))}
              contract={contracts.find((c) => c.locataireId === currentUser.locataireId)}
              payments={scopedPayments}
              inspections={scopedInspections}
              maintenance={scopedMaintenance}
              onOpenReceipt={(payment) => setReceiptModalPayment(payment)}
            />
          )}

          {activeTab === 'dashboard' && currentUser.role === 'AGENT' && (
            <AgentDashboardView
              currentUser={currentUser}
              properties={properties}
              tenants={tenants}
              inspections={scopedInspections}
              maintenance={scopedMaintenance}
              reminders={reminders}
              onOpenInspectionModal={() => handleSafeTabChange('inspections')}
              onOpenMaintenanceModal={() => handleSafeTabChange('maintenance')}
              setActiveTab={handleSafeTabChange}
            />
          )}

          {activeTab === 'dashboard' && currentUser.role === 'GESTIONNAIRE' && (
            <ManagerDashboardView
              properties={properties}
              tenants={tenants}
              owners={owners}
              contracts={contracts}
              payments={payments}
              maintenance={scopedMaintenance}
              reminders={reminders}
              onOpenNewContract={() => handleSafeTabChange('contracts')}
              onOpenNewTenant={() => setIsNewTenantWizardOpen(true)}
              onOpenNewReminder={() => handleSafeTabChange('reminders')}
              setActiveTab={handleSafeTabChange}
            />
          )}
          {activeTab === 'saas-admin' && currentUser.role === 'SUPER_ADMIN_SAAS' && (
            <SuperAdminDashboard currentUser={currentUser} />
          )}

                    {activeTab === 'admin-control' && (
            <AdminControlCenterView
              users={users}
              properties={properties}
              owners={owners}
              tenants={tenants}
              payments={payments}
              cashMovements={cashMovements}
              cashClosings={cashClosings}
              paymentMethods={paymentMethods}
              auditLogs={auditLogs}
              settings={settings}
              maintenance={maintenance}
              buildings={buildings}
              units={units}
              contracts={contracts}
              invoices={invoices}
              disbursements={disbursements}
              bulletins={bulletinsVersements}
              ownerDeductions={ownerDeductions}
              ownerCharges={ownerCharges}
              inspections={inspections}
              activityLogs={activityLogs}
              reminders={reminders}
              penalties={penalties}
              archives={archives}
              notifications={notifications}
              onTriggerAuditLog={handleTriggerAuditLog}
            />
          )}

          {activeTab === 'admin-journal' && (
            <AdminActivityJournalView auditLogs={auditLogs} onTriggerAuditLog={handleTriggerAuditLog} />
          )}

          {activeTab === 'admin-users' && (
            <AdminUsersView
              users={users}
              currentUser={currentUser}
              owners={owners}
              tenants={tenants}
              properties={properties}
              buildings={buildings}
              onAddUser={handleAddUser}
              isSupabaseOnline={isSupabaseConfigured}
              onUpdateUser={(updatedUser) => {
                setUsers((prev) => {
                  const next = prev.map((u) => (u.id === updatedUser.id ? updatedUser : u));
                  persistCollection('users', next);
                  return next;
                });
                saveUserToDb(updatedUser, currentUser.agencyId).catch(console.warn);
              }}
              onSwitchActiveUser={handleSwitchUser}
            />
          )}

         {activeTab === 'archives' && (
  <ArchiveView
    currentUser={currentUser}
    tenants={tenants}
    owners={owners}
    properties={properties}
    buildings={buildings}
    units={units}
    contracts={contracts}
    payments={payments}
    disbursements={disbursements}
    inspections={inspections}
    maintenance={maintenance}
    invoices={invoices}
    bulletins={bulletinsVersements}
  />
)}

          {activeTab === 'activity-logs' && (
            <ActivityLogView activities={activityLogs} currentUser={currentUser} />
          )}

          {activeTab === 'penalties' && (
            <PenaltiesView
              penalties={penalties}
              tenants={scopedTenants}
              payments={scopedPayments}
              currentUser={currentUser}
              onAddPenalty={handleAddPenalty}
              onDeletePenalty={handleDeletePenalty}
              onUpdatePenalty={handleUpdatePenalty}
            />
          )}

          {activeTab === 'caisse' && (
            <CashRegisterView
              cashMovements={cashMovements}
              cashClosings={cashClosings}
              currentUser={currentUser}
              onAddCashMovement={handleAddCashMovement}
              onAddCashClosing={handleAddCashClosing}
            />
          )}

          {activeTab === 'pending-payments' && (
            <PendingPaymentsView
              payments={payments}
              currentUser={currentUser}
              onValidatePayment={handleValidatePendingPayment}
              onRejectPayment={handleRejectPendingPayment}
              onOpenReceipt={(payment) => setReceiptModalPayment(payment)}
            />
          )}

          {activeTab === 'payment-methods' && (
            <PaymentMethodsConfigView
              paymentMethods={paymentMethods}
              settings={settings}
              onUpdatePaymentMethod={handleUpdatePaymentMethod}
              onAddPaymentMethod={handleAddPaymentMethod}
            />
          )}

          {activeTab === 'payment-reports' && (
            <PaymentMethodReportsView
              payments={payments}
              paymentMethods={paymentMethods}
              owners={owners}
              properties={properties}
              tenants={tenants}
            />
          )}

          {activeTab === 'recovery' && (
            <RecoveryTrackerView
              properties={scopedProperties}
              owners={owners}
              tenants={scopedTenants}
              payments={scopedPayments}
              selectedPeriod={selectedPeriod}
              onOpenQuickReminder={handleOpenQuickReminder}
              onOpenNewPayment={handleOpenNewPaymentForTenant}
              onOpenOwnerSlip={(owner) => setOwnerSlipModalOwner(owner)}
              onAddPayment={handleAddPayment}
            />
          )}

          {activeTab === 'reminders' && (
                        <AutomatedRemindersView
              tenants={scopedTenants}
              properties={scopedProperties}
              payments={scopedPayments}
              reminders={reminders}
              onAddReminder={handleAddReminder}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsView
              payments={scopedPayments}
              tenants={scopedTenants}
              properties={scopedProperties}
              owners={owners}
              currentUser={currentUser || undefined}
              settings={settings}
              onAddPayment={handleAddPayment}
              onOpenReceipt={(payment) => setReceiptModalPayment(payment)}
              isNewPaymentModalOpen={isNewPaymentModalOpen}
              setIsNewPaymentModalOpen={setIsNewPaymentModalOpen}
              initialTenantForPayment={initialTenantForPayment}
            />
          )}

          {activeTab === 'buildings' && (
            <BuildingsView
              buildings={scopedBuildings}
              units={scopedUnits}
              owners={owners}
              currentUser={currentUser}
              onAddBuilding={handleAddBuilding}
              onUpdateBuilding={handleUpdateBuilding}
              onDeleteBuilding={handleDeleteBuilding}
              onSelectBuilding={() => handleSafeTabChange('units')}
            />
          )}

          {activeTab === 'units' && (
            <UnitsView
              units={scopedUnits}
              buildings={scopedBuildings}
              owners={owners}
              tenants={scopedTenants}
              currentUser={currentUser}
              onAddUnit={handleAddUnit}
              onUpdateUnit={handleUpdateUnit}
              onDeleteUnit={handleDeleteUnit}
            />
          )}

          {activeTab === 'properties' && (
            <PropertiesView
              properties={scopedProperties}
              owners={owners}
              tenants={scopedTenants}
              currentUser={currentUser}
              onAddProperty={handleAddProperty}
              onUpdateProperty={handleUpdateProperty}
              onDeleteProperty={handleDeleteProperty}
              isNewPropertyModalOpen={isNewPropertyModalOpen}
              setIsNewPropertyModalOpen={setIsNewPropertyModalOpen}
            />
          )}

          {activeTab === 'tenants' && (
            <div className="space-y-4">
             {['ADMIN', 'SUPER_ADMIN', 'GESTIONNAIRE'].includes(currentUser.role) && (
  <div className="flex justify-end gap-3">
    <button
      onClick={() => setIsNewTenantWizardOpen(true)}
      className="px-4 py-2.5 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer flex items-center gap-2"
    >
      <span>✨ Assistant Nouveau Locataire (7 Étapes)</span>
    </button>
  </div>
)}
                            <TenantsView
                tenants={scopedTenants}
                properties={scopedProperties}
                units={scopedUnits}
                payments={scopedPayments}
                currentUser={currentUser}
                onOpenQuickReminder={handleOpenQuickReminder}
                onOpenNewPayment={handleOpenNewPaymentForTenant}
                onAddTenant={handleAddTenant}
                onOpenMobileMoney={(tenant) => handleOpenMobileMoney(tenant)}
                onAddPayment={handleAddPayment}
                onInitiateExit={(tenant) => setTenantExitTarget(tenant)}
              />
            </div>
          )}

          {activeTab === 'owners' && (
            <OwnersView
              owners={owners}
              properties={properties}
              buildings={buildings}
              units={units}
              payments={payments}
              onOpenOwnerSlip={(owner) => setOwnerSlipModalOwner(owner)}
              onOpenBulletin={(owner) => handleOpenBulletinVersement(owner)}
              onAddOwner={handleAddOwner}
            />
          )}

                    {activeTab === 'contracts' && (
            <ContractsView
              contracts={scopedContracts}
              tenants={tenants}
              properties={scopedProperties}
              owners={owners}
              currentUser={currentUser}
              onAddContract={handleAddContract}
              onUpdateContract={handleUpdateContract}
            />
          )}

          {activeTab === 'inspections' && (
            <InspectionsView
              inspections={scopedInspections}
              tenants={scopedTenants}
              properties={scopedProperties}
              onAddInspection={handleAddInspection}
            />
          )}

          {activeTab === 'maintenance' && (
            <MaintenanceView
              tickets={scopedMaintenance}
              properties={scopedProperties}
              tenants={scopedTenants}
              owners={owners}
              currentUser={currentUser}
              onAddTicket={handleAddTicket}
              onUpdateTicket={handleUpdateTicket}
              onAddCashMovement={handleAddCashMovement}
              onTriggerAuditLog={handleTriggerAuditLog}
            />
          )}

                    {activeTab === 'invoices' && (
            <InvoicesView
              invoices={invoices}
              properties={scopedProperties}
              buildings={scopedBuildings}
              units={scopedUnits}
              owners={owners}
              tenants={scopedTenants}
              onAddInvoice={handleAddInvoice}
            />
          )}

                    {activeTab === 'finance' && (
            <FinanceView
              disbursements={scopedDisbursements}
              payments={scopedPayments}
              owners={currentUser?.role === 'PROPRIETAIRE'
                ? owners.filter((o) => o.id === currentUser.proprietaireId)
                : owners}
              properties={scopedProperties}
              buildings={scopedBuildings}
              units={scopedUnits}
              tenants={scopedTenants}
              invoices={invoices}
              maintenance={scopedMaintenance}
              ownerDeductions={ownerDeductions}
              onAddDisbursement={handleAddDisbursement}
              onOpenBulletin={(owner) => handleOpenBulletinVersement(owner)}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              properties={scopedProperties}
              tenants={scopedTenants}
              payments={scopedPayments}
              owners={owners}
              disbursements={scopedDisbursements}
              selectedPeriod={selectedPeriod}
            />
          )}

                    {activeTab === 'documents' && (
            <DocumentsView
              payments={scopedPayments}
              owners={owners}
              tenants={scopedTenants}
              contracts={scopedContracts}
              properties={scopedProperties}
              currentUser={currentUser}
              onOpenReceipt={(payment) => setReceiptModalPayment(payment)}
              onOpenOwnerSlip={(owner) => setOwnerSlipModalOwner(owner)}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView settings={settings} onSaveSettings={handleSaveSettings} />
          )}
        </main>
      </div>
      
      {receiptModalPayment && (
        <PaymentReceiptModal
          payment={receiptModalPayment}
          settings={settings}
          units={units}
          buildings={buildings}
          currentUser={currentUser}
          onClose={() => setReceiptModalPayment(null)}
        />
      )}

      {ownerSlipModalOwner && (
        <PaymentBulletinModal
          owner={ownerSlipModalOwner}
          properties={properties}
          tenants={tenants}
          payments={payments}
          tickets={maintenance}
          selectedPeriod={selectedPeriod}
          onClose={() => setOwnerSlipModalOwner(null)}
        />
      )}

      {ownerBulletinModalOwner && (
          <OwnerBulletinModal
          currentUser={currentUser}
          owner={ownerBulletinModalOwner}
          properties={properties}
          buildings={buildings}
          units={units}
          tenants={tenants}
          payments={payments}
          invoices={invoices}
          maintenance={maintenance}
          deductions={ownerDeductions}
          selectedPeriod={selectedPeriod}
          onClose={() => setOwnerBulletinModalOwner(null)}
          onSaveDeduction={handleAddOwnerDeduction}
          onDeleteDeduction={handleDeleteOwnerDeduction}
          onSaveBulletin={handleSaveBulletinVersement}
        />
      )}

      {cashVoucherModalOwner && (() => {
        const ownerDisb = disbursements.find(
          (d) => d.proprietaireId === cashVoucherModalOwner.id && d.periode === selectedPeriod
        );
        const ownerPayments = payments.filter(
          (p) => p.proprietaireId === cashVoucherModalOwner.id && p.statut === 'Payé'
        );
        const loyersBruts = ownerDisb?.loyersBruts
          ?? ownerPayments.reduce((sum, p) => sum + (p.loyerBase || 0), 0);
        const commission = ownerDisb?.commissionAgence
          ?? Math.round(loyersBruts * ((cashVoucherModalOwner.tauxCommission || 10) / 100));
        const montantNet = ownerDisb?.montantNetPaye ?? Math.max(0, loyersBruts - commission);
        return (
          <CashVoucherModal
            owner={cashVoucherModalOwner}
            montantNet={montantNet}
            loyersBruts={loyersBruts}
            commission={commission}
            periode={selectedPeriod}
            onClose={() => setCashVoucherModalOwner(null)}
          />
        );
      })()}

           {isNewTenantWizardOpen && (
        <NewTenantWizardModal
          properties={properties}
          units={units}
          onComplete={handleCompleteNewTenantWizard}
          onClose={() => setIsNewTenantWizardOpen(false)}
        />
      )}

      {tenantExitTarget && (
        <TenantExitModal
          tenant={tenantExitTarget}
          property={properties.find((p) => p.id === tenantExitTarget.bienId)}
          onConfirmExit={handleCompleteTenantExit}
          onClose={() => setTenantExitTarget(null)}
        />
      )}

      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        properties={properties}
        owners={owners}
        tenants={tenants}
        contracts={contracts}
        payments={payments}
        invoices={invoices}
        maintenance={maintenance}
        onNavigate={(targetTab) => handleSafeTabChange(targetTab)}
      />

      <UserProfileModal
        currentUser={currentUser}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSignOut={handleSignOut}
        onUpdatePassword={(newPass) => {
          setAuditLogs((prev) => [
            {
              id: crypto.randomUUID(),
              action: 'MODIFICATION_MOT_DE_PASSE',
              entite: 'USER',
              entiteId: currentUser.id,
              utilisateur: `${currentUser.prenom} ${currentUser.nom}`,
              details: `Mise à jour sécurisée du mot de passe via Supabase Auth`,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ]);
        }}
      />

      {mobileMoneyModalConfig && (
  <MobileMoneyPaymentModal
    isOpen={mobileMoneyModalConfig.isOpen}
    onClose={() => setMobileMoneyModalConfig(null)}
    amount={mobileMoneyModalConfig.amount || 250000}
    tenantName={mobileMoneyModalConfig.tenantName || 'Client FITAL-IMMO'}
    tenantPhone={mobileMoneyModalConfig.tenantPhone || '+221 77 845 20 10'}
    propertyNom={mobileMoneyModalConfig.propertyNom || 'Logement Dakar'}
    period={mobileMoneyModalConfig.period || selectedPeriod}
    reference={mobileMoneyModalConfig.reference || `LOY-${Date.now().toString().slice(-4)}`}
    onConfirmPayment={handleConfirmMobileMoneyPayment}
    waveNumero={settings.waveNumero}
    orangeMoneyCode={settings.orangeMoneyCode}
    whatsappBusiness={settings.whatsappBusiness}
    settings={settings}
    currentUser={currentUser}
    tenantId={mobileMoneyModalConfig.tenantId}
    payments={payments}
  />
)}

      {quickCommsModalConfig && (
        <QuickCommsModal
          isOpen={quickCommsModalConfig.isOpen}
          onClose={() => setQuickCommsModalConfig(null)}
          tenants={tenants}
          owners={owners}
          properties={properties}
          recipientName={quickCommsModalConfig.recipientName}
          recipientPhone={quickCommsModalConfig.recipientPhone}
          recipientRole={quickCommsModalConfig.recipientRole}
          propertyNom={quickCommsModalConfig.propertyNom}
          dueAmount={quickCommsModalConfig.dueAmount}
          daysLate={quickCommsModalConfig.daysLate}
        />
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0F1B2D]/95 backdrop-blur-xl border-t border-[#C9A96E]/20 px-2 py-1.5 shadow-2xl flex items-center justify-around">
        <button
          onClick={() => handleSafeTabChange('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[44px] ${
            activeTab === 'dashboard' ? 'text-[#C9A96E] font-bold' : 'text-[#6B7C94] hover:text-[#A8B4C4]'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Accueil</span>
        </button>

        {currentUser.role !== 'LOCATAIRE' && (
          <button
            onClick={() => handleSafeTabChange('buildings')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[44px] ${
              activeTab === 'buildings' ? 'text-[#C9A96E] font-bold' : 'text-[#6B7C94] hover:text-[#A8B4C4]'
            }`}
          >
            <Building2 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Immeubles</span>
          </button>
        )}

        {currentUser.role !== 'LOCATAIRE' && currentUser.role !== 'PROPRIETAIRE' && (
          <button
            onClick={() => handleSafeTabChange('tenants')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[44px] ${
              activeTab === 'tenants' ? 'text-[#C9A96E] font-bold' : 'text-[#6B7C94] hover:text-[#A8B4C4]'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Locataires</span>
          </button>
        )}

        <button
          onClick={() => handleSafeTabChange(currentUser.role === 'CAISSIER' ? 'caisse' : 'payments')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[44px] ${
            activeTab === 'payments' || activeTab === 'caisse' ? 'text-[#C9A96E] font-bold' : 'text-[#6B7C94] hover:text-[#A8B4C4]'
          }`}
        >
          {currentUser.role === 'CAISSIER' ? (
            <Coins className="w-5 h-5 mb-0.5" />
          ) : (
            <CreditCard className="w-5 h-5 mb-0.5" />
          )}
          <span className="text-[10px]">
            {currentUser.role === 'CAISSIER' ? 'Caisse' : 'Loyers'}
          </span>
        </button>

        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[44px] ${
            isMobileSidebarOpen ? 'text-[#C9A96E] font-bold' : 'text-[#6B7C94] hover:text-[#A8B4C4]'
          }`}
        >
          <MenuIcon className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Menu</span>
        </button>
      </nav>
    </div>
  );
}