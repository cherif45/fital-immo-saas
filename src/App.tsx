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
import { supabase, isSupabaseConfigured } from './lib/supabase/client';
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
} from './lib/supabase/service';

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

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Ce mois (Mai 2026)');

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

  // useEffect 1 : Détection reset password
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token') || hash.includes('type=recovery')) {
      setIsResetPasswordMode(true);
    }
  }, []);

  // useEffect 2 : Raccourci Ctrl+K
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

  // useEffect 3 : Chargement session auth
  useEffect(() => {
    getAuthSession().then(async (session) => {
      try {
        if (session?.user && supabase) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*, agencies(name, slug, status)')
            .eq('id', session.user.id)
            .maybeSingle();

          const userAccount: UserAccount = {
            id: session.user.id,
            agencyId: profile?.agency_id || FALLBACK_AGENCY_ID,
            email: session.user.email || '',
            nom: profile?.nom || 'Administrateur',
            prenom: profile?.prenom || '',
            telephone: profile?.telephone || '',
            role: (profile?.role as any) || 'ADMIN',
            statut: 'actif',
            permissions: profile?.permissions || ['ALL'],
            organisation: profile?.agencies?.name || 'FITAL-IMMO Agence',
            createdAt: session.user.created_at || new Date().toISOString(),
          };
          setCurrentUser(userAccount);
          persistCollection('current_user', userAccount);
          setUsers((prev) => (prev.some((u) => u.id === userAccount.id) ? prev : [userAccount, ...prev]));
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

  // useEffect 4 : Chargement des données APRÈS currentUser prêt
  useEffect(() => {
    if (!currentUser?.agencyId) {
      console.log('⏳ Attente de currentUser.agencyId...');
      return;
    }

    console.log('🔍 Chargement des données pour agence:', currentUser.agencyId);

    loadFullApplicationData(currentUser.agencyId).then((data) => {
      console.log('🔍 Données reçues:', {
        properties: data.properties?.length,
        buildings: data.buildings?.length,
        units: data.units?.length,
        owners: data.owners?.length,
        tenants: data.tenants?.length,
        archives: data.archives?.length,
        activityLogs: data.activityLogs?.length,
      });
      if (data.properties && data.properties.length > 0) setProperties(data.properties);
      if (data.buildings && data.buildings.length > 0) setBuildings(data.buildings);
      if (data.units && data.units.length > 0) setUnits(data.units);
      if (data.owners && data.owners.length > 0) setOwners(data.owners);
      if (data.tenants && data.tenants.length > 0) setTenants(data.tenants);
      if (data.contracts && data.contracts.length > 0) setContracts(data.contracts);
      if (data.payments && data.payments.length > 0) setPayments(data.payments);
      if (data.reminders && data.reminders.length > 0) setReminders(data.reminders);
      if (data.inspections && data.inspections.length > 0) setInspections(data.inspections);
      if (data.maintenance && data.maintenance.length > 0) setMaintenance(data.maintenance);
      if (data.disbursements && data.disbursements.length > 0) setDisbursements(data.disbursements);
      if (data.invoices && data.invoices.length > 0) setInvoices(data.invoices);
      if (data.cashVouchers && data.cashVouchers.length > 0) setCashVouchers(data.cashVouchers);
      if (data.notifications && data.notifications.length > 0) setNotifications(data.notifications);
      if (data.auditLogs && data.auditLogs.length > 0) setAuditLogs(data.auditLogs);
      if (data.users && data.users.length > 0) setUsers(data.users);
      if (data.cashMovements && data.cashMovements.length > 0) setCashMovements(data.cashMovements);
      if (data.cashClosings && data.cashClosings.length > 0) setCashClosings(data.cashClosings);
      if (data.paymentMethods && data.paymentMethods.length > 0) setPaymentMethods(data.paymentMethods);
      if (data.settings) setSettings(data.settings);
      if (data.ownerDeductions && data.ownerDeductions.length > 0) setOwnerDeductions(data.ownerDeductions);
      if (data.bulletinVersements && data.bulletinVersements.length > 0) setBulletinsVersements(data.bulletinVersements);
      if (data.archives && data.archives.length > 0) setArchives(data.archives);
      if (data.activityLogs && data.activityLogs.length > 0) setActivityLogs(data.activityLogs);
    });
  }, [currentUser?.agencyId]);

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
      action,
      entite: module,
      entiteId: entityRef || 'SYSTÈME',
      utilisateur: `${userLabel} (${userRole})`,
      userNom: userLabel,
      module,
      entityRef,
      details,
      date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    logSystemAudit(newLog);
  };

  const checkAccessPermission = (tab: ActiveTab, user: UserAccount): boolean => {
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return true;
       if (tab === 'archives' || tab === 'activity-logs') {
      return ['ADMIN', 'SUPER_ADMIN', 'GESTIONNAIRE'].includes(user.role);
    }
    if (user.role === 'CAISSIER') {
      return ['dashboard', 'caisse', 'pending-payments', 'payments', 'payment-reports', 'tenants', 'buildings', 'units', 'finance', 'documents'].includes(tab);
    }
    if (user.role === 'PROPRIETAIRE') {
      return ['dashboard', 'properties', 'buildings', 'units', 'tenants', 'payments', 'finance', 'maintenance', 'documents'].includes(tab);
    }
    if (user.role === 'LOCATAIRE') {
      return ['dashboard', 'properties', 'units', 'payments', 'maintenance'].includes(tab);
    }
    if (user.role === 'AGENT') {
      return ['dashboard', 'inspections', 'properties', 'buildings', 'units', 'maintenance', 'recovery'].includes(tab);
    }
    if (user.role === 'GESTIONNAIRE') {
      return ['dashboard', 'owners', 'properties', 'buildings', 'units', 'tenants', 'contracts', 'inspections', 'recovery', 'reminders', 'maintenance', 'documents', 'finance', 'archives'].includes(tab);
    }
    return false;
  };

  const handleSwitchUser = (newUser: UserAccount) => {
    setCurrentUser(newUser);
    persistCollection('current_user', newUser);
    localStorage.setItem('fital_immo_user', JSON.stringify(newUser));
    if (!checkAccessPermission(activeTab, newUser)) {
      setActiveTab('dashboard');
    }
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
    setBuildings((prev) => {
      const next = [newBuilding, ...prev];
      persistCollection('buildings', next);
      return next;
    });
    if (currentUser?.agencyId) {
      saveBuildingToDb(newBuilding, currentUser.agencyId).catch(console.warn);
    }
    handleTriggerAuditLog('AJOUT_IMMEUBLE', 'BUILDINGS', `Création de l'immeuble ${newBuilding.nom}`, newBuilding.id);
  };

  const handleUpdateBuilding = (updatedBuilding: Building) => {
    setBuildings((prev) => {
      const next = prev.map((b) => (b.id === updatedBuilding.id ? updatedBuilding : b));
      persistCollection('buildings', next);
      return next;
    });
    if (currentUser?.agencyId) {
      saveBuildingToDb(updatedBuilding, currentUser.agencyId).catch(console.warn);
    }
  };

  const handleDeleteBuilding = (buildingId: string) => {
    setBuildings((prev) => {
      const next = prev.filter((b) => b.id !== buildingId);
      persistCollection('buildings', next);
      return next;
    });
    setUnits((prev) => {
      const next = prev.filter((u) => u.buildingId !== buildingId);
      persistCollection('units', next);
      return next;
    });
    deleteBuildingFromDb(buildingId).catch(console.warn);
  };

  // ============================================================
  // HANDLERS : UNITS
  // ============================================================
  const handleAddUnit = (newUnit: Unit) => {
    setUnits((prev) => {
      const next = [newUnit, ...prev];
      persistCollection('units', next);
      return next;
    });
    if (currentUser?.agencyId) {
      saveUnitToDb(newUnit, currentUser.agencyId).catch(console.warn);
    }
  };

  const handleUpdateUnit = (updatedUnit: Unit) => {
    setUnits((prev) => {
      const next = prev.map((u) => (u.id === updatedUnit.id ? updatedUnit : u));
      persistCollection('units', next);
      return next;
    });
    if (currentUser?.agencyId) {
      saveUnitToDb(updatedUnit, currentUser.agencyId).catch(console.warn);
    }
  };

  const handleDeleteUnit = (unitId: string) => {
    setUnits((prev) => {
      const next = prev.filter((u) => u.id !== unitId);
      persistCollection('units', next);
      return next;
    });
    deleteUnitFromDb(unitId).catch(console.warn);
  };

  // ============================================================
  // HANDLERS : ARCHIVES & ACTIVITY LOGS
  // ============================================================
  const handleArchiveRecord = (archive: ArchiveRecord) => {
    setArchives((prev) => {
      const next = [archive, ...prev];
      persistCollection('archives', next);
      return next;
    });
    if (currentUser?.agencyId) {
      saveArchiveToDb(archive, currentUser.agencyId).catch(console.warn);
    }
  };

  const handleLogActivity = (activity: ActivityLog) => {
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
    setOwnerDeductions((prev) => {
      const next = [deduction, ...prev];
      persistCollection('owner_deductions', next);
      return next;
    });
    if (currentUser?.agencyId) {
      saveOwnerDeductionToDb(deduction, currentUser.agencyId).catch(console.warn);
    }
  };

  const handleDeleteOwnerDeduction = (deductionId: string) => {
    setOwnerDeductions((prev) => {
      const next = prev.filter((d) => d.id !== deductionId);
      persistCollection('owner_deductions', next);
      return next;
    });
    deleteOwnerDeductionFromDb(deductionId).catch(console.warn);
  };

  // ============================================================
  // HANDLERS : BULLETINS VERSEMENTS
  // ============================================================
  const handleSaveBulletinVersement = (bulletin: BulletinVersement) => {
    setBulletinsVersements((prev) => {
      const existing = prev.findIndex((b) => b.id === bulletin.id);
      const next = existing >= 0 ? prev.map((b) => (b.id === bulletin.id ? bulletin : b)) : [bulletin, ...prev];
      persistCollection('bulletin_versements', next);
      return next;
    });
    if (currentUser?.agencyId) {
      saveBulletinVersementToDb(bulletin, currentUser.agencyId).catch(console.warn);
    }
  };

  // ============================================================
  // HANDLERS : PAIEMENTS
  // ============================================================
  const handleAddPayment = (newPayment: Payment) => {
    setPayments((prev) => {
      const next = [newPayment, ...prev];
      persistCollection('payments', next);
      return next;
    });

    if (currentUser?.agencyId) {
      savePaymentToDb(newPayment, currentUser.agencyId, currentUser.id).catch(console.warn);
    }

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
      setCashMovements((prev) => {
        const next = [newCashEntry, ...prev];
        persistCollection('cash_movements', next);
        return next;
      });
      if (currentUser?.agencyId) {
        saveCashMovementToDb(newCashEntry, currentUser.agencyId).catch(console.warn);
      }
    }

    setTenants((prev) => {
      const next = prev.map((t) => {
        if (t.id === newPayment.locataireId) {
          return {
            ...t,
            statut: newPayment.statut === 'Payé' ? ('À jour' as const) : ('Retard' as const),
            joursRetard: newPayment.statut === 'Payé' ? 0 : t.joursRetard,
            arrieresCumules: newPayment.montantRestant,
          };
        }
        return t;
      });
      persistCollection('tenants', next);
      return next;
    });

    // LOG ACTIVITÉ
    if (currentUser?.agencyId) {
      handleLogActivity({
        id: crypto.randomUUID(),
        agencyId: currentUser.agencyId,
        userId: currentUser.id,
        userNom: `${currentUser.prenom} ${currentUser.nom}`,
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
      });
    }
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

  const handleOpenQuickComms = (contact?: {
    name: string;
    phone: string;
    role?: string;
    propertyNom?: string;
    amount?: number;
    daysLate?: number;
  }) => {
    if (contact) {
      setQuickCommsModalConfig({
        isOpen: true,
        recipientName: contact.name,
        recipientPhone: contact.phone,
        recipientRole: contact.role || 'Locataire',
        propertyNom: contact.propertyNom,
        dueAmount: contact.amount,
        daysLate: contact.daysLate,
      });
    } else {
      const lateTenant = tenants.find((t) => t.statut === 'Retard') || tenants[0];
      setQuickCommsModalConfig({
        isOpen: true,
        recipientName: lateTenant ? `${lateTenant.prenom} ${lateTenant.nom}` : 'Locataire FITAL-IMMO',
        recipientPhone: lateTenant?.telephone || '+221 77 845 20 10',
        recipientRole: 'Locataire',
        propertyNom: lateTenant?.bienNom || 'Logement Dakar',
        dueAmount: lateTenant?.arrieresCumules || lateTenant?.loyerMensuel || 150000,
        daysLate: lateTenant?.joursRetard || 0,
      });
    }
  };

  const handleConfirmMobileMoneyPayment = (amount: number, method: string, transactionId: string) => {
    const tId = mobileMoneyModalConfig?.tenantId;
    const tenant = tenants.find((t) => t.id === tId) || tenants[0];
    const property = properties.find((p) => p.id === tenant?.bienId);
    const owner = owners.find((o) => o.id === (property?.proprietaireId || tenant?.proprietaireId));

    if (!tenant || !property) {
      alert('Impossible de valider le paiement : locataire ou bien introuvable.');
      return;
    }

    const paymentId = crypto.randomUUID();
    const quittanceNum = `QUITT-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newPayment: Payment = {
      id: paymentId,
      ref: transactionId || `PAY-MM-${Date.now().toString().slice(-6)}`,
      quittanceNumero: quittanceNum,
      locataireId: tenant.id,
      locataireNom: `${tenant.prenom} ${tenant.nom}`,
      bienId: property.id,
      bienNom: property.nom,
      proprietaireId: owner?.id || '',
      proprietaireNom: owner ? `${owner.prenom} ${owner.nom}` : 'Propriétaire',
      periode: mobileMoneyModalConfig?.period || selectedPeriod,
      loyerBase: amount,
      charges: 0,
      tva: 0,
      tom: 0,
      penalites: 0,
      montantTotal: amount,
      montantPaye: amount,
      montantRestant: 0,
      modePaiement: 'Mobile Money',
      moyenPaiementCode: method === 'WAVE' ? 'WAVE' : 'ORANGE_MONEY',
      numeroTransaction: transactionId,
      datePaiement: new Date().toISOString().split('T')[0],
      statut: 'Payé',
      observation: `Règlement direct validé via ${method === 'WAVE' ? 'Wave Sénégal' : 'Orange Money'} (Tx: ${transactionId})`,
      auteurId: currentUser?.id,
      auteurNom: currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Système',
      dateHeurePaiement: new Date().toISOString().replace('T', ' ').substring(0, 16),
      typeRecu: 'QUITTANCE',
    };

    handleAddPayment(newPayment);
    setMobileMoneyModalConfig(null);

    const notifItem: NotificationItem = {
      id: crypto.randomUUID(),
      titre: `Paiement ${method} Validé`,
      message: `${amount.toLocaleString('fr-FR')} FCFA encaissés pour ${newPayment.locataireNom}. Quittance ${quittanceNum} émise.`,
      type: 'PAIEMENT',
      lu: false,
      date: "À l'instant",
    };
    setNotifications((prev) => {
      const next = [notifItem, ...prev];
      persistCollection('notifications', next);
      return next;
    });
  };

  const handleValidatePendingPayment = (paymentId: string) => {
    setPayments((prev) => {
      const next = prev.map((p) => {
        if (p.id === paymentId) {
          return {
            ...p,
            verificationStatut: 'valide' as const,
            statut: 'Payé' as const,
            quittanceNumero: p.quittanceNumero || `QUITT-VAL-${Math.floor(1000 + Math.random() * 9000)}`,
            dateValidation: new Date().toISOString().split('T')[0],
            valideParId: currentUser?.id,
            valideParNom: currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Système',
          };
        }
        return p;
      });
      persistCollection('payments', next);
      return next;
    });

    if (currentUser?.agencyId) {
      validatePendingPaymentInDb(paymentId, currentUser.agencyId, currentUser.id).catch(console.warn);
    }
  };

  const handleRejectPendingPayment = (paymentId: string, reason: string) => {
    setPayments((prev) => {
      const next = prev.map((p) => {
        if (p.id === paymentId) {
          return { ...p, verificationStatut: 'rejete' as const, statut: 'Impayé' as const, motifRejet: reason };
        }
        return p;
      });
      persistCollection('payments', next);
      return next;
    });
    if (currentUser?.agencyId) {
      rejectPendingPaymentInDb(paymentId, currentUser.agencyId, reason).catch(console.warn);
    }
  };

  const handleAddCashMovement = (mov: CashMovement) => {
    setCashMovements((prev) => {
      const next = [mov, ...prev];
      persistCollection('cash_movements', next);
      return next;
    });
    if (currentUser?.agencyId) {
      saveCashMovementToDb(mov, currentUser.agencyId).catch(console.warn);
    }
  };

  const handleAddCashClosing = (cls: CashClosing) => {
    setCashClosings((prev) => {
      const next = [cls, ...prev];
      persistCollection('cash_closings', next);
      return next;
    });
    if (currentUser?.agencyId) {
      saveCashClosingToDb(cls, currentUser.agencyId, currentUser.id, `${currentUser.prenom} ${currentUser.nom}`).catch(console.warn);
    }
  };

  const handleUpdatePaymentMethod = (method: PaymentMethodConfig) => {
    setPaymentMethods((prev) => {
      const next = prev.map((m) => (m.id === method.id ? method : m));
      persistCollection('payment_methods', next);
      return next;
    });
    savePaymentMethodToDb(method, currentUser?.agencyId).catch(console.warn);
  };

  const handleAddPaymentMethod = (method: PaymentMethodConfig) => {
    setPaymentMethods((prev) => {
      const next = [...prev, method];
      persistCollection('payment_methods', next);
      return next;
    });
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
        email: user.email,
        password: user.password || `Pass${Date.now()}!`,
        nom: user.nom,
        prenom: user.prenom,
        telephone: user.telephone,
        role: user.role,
        agencyId,
        permissions: user.permissions,
        proprietaireId: user.proprietaireId,
        locataireId: user.locataireId,
        organisation: user.organisation,
        avatar: user.avatar,
      });

      if (result.success && result.user) {
        setUsers((prev) => {
          const next = [result.user!, ...prev.filter((u) => u.email !== user.email)];
          persistCollection('users', next);
          return next;
        });
        return { success: true };
      }
      return { success: false, error: result.error };
    }

    setUsers((prev) => {
      const next = [user, ...prev];
      persistCollection('users', next);
      return next;
    });
    return {
      success: true,
      error: isSupabaseConfigured ? undefined : 'Compte enregistré localement.',
    };
  };

  const handleAddProperty = (newProperty: Property) => {
    setProperties((prev) => {
      const next = [newProperty, ...prev];
      persistCollection('properties', next);
      return next;
    });
    if (currentUser?.agencyId) {
      savePropertyToDb(newProperty, currentUser.agencyId).catch(console.warn);
    }
  };

  const handleUpdateProperty = (updatedProperty: Property) => {
    setProperties((prev) => {
      const next = prev.map((p) => (p.id === updatedProperty.id ? updatedProperty : p));
      persistCollection('properties', next);
      return next;
    });
    if (currentUser?.agencyId) {
      savePropertyToDb(updatedProperty, currentUser.agencyId).catch(console.warn);
    }
  };

  const handleDeleteProperty = (propertyId: string) => {
    setProperties((prev) => {
      const next = prev.filter((p) => p.id !== propertyId);
      persistCollection('properties', next);
      return next;
    });
    softDeleteRecord('properties', propertyId).catch(console.warn);
  };

  const handleAddContract = (newContract: LeaseContract) => {
    setContracts((prev) => {
      const next = [newContract, ...prev];
      persistCollection('contracts', next);
      return next;
    });
    if (currentUser?.agencyId) {
      saveContractToDb(newContract, currentUser.agencyId).catch(console.warn);
    }
  };

  const handleUpdateContract = (updatedContract: LeaseContract) => {
    setContracts((prev) => {
      const next = prev.map((c) => (c.id === updatedContract.id ? updatedContract : c));
      persistCollection('contracts', next);
      return next;
    });
    if (currentUser?.agencyId) {
      saveContractToDb(updatedContract, currentUser.agencyId).catch(console.warn);
    }
  };

  const handleAddTenant = (newTenant: Tenant) => {
    setTenants((prev) => {
      const next = [newTenant, ...prev];
      persistCollection('tenants', next);
      return next;
    });
    if (currentUser?.agencyId) {
      saveTenantToDb(newTenant, currentUser.agencyId).catch(console.warn);
    }
    if (newTenant.bienId) {
      setProperties((prev) => {
        const next = prev.map((p) => {
          if (p.id === newTenant.bienId) {
            const updatedP = {
              ...p,
              statut: 'Occupé' as const,
              locataireActuelNom: `${newTenant.prenom} ${newTenant.nom}`,
            };
            if (currentUser?.agencyId) {
              savePropertyToDb(updatedP, currentUser.agencyId).catch(console.warn);
            }
            return updatedP;
          }
          return p;
        });
        persistCollection('properties', next);
        return next;
      });
    }
  };

  const handleCompleteNewTenantWizard = async (data: {
    tenant: Tenant;
    contract: LeaseContract;
    inspection: Inspection;
  }) => {
    if (!currentUser?.agencyId || !supabase) return;

    const tenantResult = await saveTenantToDb(data.tenant, currentUser.agencyId);
    if (!tenantResult.success) {
      console.error('❌ Locataire refusé:', tenantResult.error);
      const errorMsg = tenantResult.error || '';
      let userMessage = 'Impossible de créer le locataire.';
      if (errorMsg.includes('uq_tenant_active_per_bien') || errorMsg.includes('duplicate key')) {
        userMessage = "Ce bien est déjà occupé par un autre locataire actif.";
      } else if (errorMsg.includes('violates foreign key')) {
        userMessage = "Erreur de liaison.";
      }
      alert(userMessage);
      return;
    }

    const realTenantId = tenantResult.data?.id || data.tenant.id;
    const tenantToSave = { ...data.tenant, id: realTenantId };
    const contractToSave = { ...data.contract, locataireId: realTenantId };
    const inspectionToSave = { ...data.inspection, locataireId: realTenantId };

    await saveContractToDb(contractToSave, currentUser.agencyId);
    await saveInspectionToDb(inspectionToSave, currentUser.agencyId);

    setTenants((prev) => [tenantToSave, ...prev]);
    setContracts((prev) => [contractToSave, ...prev]);
    setInspections((prev) => [inspectionToSave, ...prev]);
  };

  const handleCompleteTenantExit = (data: {
    tenantId: string;
    bienId: string;
    dateSortie: string;
    inspection: Inspection;
    retenueCaution: number;
    restitutionCaution: number;
  }) => {
    setInspections((prev) => [data.inspection, ...prev]);
    setTenants((prev) =>
      prev.map((t) => (t.id === data.tenantId ? { ...t, statut: 'À jour' as const, dateSortie: data.dateSortie } : t))
    );
    setProperties((prev) =>
      prev.map((p) => (p.id === data.bienId ? { ...p, statut: 'Vacant' as const, locataireActuelNom: undefined } : p))
    );
    if (currentUser?.agencyId) {
      saveInspectionToDb(data.inspection, currentUser.agencyId).catch(console.warn);
    }
  };

  const handleAddOwner = (newOwner: Owner) => {
    setOwners((prev) => {
      const next = [newOwner, ...prev];
      persistCollection('owners', next);
      return next;
    });
    if (currentUser?.agencyId) {
      saveOwnerToDb(newOwner, currentUser.agencyId).catch(console.warn);
    }
  };

  const handleAddReminder = (newReminder: TenantReminder) => {
    setReminders((prev) => {
      const next = [newReminder, ...prev];
      persistCollection('reminders', next);
      return next;
    });
    if (currentUser?.agencyId) {
      saveReminderToDb(newReminder, currentUser.agencyId).catch(console.warn);
    }
  };

  const handleAddInspection = (newInspection: Inspection) => {
    setInspections((prev) => {
      const next = [newInspection, ...prev];
      persistCollection('inspections', next);
      return next;
    });
    if (currentUser?.agencyId) {
      saveInspectionToDb(newInspection, currentUser.agencyId).catch(console.warn);
    }
  };

  const handleAddTicket = (newTicket: MaintenanceTicket) => {
    setMaintenance((prev) => {
      const next = [newTicket, ...prev];
      persistCollection('maintenance', next);
      return next;
    });
    if (currentUser?.agencyId) {
      saveMaintenanceToDb(newTicket, currentUser.agencyId).catch(console.warn);
    }
  };

  const handleUpdateTicket = (updatedTicket: MaintenanceTicket) => {
    setMaintenance((prev) => {
      const next = prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t));
      persistCollection('maintenance', next);
      return next;
    });
    if (currentUser?.agencyId) {
      saveMaintenanceToDb(updatedTicket, currentUser.agencyId).catch(console.warn);
    }
  };

  const handleAddDisbursement = (newDisbursement: OwnerDisbursement) => {
    setDisbursements((prev) => {
      const next = [newDisbursement, ...prev];
      persistCollection('disbursements', next);
      return next;
    });
    if (currentUser?.agencyId) {
      saveDisbursementToDb(newDisbursement, currentUser.agencyId).catch(console.warn);
    }
  };

  const handleAddInvoice = (newInvoice: Invoice) => {
    setInvoices((prev) => {
      const next = [newInvoice, ...prev];
      persistCollection('invoices', next);
      return next;
    });
    if (currentUser?.agencyId) {
      saveInvoiceToDb(newInvoice, currentUser.agencyId).catch(console.warn);
    }
  };

  const handleSaveSettings = (newSettings: AgencySettings) => {
    setSettings(newSettings);
    persistCollection('settings', newSettings);
    if (currentUser?.agencyId) {
      saveSettingsToDb(newSettings, currentUser.agencyId).catch(console.warn);
    }
  };

  const handleOpenQuickReminder = (tenant: Tenant) => {
    setActiveTab('reminders');
  };

  const handleOpenNewPaymentForTenant = (tenant?: Tenant) => {
    if (tenant) {
      setInitialTenantForPayment(tenant);
    } else {
      setInitialTenantForPayment(null);
    }
    setIsNewPaymentModalOpen(true);
  };

  const handleOpenBulletinVersement = (owner: Owner) => {
    setOwnerBulletinModalOwner(owner);
  };

  const unpaidCount = tenants.filter((t) => t.statut === 'Impayé' || t.statut === 'Retard').length;
  const pendingPaymentsCount = payments.filter((p) => p.verificationStatut === 'en_attente').length;

  // SCOPED DATA
  const scopedProperties = (() => {
    if (currentUser?.role === 'PROPRIETAIRE') {
      return properties.filter((p) => p.proprietaireId === currentUser.proprietaireId);
    }
    if (currentUser?.role === 'LOCATAIRE') {
      const myTenant = tenants.find((t) => t.id === currentUser.locataireId);
      return myTenant ? properties.filter((p) => p.id === myTenant.bienId) : [];
    }
    return properties;
  })();

  const scopedBuildings = (() => {
    if (currentUser?.role === 'PROPRIETAIRE') {
      return buildings.filter((b) => b.proprietaireId === currentUser.proprietaireId);
    }
    return buildings;
  })();

  const scopedUnits = (() => {
    if (currentUser?.role === 'PROPRIETAIRE') {
      return units.filter((u) => u.proprietaireId === currentUser.proprietaireId);
    }
    if (currentUser?.role === 'LOCATAIRE') {
      const myTenant = tenants.find((t) => t.id === currentUser.locataireId);
      if (myTenant) {
        return units.filter((u) => u.buildingId === myTenant.bienId || u.locataireActuelId === myTenant.id);
      }
    }
    return units;
  })();

  const scopedTenants = (() => {
    if (currentUser?.role === 'PROPRIETAIRE') {
      const myProps = properties.filter((p) => p.proprietaireId === currentUser.proprietaireId);
      const myBienIds = myProps.map((p) => p.id);
      return tenants.filter((t) => myBienIds.includes(t.bienId));
    }
    if (currentUser?.role === 'LOCATAIRE') {
      return tenants.filter((t) => t.id === currentUser.locataireId);
    }
    return tenants;
  })();

  const scopedPayments = (() => {
    if (currentUser?.role === 'PROPRIETAIRE') {
      return payments.filter((p) => p.proprietaireId === currentUser.proprietaireId);
    }
    if (currentUser?.role === 'LOCATAIRE') {
      return payments.filter((p) => p.locataireId === currentUser.locataireId);
    }
    if (currentUser?.role === 'AGENT') {
      return [];
    }
    return payments;
  })();

  const scopedContracts = (() => {
    if (currentUser?.role === 'PROPRIETAIRE') {
      return contracts.filter((c) => c.proprietaireId === currentUser.proprietaireId);
    }
    if (currentUser?.role === 'LOCATAIRE') {
      return contracts.filter((c) => c.locataireId === currentUser.locataireId);
    }
    return contracts;
  })();

  const scopedInspections = (() => {
    if (currentUser?.role === 'PROPRIETAIRE') {
      const myProps = properties.filter((p) => p.proprietaireId === currentUser.proprietaireId);
      const myBienIds = myProps.map((p) => p.id);
      return inspections.filter((i) => myBienIds.includes(i.bienId));
    }
    if (currentUser?.role === 'LOCATAIRE') {
      return inspections.filter((i) => i.locataireId === currentUser.locataireId);
    }
    return inspections;
  })();

  const scopedMaintenance = (() => {
    if (currentUser?.role === 'PROPRIETAIRE') {
      const myProps = properties.filter((p) => p.proprietaireId === currentUser.proprietaireId);
      const myBienIds = myProps.map((p) => p.id);
      return maintenance.filter((m) => myBienIds.includes(m.bienId));
    }
    if (currentUser?.role === 'LOCATAIRE') {
      const myTenant = tenants.find((t) => t.id === currentUser.locataireId);
      return myTenant ? maintenance.filter((m) => m.bienId === myTenant.bienId) : [];
    }
    return maintenance;
  })();

  const scopedDisbursements = (() => {
    if (currentUser?.role === 'PROPRIETAIRE') {
      return disbursements.filter((d) => d.proprietaireId === currentUser.proprietaireId);
    }
    if (currentUser?.role === 'AGENT' || currentUser?.role === 'LOCATAIRE') {
      return [];
    }
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
        urgentMaintenanceCount={maintenance.filter((m) => m.priorite === 'Urgente').length}
        currentUser={currentUser}
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
              archives={archives}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'activity-logs' && (
            <ActivityLogView
              activities={activityLogs}
              currentUser={currentUser}
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
              {currentUser.role === 'ADMIN' && (
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
              tenants={scopedTenants}
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
              owners={owners}
              tenants={scopedTenants}
              onAddInvoice={handleAddInvoice}
            />
          )}

          {activeTab === 'finance' && (
            <FinanceView
              disbursements={scopedDisbursements}
              payments={scopedPayments}
              owners={owners}
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