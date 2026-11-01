import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Coins,
  Menu as MenuIcon,
  Sparkles,
} from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { DashboardView } from "./components/DashboardView";
import { ThemeToggle } from "./components/ThemeToggle";
import { useTheme } from "./hooks/useTheme";
import { useAgencySettings } from "./hooks/useAgencySettings";
import { supabase, isSupabaseConfigured } from "./lib/supabase/client";
import { formatNumber } from "./lib/utils";
import { findBlockingPayment } from "./lib/payments/duplicate";
import { createDocumentNumber } from "./lib/documentNumber";
import { createPendingMobilePayment } from "./lib/payments/createPendingMobilePayment";
// ============================================================
// BUNDLE SPLITTING - Lazy imports
// ============================================================
import { ViewLoader } from "./components/ViewLoader";
import {
  LazyLoginView,
  LazyResetPasswordView,
  LazyPaymentsView,
  LazyPropertiesView,
  LazyBuildingsView,
  LazyUnitsView,
  LazyTenantsView,
  LazyOwnersView,
  LazyContractsView,
  LazyInspectionsView,
  LazyMaintenanceView,
  LazyFinanceView,
  LazyInvoicesView,
  LazyPenaltiesView,
  LazyOwnerChargesView,
  LazyDocumentsView,
  LazyReportsView,
  LazyAgencySettingsView,
  LazyArchiveView,
  LazyActivityLogView,
  LazyAdminControlCenterView,
  LazyAdminUsersView,
  LazyAdminActivityJournalView,
  LazySuperAdminDashboard,
  LazyCashierDashboardView,
  LazyOwnerDashboardView,
  LazyTenantDashboardView,
  LazyAgentDashboardView,
  LazyManagerDashboardView,
  LazyCashRegisterView,
  LazyPendingPaymentsView,
  LazyPaymentMethodsConfigView,
  LazyPaymentMethodReportsView,
  LazyRecoveryTrackerView,
  LazyAutomatedRemindersView,
  LazyReceiptModal,
  LazyPaymentBulletinModal,
  LazyCashVoucherModal,
  LazyNewTenantWizardModal,
  LazyTenantExitModal,
  LazyUserProfileModal,
  LazyMobileMoneyPaymentModal,
  LazyQuickCommsModal,
  LazyGlobalSearchModal,
  LazyOwnerBulletinModal,
  LazyPaymentReceiptModal,
  LazyThemePreview,
} from "./lib/lazyImports";
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
} from "./types";
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
} from "./data/mockData";
import {
  loadFullApplicationData,
  loadLocalCollection,
  persistCollection,
  logSystemAudit,
  signOutSession,
  getAuthSession,
  savePropertyToDb,
  saveOwnerToDb,
  saveOwnerToDbWithLog,
  saveTenantToDbWithLog,
  savePaymentToDbWithLog,
  savePropertyToDbWithLog,
  saveContractToDbWithLog,
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
  getAgencyStats,
  saveBuildingToDb,
  deleteBuildingFromDb,
  saveUnitToDb,
  deleteUnitFromDb,
  saveOwnerDeductionToDb,
  deleteOwnerDeductionFromDb,
  saveBulletinVersementToDb,
  saveArchiveToDb,
  saveActivityLogToDb,
  fetchAgencyActivityLogs,
  fetchAgencyArchiveData,
  savePenaltyToDb,
  saveOwnerChargeToDb,
  deletePenaltyFromDb,
  deleteOwnerChargeFromDb,
} from "./lib/supabase/service";

// Force le nettoyage du cache si la version change
const APP_VERSION = "3.0.8";
const storedVersion = localStorage.getItem("fital_immo_version");

if (storedVersion !== APP_VERSION) {
  console.log("Nouvelle version détectée, nettoyage du cache...");
  const keysToKeep = ["fital_immo_user"];
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("fital_immo_") && !keysToKeep.includes(key)) {
      localStorage.removeItem(key);
    }
  });
  localStorage.setItem("fital_immo_version", APP_VERSION);
}

const FALLBACK_AGENCY_ID = "a592861a-68b0-4469-94ee-751f1f2863b7";

