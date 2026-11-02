// ============================================================
// LAZY IMPORTS - Bundle Splitting pour SaaS 1000+ users
// ============================================================
// Chaque import() genere un chunk separe (charge a la demande)
// IMPORTANT : ne JAMAIS importer ces composants directement.
// Utiliser : import { LazyXxx } from '../lib/lazyImports';
// ============================================================

import { lazy } from 'react';

// ============================================================
// GROUPE 1 - AUTH
// ============================================================
export const LazyLoginView = lazy(() => import('../components/LoginView').then(m => ({ default: m.LoginView })));
export const LazyResetPasswordView = lazy(() => import('../components/ResetPasswordView').then(m => ({ default: m.ResetPasswordView })));

// ============================================================
// GROUPE 2 - VUES METIER
// ============================================================
export const LazyPaymentsView = lazy(() => import('../components/PaymentsView').then(m => ({ default: m.PaymentsView })));
export const LazyPropertiesView = lazy(() => import('../components/PropertiesView').then(m => ({ default: m.PropertiesView })));
export const LazyBuildingsView = lazy(() => import('../components/BuildingsView').then(m => ({ default: m.BuildingsView })));
export const LazyUnitsView = lazy(() => import('../components/UnitsView').then(m => ({ default: m.UnitsView })));
export const LazyTenantsView = lazy(() => import('../components/TenantsView').then(m => ({ default: m.TenantsView })));
export const LazyOwnersView = lazy(() => import('../components/OwnersView').then(m => ({ default: m.OwnersView })));
export const LazyContractsView = lazy(() => import('../components/ContractsView').then(m => ({ default: m.ContractsView })));
export const LazyInspectionsView = lazy(() => import('../components/InspectionsView').then(m => ({ default: m.InspectionsView })));
export const LazyMaintenanceView = lazy(() => import('../components/MaintenanceView').then(m => ({ default: m.MaintenanceView })));
export const LazyFinanceView = lazy(() => import('../components/FinanceView').then(m => ({ default: m.FinanceView })));
export const LazyInvoicesView = lazy(() => import('../components/InvoicesView').then(m => ({ default: m.InvoicesView })));
export const LazyPenaltiesView = lazy(() => import('../components/PenaltiesView').then(m => ({ default: m.PenaltiesView })));
export const LazyOwnerChargesView = lazy(() => import('../components/OwnerChargesView').then(m => ({ default: m.OwnerChargesView })));
export const LazyTenantChargesModal = lazy(() => import('../components/TenantChargesModal').then(m => ({ default: m.TenantChargesModal })));
export const LazyDocumentsView = lazy(() => import('../components/DocumentsView').then(m => ({ default: m.DocumentsView })));
export const LazyReportsView = lazy(() => import('../components/ReportsView').then(m => ({ default: m.ReportsView })));
export const LazyAgencySettingsView = lazy(() => import('../components/AgencySettingsView').then(m => ({ default: m.AgencySettingsView })));
export const LazyArchiveView = lazy(() => import('../components/ArchiveView').then(m => ({ default: m.ArchiveView })));
export const LazyActivityLogView = lazy(() => import('../components/ActivityLogView').then(m => ({ default: m.ActivityLogView })));

// ============================================================
// GROUPE 3 - ADMIN
// ============================================================
export const LazyAdminControlCenterView = lazy(() => import('../components/AdminControlCenterView').then(m => ({ default: m.AdminControlCenterView })));
export const LazyAdminUsersView = lazy(() => import('../components/AdminUsersView').then(m => ({ default: m.AdminUsersView })));
export const LazyAdminActivityJournalView = lazy(() => import('../components/AdminActivityJournalView').then(m => ({ default: m.AdminActivityJournalView })));
export const LazySuperAdminDashboard = lazy(() => import('../components/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));

// ============================================================
// GROUPE 4 - DASHBOARDS PAR ROLE
// ============================================================
export const LazyCashierDashboardView = lazy(() => import('../components/CashierDashboardView').then(m => ({ default: m.CashierDashboardView })));
export const LazyOwnerDashboardView = lazy(() => import('../components/OwnerDashboardView').then(m => ({ default: m.OwnerDashboardView })));
export const LazyTenantDashboardView = lazy(() => import('../components/TenantDashboardView').then(m => ({ default: m.TenantDashboardView })));
export const LazyAgentDashboardView = lazy(() => import('../components/AgentDashboardView').then(m => ({ default: m.AgentDashboardView })));
export const LazyManagerDashboardView = lazy(() => import('../components/ManagerDashboardView').then(m => ({ default: m.ManagerDashboardView })));
export const LazyCashRegisterView = lazy(() => import('../components/CashRegisterView').then(m => ({ default: m.CashRegisterView })));
export const LazyPendingPaymentsView = lazy(() => import('../components/PendingPaymentsView').then(m => ({ default: m.PendingPaymentsView })));
export const LazyPaymentMethodsConfigView = lazy(() => import('../components/PaymentMethodsConfigView').then(m => ({ default: m.PaymentMethodsConfigView })));
export const LazyPaymentMethodReportsView = lazy(() => import('../components/PaymentMethodReportsView').then(m => ({ default: m.PaymentMethodReportsView })));

// ============================================================
// GROUPE 5 - VUES SPECIALES
// ============================================================
export const LazyRecoveryTrackerView = lazy(() => import('../components/RecoveryTrackerView').then(m => ({ default: m.RecoveryTrackerView })));
export const LazyAutomatedRemindersView = lazy(() => import('../components/AutomatedRemindersView').then(m => ({ default: m.AutomatedRemindersView })));

// ============================================================
// GROUPE 6 - MODALES
// ============================================================
export const LazyReceiptModal = lazy(() => import('../components/ReceiptModal').then(m => ({ default: m.ReceiptModal })));
export const LazyPaymentBulletinModal = lazy(() => import('../components/PaymentBulletinModal').then(m => ({ default: m.PaymentBulletinModal })));
export const LazyCashVoucherModal = lazy(() => import('../components/CashVoucherModal').then(m => ({ default: m.CashVoucherModal })));
export const LazyNewTenantWizardModal = lazy(() => import('../components/NewTenantWizardModal').then(m => ({ default: m.NewTenantWizardModal })));
export const LazyTenantExitModal = lazy(() => import('../components/TenantExitModal').then(m => ({ default: m.TenantExitModal })));
export const LazyUserProfileModal = lazy(() => import('../components/UserProfileModal').then(m => ({ default: m.UserProfileModal })));
export const LazyMobileMoneyPaymentModal = lazy(() => import('../components/MobileMoneyPaymentModal').then(m => ({ default: m.MobileMoneyPaymentModal })));
export const LazyQuickCommsModal = lazy(() => import('../components/QuickCommsModal').then(m => ({ default: m.QuickCommsModal })));
export const LazyGlobalSearchModal = lazy(() => import('../components/GlobalSearchModal').then(m => ({ default: m.GlobalSearchModal })));
export const LazyOwnerBulletinModal = lazy(() => import('../components/OwnerBulletinModal').then(m => ({ default: m.OwnerBulletinModal })));
export const LazyPaymentReceiptModal = lazy(() => import('../components/PaymentReceiptModal').then(m => ({ default: m.PaymentReceiptModal })));

// ============================================================
// GROUPE 7 - THEME
// ============================================================
export const LazyThemePreview = lazy(() => import('../components/ThemePreview').then(m => ({ default: m.ThemePreview })));

// ============================================================
// Total : 49 composants lazy-loaded
// ============================================================