export default function App() {
  const [users, setUsers] = useState<UserAccount[]>(() =>
    loadLocalCollection("users", initialUsers),
  );
  const isAgencyLoginPath = /^\/login\//i.test(window.location.pathname);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    if (isAgencyLoginPath) return null;
    const saved = loadLocalCollection<UserAccount | null>("current_user", null);
    if (saved) return saved;
    try {
      const raw = localStorage.getItem("fital_immo_user");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  });
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);

  const { settings: agencySettings, reload: reloadAgencySettings } =
    useAgencySettings(currentUser?.agencyId);
  // ============================================================
  // TITRE DYNAMIQUE DU NAVIGATEUR (par agence)
  // ============================================================
  React.useEffect(() => {
    const agencyName = agencySettings?.nomAgence?.trim();
    if (agencyName) {
      document.title = `${agencyName} — Gestion Locative`;
    } else {
      document.title = "Gestion Locative";
    }
  }, [agencySettings?.nomAgence]);
  // ============================================================
  // RECALCUL AUTOMATIQUE DES STATUTS AU CHARGEMENT
  // ============================================================
  React.useEffect(() => {
    if (!currentUser?.agencyId || !isSupabaseConfigured) return;

    const runRecalc = async () => {
      try {
        console.log("🔄 Recalcul des statuts locataires...");
        const { error } = await supabase.rpc("recalculate_tenant_statuses", {
          p_agency_id: currentUser.agencyId,
        });

        if (error) {
          console.warn("⚠️ Recalcul échoué:", error.message);
          return;
        }

        console.log("✅ Statuts recalculés");

        // Recharger les tenants pour rafraîchir le dashboard
        const { data: refreshedTenants } = await supabase
          .from("tenants")
          .select("*")
          .eq("agency_id", currentUser.agencyId)
          .is("deleted_at", null);

        if (refreshedTenants && refreshedTenants.length > 0) {
          // Mapper au format Tenant (adapter si nécessaire)
          setTenants((prev) => {
            // Si on a déjà les tenants chargés, on met à jour juste les statuts
            const updates = new Map(
              refreshedTenants.map((t: any) => [t.id, t]),
            );
            return prev.map((t) => {
              const fresh = updates.get(t.id);
              if (fresh) {
                return {
                  ...t,
                  statut: fresh.statut || t.statut,
                  joursRetard: Number(fresh.jours_retard ?? t.joursRetard ?? 0),
                };
              }
              return t;
            });
          });
        }
      } catch (err) {
        console.warn("⚠️ Erreur recalcul:", err);
      }
    };

    // Délai pour laisser le temps à l'app de charger
    const timer = setTimeout(runRecalc, 2000);
    return () => clearTimeout(timer);
  }, [currentUser?.agencyId]);
  useTheme();
  const [agencyStats, setAgencyStats] = useState<any>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isResetPasswordMode, setIsResetPasswordMode] = useState(false);
  const [showThemePreview, setShowThemePreview] = useState(false);

  const [properties, setProperties] = useState<Property[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [contracts, setContracts] = useState<LeaseContract[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reminders, setReminders] = useState<TenantReminder[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceTicket[]>([]);
  const [disbursements, setDisbursements] = useState<OwnerDisbursement[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [cashVouchers, setCashVouchers] = useState<CashVoucher[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<AgencySettings>(initialSettings);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>(
    [],
  );
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [cashClosings, setCashClosings] = useState<CashClosing[]>([]);
  const [ownerDeductions, setOwnerDeductions] = useState<OwnerDeduction[]>([]);
  const [bulletinsVersements, setBulletinsVersements] = useState<
    BulletinVersement[]
  >([]);
  const [archives, setArchives] = useState<ArchiveRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityLogsLoading, setActivityLogsLoading] = useState(false);
  const [activityLogsError, setActivityLogsError] = useState<string | null>(
    null,
  );
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [ownerCharges, setOwnerCharges] = useState<OwnerCharge[]>([]);
  const [isSavingBuilding, setIsSavingBuilding] = useState(false);
  const [isSavingUnit, setIsSavingUnit] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    const now = new Date();
    return now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] =
    useState<boolean>(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState<boolean>(false);
  const [receiptModalPayment, setReceiptModalPayment] =
    useState<Payment | null>(null);
  const [ownerSlipModalOwner, setOwnerSlipModalOwner] = useState<Owner | null>(
    null,
  );
  const [ownerBulletinModalOwner, setOwnerBulletinModalOwner] =
    useState<Owner | null>(null);
  const [cashVoucherModalOwner, setCashVoucherModalOwner] =
    useState<Owner | null>(null);
  const [isNewPaymentModalOpen, setIsNewPaymentModalOpen] =
    useState<boolean>(false);
  const [isNewPropertyModalOpen, setIsNewPropertyModalOpen] =
    useState<boolean>(false);
  const [isNewTenantWizardOpen, setIsNewTenantWizardOpen] =
    useState<boolean>(false);
  const [tenantExitTarget, setTenantExitTarget] = useState<Tenant | null>(null);
  const [initialTenantForPayment, setInitialTenantForPayment] =
    useState<Tenant | null>(null);
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
    if (hash.includes("access_token") || hash.includes("type=recovery")) {
      setIsResetPasswordMode(true);
    }
  }, []);

  // useEffect 2 : Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsGlobalSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // useEffect 3 : Session auth
  useEffect(() => {
    getAuthSession().then(async (session) => {
      try {
        if (isAgencyLoginPath) {
          setCurrentUser(null);
          return;
        }
        if (session?.user && supabase) {
          await new Promise((resolve) => setTimeout(resolve, 300));

          let { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();

          if (!profile) {
            await new Promise((resolve) => setTimeout(resolve, 800));
            const retry = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .maybeSingle();
            profile = retry.data;
          }

          if (profile) {
            if (
              profile.statut === "suspendu" ||
              profile.statut === "desactive"
            ) {
              console.warn(
                "Session restaurée refusée : compte suspendu ou désactivé.",
              );
              const { error } = await supabase.auth.signOut();
              if (error)
                console.error(
                  "Impossible de fermer la session du compte bloqué :",
                  error,
                );
              localStorage.removeItem("fital_immo_user");
              localStorage.removeItem("fital_immo_current_user");
              return;
            }

            const { data: agencyData, error: agencyError } = await supabase
              .from("agencies")
              .select("name, slug, status")
              .eq("id", profile.agency_id)
              .maybeSingle();
            if (
              agencyError ||
              !agencyData ||
              !["active", "trial"].includes(agencyData.status)
            ) {
              console.warn(
                "Session restaurée refusée : agence inaccessible, suspendue ou inactive.",
                agencyError?.message,
              );
              const { error } = await supabase.auth.signOut();
              if (error)
                console.error(
                  "Impossible de fermer la session de l'agence bloquée :",
                  error,
                );
              localStorage.removeItem("fital_immo_user");
              localStorage.removeItem("fital_immo_current_user");
              return;
            }

            const userAccount: UserAccount = {
              id: session.user.id,
              agencyId: profile.agency_id || FALLBACK_AGENCY_ID,
              email: session.user.email || "",
              nom: profile.nom || "Administrateur",
              prenom: profile.prenom || "",
              telephone: profile.telephone || "",
              role: (profile.role as any) || "ADMIN",
              statut: profile.statut || "actif",
              permissions: profile.permissions || ["ALL"],
              organisation: agencyData?.name || "FITAL-IMMO Agence",
              createdAt: session.user.created_at || new Date().toISOString(),
              initiales:
                profile.initiales ||
                (profile.prenom && profile.nom
                  ? `${profile.prenom.trim()[0]}${profile.nom.trim()[0]}`.toUpperCase()
                  : undefined),
              signatureUrl: profile.signature_url || undefined,
              fonction: profile.fonction || undefined,
            };
            setCurrentUser(userAccount);
            persistCollection("current_user", userAccount);
            setUsers((prev) =>
              prev.some((u) => u.id === userAccount.id)
                ? prev
                : [userAccount, ...prev],
            );
          } else {
            console.warn(
              "Session restaurée refusée : profil utilisateur absent.",
            );
            const { error } = await supabase.auth.signOut();
            if (error)
              console.error(
                "Impossible de fermer la session sans profil :",
                error,
              );
          }
        } else {
          const localUserJson = localStorage.getItem("fital_immo_user");
          if (localUserJson) {
            try {
              const parsed = JSON.parse(localUserJson);
              if (parsed && parsed.id) {
                setCurrentUser(parsed);
                persistCollection("current_user", parsed);
              }
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn("Erreur verification session auth:", err);
      } finally {
        setIsAuthLoading(false);
      }
    });
  }, [isAgencyLoginPath]);

  // useEffect 4 : Chargement données
  useEffect(() => {
    if (!currentUser?.agencyId || currentUser.agencyId.trim() === "") {
      return;
    }

    // Éviter le double-appel (React Strict Mode en dev)
    const loadingKey = `data_loading_${currentUser.agencyId}`;
    if ((window as any)[loadingKey]) {
      return;
    }
    (window as any)[loadingKey] = true;

    console.log("Chargement des données pour:", currentUser.agencyId);

    let cancelled = false;
    setIsDataLoading(true);

    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        const data = await loadFullApplicationData(currentUser.agencyId);
        try {
          const stats = await getAgencyStats(currentUser.agencyId);
          if (stats) setAgencyStats(stats);
        } catch (e) {
          console.warn("Stats loading failed:", e);
        }
        if (cancelled) return;

        console.log("Données chargées:", {
          properties: data.properties?.length,
          buildings: data.buildings?.length,
          units: data.units?.length,
          owners: data.owners?.length,
          tenants: data.tenants?.length,
        });

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
        console.error("Erreur chargement:", err);
      } finally {
        if (!cancelled) {
          setIsDataLoading(false);
          (window as any)[loadingKey] = false;
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      (window as any)[loadingKey] = false;
    };
  }, [currentUser?.agencyId, currentUser?.id]);

  // Charger les actions à la demande pour les vues journal et archives.
  useEffect(() => {
    if (
      (activeTab !== "activity-logs" && activeTab !== "archives") ||
      !currentUser?.agencyId
    )
      return;

    let cancelled = false;
    setActivityLogs([]);
    setActivityLogsLoading(true);
    setActivityLogsError(null);
    const loadRecords = async () => {
      if (activeTab === "archives") {
        // Charger les petites tables d'abord (rapide)
        const data = await fetchAgencyArchiveData(currentUser.agencyId);
        if (cancelled) return;
        setTenants(data.tenants);
        setOwners(data.owners);
        setProperties(data.properties);
        setBuildings(data.buildings);
        setUnits(data.units);
        setContracts(data.contracts);
        setPayments(data.payments);
        setDisbursements(data.disbursements);
        setInspections(data.inspections);
        setMaintenance(data.maintenance);
        setInvoices(data.invoices);
        setBulletinsVersements(data.bulletinVersements);
        setOwnerCharges(data.ownerCharges);
        setOwnerDeductions(data.ownerDeductions);
        setArchives(data.archives);
        setActivityLogs(data.activityLogs);
        setPenalties(data.penalties);
        setReminders(data.reminders);
        setCashMovements(data.cashMovements);
        setCashClosings(data.cashClosings);
        setCashVouchers(data.cashVouchers);
        return;
      }
      const activities = await fetchAgencyActivityLogs(currentUser.agencyId);
      if (cancelled) return;
      setActivityLogs(activities);
    };

    loadRecords()
      .catch((error: unknown) => {
        console.error(
          "Erreur de chargement du journal ou des archives:",
          error,
        );
        if (!cancelled) {
          if (activeTab === "activity-logs") setActivityLogs([]);
          setActivityLogsError(
            error instanceof Error
              ? error.message
              : "Impossible de charger les données distantes.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setActivityLogsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, currentUser?.agencyId]);

  const handleSignOut = async () => {
    await signOutSession();
    try {
      localStorage.removeItem("fital_immo_user");
      localStorage.removeItem("fital_immo_current_user");
    } catch (e) {}

    // 🔒 VIDER TOUT L'ÉTAT AVANT DÉCONNEXION (évite les fuites visuelles entre agences)
    setCurrentUser(null);
    setIsProfileModalOpen(false);
    setProperties([]);
    setBuildings([]);
    setUnits([]);
    setOwners([]);
    setTenants([]);
    setContracts([]);
    setPayments([]);
    setReminders([]);
    setInspections([]);
    setMaintenance([]);
    setDisbursements([]);
    setInvoices([]);
    setCashVouchers([]);
    setNotifications([]);
    setAuditLogs([]);
    setUsers([]);
    setCashMovements([]);
    setCashClosings([]);
    setPaymentMethods([]);
    setOwnerDeductions([]);
    setBulletinsVersements([]);
    setArchives([]);
    setActivityLogs([]);
    setPenalties([]);
    setOwnerCharges([]);
    setAgencyStats(null);
  };

  const handleTriggerAuditLog = (
    action: string,
    module: string,
    details: string,
    entityRef?: string,
  ) => {
    const userLabel = currentUser
      ? `${currentUser.prenom} ${currentUser.nom}`
      : "Système";
    const userRole = currentUser ? currentUser.role : "SYSTÈME";
    const newLog: AuditLog = {
      id: crypto.randomUUID(),
      action,
      entite: module,
      entiteId: entityRef || "SYSTÈME",
      utilisateur: `${userLabel} (${userRole})`,
      userNom: userLabel,
      module,
      entityRef,
      details,
      date: new Date().toISOString().replace("T", " ").substring(0, 19),
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    const activityDate = newLog.createdAt.slice(0, 10);
    const activityHour = newLog.createdAt.slice(11, 19);
    const activity: ActivityLog = {
      id: `audit-${newLog.id}`,
      agencyId: currentUser?.agencyId || "",
      userNom: userLabel,
      activityType: "OTHER",
      entityType: module,
      entityRef: entityRef,
      title: action,
      description: details,
      activityDate,
      activityHour,
      createdAt: newLog.createdAt,
    };
    if (!currentUser?.agencyId) {
      setActivityLogsError(
        "Impossible d'enregistrer l'activité : agence de l'utilisateur introuvable.",
      );
      return;
    }
    setActivityLogsError(null);
    void saveActivityLogToDb(activity, currentUser.agencyId)
      .then((activityResult) => {
        const savedActivity = activityResult.data;
        if (!activityResult.success || !savedActivity) {
          throw new Error(
            activityResult.error ||
              "L'activité n'a pas été enregistrée dans Supabase.",
          );
        }
        setActivityLogs((previous) => [
          savedActivity,
          ...previous.filter((entry) => entry.id !== savedActivity.id),
        ]);
      })
      .catch((error: unknown) => {
        console.error("Erreur d'enregistrement du journal d'activité:", error);
        setActivityLogsError(
          error instanceof Error
            ? error.message
            : "Impossible d'enregistrer l'activité dans Supabase.",
        );
      });
    void logSystemAudit(newLog, currentUser.agencyId).catch(
      (error: unknown) => {
        console.error("Erreur d'enregistrement de l'audit:", error);
        setActivityLogsError(
          error instanceof Error
            ? error.message
            : "Impossible d'enregistrer l'audit de cette action.",
        );
      },
    );
  };

  const checkAccessPermission = (
    tab: ActiveTab,
    user: UserAccount,
  ): boolean => {
    if (user.role === "SUPER_ADMIN_SAAS") {
      return tab === "saas-admin" || tab === "dashboard";
    }

    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") return true;
    if (tab === "archives" || tab === "activity-logs") {
      return ["ADMIN", "SUPER_ADMIN", "GESTIONNAIRE"].includes(user.role);
    }
    if (tab === "penalties") {
      return ["ADMIN", "SUPER_ADMIN", "GESTIONNAIRE", "CAISSIER"].includes(
        user.role,
      );
    }
    if (user.role === "CAISSIER") {
      return [
        "dashboard",
        "caisse",
        "pending-payments",
        "payments",
        "payment-reports",
        "tenants",
        "buildings",
        "units",
        "finance",
        "documents",
      ].includes(tab);
    }
    if (user.role === "PROPRIETAIRE") {
      return ["dashboard", "buildings", "units", "tenants", "finance"].includes(
        tab,
      );
    }
    if (user.role === "LOCATAIRE") {
      return ["dashboard", "payments", "maintenance"].includes(tab);
    }
    if (user.role === "AGENT") {
      return [
        "dashboard",
        "inspections",
        "properties",
        "buildings",
        "units",
        "maintenance",
        "recovery",
      ].includes(tab);
    }
    if (user.role === "GESTIONNAIRE") {
      return [
        "dashboard",
        "owners",
        "properties",
        "buildings",
        "units",
        "tenants",
        "contracts",
        "inspections",
        "recovery",
        "reminders",
        "maintenance",
        "documents",
        "finance",
        "archives",
        "activity-logs",
        "penalties",
      ].includes(tab);
    }
    return false;
  };

  const handleSwitchUser = (newUser: UserAccount) => {
    if (newUser.statut !== "actif") {
      alert("Ce compte est suspendu ou désactivé et ne peut pas être ouvert.");
      return;
    }

    // 🔒 Vider tout l'état avant de changer d'utilisateur
    setProperties([]);
    setBuildings([]);
    setUnits([]);
    setOwners([]);
    setTenants([]);
    setContracts([]);
    setPayments([]);
    setReminders([]);
    setInspections([]);
    setMaintenance([]);
    setDisbursements([]);
    setInvoices([]);
    setCashVouchers([]);
    setNotifications([]);
    setAuditLogs([]);
    setUsers([]);
    setCashMovements([]);
    setCashClosings([]);
    setPaymentMethods([]);
    setOwnerDeductions([]);
    setBulletinsVersements([]);
    setArchives([]);
    setActivityLogs([]);
    setPenalties([]);
    setOwnerCharges([]);
    setAgencyStats(null);

    setCurrentUser(newUser);
    persistCollection("current_user", newUser);
    localStorage.setItem("fital_immo_user", JSON.stringify(newUser));
    if (!checkAccessPermission(activeTab, newUser)) setActiveTab("dashboard");
  };

  const handleSafeTabChange = (targetTab: ActiveTab) => {
    if (currentUser && checkAccessPermission(targetTab, currentUser)) {
      setActiveTab(targetTab);
    } else {
      setActiveTab("dashboard");
    }
  };

  // ============================================================
  // HANDLERS : BUILDINGS
  // ============================================================
  const handleAddBuilding = async (newBuilding: Building) => {
    // 🔒 Protection : bloque si une sauvegarde est déjà en cours
    if (isSavingBuilding) {
      alert(
        "Une sauvegarde est déjà en cours. Merci de patienter quelques secondes.",
      );
      return;
    }
    setIsSavingBuilding(true);

    // Insertion optimiste (affiche tout de suite)
    setBuildings((prev) => {
      const next = [newBuilding, ...prev];
      persistCollection("buildings", next);
      return next;
    });

    // Persistance serveur + récupération de l'ID réel
    if (currentUser?.agencyId) {
      try {
        const res = await saveBuildingToDb(newBuilding, currentUser.agencyId);
        if (res.success && res.data) {
          // Remplace le bâtiment optimiste par celui du serveur (avec le vrai ID)
          setBuildings((prev) => {
            const next = prev.map((b) =>
              b.id === newBuilding.id ? { ...b, ...res.data! } : b,
            );
            persistCollection("buildings", next);
            return next;
          });
        } else {
          // Échec : on retire le bâtiment optimiste
          alert(
            `Impossible de créer l'immeuble : ${res.error || "erreur inconnue"}`,
          );
          setBuildings((prev) => {
            const next = prev.filter((b) => b.id !== newBuilding.id);
            persistCollection("buildings", next);
            return next;
          });
        }
      } catch (err: any) {
        console.warn("Erreur saveBuildingToDb:", err);
        alert(
          `Erreur réseau. L'immeuble n'a pas été créé. Réessayez.\n\n${err?.message || ""}`,
        );
        setBuildings((prev) => {
          const next = prev.filter((b) => b.id !== newBuilding.id);
          persistCollection("buildings", next);
          return next;
        });
      }
    }

    setIsSavingBuilding(false);
  };
  const handleUpdateBuilding = (updatedBuilding: Building) => {
    setBuildings((prev) => {
      const next = prev.map((b) =>
        b.id === updatedBuilding.id ? updatedBuilding : b,
      );
      persistCollection("buildings", next);
      return next;
    });
    if (currentUser?.agencyId)
      saveBuildingToDb(updatedBuilding, currentUser.agencyId).catch(
        console.warn,
      );
  };
  const handleDeleteBuilding = (buildingId: string) => {
    setBuildings((prev) => {
      const next = prev.filter((b) => b.id !== buildingId);
      persistCollection("buildings", next);
      return next;
    });
    setUnits((prev) => {
      const next = prev.filter((u) => u.buildingId !== buildingId);
      persistCollection("units", next);
      return next;
    });
    deleteBuildingFromDb(buildingId).catch(console.warn);
  };

  // ============================================================
  // RATTACHER une unité orpheline à un immeuble existant
  // ============================================================
  const handleReattachUnit = (unitId: string, newBuildingId: string) => {
    setUnits((prev) => {
      const next = prev.map((u) =>
        u.id === unitId ? { ...u, buildingId: newBuildingId } : u,
      );
      persistCollection("units", next);
      return next;
    });

    if (currentUser?.agencyId) {
      // Mise à jour en base
      supabase
        .from("units")
        .update({ building_id: newBuildingId })
        .eq("id", unitId)
        .then(({ error }) => {
          if (error) console.warn("Erreur rattachement:", error);
          else console.log("✅ Unité rattachée");
        });
    }
  };

  // ============================================================
  // HANDLERS : UNITS
  // ============================================================
  const handleAddUnit = async (newUnit: Unit) => {
    // 🔒 Protection : bloque si une sauvegarde est déjà en cours
    if (isSavingUnit) {
      alert(
        "Une sauvegarde est déjà en cours. Merci de patienter quelques secondes.",
      );
      return;
    }
    setIsSavingUnit(true);

    setUnits((prev) => {
      const next = [newUnit, ...prev];
      persistCollection("units", next);
      return next;
    });

    if (currentUser?.agencyId) {
      try {
        const res = await saveUnitToDb(newUnit, currentUser.agencyId);
        if (res.success && res.data) {
          setUnits((prev) => {
            const next = prev.map((u) =>
              u.id === newUnit.id ? { ...u, ...res.data! } : u,
            );
            persistCollection("units", next);
            return next;
          });
        } else {
          // Échec : on retire l'unit optimiste
          alert(
            `Impossible de créer l'espace : ${res.error || "erreur inconnue"}`,
          );
          setUnits((prev) => {
            const next = prev.filter((u) => u.id !== newUnit.id);
            persistCollection("units", next);
            return next;
          });
        }
      } catch (err: any) {
        console.warn("Erreur saveUnitToDb:", err);
        alert(
          `Erreur réseau. L'espace n'a pas été créé. Réessayez.\n\n${err?.message || ""}`,
        );
        setUnits((prev) => {
          const next = prev.filter((u) => u.id !== newUnit.id);
          persistCollection("units", next);
          return next;
        });
      }
    }

    setIsSavingUnit(false);
  };
  const handleUpdateUnit = (updatedUnit: Unit) => {
    setUnits((prev) => {
      const next = prev.map((u) => (u.id === updatedUnit.id ? updatedUnit : u));
      persistCollection("units", next);
      return next;
    });
    if (currentUser?.agencyId)
      saveUnitToDb(updatedUnit, currentUser.agencyId).catch(console.warn);
  };
  const handleDeleteUnit = (unitId: string) => {
    setUnits((prev) => {
      const next = prev.filter((u) => u.id !== unitId);
      persistCollection("units", next);
      return next;
    });
    deleteUnitFromDb(unitId).catch(console.warn);
  };

  // ============================================================
  // HANDLERS : PENALTIES
  // ============================================================
  const handleAddOwnerCharge = (charge: OwnerCharge) => {
    setOwnerCharges((prev) => [charge, ...prev]);
    if (currentUser?.agencyId) {
      saveOwnerChargeToDb(charge, currentUser.agencyId).catch(console.warn);
    }
    handleTriggerAuditLog(
      "OWNER_CHARGE_CREATED",
      "Charges propriétaire",
      `${charge.libelle} — ${formatNumber(charge.montant)} FCFA`,
      charge.referenceDocument || charge.id,
    );
  };

  const handleDeleteOwnerCharge = (chargeId: string) => {
    const charge = ownerCharges.find((item) => item.id === chargeId);
    setOwnerCharges((prev) => prev.filter((c) => c.id !== chargeId));
    deleteOwnerChargeFromDb(chargeId).catch(console.warn);
    handleTriggerAuditLog(
      "OWNER_CHARGE_DELETED",
      "Charges propriétaire",
      `Suppression de la charge ${charge?.libelle || chargeId}`,
      charge?.referenceDocument || chargeId,
    );
  };
  const handleAddPenalty = async (penalty: Penalty): Promise<boolean> => {
    if (currentUser?.agencyId) {
      const result = await savePenaltyToDb(penalty, currentUser.agencyId);
      if (!result.success) {
        alert(`Échec de l'enregistrement de la pénalité : ${result.error}`);
        return false;
      }
    }
    setPenalties((prev) => {
      const next = [penalty, ...prev];
      persistCollection("penalties", next);
      return next;
    });
    handleTriggerAuditLog(
      "PENALTY_CREATED",
      "Pénalités",
      `${penalty.locataireNom} — ${formatNumber(penalty.montantPenalite)} FCFA (${penalty.periode})`,
      penalty.id,
    );
    return true;
  };
  const handleDeletePenalty = async (penaltyId: string): Promise<boolean> => {
    const penalty = penalties.find((item) => item.id === penaltyId);
    const result = await deletePenaltyFromDb(penaltyId);
    if (!result.success) {
      alert(`Échec de la suppression de la pénalité : ${result.error}`);
      return false;
    }
    setPenalties((prev) => {
      const next = prev.filter((p) => p.id !== penaltyId);
      persistCollection("penalties", next);
      return next;
    });
    handleTriggerAuditLog(
      "PENALTY_DELETED",
      "Pénalités",
      `Suppression de la pénalité de ${penalty?.locataireNom || penaltyId}`,
      penaltyId,
    );
    return true;
  };
  const handleUpdatePenalty = async (penalty: Penalty): Promise<boolean> => {
    if (!currentUser?.agencyId) {
      alert("Impossible d'appliquer la pénalité : agence non identifiée.");
      return false;
    }
    const result = await savePenaltyToDb(penalty, currentUser.agencyId);
    if (!result.success) {
      alert(`Échec de la mise à jour de la pénalité : ${result.error}`);
      return false;
    }
    setPenalties((prev) => {
      const next = prev.map((p) => (p.id === penalty.id ? penalty : p));
      persistCollection("penalties", next);
      return next;
    });
    handleTriggerAuditLog(
      "PENALTY_APPLIED",
      "Pénalités",
      `${penalty.locataireNom} — ${formatNumber(penalty.montantPenalite)} FCFA`,
      penalty.id,
    );
    return true;
  };

  // ============================================================
  // HANDLERS : ARCHIVES & ACTIVITY
  // ============================================================
  const handleArchiveRecord = (archive: ArchiveRecord) => {
    setArchives((prev) => {
      const next = [archive, ...prev];
      persistCollection("archives", next);
      return next;
    });
    if (currentUser?.agencyId)
      saveArchiveToDb(archive, currentUser.agencyId).catch(console.warn);
  };
  const handleLogActivity = (activity: ActivityLog) => {
    console.log("handleLogActivity REÇU:", activity.title);
    if (!currentUser?.agencyId) {
      setActivityLogsError(
        "Impossible d'enregistrer l'activité : agence de l'utilisateur introuvable.",
      );
      return;
    }
    setActivityLogsError(null);
    void saveActivityLogToDb(activity, currentUser.agencyId)
      .then((result) => {
        const savedActivity = result.data;
        if (!result.success || !savedActivity) {
          throw new Error(
            result.error || "L'activité n'a pas été enregistrée dans Supabase.",
          );
        }
        setActivityLogs((previous) => [
          savedActivity,
          ...previous.filter((entry) => entry.id !== savedActivity.id),
        ]);
        setActivityLogsError(null);
      })
      .catch((error: unknown) => {
        console.error("Échec de l'enregistrement de l'activité:", error);
        setActivityLogsError(
          error instanceof Error
            ? error.message
            : "Impossible d'enregistrer l'activité dans Supabase.",
        );
      });
  };

  // ============================================================
  // HANDLERS : OWNER DEDUCTIONS
  // ============================================================
  const handleAddOwnerDeduction = (deduction: OwnerDeduction) => {
    setOwnerDeductions((prev) => {
      const next = [deduction, ...prev];
      persistCollection("owner_deductions", next);
      return next;
    });
    if (currentUser?.agencyId)
      saveOwnerDeductionToDb(deduction, currentUser.agencyId).catch(
        console.warn,
      );
  };
  const handleDeleteOwnerDeduction = (deductionId: string) => {
    setOwnerDeductions((prev) => {
      const next = prev.filter((d) => d.id !== deductionId);
      persistCollection("owner_deductions", next);
      return next;
    });
    deleteOwnerDeductionFromDb(deductionId).catch(console.warn);
  };

  // ============================================================
  // HANDLERS : BULLETINS
  // ============================================================
  const handleSaveBulletinVersement = (bulletin: BulletinVersement) => {
    const enrichedBulletin: BulletinVersement = {
      ...bulletin,
      createdById: bulletin.createdById || currentUser?.id,
      createdByNom:
        bulletin.createdByNom ||
        (currentUser ? `${currentUser.prenom} ${currentUser.nom}` : "Système"),
      createdByRole: bulletin.createdByRole || currentUser?.role,
    };
    setBulletinsVersements((prev) => {
      const existing = prev.findIndex((b) => b.id === enrichedBulletin.id);
      const next =
        existing >= 0
          ? prev.map((b) =>
              b.id === enrichedBulletin.id ? enrichedBulletin : b,
            )
          : [enrichedBulletin, ...prev];
      persistCollection("bulletin_versements", next);
      return next;
    });
    if (currentUser?.agencyId)
      saveBulletinVersementToDb(enrichedBulletin, currentUser.agencyId).catch(
        console.warn,
      );
  };

  // ============================================================
  // HANDLERS : PAIEMENTS
  // ============================================================
  const handleAddPayment = async (newPayment: Payment): Promise<boolean> => {
    const existingPayment = findBlockingPayment(
      payments,
      newPayment.locataireId,
      newPayment.periode,
    );

    const existingPaymentIsPending =
      existingPayment?.statut === "En attente" ||
      existingPayment?.verificationStatut === "en_attente";
    const isUpdatingExistingPayment = existingPayment?.id === newPayment.id;

    if (
      existingPayment &&
      !isUpdatingExistingPayment &&
      existingPaymentIsPending
    ) {
      alert(
        `Paiement déjà en attente\n\n` +
          `Un paiement de ${formatNumber(existingPayment.montantPaye)} FCFA est déjà en attente de validation pour ce locataire.\n\n` +
          `Veuillez d'abord valider ou rejeter ce paiement avant d'en créer un nouveau.`,
      );
      return false;
    }

    if (existingPayment && !isUpdatingExistingPayment) {
      alert(
        `DOUBLON DÉTECTÉ - Paiement refusé\n\n` +
          `Un paiement de ${formatNumber(existingPayment.montantPaye)} FCFA existe déjà pour ce locataire (${existingPayment.periode}).\n\n` +
          `Quittance : ${existingPayment.quittanceNumero}\n` +
          `Date : ${existingPayment.datePaiement}\n\n` +
          `Pour éviter un double encaissement, ce paiement est bloqué.`,
      );
      handleTriggerAuditLog(
        "PAYMENT_BLOCKED_DUPLICATE",
        "Paiements",
        `Tentative bloquée : ${newPayment.locataireNom} - ${newPayment.periode} - ${formatNumber(newPayment.montantPaye)} FCFA`,
        newPayment.quittanceNumero,
      );
      return false;
    }

    const enrichedPayment: Payment = {
      ...newPayment,
      createdById: newPayment.createdById || currentUser?.id,
      createdByNom:
        newPayment.createdByNom ||
        (currentUser ? `${currentUser.prenom} ${currentUser.nom}` : "Système"),
      createdByRole: newPayment.createdByRole || currentUser?.role,
    };
    if (currentUser?.agencyId) {
      const result = await savePaymentToDbWithLog(
        enrichedPayment,
        currentUser.agencyId,
        currentUser.id,
      );
      if (!result.success) {
        alert(result.error || "Le paiement n'a pas pu être enregistré.");
        return false;
      }
    }
    setPayments((prev) => {
      const exists = prev.some((payment) => payment.id === enrichedPayment.id);
      const next = exists
        ? prev.map((payment) =>
            payment.id === enrichedPayment.id ? enrichedPayment : payment,
          )
        : [enrichedPayment, ...prev];
      persistCollection("payments", next);
      return next;
    });

    if (
      newPayment.modePaiement === "Espèces" ||
      newPayment.moyenPaiementCode === "ESPECES"
    ) {
      const newCashEntry: CashMovement = {
        id: crypto.randomUUID(),
        type: "ENCAISSEMENT",
        montant: newPayment.montantPaye,
        libelle: `Encaissement loyer ${newPayment.periode} - ${newPayment.locataireNom}`,
        dateHeure: new Date().toISOString().replace("T", " ").substring(0, 16),
        auteurId: currentUser?.id,
        auteurNom: currentUser
          ? `${currentUser.prenom} ${currentUser.nom}`
          : "Système",
        justificatifRef: newPayment.quittanceNumero,
        moyenPaiementCode: "ESPECES",
      };
      setCashMovements((prev) => {
        const next = [newCashEntry, ...prev];
        persistCollection("cash_movements", next);
        return next;
      });
      if (currentUser?.agencyId)
        saveCashMovementToDb(newCashEntry, currentUser.agencyId).catch(
          console.warn,
        );
    }

    setTenants((prev) => {
      if (
        newPayment.statut === "En attente" ||
        newPayment.verificationStatut === "en_attente"
      ) {
        return prev;
      }
      const next = prev.map((t) => {
        if (t.id !== newPayment.locataireId) return t;

        const total = newPayment.montantTotal || 0;
        const paye = newPayment.montantPaye || 0;
        const percent = total > 0 ? (paye / total) * 100 : 0;

        let newStatut: "À jour" | "Retard" | "Impayé";
        if (percent >= 100) {
          newStatut = "À jour";
        } else if (percent >= 50) {
          newStatut = "À jour";
        } else if (percent > 0) {
          newStatut = "Retard";
        } else {
          newStatut = "Impayé";
        }

        return {
          ...t,
          statut: newStatut,
          joursRetard: newStatut === "À jour" ? 0 : t.joursRetard,
          arrieresCumules: Math.max(0, total - paye),
        };
      });
      persistCollection("tenants", next);
      return next;
    });

    const activityEntry: ActivityLog = {
      id: crypto.randomUUID(),
      agencyId: currentUser?.agencyId || "local",
      userId: currentUser?.id,
      userNom: currentUser
        ? `${currentUser.prenom} ${currentUser.nom}`
        : "Système",
      activityType: "PAYMENT",
      entityType: "payment",
      entityId: newPayment.id,
      entityRef: newPayment.quittanceNumero,
      title: `Paiement ${newPayment.statut} - ${newPayment.locataireNom}`,
      description: `${formatNumber(newPayment.montantPaye)} FCFA pour ${newPayment.bienNom}`,
      montant: newPayment.montantPaye,
      activityDate: new Date().toISOString().split("T")[0],
      activityHour: new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      createdAt: new Date().toISOString(),
    };
    handleLogActivity(activityEntry);

    alert(
      newPayment.statut === "En attente" ||
        newPayment.verificationStatut === "en_attente"
        ? `Paiement transmis et en attente de validation.\n\nRéférence : ${newPayment.quittanceNumero}\nMontant : ${formatNumber(newPayment.montantPaye)} FCFA\nLocataire : ${newPayment.locataireNom}`
        : `Paiement enregistré !\n\nQuittance : ${newPayment.quittanceNumero}\nMontant : ${formatNumber(newPayment.montantPaye)} FCFA\nLocataire : ${newPayment.locataireNom}`,
    );
    return true;
  };

  const handleOpenMobileMoney = (tenant?: Tenant, amount?: number) => {
    const t = tenant || tenants[0];
    setMobileMoneyModalConfig({
      isOpen: true,
      tenantName: t ? `${t.prenom} ${t.nom}` : "Client FITAL-IMMO",
      tenantPhone: t?.telephone || "+221 77 845 20 10",
      propertyNom: t?.bienNom || "Résidence FITAL-IMMO",
      amount: amount || t?.arrieresCumules || t?.loyerMensuel || 250000,
      period: selectedPeriod,
      reference: createDocumentNumber(agencySettings?.prefixPaiement, "PAY-"),
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
        recipientRole: contact.role || "Locataire",
        propertyNom: contact.propertyNom,
        dueAmount: contact.amount,
        daysLate: contact.daysLate,
      });
    } else {
      const lateTenant =
        tenants.find((t) => t.statut === "Retard") || tenants[0];
      setQuickCommsModalConfig({
        isOpen: true,
        recipientName: lateTenant
          ? `${lateTenant.prenom} ${lateTenant.nom}`
          : "Locataire FITAL-IMMO",
        recipientPhone: lateTenant?.telephone || "+221 77 845 20 10",
        recipientRole: "Locataire",
        propertyNom: lateTenant?.bienNom || "Logement Dakar",
        dueAmount:
          lateTenant?.arrieresCumules || lateTenant?.loyerMensuel || 150000,
        daysLate: lateTenant?.joursRetard || 0,
      });
    }
  };

  const resolvePaymentStatus = (
    payment: Partial<Payment>,
  ): Payment["statut"] => {
    const paid = Number(payment.montantPaye ?? 0);
    const totalFromBreakdown =
      (payment.loyerBase ?? 0) +
      (payment.charges ?? 0) +
      (payment.penalites ?? 0) +
      (payment.tva ?? 0) +
      (payment.tom ?? 0);
    const total = Number(
      payment.montantTotal ??
        (totalFromBreakdown > 0 ? totalFromBreakdown : paid),
    );

    if (payment.verificationStatut === "en_attente") return "En attente";
    if (payment.verificationStatut === "rejete") return "Impayé";
    if (total > 0 && paid >= total) return "Payé";
    if (paid > 0) return "Partiel";
    if (payment.statut === "Impayé") return "Impayé";
    return "Impayé";
  };

  const handleConfirmMobileMoneyPayment = async (
    amount: number,
    method: string,
    transactionId: string,
    tenantId = mobileMoneyModalConfig?.tenantId,
    period = selectedPeriod,
  ): Promise<boolean> => {
    const tenant = tenants.find((t) => t.id === tenantId);
    const property = properties.find((p) => p.id === tenant?.bienId);
    const owner = owners.find(
      (o) => o.id === (property?.proprietaireId || tenant?.proprietaireId),
    );
    if (
      !tenant ||
      !property ||
      !period.trim() ||
      !transactionId.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      alert(
        "Impossible de valider le paiement : données de paiement invalides ou locataire/bien introuvable.",
      );
      return false;
    }

    const samePeriodPayment = findBlockingPayment(payments, tenant.id, period);

    if (samePeriodPayment) {
      alert(
        `PAIEMENT DÉJÀ TRAITÉ\n\n` +
          `Un paiement de ${formatNumber(samePeriodPayment.montantPaye)} FCFA est déjà enregistré pour ${tenant.prenom} ${tenant.nom} (${period}).\n\n` +
          `Statut : ${
            samePeriodPayment.statut === "En attente" ||
            samePeriodPayment.verificationStatut === "en_attente"
              ? "En attente de validation"
              : samePeriodPayment.statut
          }.\n\n` +
          `Veuillez d'abord le valider ou le rejeter avant d'en créer un nouveau.`,
      );
      setMobileMoneyModalConfig(null);
      return false;
    }

    const methodCode =
      method === "WAVE"
        ? "WAVE"
        : method === "ORANGE_MONEY"
          ? "ORANGE_MONEY"
          : "AUTRE";
    const newPayment = createPendingMobilePayment({
      tenant,
      property,
      owner,
      amount,
      method: methodCode,
      transactionId,
      period,
      settings: agencySettings,
      currentUser,
      dueDay:
        contracts.find((item) => item.locataireId === tenant.id)
          ?.jourEcheance ?? 5,
    });
    const saved = await handleAddPayment(newPayment);
    if (saved) setMobileMoneyModalConfig(null);
    return saved;
  };

  const handleValidatePendingPayment = (paymentId: string) => {
    setPayments((prev) => {
      const next = prev.map((p) => {
        if (p.id !== paymentId) return p;

        const finalStatus = resolvePaymentStatus({
          ...p,
          verificationStatut: "valide",
          montantPaye: Number(p.montantPaye ?? 0),
          montantTotal: Number(p.montantTotal ?? p.montantPaye ?? 0),
        });

        return {
          ...p,
          verificationStatut: "valide" as const,
          statut: finalStatus,
          dateValidation: new Date().toISOString().split("T")[0],
          valideParId: currentUser?.id,
          valideParNom: currentUser
            ? `${currentUser.prenom} ${currentUser.nom}`
            : "Système",
          montantRestant: Math.max(
            0,
            Number(p.montantTotal ?? p.montantPaye ?? 0) -
              Number(p.montantPaye ?? 0),
          ),
        };
      });
      persistCollection("payments", next);
      return next;
    });
    if (currentUser?.agencyId)
      validatePendingPaymentInDb(
        paymentId,
        currentUser.agencyId,
        currentUser.id,
      ).catch(console.warn);
  };

  const handleRejectPendingPayment = (paymentId: string, reason: string) => {
    setPayments((prev) => {
      const next = prev.map((p) =>
        p.id === paymentId
          ? {
              ...p,
              verificationStatut: "rejete" as const,
              statut: "Impayé" as const,
              motifRejet: reason,
              montantRestant: Number(p.montantTotal ?? p.montantPaye ?? 0),
            }
          : p,
      );
      persistCollection("payments", next);
      return next;
    });
    if (currentUser?.agencyId)
      rejectPendingPaymentInDb(paymentId, currentUser.agencyId, reason).catch(
        console.warn,
      );
  };

  const handleAddCashMovement = (mov: CashMovement) => {
    const enrichedMov: CashMovement = {
      ...mov,
      createdById: mov.createdById || currentUser?.id,
      createdByNom:
        mov.createdByNom ||
        (currentUser ? `${currentUser.prenom} ${currentUser.nom}` : "Système"),
      createdByRole: mov.createdByRole || currentUser?.role,
    };
    setCashMovements((prev) => {
      const next = [enrichedMov, ...prev];
      persistCollection("cash_movements", next);
      return next;
    });
    if (currentUser?.agencyId)
      saveCashMovementToDb(enrichedMov, currentUser.agencyId).catch(
        console.warn,
      );
  };

  const handleAddCashClosing = (cls: CashClosing) => {
    setCashClosings((prev) => {
      const next = [cls, ...prev];
      persistCollection("cash_closings", next);
      return next;
    });
    if (currentUser?.agencyId)
      saveCashClosingToDb(
        cls,
        currentUser.agencyId,
        currentUser.id,
        `${currentUser.prenom} ${currentUser.nom}`,
      ).catch(console.warn);
  };

  const handleUpdatePaymentMethod = (method: PaymentMethodConfig) => {
    setPaymentMethods((prev) => {
      const next = prev.map((m) => (m.id === method.id ? method : m));
      persistCollection("payment_methods", next);
      return next;
    });
    savePaymentMethodToDb(method, currentUser?.agencyId).catch(console.warn);
  };

  const handleAddPaymentMethod = (method: PaymentMethodConfig) => {
    setPaymentMethods((prev) => {
      const next = [...prev, method];
      persistCollection("payment_methods", next);
      return next;
    });
    savePaymentMethodToDb(method, currentUser?.agencyId).catch(console.warn);
  };

  const handleAddUser = async (
    user: UserAccount,
  ): Promise<{ success: boolean; error?: string }> => {
    let agencyId = currentUser?.agencyId;
    if (
      isSupabaseConfigured &&
      supabase &&
      (!agencyId || agencyId.startsWith("agency-"))
    ) {
      const agency = await getOrCreateDefaultAgency();
      if (agency) agencyId = agency.id;
    }
    if (isSupabaseConfigured && agencyId && !agencyId.startsWith("agency-")) {
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
          const next = [
            result.user!,
            ...prev.filter((u) => u.email !== user.email),
          ];
          persistCollection("users", next);
          return next;
        });
        return { success: true };
      }
      return { success: false, error: result.error };
    }
    setUsers((prev) => {
      const next = [user, ...prev];
      persistCollection("users", next);
      return next;
    });
    return {
      success: true,
      error: isSupabaseConfigured ? undefined : "Compte local.",
    };
  };

  const handleUpdateUser = async (
    updatedUser: UserAccount,
  ): Promise<{ success: boolean; error?: string }> => {
    const isLocalUser =
      updatedUser.id.startsWith("user-") || updatedUser.id.startsWith("usr-");
    if (isSupabaseConfigured && !isLocalUser) {
      const result = await saveUserToDb(
        updatedUser,
        updatedUser.agencyId || currentUser?.agencyId,
      );
      if (!result.success) return result;
    }

    setUsers((prev) => {
      const next = prev.map((user) =>
        user.id === updatedUser.id ? updatedUser : user,
      );
      persistCollection("users", next);
      return next;
    });
    return { success: true };
  };

  const handleAddProperty = (newProperty: Property) => {
    setProperties((prev) => {
      const next = [newProperty, ...prev];
      persistCollection("properties", next);
      return next;
    });
    if (currentUser?.agencyId)
      savePropertyToDbWithLog(newProperty, currentUser.agencyId).catch(
        console.warn,
      );
  };
  const handleUpdateProperty = (updatedProperty: Property) => {
    setProperties((prev) => {
      const next = prev.map((p) =>
        p.id === updatedProperty.id ? updatedProperty : p,
      );
      persistCollection("properties", next);
      return next;
    });
    if (currentUser?.agencyId)
      savePropertyToDb(updatedProperty, currentUser.agencyId).catch(
        console.warn,
      );
  };
  const handleDeleteProperty = (propertyId: string) => {
    setProperties((prev) => {
      const next = prev.filter((p) => p.id !== propertyId);
      persistCollection("properties", next);
      return next;
    });
    softDeleteRecord("properties", propertyId).catch(console.warn);
  };

  const handleAddContract = (newContract: LeaseContract) => {
    const enrichedContract: LeaseContract = {
      ...newContract,
      createdById: newContract.createdById || currentUser?.id,
      createdByNom:
        newContract.createdByNom ||
        (currentUser ? `${currentUser.prenom} ${currentUser.nom}` : "Système"),
      createdByRole: newContract.createdByRole || currentUser?.role,
    };
    setContracts((prev) => {
      const next = [enrichedContract, ...prev];
      persistCollection("contracts", next);
      return next;
    });
    if (currentUser?.agencyId)
      saveContractToDbWithLog(enrichedContract, currentUser.agencyId).catch(
        console.warn,
      );
  };
  const handleUpdateContract = (updatedContract: LeaseContract) => {
    setContracts((prev) => {
      const next = prev.map((c) =>
        c.id === updatedContract.id ? updatedContract : c,
      );
      persistCollection("contracts", next);
      return next;
    });
    if (currentUser?.agencyId)
      saveContractToDb(updatedContract, currentUser.agencyId).catch(
        console.warn,
      );
  };

  const handleAddTenant = (newTenant: Tenant) => {
    const existingUnit = units.find((u) => u.id === newTenant.bienId);
    const existingProp = properties.find((p) => p.id === newTenant.bienId);

    if (
      existingUnit &&
      existingUnit.statut === "Occupé" &&
      existingUnit.locataireActuelId !== newTenant.id
    ) {
      alert(`Le bien ${existingUnit.nom} est déjà occupé.`);
      return;
    }
    if (
      existingProp &&
      existingProp.statut === "Occupé" &&
      existingProp.locataireActuelNom &&
      existingProp.locataireActuelNom !== `${newTenant.prenom} ${newTenant.nom}`
    ) {
      alert(`Le bien ${existingProp.nom} est déjà occupé.`);
      return;
    }

    const existingActiveLease = tenants.find(
      (t) =>
        t.nom?.toLowerCase() === newTenant.nom?.toLowerCase() &&
        t.prenom?.toLowerCase() === newTenant.prenom?.toLowerCase() &&
        t.cni === newTenant.cni &&
        t.bienId !== newTenant.bienId &&
        !t.dateSortie,
    );

    if (existingActiveLease) {
      alert(
        `LOCATAIRE DÉJÀ ACTIF\n\n` +
          `${newTenant.prenom} ${newTenant.nom} (CNI : ${newTenant.cni}) occupe déjà : ${existingActiveLease.bienNom}`,
      );
      return;
    }

    setTenants((prev) => {
      const next = [newTenant, ...prev];
      persistCollection("tenants", next);
      return next;
    });
    if (currentUser?.agencyId)
      saveTenantToDbWithLog(newTenant, currentUser.agencyId).catch(
        console.warn,
      );

    if (newTenant.bienId) {
      if (existingProp) {
        setProperties((prev) => {
          const next = prev.map((p) => {
            if (p.id === newTenant.bienId) {
              const updatedP = {
                ...p,
                statut: "Occupé" as const,
                locataireActuelNom: `${newTenant.prenom} ${newTenant.nom}`,
                locataireActuelId: newTenant.id,
              };
              if (currentUser?.agencyId)
                savePropertyToDb(updatedP, currentUser.agencyId).catch(
                  console.warn,
                );
              return updatedP;
            }
            return p;
          });
          persistCollection("properties", next);
          return next;
        });
      }

      if (existingUnit) {
        setUnits((prev) => {
          const next = prev.map((u) => {
            if (u.id === newTenant.bienId) {
              const updatedU = {
                ...u,
                statut: "Occupé" as const,
                locataireActuelId: newTenant.id,
                locataireActuelNom: `${newTenant.prenom} ${newTenant.nom}`,
              };
              if (currentUser?.agencyId)
                saveUnitToDb(updatedU, currentUser.agencyId).catch(
                  console.warn,
                );
              return updatedU;
            }
            return u;
          });
          persistCollection("units", next);
          return next;
        });
      }
    }
  };

  const handleCompleteNewTenantWizard = async (data: {
    tenant: Tenant;
    contract: LeaseContract;
    inspection: Inspection;
  }) => {
    if (!currentUser?.agencyId || !supabase) return;

    const existingUnit = units.find((u) => u.id === data.tenant.bienId);
    const existingProp = properties.find((p) => p.id === data.tenant.bienId);

    if (existingUnit && existingUnit.statut === "Occupé") {
      alert(
        `CE BIEN EST DÉJÀ OCCUPÉ\n\n` +
          `L'unité ${existingUnit.nom} est déjà louée par ${existingUnit.locataireActuelNom || "un autre locataire"}.\n\n` +
          `Veuillez d'abord enregistrer la sortie de ce locataire avant d'en créer un nouveau.`,
      );
      return;
    }
    if (existingProp && existingProp.statut === "Occupé") {
      alert(
        `CE BIEN EST DÉJÀ OCCUPÉ\n\n` +
          `Le bien ${existingProp.nom} est déjà loué par ${existingProp.locataireActuelNom || "un autre locataire"}.\n\n` +
          `Veuillez d'abord enregistrer la sortie de ce locataire avant d'en créer un nouveau.`,
      );
      return;
    }

    const existingActiveLease = tenants.find(
      (t) =>
        t.nom?.toLowerCase() === data.tenant.nom?.toLowerCase() &&
        t.prenom?.toLowerCase() === data.tenant.prenom?.toLowerCase() &&
        t.cni === data.tenant.cni &&
        t.bienId !== data.tenant.bienId &&
        !t.dateSortie,
    );

    if (existingActiveLease) {
      alert(
        `LOCATAIRE DÉJÀ ACTIF\n\n` +
          `${data.tenant.prenom} ${data.tenant.nom} (CNI : ${data.tenant.cni}) occupe déjà :\n` +
          `${existingActiveLease.bienNom}\n\n` +
          `Un locataire ne peut occuper qu'un seul bien à la fois.\n\n` +
          `Si c'est une erreur, enregistrez d'abord sa sortie de l'autre bien.`,
      );
      return;
    }

    const tenantResult = await saveTenantToDb(
      data.tenant,
      currentUser.agencyId,
    );
    if (!tenantResult.success) {
      alert("Erreur création locataire : " + tenantResult.error);
      return;
    }
    const realTenantId = tenantResult.data?.id || data.tenant.id;
    const tenantToSave = { ...data.tenant, id: realTenantId };
    const contractToSave = { ...data.contract, locataireId: realTenantId };
    const inspectionToSave = { ...data.inspection, locataireId: realTenantId };

    await saveContractToDb(contractToSave, currentUser.agencyId);
    await saveInspectionToDb(inspectionToSave, currentUser.agencyId);

    if (existingUnit) {
      const updatedU = {
        ...existingUnit,
        statut: "Occupé" as const,
        locataireActuelId: realTenantId,
        locataireActuelNom: `${data.tenant.prenom} ${data.tenant.nom}`,
      };
      await saveUnitToDb(updatedU, currentUser.agencyId);
      setUnits((prev) =>
        prev.map((u) => (u.id === updatedU.id ? updatedU : u)),
      );
    } else if (existingProp) {
      const updatedP = {
        ...existingProp,
        statut: "Occupé" as const,
        locataireActuelNom: `${data.tenant.prenom} ${data.tenant.nom}`,
        locataireActuelId: realTenantId,
      };
      await savePropertyToDb(updatedP, currentUser.agencyId);
      setProperties((prev) =>
        prev.map((p) => (p.id === updatedP.id ? updatedP : p)),
      );
    }

    setTenants((prev) => [tenantToSave, ...prev]);
    setContracts((prev) => [contractToSave, ...prev]);
    setInspections((prev) => [inspectionToSave, ...prev]);
  };

  const handleCompleteTenantExit = async (data: {
    tenantId: string;
    bienId: string;
    dateSortie: string;
    inspection: Inspection;
    retenueCaution: number;
    restitutionCaution: number;
  }) => {
    if (!currentUser?.agencyId) return;

    const tenantToUpdate = tenants.find((t) => t.id === data.tenantId);
    if (tenantToUpdate) {
      const updatedTenant = {
        ...tenantToUpdate,
        statut: "À jour" as const,
        dateSortie: data.dateSortie,
      };
      const res = await saveTenantToDb(updatedTenant, currentUser.agencyId);
      if (res.success) {
        setTenants((prev) =>
          prev.map((t) => (t.id === data.tenantId ? updatedTenant : t)),
        );
      }
    }

    const property = properties.find((p) => p.id === data.bienId);
    const unit = units.find((u) => u.id === data.bienId);

    if (property) {
      const updatedProp = {
        ...property,
        statut: "Vacant" as const,
        locataireActuelNom: undefined,
        locataireActuelId: undefined,
      };
      const res = await savePropertyToDb(updatedProp, currentUser.agencyId);
      if (res.success) {
        setProperties((prev) =>
          prev.map((p) => (p.id === data.bienId ? updatedProp : p)),
        );
      }
    }

    if (unit) {
      const updatedUnit = {
        ...unit,
        statut: "Vacant" as const,
        locataireActuelId: undefined,
        locataireActuelNom: undefined,
      };
      const res = await saveUnitToDb(updatedUnit, currentUser.agencyId);
      if (res.success) {
        setUnits((prev) =>
          prev.map((u) => (u.id === data.bienId ? updatedUnit : u)),
        );
      }
    }

    const inspRes = await saveInspectionToDb(
      data.inspection,
      currentUser.agencyId,
    );
    if (inspRes.success && inspRes.data) {
      setInspections((prev) => [inspRes.data!, ...prev]);
    } else {
      setInspections((prev) => [data.inspection, ...prev]);
    }
  };

  const handleAddOwner = (newOwner: Owner) => {
    setOwners((prev) => {
      const next = [newOwner, ...prev];
      persistCollection("owners", next);
      return next;
    });
    if (currentUser?.agencyId)
      saveOwnerToDbWithLog(newOwner, currentUser.agencyId).catch(console.warn);
  };
  const handleAddReminder = (newReminder: TenantReminder) => {
    setReminders((prev) => {
      const next = [newReminder, ...prev];
      persistCollection("reminders", next);
      return next;
    });
    if (currentUser?.agencyId)
      saveReminderToDb(newReminder, currentUser.agencyId).catch(console.warn);
    handleTriggerAuditLog(
      "REMINDER_SENT",
      "Relances",
      `${newReminder.canal} — ${newReminder.locataireNom} — ${formatNumber(newReminder.montantDu)} FCFA`,
      newReminder.id,
    );
  };

  const handleAddInspection = (newInspection: Inspection) => {
    const enrichedInspection: Inspection = {
      ...newInspection,
      createdById: newInspection.createdById || currentUser?.id,
      createdByNom:
        newInspection.createdByNom ||
        (currentUser ? `${currentUser.prenom} ${currentUser.nom}` : "Système"),
      createdByRole: newInspection.createdByRole || currentUser?.role,
    };
    setInspections((prev) => {
      const next = [enrichedInspection, ...prev];
      persistCollection("inspections", next);
      return next;
    });
    if (currentUser?.agencyId)
      saveInspectionToDb(enrichedInspection, currentUser.agencyId).catch(
        console.warn,
      );
  };
  const handleAddTicket = (newTicket: MaintenanceTicket) => {
    const enrichedTicket: MaintenanceTicket = {
      ...newTicket,
      createdById: newTicket.createdById || currentUser?.id,
      createdByNom:
        newTicket.createdByNom ||
        (currentUser ? `${currentUser.prenom} ${currentUser.nom}` : "Système"),
      createdByRole: newTicket.createdByRole || currentUser?.role,
    };
    setMaintenance((prev) => {
      const next = [enrichedTicket, ...prev];
      persistCollection("maintenance", next);
      return next;
    });
    if (currentUser?.agencyId)
      saveMaintenanceToDb(enrichedTicket, currentUser.agencyId).catch(
        console.warn,
      );
  };
  const handleUpdateTicket = (updatedTicket: MaintenanceTicket) => {
    setMaintenance((prev) => {
      const next = prev.map((t) =>
        t.id === updatedTicket.id ? updatedTicket : t,
      );
      persistCollection("maintenance", next);
      return next;
    });
    if (currentUser?.agencyId)
      saveMaintenanceToDb(updatedTicket, currentUser.agencyId).catch(
        console.warn,
      );
  };
  const handleAddDisbursement = (newDisbursement: OwnerDisbursement) => {
    const enrichedDisbursement: OwnerDisbursement = {
      ...newDisbursement,
      createdById: newDisbursement.createdById || currentUser?.id,
      createdByNom:
        newDisbursement.createdByNom ||
        (currentUser ? `${currentUser.prenom} ${currentUser.nom}` : "Système"),
      createdByRole: newDisbursement.createdByRole || currentUser?.role,
    };
    setDisbursements((prev) => {
      const next = [enrichedDisbursement, ...prev];
      persistCollection("disbursements", next);
      return next;
    });
    if (currentUser?.agencyId)
      saveDisbursementToDb(enrichedDisbursement, currentUser.agencyId).catch(
        console.warn,
      );
  };
  const handleAddInvoice = async (newInvoice: Invoice): Promise<void> => {
    const enrichedInvoice: Invoice = {
      ...newInvoice,
      createdById: newInvoice.createdById || currentUser?.id,
      createdByNom:
        newInvoice.createdByNom ||
        (currentUser ? `${currentUser.prenom} ${currentUser.nom}` : "Système"),
      createdByRole: newInvoice.createdByRole || currentUser?.role,
    };
    let invoiceToUse = enrichedInvoice;
    if (currentUser?.agencyId) {
      const result = await saveInvoiceToDb(
        enrichedInvoice,
        currentUser.agencyId,
      );
      if (!result.success) {
        throw new Error(result.error || "Impossible d'enregistrer la facture.");
      }
      invoiceToUse = result.data || enrichedInvoice;
    }

    setInvoices((prev) => {
      const next = [invoiceToUse, ...prev];
      persistCollection("invoices", next);
      return next;
    });
    handleTriggerAuditLog(
      "INVOICE_CREATED",
      "Factures",
      `${invoiceToUse.ref} — ${invoiceToUse.type} — ${formatNumber(invoiceToUse.total)} FCFA`,
      invoiceToUse.ref,
    );

    // 🆕 Si c'est une facture de travaux décaissée sur le propriétaire,
    //     créer aussi une charge propriétaire + un décaissement
    if (
      newInvoice.type === "Travaux" &&
      newInvoice.decaisserSurProprietaire !== false &&
      newInvoice.proprietaireId &&
      currentUser?.agencyId
    ) {
      // 1. Charge propriétaire
      const newCharge: OwnerCharge = {
        id: crypto.randomUUID(),
        agencyId: currentUser.agencyId,
        proprietaireId: newInvoice.proprietaireId,
        proprietaireNom: newInvoice.proprietaireNom,
        periode: selectedPeriod,
        typeCharge: "TRAVAUX",
        libelle: `Travaux ${newInvoice.natureTravaux || "entretien"} - ${newInvoice.bienNom}`,
        montant: newInvoice.total,
        referenceDocument: newInvoice.ref,
        dateCharge:
          newInvoice.dateFacture || new Date().toISOString().split("T")[0],
        statut: "Validé",
        notes: newInvoice.notes || "",
      };
      setOwnerCharges((prev) => {
        const next = [newCharge, ...prev];
        persistCollection("owner_charges", next);
        return next;
      });
      saveOwnerChargeToDb(newCharge, currentUser.agencyId).catch(console.warn);

      // 2. Décaissement
      const newDisb: OwnerDisbursement = {
        id: crypto.randomUUID(),
        ref: `REV-${Date.now()}`,
        proprietaireId: newInvoice.proprietaireId,
        proprietaireNom: newInvoice.proprietaireNom || "",
        periode: selectedPeriod,
        loyersBruts: 0,
        montantBrut: 0,
        tauxCommission: 0,
        commissionAgence: 0,
        chargesDeduites: newInvoice.total,
        montantNetPaye: -newInvoice.total,
        montantNet: -newInvoice.total,
        statut: "Effectué",
        modeReglement: "Déduction bulletin",
        dateReglement:
          newInvoice.dateFacture || new Date().toISOString().split("T")[0],
        createdById: currentUser.id,
        createdByNom: `${currentUser.prenom} ${currentUser.nom}`,
        createdByRole: currentUser.role,
      };
      setDisbursements((prev) => {
        const next = [newDisb, ...prev];
        persistCollection("disbursements", next);
        return next;
      });
      saveDisbursementToDb(newDisb, currentUser.agencyId).catch(console.warn);
    }
  };
  const handleSaveSettings = async (
    newSettings: AgencySettings,
  ): Promise<void> => {
    if (currentUser?.agencyId) {
      const result = await saveSettingsToDb(newSettings, currentUser.agencyId);
      if (!result.success)
        throw new Error(
          result.error || "Impossible de sauvegarder les paramètres.",
        );
      await reloadAgencySettings();
    }
    setSettings(newSettings);
    persistCollection("settings", newSettings);
  };
  const handleOpenQuickReminder = (tenant: Tenant) => {
    setActiveTab("reminders");
  };
  const handleOpenNewPaymentForTenant = (tenant?: Tenant) => {
    if (tenant) {
      setInitialTenantForPayment(tenant);
    } else {
      setInitialTenantForPayment(null);
    }
    setIsNewPaymentModalOpen(true);
    setActiveTab("payments");
  };
  const handleOpenBulletinVersement = (owner: Owner) => {
    setOwnerBulletinModalOwner(owner);
  };

  const unpaidCount = tenants.filter(
    (t) => t.statut === "Impayé" || t.statut === "Retard",
  ).length;
  const pendingPaymentsCount = payments.filter(
    (p) => p.verificationStatut === "en_attente",
  ).length;

  // SCOPED DATA
  const scopedProperties = (() => {
    if (currentUser?.role === "PROPRIETAIRE")
      return properties.filter(
        (p) => p.proprietaireId === currentUser.proprietaireId,
      );
    if (currentUser?.role === "LOCATAIRE") {
      const myTenant = tenants.find((t) => t.id === currentUser.locataireId);
      return myTenant ? properties.filter((p) => p.id === myTenant.bienId) : [];
    }
    return properties;
  })();

  const scopedBuildings = (() => {
    if (currentUser?.role === "PROPRIETAIRE")
      return buildings.filter(
        (b) => b.proprietaireId === currentUser.proprietaireId,
      );
    return buildings;
  })();
  const scopedUnits = (() => {
    if (currentUser?.role === "PROPRIETAIRE")
      return units.filter(
        (u) => u.proprietaireId === currentUser.proprietaireId,
      );
    if (currentUser?.role === "LOCATAIRE") {
      const myTenant = tenants.find((t) => t.id === currentUser.locataireId);
      if (myTenant)
        return units.filter(
          (u) =>
            u.buildingId === myTenant.bienId ||
            u.locataireActuelId === myTenant.id,
        );
    }
    return units;
  })();
  const scopedTenants = (() => {
    if (currentUser?.role === "PROPRIETAIRE") {
      const myProps = properties.filter(
        (p) => p.proprietaireId === currentUser.proprietaireId,
      );
      const myUnits = units.filter(
        (u) => u.proprietaireId === currentUser.proprietaireId,
      );
      const myBienIds = [
        ...myProps.map((p) => p.id),
        ...myUnits.map((u) => u.id),
      ];
      const filtered = tenants.filter(
        (t) =>
          myBienIds.includes(t.bienId) ||
          t.proprietaireId === currentUser.proprietaireId,
      );

      return filtered.map((t) => ({
        ...t,
        telephone: "",
        email: "",
        cni: "",
        typePiece: undefined,
        profession: "",
        employeur: "",
        revenuMensuel: 0,
        statut: "À jour" as const,
        joursRetard: 0,
        arrieresCumules: 0,
        observations: "",
        conjointNom: "",
        conjointTelephone: "",
      }));
    }
    if (currentUser?.role === "LOCATAIRE")
      return tenants.filter((t) => t.id === currentUser.locataireId);
    return tenants;
  })();
  const scopedPayments = (() => {
    if (currentUser?.role === "PROPRIETAIRE") return [];
    if (currentUser?.role === "LOCATAIRE")
      return payments.filter((p) => p.locataireId === currentUser.locataireId);
    if (currentUser?.role === "AGENT") return [];
    return payments;
  })();
  const scopedContracts = (() => {
    if (currentUser?.role === "PROPRIETAIRE")
      return contracts.filter(
        (c) => c.proprietaireId === currentUser.proprietaireId,
      );
    if (currentUser?.role === "LOCATAIRE")
      return contracts.filter((c) => c.locataireId === currentUser.locataireId);
    return contracts;
  })();
  const scopedInspections = (() => {
    if (currentUser?.role === "PROPRIETAIRE") {
      const myProps = properties.filter(
        (p) => p.proprietaireId === currentUser.proprietaireId,
      );
      const myUnits = units.filter(
        (u) => u.proprietaireId === currentUser.proprietaireId,
      );
      const myBienIds = [
        ...myProps.map((p) => p.id),
        ...myUnits.map((u) => u.id),
      ];
      return inspections.filter((i) => myBienIds.includes(i.bienId));
    }
    if (currentUser?.role === "LOCATAIRE")
      return inspections.filter(
        (i) => i.locataireId === currentUser.locataireId,
      );
    return inspections;
  })();
  const scopedMaintenance = (() => {
    if (currentUser?.role === "PROPRIETAIRE") {
      const myProps = properties.filter(
        (p) => p.proprietaireId === currentUser.proprietaireId,
      );
      const myUnits = units.filter(
        (u) => u.proprietaireId === currentUser.proprietaireId,
      );
      const myBienIds = [
        ...myProps.map((p) => p.id),
        ...myUnits.map((u) => u.id),
      ];
      return maintenance.filter((m) => myBienIds.includes(m.bienId));
    }
    if (currentUser?.role === "LOCATAIRE") {
      const myTenant = tenants.find((t) => t.id === currentUser.locataireId);
      return myTenant
        ? maintenance.filter((m) => m.bienId === myTenant.bienId)
        : [];
    }
    return maintenance;
  })();
  const scopedDisbursements = (() => {
    if (currentUser?.role === "PROPRIETAIRE")
      return disbursements.filter(
        (d) => d.proprietaireId === currentUser.proprietaireId,
      );
    if (currentUser?.role === "AGENT" || currentUser?.role === "LOCATAIRE")
      return [];
    return disbursements;
  })();

  if (isResetPasswordMode) {
    return (
      <ViewLoader variant="form">
        <LazyResetPasswordView
          onSuccess={() => {
            setIsResetPasswordMode(false);
            window.location.hash = "";
          }}
        />
      </ViewLoader>
    );
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#0A111D] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#C9A96E]/30 border-t-[#C9A96E] rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#A8B4C4] font-medium tracking-wide">
            Chargement sécurisé de FITAL-IMMO...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <ViewLoader variant="form">
        <LazyLoginView
          availableUsers={users}
          onLoginSuccess={async (user) => {
            let resolvedUser = user;
            if (
              isSupabaseConfigured &&
              user.agencyId &&
              !user.agencyId.startsWith("agency-")
            ) {
              const cloudUsers = await fetchAgencyUsers(user.agencyId);
              if (cloudUsers.length > 0) {
                setUsers(cloudUsers);
                persistCollection("users", cloudUsers);
              }
            } else if (isSupabaseConfigured) {
              const agency = await getOrCreateDefaultAgency();
              if (agency) {
                resolvedUser = { ...user, agencyId: agency.id };
              }
            }
            setCurrentUser(resolvedUser);
            persistCollection("current_user", resolvedUser);
            localStorage.setItem(
              "fital_immo_user",
              JSON.stringify(resolvedUser),
            );
            setUsers((prev) => {
              const next = prev.some((u) => u.id === resolvedUser.id)
                ? prev
                : [resolvedUser, ...prev];
              persistCollection("users", next);
              return next;
            });
          }}
        />
      </ViewLoader>
    );
  }

  if (isDataLoading) {
    return (
      <div className="min-h-screen bg-[#0A111D] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#C9A96E]/30 border-t-[#C9A96E] rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#A8B4C4] font-medium tracking-wide">
            Chargement des données FITAL-IMMO...
          </p>
          <p className="text-[10px] text-[#6B7C94]">
            Cela peut prendre quelques secondes.
          </p>
        </div>
      </div>
    );
  }

  if (showThemePreview) {
    return (
      <ViewLoader variant="default">
        <LazyThemePreview onBack={() => setShowThemePreview(false)} />
      </ViewLoader>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A111D] text-[#F0EDE8] flex font-sans antialiased selection:bg-[#C9A96E]/30 selection:text-[#E8D5B0]">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleSafeTabChange}
        unpaidCount={unpaidCount}
        settings={agencySettings}
        urgentMaintenanceCount={
          maintenance.filter((m) => m.priorite === "Urgente").length
        }
        currentUser={
          {
            ...currentUser,
            __ownerBuildingsCount:
              currentUser.role === "PROPRIETAIRE"
                ? buildings.filter(
                    (b) => b.proprietaireId === currentUser.proprietaireId,
                  ).length
                : buildings.length,
            __ownerUnitsCount:
              currentUser.role === "PROPRIETAIRE"
                ? units.filter(
                    (u) => u.proprietaireId === currentUser.proprietaireId,
                  ).length
                : units.length,
          } as any
        }
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
          onOpenReminders={() => handleSafeTabChange("reminders")}
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
          onOpenThemePreview={() => setShowThemePreview(true)}
        />

        <main className="flex-1 p-3.5 sm:p-5 md:p-8 pb-24 md:pb-8 max-w-[1600px] w-full mx-auto">
          {activeTab === "dashboard" &&
            (currentUser.role === "ADMIN" ||
              currentUser.role === "SUPER_ADMIN") && (
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
                currentUser={currentUser}
              />
            )}

          {activeTab === "dashboard" && currentUser.role === "CAISSIER" && (
            <ViewLoader variant="kpi">
              <LazyCashierDashboardView
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
            </ViewLoader>
          )}

          {activeTab === "dashboard" && currentUser.role === "PROPRIETAIRE" && (
            <ViewLoader variant="kpi">
              <LazyOwnerDashboardView
                currentUser={currentUser}
                owner={
                  owners.find((o) => o.id === currentUser.proprietaireId) ||
                  owners[0]
                }
                properties={scopedProperties}
                tenants={scopedTenants}
                payments={scopedPayments}
                maintenance={scopedMaintenance}
                disbursements={scopedDisbursements}
                settings={agencySettings}
                cashVouchers={cashVouchers.filter(
                  (v) =>
                    v.proprietaireId === currentUser.proprietaireId ||
                    !currentUser.proprietaireId,
                )}
                onOpenReceipt={(payment) => setReceiptModalPayment(payment)}
                onOpenOwnerSlip={(owner) => setOwnerSlipModalOwner(owner)}
              />
            </ViewLoader>
          )}

          {activeTab === "dashboard" && currentUser.role === "LOCATAIRE" && (
            <ViewLoader variant="kpi">
              <LazyTenantDashboardView
                currentUser={currentUser}
                settings={agencySettings}
                tenant={
                  tenants.find((t) => t.id === currentUser.locataireId) ||
                  tenants[0]
                }
                property={properties.find(
                  (p) =>
                    p.id ===
                    (currentUser.bienId ||
                      tenants.find((t) => t.id === currentUser.locataireId)
                        ?.bienId),
                )}
                contract={contracts.find(
                  (c) => c.locataireId === currentUser.locataireId,
                )}
                payments={scopedPayments}
                inspections={scopedInspections}
                maintenance={scopedMaintenance}
                onOpenReceipt={(payment) => setReceiptModalPayment(payment)}
                onInitiateOnlinePayment={(amount, method, transactionRef) => {
                  return handleConfirmMobileMoneyPayment(
                    amount,
                    method,
                    transactionRef,
                    currentUser.locataireId,
                    selectedPeriod,
                  );
                }}
                paymentPeriod={selectedPeriod}
              />
            </ViewLoader>
          )}

          {activeTab === "dashboard" && currentUser.role === "AGENT" && (
            <ViewLoader variant="kpi">
              <LazyAgentDashboardView
                currentUser={currentUser}
                properties={properties}
                tenants={tenants}
                inspections={scopedInspections}
                maintenance={scopedMaintenance}
                reminders={reminders}
                onOpenInspectionModal={() => handleSafeTabChange("inspections")}
                onOpenMaintenanceModal={() =>
                  handleSafeTabChange("maintenance")
                }
                setActiveTab={handleSafeTabChange}
              />
            </ViewLoader>
          )}

          {activeTab === "dashboard" && currentUser.role === "GESTIONNAIRE" && (
            <ViewLoader variant="kpi">
              <LazyManagerDashboardView
                properties={properties}
                tenants={tenants}
                owners={owners}
                contracts={contracts}
                payments={payments}
                maintenance={scopedMaintenance}
                reminders={reminders}
                onOpenNewContract={() => handleSafeTabChange("contracts")}
                onOpenNewTenant={() => setIsNewTenantWizardOpen(true)}
                onOpenNewReminder={() => handleSafeTabChange("reminders")}
                setActiveTab={handleSafeTabChange}
              />
            </ViewLoader>
          )}

          {activeTab === "saas-admin" &&
            currentUser.role === "SUPER_ADMIN_SAAS" && (
              <ViewLoader variant="kpi">
                <LazySuperAdminDashboard
                  currentUser={currentUser}
                  agencyStats={agencyStats}
                  payments={payments}
                  invoices={invoices}
                  cashMovements={cashMovements}
                  owners={owners}
                  tenants={tenants}
                  properties={properties}
                  buildings={buildings}
                  units={units}
                  contracts={contracts}
                />
              </ViewLoader>
            )}

          {activeTab === "admin-control" && (
            <ViewLoader variant="default">
              <LazyAdminControlCenterView
                users={users}
                properties={properties}
                owners={owners}
                tenants={tenants}
                payments={payments}
                cashMovements={cashMovements}
                cashClosings={cashClosings}
                paymentMethods={paymentMethods}
                auditLogs={auditLogs}
                settings={agencySettings}
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
                agencyStats={agencyStats}
              />
            </ViewLoader>
          )}

          {activeTab === "admin-journal" && (
            <ViewLoader variant="list">
              <LazyAdminActivityJournalView
                auditLogs={auditLogs}
                onTriggerAuditLog={handleTriggerAuditLog}
              />
            </ViewLoader>
          )}

          {activeTab === "agency-settings" && currentUser?.agencyId && (
            <ViewLoader variant="form">
              <LazyAgencySettingsView agencyId={currentUser.agencyId} />
            </ViewLoader>
          )}

          {activeTab === "admin-users" && (
            <ViewLoader variant="list">
              <LazyAdminUsersView
                users={users}
                currentUser={currentUser}
                owners={owners}
                tenants={tenants}
                properties={properties}
                buildings={buildings}
                onAddUser={handleAddUser}
                isSupabaseOnline={isSupabaseConfigured}
                onUpdateUser={handleUpdateUser}
                onSwitchActiveUser={handleSwitchUser}
              />
            </ViewLoader>
          )}

          {activeTab === "archives" && (
            <ViewLoader variant="list">
              <LazyArchiveView
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
                ownerCharges={ownerCharges}
                archives={archives}
                activities={activityLogs}
                activityLoading={activityLogsLoading}
                activityError={activityLogsError}
                penalties={penalties}
                reminders={reminders}
                cashMovements={cashMovements}
                cashClosings={cashClosings}
                cashVouchers={cashVouchers}
                ownerDeductions={ownerDeductions}
              />
            </ViewLoader>
          )}

          {activeTab === "activity-logs" && (
            <ViewLoader variant="list">
              <LazyActivityLogView
                activities={activityLogs}
                currentUser={currentUser}
                settings={agencySettings}
                loading={activityLogsLoading}
                error={activityLogsError}
              />
            </ViewLoader>
          )}

          {activeTab === "penalties" && (
            <ViewLoader variant="list">
              <LazyPenaltiesView
                penalties={penalties}
                tenants={scopedTenants}
                properties={scopedProperties}
                units={scopedUnits}
                payments={scopedPayments}
                currentUser={currentUser}
                onAddPenalty={handleAddPenalty}
                onDeletePenalty={handleDeletePenalty}
                onUpdatePenalty={handleUpdatePenalty}
              />
            </ViewLoader>
          )}

          {activeTab === "owner-charges" && (
            <ViewLoader variant="list">
              <LazyOwnerChargesView
                ownerCharges={ownerCharges}
                owners={owners}
                currentUser={currentUser}
                onAddOwnerCharge={handleAddOwnerCharge}
                onDeleteOwnerCharge={handleDeleteOwnerCharge}
              />
            </ViewLoader>
          )}

          {activeTab === "caisse" && (
            <ViewLoader variant="list">
              <LazyCashRegisterView
                cashMovements={cashMovements}
                cashClosings={cashClosings}
                currentUser={currentUser}
                onAddCashMovement={handleAddCashMovement}
                onAddCashClosing={handleAddCashClosing}
                agencyStats={agencyStats}
              />
            </ViewLoader>
          )}

          {activeTab === "pending-payments" && (
            <ViewLoader variant="list">
              <LazyPendingPaymentsView
                payments={payments}
                currentUser={currentUser}
                onValidatePayment={handleValidatePendingPayment}
                onRejectPayment={handleRejectPendingPayment}
                onOpenReceipt={(payment) => setReceiptModalPayment(payment)}
              />
            </ViewLoader>
          )}

          {activeTab === "payment-methods" && (
            <ViewLoader variant="list">
              <LazyPaymentMethodsConfigView
                paymentMethods={paymentMethods}
                settings={agencySettings}
                onUpdatePaymentMethod={handleUpdatePaymentMethod}
                onAddPaymentMethod={handleAddPaymentMethod}
              />
            </ViewLoader>
          )}

          {activeTab === "payment-reports" && (
            <ViewLoader variant="list">
              <LazyPaymentMethodReportsView
                payments={payments}
                paymentMethods={paymentMethods}
                owners={owners}
                properties={properties}
                tenants={tenants}
                currentUser={currentUser}
              />
            </ViewLoader>
          )}

          {activeTab === "recovery" && (
            <ViewLoader variant="list">
              <LazyRecoveryTrackerView
                properties={scopedProperties}
                owners={owners}
                tenants={scopedTenants}
                payments={scopedPayments}
                selectedPeriod={selectedPeriod}
                settings={agencySettings}
                onOpenQuickReminder={handleOpenQuickComms}
                onOpenNewPayment={handleOpenNewPaymentForTenant}
                onOpenOwnerSlip={(owner) => setOwnerSlipModalOwner(owner)}
                onAddPayment={handleAddPayment}
                currentUser={currentUser}
              />
            </ViewLoader>
          )}

          {activeTab === "reminders" && (
            <ViewLoader variant="list">
              <LazyAutomatedRemindersView
                tenants={scopedTenants}
                properties={scopedProperties}
                payments={scopedPayments}
                reminders={reminders}
                onAddReminder={handleAddReminder}
              />
            </ViewLoader>
          )}

          {activeTab === "payments" && (
            <ViewLoader variant="list">
              <LazyPaymentsView
                payments={scopedPayments}
                tenants={scopedTenants}
                properties={scopedProperties}
                owners={owners}
                currentUser={currentUser || undefined}
                settings={agencySettings}
                onAddPayment={handleAddPayment}
                onOpenReceipt={(payment) => setReceiptModalPayment(payment)}
                isNewPaymentModalOpen={isNewPaymentModalOpen}
                setIsNewPaymentModalOpen={setIsNewPaymentModalOpen}
                initialTenantForPayment={initialTenantForPayment}
                onValidatePendingPayment={handleValidatePendingPayment}
              />
            </ViewLoader>
          )}

          {activeTab === "buildings" && (
            <ViewLoader variant="list">
              <LazyBuildingsView
                buildings={scopedBuildings}
                units={scopedUnits}
                owners={owners}
                currentUser={currentUser}
                onAddBuilding={handleAddBuilding}
                onUpdateBuilding={handleUpdateBuilding}
                onDeleteBuilding={handleDeleteBuilding}
                onSelectBuilding={() => handleSafeTabChange("units")}
              />
            </ViewLoader>
          )}

          {activeTab === "units" && (
            <ViewLoader variant="list">
              <LazyUnitsView
                units={scopedUnits}
                buildings={scopedBuildings}
                owners={owners}
                tenants={scopedTenants}
                currentUser={currentUser}
                onAddUnit={handleAddUnit}
                onUpdateUnit={handleUpdateUnit}
                onReattachUnit={handleReattachUnit}
                onDeleteUnit={handleDeleteUnit}
              />
            </ViewLoader>
          )}

          {activeTab === "properties" && (
            <ViewLoader variant="list">
              <LazyPropertiesView
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
            </ViewLoader>
          )}

          {activeTab === "tenants" && (
            <div className="space-y-4">
              {["ADMIN", "SUPER_ADMIN", "GESTIONNAIRE"].includes(
                currentUser.role,
              ) && (
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setIsNewTenantWizardOpen(true)}
                    className="px-4 py-2.5 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer flex items-center gap-2"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Assistant Nouveau Locataire (7 Etapes)
                    </span>
                  </button>
                </div>
              )}
              <ViewLoader variant="list">
                <LazyTenantsView
                  tenants={scopedTenants}
                  properties={scopedProperties}
                  units={scopedUnits}
                  payments={scopedPayments}
                  owners={owners}
                  selectedPeriod={selectedPeriod}
                  settings={agencySettings}
                  currentUser={currentUser}
                  onOpenQuickReminder={handleOpenQuickComms}
                  onOpenNewPayment={handleOpenNewPaymentForTenant}
                  onAddTenant={handleAddTenant}
                  onOpenMobileMoney={(tenant) => handleOpenMobileMoney(tenant)}
                  onAddPayment={handleAddPayment}
                  onInitiateExit={(tenant) => setTenantExitTarget(tenant)}
                />
              </ViewLoader>
            </div>
          )}

          {activeTab === "owners" && (
            <ViewLoader variant="list">
              <LazyOwnersView
                owners={owners}
                properties={properties}
                buildings={buildings}
                units={units}
                payments={payments}
                settings={agencySettings}
                onOpenOwnerSlip={(owner) => setOwnerSlipModalOwner(owner)}
                onOpenBulletin={(owner) => handleOpenBulletinVersement(owner)}
                onAddOwner={handleAddOwner}
                onUpdateOwner={(owner) => {
                  setOwners((prev) =>
                    prev.map((o) => (o.id === owner.id ? owner : o)),
                  );
                  if (currentUser?.agencyId) {
                    saveOwnerToDb(owner, currentUser.agencyId).catch(
                      console.warn,
                    );
                  }
                }}
                onDeleteOwner={async (ownerId) => {
                  if (!currentUser?.agencyId || !supabase) return;
                  const { error } = await supabase
                    .from("owners")
                    .delete()
                    .eq("id", ownerId)
                    .eq("agency_id", currentUser.agencyId);
                  if (error) {
                    alert(`Impossible de supprimer : ${error.message}`);
                    return;
                  }
                  setOwners((prev) => prev.filter((o) => o.id !== ownerId));
                }}
              />
            </ViewLoader>
          )}

          {activeTab === "contracts" && (
            <ViewLoader variant="list">
              <LazyContractsView
                contracts={scopedContracts}
                tenants={tenants}
                properties={scopedProperties}
                units={scopedUnits}
                buildings={scopedBuildings}
                owners={owners}
                currentUser={currentUser}
                settings={agencySettings}
                onAddContract={handleAddContract}
                onUpdateContract={handleUpdateContract}
              />
            </ViewLoader>
          )}

          {activeTab === "inspections" && (
            <ViewLoader variant="list">
              <LazyInspectionsView
                inspections={scopedInspections}
                tenants={scopedTenants}
                properties={scopedProperties}
                settings={agencySettings}
                onAddInspection={handleAddInspection}
              />
            </ViewLoader>
          )}

          {activeTab === "maintenance" && (
            <ViewLoader variant="list">
              <LazyMaintenanceView
                tickets={scopedMaintenance}
                properties={scopedProperties}
                tenants={scopedTenants}
                owners={owners}
                currentUser={currentUser}
                onAddTicket={handleAddTicket}
                onUpdateTicket={handleUpdateTicket}
                onAddCashMovement={handleAddCashMovement}
                onTriggerAuditLog={handleTriggerAuditLog}
                agencyStats={agencyStats}
              />
            </ViewLoader>
          )}

          {activeTab === "invoices" && (
            <ViewLoader variant="list">
              <LazyInvoicesView
                invoices={invoices}
                properties={scopedProperties}
                buildings={scopedBuildings}
                units={scopedUnits}
                owners={owners}
                tenants={scopedTenants}
                onAddInvoice={handleAddInvoice}
                currentUser={currentUser}
                settings={agencySettings}
              />
            </ViewLoader>
          )}

          {activeTab === "finance" && (
            <ViewLoader variant="default">
              <LazyFinanceView
                disbursements={scopedDisbursements}
                payments={scopedPayments}
                owners={
                  currentUser?.role === "PROPRIETAIRE"
                    ? owners.filter((o) => o.id === currentUser.proprietaireId)
                    : owners
                }
                properties={scopedProperties}
                buildings={scopedBuildings}
                units={scopedUnits}
                tenants={scopedTenants}
                invoices={invoices}
                maintenance={scopedMaintenance}
                ownerDeductions={ownerDeductions}
                onAddDisbursement={handleAddDisbursement}
                onOpenBulletin={(owner) => handleOpenBulletinVersement(owner)}
                currentUser={currentUser}
              />
            </ViewLoader>
          )}

          {activeTab === "reports" && (
            <ViewLoader variant="default">
              <LazyReportsView
                properties={scopedProperties}
                tenants={scopedTenants}
                payments={scopedPayments}
                owners={owners}
                disbursements={scopedDisbursements}
                selectedPeriod={selectedPeriod}
              />
            </ViewLoader>
          )}

          {activeTab === "documents" && (
            <ViewLoader variant="list">
              <LazyDocumentsView
                payments={scopedPayments}
                owners={owners}
                tenants={scopedTenants}
                contracts={scopedContracts}
                properties={scopedProperties}
                currentUser={currentUser}
                settings={agencySettings}
                onOpenReceipt={(payment) => setReceiptModalPayment(payment)}
                onOpenOwnerSlip={(owner) => setOwnerSlipModalOwner(owner)}
              />
            </ViewLoader>
          )}

          {activeTab === "settings" && currentUser?.agencyId && (
            <ViewLoader variant="form">
              <LazyAgencySettingsView agencyId={currentUser.agencyId} />
            </ViewLoader>
          )}
        </main>
      </div>

      {receiptModalPayment && (
        <ViewLoader variant="default">
          <LazyPaymentReceiptModal
            payment={receiptModalPayment}
            settings={agencySettings}
            units={units}
            buildings={buildings}
            currentUser={currentUser}
            onClose={() => setReceiptModalPayment(null)}
          />
        </ViewLoader>
      )}

      {ownerSlipModalOwner && (
        <ViewLoader variant="default">
          <LazyPaymentBulletinModal
            owner={ownerSlipModalOwner}
            properties={properties}
            tenants={tenants}
            payments={payments}
            tickets={maintenance}
            selectedPeriod={selectedPeriod}
            settings={agencySettings}
            onClose={() => setOwnerSlipModalOwner(null)}
          />
        </ViewLoader>
      )}

      {ownerBulletinModalOwner && (
        <ViewLoader variant="default">
          <LazyOwnerBulletinModal
            currentUser={currentUser}
            settings={agencySettings}
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
        </ViewLoader>
      )}

      {cashVoucherModalOwner &&
        (() => {
          const ownerDisb = disbursements.find(
            (d) =>
              d.proprietaireId === cashVoucherModalOwner.id &&
              d.periode === selectedPeriod,
          );
          const ownerPayments = payments.filter(
            (p) =>
              p.proprietaireId === cashVoucherModalOwner.id &&
              p.statut === "Payé",
          );
          const loyersBruts =
            ownerDisb?.loyersBruts ??
            ownerPayments.reduce((sum, p) => sum + (p.loyerBase || 0), 0);
          const commission =
            ownerDisb?.commissionAgence ??
            Math.round(
              loyersBruts *
                ((cashVoucherModalOwner.tauxCommission || 10) / 100),
            );
          const montantNet =
            ownerDisb?.montantNetPaye ?? Math.max(0, loyersBruts - commission);
          return (
            <ViewLoader variant="default">
              <LazyCashVoucherModal
                owner={cashVoucherModalOwner}
                montantNet={montantNet}
                loyersBruts={loyersBruts}
                commission={commission}
                periode={selectedPeriod}
                onClose={() => setCashVoucherModalOwner(null)}
              />
            </ViewLoader>
          );
        })()}

      {isNewTenantWizardOpen && (
        <ViewLoader variant="form">
          <LazyNewTenantWizardModal
            properties={properties}
            units={units}
            settings={agencySettings}
            onComplete={handleCompleteNewTenantWizard}
            onClose={() => setIsNewTenantWizardOpen(false)}
          />
        </ViewLoader>
      )}

      {tenantExitTarget && (
        <ViewLoader variant="default">
          <LazyTenantExitModal
            tenant={tenantExitTarget}
            property={properties.find((p) => p.id === tenantExitTarget.bienId)}
            onConfirmExit={handleCompleteTenantExit}
            onClose={() => setTenantExitTarget(null)}
          />
        </ViewLoader>
      )}

      <ViewLoader variant="form">
        <LazyGlobalSearchModal
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
      </ViewLoader>

      <ViewLoader variant="form">
        <LazyUserProfileModal
          currentUser={currentUser}
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          onSignOut={handleSignOut}
          onUpdatePassword={(newPass) => {
            setAuditLogs((prev) => [
              {
                id: crypto.randomUUID(),
                action: "MODIFICATION_MOT_DE_PASSE",
                entite: "USER",
                entiteId: currentUser.id,
                utilisateur: `${currentUser.prenom} ${currentUser.nom}`,
                details: `Mise à jour sécurisée du mot de passe via Supabase Auth`,
                createdAt: new Date().toISOString(),
              },
              ...prev,
            ]);
          }}
        />
      </ViewLoader>

      {mobileMoneyModalConfig && (
        <ViewLoader variant="form">
          <LazyMobileMoneyPaymentModal
            isOpen={mobileMoneyModalConfig.isOpen}
            onClose={() => setMobileMoneyModalConfig(null)}
            amount={mobileMoneyModalConfig.amount || 250000}
            tenantName={
              mobileMoneyModalConfig.tenantName || "Client FITAL-IMMO"
            }
            tenantPhone={
              mobileMoneyModalConfig.tenantPhone || "+221 77 845 20 10"
            }
            propertyNom={mobileMoneyModalConfig.propertyNom || "Logement Dakar"}
            period={mobileMoneyModalConfig.period || selectedPeriod}
            reference={
              mobileMoneyModalConfig.reference ||
              createDocumentNumber(agencySettings?.prefixPaiement, "PAY-")
            }
            onConfirmPayment={handleConfirmMobileMoneyPayment}
            waveNumero={settings.waveNumero}
            orangeMoneyCode={settings.orangeMoneyCode}
            whatsappBusiness={settings.whatsappBusiness}
            settings={agencySettings}
            currentUser={currentUser}
            tenantId={mobileMoneyModalConfig.tenantId}
            payments={payments}
          />
        </ViewLoader>
      )}

      {quickCommsModalConfig && (
        <ViewLoader variant="form">
          <LazyQuickCommsModal
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
        </ViewLoader>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0F1B2D]/95 backdrop-blur-xl border-t border-[#C9A96E]/20 px-2 py-1.5 shadow-2xl flex items-center justify-around">
        <button
          onClick={() => handleSafeTabChange("dashboard")}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[44px] ${
            activeTab === "dashboard"
              ? "text-[#C9A96E] font-bold"
              : "text-[#6B7C94] hover:text-[#A8B4C4]"
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Accueil</span>
        </button>

        {currentUser.role !== "LOCATAIRE" && (
          <button
            onClick={() => handleSafeTabChange("buildings")}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[44px] ${
              activeTab === "buildings"
                ? "text-[#C9A96E] font-bold"
                : "text-[#6B7C94] hover:text-[#A8B4C4]"
            }`}
          >
            <Building2 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Immeubles</span>
          </button>
        )}

        {currentUser.role !== "LOCATAIRE" &&
          currentUser.role !== "PROPRIETAIRE" && (
            <button
              onClick={() => handleSafeTabChange("tenants")}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[44px] ${
                activeTab === "tenants"
                  ? "text-[#C9A96E] font-bold"
                  : "text-[#6B7C94] hover:text-[#A8B4C4]"
              }`}
            >
              <Users className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">Locataires</span>
            </button>
          )}

        <button
          onClick={() =>
            handleSafeTabChange(
              currentUser.role === "CAISSIER" ? "caisse" : "payments",
            )
          }
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[44px] ${
            activeTab === "payments" || activeTab === "caisse"
              ? "text-[#C9A96E] font-bold"
              : "text-[#6B7C94] hover:text-[#A8B4C4]"
          }`}
        >
          {currentUser.role === "CAISSIER" ? (
            <Coins className="w-5 h-5 mb-0.5" />
          ) : (
            <CreditCard className="w-5 h-5 mb-0.5" />
          )}
          <span className="text-[10px]">
            {currentUser.role === "CAISSIER" ? "Caisse" : "Loyers"}
          </span>
        </button>

        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[44px] ${
            isMobileSidebarOpen
              ? "text-[#C9A96E] font-bold"
              : "text-[#6B7C94] hover:text-[#A8B4C4]"
          }`}
        >
          <MenuIcon className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Menu</span>
        </button>
      </nav>
    </div>
  );
}
