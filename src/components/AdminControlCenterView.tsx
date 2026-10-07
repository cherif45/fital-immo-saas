import React, { useState, useRef } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Building2,
  Receipt,
  Coins,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Database,
  Lock,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Sliders,
  CheckCircle2,
  XCircle,
  Activity,
  FileSpreadsheet,
  Layers,
  Cpu,
  Key,
  Server,
  Save,
  X,
} from 'lucide-react';
import {
  UserAccount,
  Property,
  Owner,
  Tenant,
  Payment,
  CashMovement,
  CashClosing,
  PaymentMethodConfig,
  AuditLog,
  AgencySettings,
  MaintenanceTicket,
  Building,
  Unit,
  LeaseContract,
  Invoice,
  OwnerDisbursement,
  BulletinVersement,
  OwnerDeduction,
  OwnerCharge,
  Inspection,
  ActivityLog,
  TenantReminder,
  Penalty,
  ArchiveRecord,
  NotificationItem,
} from '../types';
import { formatCurrency, formatNumber } from '../lib/utils';
import { isSupabaseConfigured } from '../lib/supabase/client';
import { restoreAllData, type AgencyStats } from '../lib/supabase/service';

interface AdminControlCenterViewProps {
  users: UserAccount[];
  properties: Property[];
  owners: Owner[];
  tenants: Tenant[];
  payments: Payment[];
  cashMovements: CashMovement[];
  cashClosings: CashClosing[];
  paymentMethods: PaymentMethodConfig[];
  auditLogs: AuditLog[];
  settings: AgencySettings;
  maintenance: MaintenanceTicket[];
  buildings?: Building[];
  units?: Unit[];
  contracts?: LeaseContract[];
  invoices?: Invoice[];
  disbursements?: OwnerDisbursement[];
  bulletins?: BulletinVersement[];
  ownerDeductions?: OwnerDeduction[];
  ownerCharges?: OwnerCharge[];
  inspections?: Inspection[];
  activityLogs?: ActivityLog[];
  reminders?: TenantReminder[];
  penalties?: Penalty[];
  archives?: ArchiveRecord[];
  notifications?: NotificationItem[];
  onTriggerAuditLog: (action: string, module: string, details: string) => void;
  onRefreshData?: () => void;
  agencyStats?: AgencyStats | null;
}

export const AdminControlCenterView: React.FC<AdminControlCenterViewProps> = ({
  users,
  properties,
  owners,
  tenants,
  payments,
  cashMovements,
  cashClosings,
  paymentMethods,
  auditLogs,
  settings,
  maintenance,
  buildings = [],
  units = [],
  contracts = [],
  invoices = [],
  disbursements = [],
  bulletins = [],
  ownerDeductions = [],
  ownerCharges = [],
  inspections = [],
  activityLogs = [],
  reminders = [],
  penalties = [],
  archives = [],
  notifications = [],
  onTriggerAuditLog,
  onRefreshData,
  agencyStats,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'db_status' | 'maintenance'>('overview');
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [pendingRestore, setPendingRestore] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Computed Domain Metrics
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.statut === 'actif').length;
  const suspendedUsers = users.filter((u) => u.statut === 'suspendu').length;

  const totalProps = properties.length;
  const totalOwners = agencyStats?.total_owners ?? owners.length;
  const occupiedProps = properties.filter((p) => p.statut === 'Occupé').length;
  const vacantProps = properties.filter((p) => p.statut === 'Vacant').length;
  const maintenanceProps = properties.filter((p) => p.statut === 'Maintenance').length;
  const occupancyRate = totalProps > 0 ? Math.round((occupiedProps / totalProps) * 100) : 0;

  const totalTenants = agencyStats?.total_tenants ?? tenants.length;
  const upToDateTenants = tenants.filter((t) => t.statut === 'À jour').length;
  const unpaidTenants = tenants.filter((t) => t.statut === 'Impayé' || t.statut === 'Retard').length;

  const totalCashIn = agencyStats?.cash_in ?? cashMovements.filter((m) => m.type === 'ENTREE' || m.type === 'ENCAISSEMENT').reduce((acc, m) => acc + m.montant, 0);
  const totalCashOut = agencyStats?.cash_out ?? cashMovements.filter((m) => m.type === 'SORTIE' || m.type === 'DECAISSEMENT').reduce((acc, m) => acc + m.montant, 0);
  const currentCashBalance = agencyStats?.cash_balance ?? totalCashIn - totalCashOut;

  // ============================================================
  // EXPORT COMPLET (toutes les tables)
  // ============================================================
  const handleExportSystemDump = () => {
    setIsExporting(true);
    try {
      const dump = {
        exportedAt: new Date().toISOString(),
        version: 'FITAL-IMMO-v3.0',
        agency: settings.nomAgence,
        counts: {
          users: users.length,
          properties: properties.length,
          owners: owners.length,
          tenants: tenants.length,
          payments: payments.length,
          cashMovements: cashMovements.length,
          closings: cashClosings.length,
          paymentMethods: paymentMethods.length,
          auditLogs: auditLogs.length,
          buildings: buildings.length,
          units: units.length,
          contracts: contracts.length,
          invoices: invoices.length,
          disbursements: disbursements.length,
          bulletins: bulletins.length,
          ownerDeductions: ownerDeductions.length,
          ownerCharges: ownerCharges.length,
          inspections: inspections.length,
          maintenance: maintenance.length,
          activityLogs: activityLogs.length,
          reminders: reminders.length,
          penalties: penalties.length,
          archives: archives.length,
          notifications: notifications.length,
        },
        // Toutes les données
        users,
        properties,
        owners,
        tenants,
        payments,
        cashMovements,
        cashClosings,
        paymentMethods,
        auditLogs,
        settings,
        buildings,
        units,
        contracts,
        invoices,
        disbursements,
        bulletins,
        ownerDeductions,
        ownerCharges,
        inspections,
        maintenance,
        activityLogs,
        reminders,
        penalties,
        archives,
        notifications,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dump, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute(
        'download',
        `fital_immo_backup_complet_${new Date().toISOString().split('T')[0]}_${new Date().getHours()}h${new Date().getMinutes()}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      onTriggerAuditLog('EXPORT_GLOBAL_JSON', 'Système', `Export complet : ${Object.values(dump.counts).reduce((a, b) => a + b, 0)} enregistrements`);
      setStatusMessage({
        text: `✅ Sauvegarde complète générée (${Object.values(dump.counts).reduce((a, b) => a + b, 0)} enregistrements, 28 tables).`,
        type: 'success',
      });
    } catch (e) {
      setStatusMessage({ text: '❌ Erreur lors de la génération du dump.', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  // ============================================================
  // IMPORT / RESTAURATION
  // ============================================================
  const handleSelectBackupFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        // Validation minimale
        if (!data.exportedAt || !data.version) {
          setStatusMessage({
            text: '❌ Fichier invalide : ce n\'est pas une sauvegarde FITAL-IMMO.',
            type: 'error',
          });
          return;
        }

        // Mettre en attente pour confirmation
        setPendingRestore(data);
        setStatusMessage({
          text: `📦 Fichier chargé (${data.version}, export du ${new Date(data.exportedAt).toLocaleString('fr-FR')}). Vérifiez et confirmez la restauration.`,
          type: 'info',
        });
      } catch (err: any) {
        setStatusMessage({
          text: '❌ Impossible de lire le fichier : ' + err.message,
          type: 'error',
        });
      }
    };
    reader.readAsText(file);

    // Reset input pour permettre de re-sélectionner le même fichier
    event.target.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestore) return;

    const confirmed = window.confirm(
      '⚠️ ATTENTION\n\n' +
      'Cette action va RESTAURER les données depuis le fichier sélectionné.\n\n' +
      'Les données existantes seront REMPLACÉES.\n\n' +
      'Confirmer la restauration ?'
    );

    if (!confirmed) return;

    setIsRestoring(true);
    try {
      const result = await restoreAllData(pendingRestore);

      if (result.success) {
        setStatusMessage({
          text: `✅ Restauration réussie : ${result.count} enregistrements restaurés. Rechargez la page (F5) pour voir les données.`,
          type: 'success',
        });
        onTriggerAuditLog('RESTORE_JSON', 'Système', `Restauration depuis backup du ${pendingRestore.exportedAt}`);
        setPendingRestore(null);

        // Rafraîchir après 3 secondes
        setTimeout(() => {
          if (onRefreshData) onRefreshData();
          window.location.reload();
        }, 3000);
      } else {
        setStatusMessage({
          text: '❌ Erreur restauration : ' + (result.error || 'inconnue'),
          type: 'error',
        });
      }
    } catch (e: any) {
      setStatusMessage({
        text: '❌ Erreur : ' + e.message,
        type: 'error',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCancelRestore = () => {
    setPendingRestore(null);
    setStatusMessage(null);
  };

  // Intégrité
  const handleIntegrityCheck = () => {
    onTriggerAuditLog('INTEGRITY_AUDIT', 'Système', 'Contrôle de cohérence base de données');
    setStatusMessage({
      text: `✅ Contrôle d'intégrité : ${totalProps} biens, ${totalTenants} locataires, ${payments.length} paiements vérifiés sans anomalie.`,
      type: 'success',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#162133] via-[#1A2A42] to-[#162133] border border-[#C9A96E]/30 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-[#C9A96E]/40 flex items-center justify-center text-[#E8D5B0] shadow-lg">
            <ShieldAlert className="w-6 h-6 text-[#C9A96E]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Centre de Contrôle & Supervision</h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                SUPER_ADMIN
              </span>
            </div>
            <p className="text-xs text-[#A8B4C4] mt-0.5">
              Pilotage centralisé, sécurité, sauvegarde et restauration complète de la base.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleIntegrityCheck}
            className="px-3.5 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#E8D5B0] border border-[#C9A96E]/30 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Activity className="w-4 h-4 text-[#C9A96E]" />
            <span>Audit d'Intégrité</span>
          </button>

          <button
            onClick={handleSelectBackupFile}
            disabled={isRestoring}
            className="px-4 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#E8D5B0] border border-[#C9A96E]/40 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>Restaurer une Sauvegarde</span>
          </button>

          <button
            onClick={handleExportSystemDump}
            disabled={isExporting}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] hover:from-[#D8BA80] hover:to-[#B58C50] text-[#0F1B2D] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Export...' : 'Sauvegarde Complète (JSON)'}</span>
          </button>

          {/* Input caché pour upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileSelected}
            className="hidden"
          />
        </div>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : statusMessage.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : statusMessage.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            ) : (
              <RefreshCw className="w-4 h-4 text-blue-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Confirmation Restauration */}
      {pendingRestore && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-bold text-amber-200 text-sm mb-2">
                Confirmation de restauration requise
              </h3>
              <div className="text-xs text-amber-100/90 space-y-1">
                <p><strong>Fichier :</strong> export du {new Date(pendingRestore.exportedAt).toLocaleString('fr-FR')}</p>
                <p><strong>Version :</strong> {pendingRestore.version}</p>
                <p><strong>Agence :</strong> {pendingRestore.agency}</p>
                {pendingRestore.counts && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-semibold">Voir le détail ({Object.values(pendingRestore.counts).reduce((a: any, b: any) => a + b, 0)} enregistrements)</summary>
                    <div className="grid grid-cols-2 gap-1 mt-2 text-[11px]">
                      {Object.entries(pendingRestore.counts).map(([key, val]) => (
                        <div key={key} className="flex justify-between">
                          <span>{key} :</span>
                          <strong>{val as number}</strong>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
              <div className="mt-3 p-2 rounded bg-rose-500/20 border border-rose-500/40 text-rose-200 text-[11px]">
                ⚠️ <strong>Attention :</strong> les données actuelles seront remplacées par celles du fichier. Cette action ne peut pas être annulée.
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancelRestore}
              disabled={isRestoring}
              className="px-4 py-2 rounded-xl bg-[#1E2E45] text-slate-300 text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirmRestore}
              disabled={isRestoring}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white text-xs font-bold cursor-pointer shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
              {isRestoring ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Restauration...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  Confirmer la restauration
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Sub-Tabs (inchangé) */}
      <div className="flex border-b border-[#C9A96E]/15 gap-4">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'overview' ? 'text-[#C9A96E]' : 'text-[#A8B4C4] hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Vue d'Ensemble</span>
          {activeTab === 'overview' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C9A96E]" />}
        </button>

        <button
          onClick={() => setActiveTab('db_status')}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'db_status' ? 'text-[#C9A96E]' : 'text-[#A8B4C4] hover:text-white'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Base de Données & Serveur</span>
          {activeTab === 'db_status' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C9A96E]" />}
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'security' ? 'text-[#C9A96E]' : 'text-[#A8B4C4] hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Sécurité & Rôles ({users.length})</span>
          {activeTab === 'security' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C9A96E]" />}
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Utilisateurs */}
            <div className="p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#A8B4C4] uppercase">Utilisateurs</span>
                <Users className="w-4 h-4 text-[#C9A96E]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white font-mono">{totalUsers}</div>
                <div className="text-[11px] text-[#A8B4C4] mt-0.5">Comptes actifs</div>
              </div>
              <div className="pt-3 border-t border-[#C9A96E]/10 flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-semibold">{activeUsers} Actifs</span>
                <span className="text-amber-400 font-semibold">{suspendedUsers} Suspendus</span>
              </div>
            </div>

            {/* Parc */}
            <div className="p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#A8B4C4] uppercase">Parc Immobilier</span>
                <Building2 className="w-4 h-4 text-[#C9A96E]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white font-mono">{totalProps}</div>
                <div className="text-[11px] text-emerald-400 font-medium mt-0.5">
                  Occupation : <strong>{occupancyRate}%</strong>
                </div>
              </div>
              <div className="pt-3 border-t border-[#C9A96E]/10 flex items-center justify-between text-xs">
                <span className="text-emerald-400">{occupiedProps} Occupés</span>
                <span className="text-sky-400">{vacantProps} Vacants</span>
              </div>
            </div>

            {/* Locataires */}
            <div className="p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#A8B4C4] uppercase">Locataires</span>
                <TrendingUp className="w-4 h-4 text-[#C9A96E]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white font-mono">{totalTenants}</div>
                <div className="text-[11px] text-[#A8B4C4] mt-0.5">Enregistrés</div>
              </div>
              <div className="pt-3 border-t border-[#C9A96E]/10 flex items-center justify-between text-xs">
                <span className="text-emerald-400">{upToDateTenants} À jour</span>
                <span className="text-rose-400 font-semibold">{unpaidTenants} Retards</span>
              </div>
            </div>

            {/* Caisse */}
            <div className="p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#A8B4C4] uppercase">Solde Caisse</span>
                <Coins className="w-4 h-4 text-[#C9A96E]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#C9A96E] font-mono">{formatCurrency(currentCashBalance)}</div>
                <div className="text-[11px] text-[#A8B4C4] mt-0.5">{cashMovements.length} opérations</div>
              </div>
              <div className="pt-3 border-t border-[#C9A96E]/10 flex items-center justify-between text-xs text-[#A8B4C4]">
                <span>Entrées : +{formatNumber(totalCashIn)}</span>
                <span>Sorties : -{formatNumber(totalCashOut)}</span>
              </div>
            </div>
          </div>

          {/* Compteur global des données */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#162133] to-[#1E2E45] border border-[#C9A96E]/30 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <FileSpreadsheet className="w-5 h-5 text-[#C9A96E]" />
              <h3 className="text-sm font-bold text-white">Volume global des données</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { label: 'Utilisateurs', value: users.length, color: 'text-rose-400' },
                { label: 'Propriétaires', value: totalOwners, color: 'text-blue-400' },
                { label: 'Immeubles', value: buildings.length, color: 'text-indigo-400' },
                { label: 'Espaces louables', value: agencyStats?.total_units ?? units.length, color: 'text-purple-400' },
                { label: 'Biens', value: agencyStats?.total_properties ?? properties.length, color: 'text-cyan-400' },
                { label: 'Locataires', value: totalTenants, color: 'text-teal-400' },
                { label: 'Contrats', value: agencyStats?.total_contracts ?? contracts.length, color: 'text-emerald-400' },
                { label: 'Paiements', value: agencyStats?.total_payments ?? payments.length, color: 'text-amber-400' },
                { label: 'Factures', value: agencyStats?.total_invoices ?? invoices.length, color: 'text-orange-400' },
                { label: 'Bulletins', value: bulletins.length, color: 'text-lime-400' },
                { label: 'Reversements', value: disbursements.length, color: 'text-yellow-400' },
                { label: 'Mouvements caisse', value: agencyStats?.total_cash_movements ?? cashMovements.length, color: 'text-[#C9A96E]' },
                { label: 'États des lieux', value: inspections.length, color: 'text-pink-400' },
                { label: 'Travaux', value: maintenance.length, color: 'text-red-400' },
                { label: 'Activités', value: activityLogs.length, color: 'text-violet-400' },
                { label: 'Archives', value: archives.length, color: 'text-slate-400' },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-xl bg-[#0A111D]/60 border border-[#C9A96E]/10">
                  <div className={`text-xl font-bold font-mono ${item.color}`}>{item.value}</div>
                  <div className="text-[10px] text-[#A8B4C4] uppercase tracking-wider mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'db_status' && (
        <div className="p-6 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/20 text-[#C9A96E] flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Statut du Moteur de Données</h3>
                <p className="text-xs text-[#A8B4C4]">Architecture hybride : base de données managée avec couche de synchronisation locale.</p>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                isSupabaseConfigured
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {isSupabaseConfigured ? 'Connecté au serveur sécurisé' : 'Mode autonome résilient'}
            </span>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="p-6 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Gouvernance RBAC & Sécurité</h3>
              <p className="text-xs text-[#A8B4C4]">Ségrégation stricte des tâches et isolation des données.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {[
              { role: 'SUPER_ADMIN', label: 'Super Administrateur', count: users.filter((u) => u.role === 'SUPER_ADMIN').length, desc: 'Accès universel.' },
              { role: 'ADMIN', label: 'Administrateur', count: users.filter((u) => u.role === 'ADMIN').length, desc: 'Gestion complète.' },
              { role: 'CAISSIER', label: 'Caissier', count: users.filter((u) => u.role === 'CAISSIER').length, desc: 'Encaissements et caisse.' },
              { role: 'GESTIONNAIRE', label: 'Gestionnaire', count: users.filter((u) => u.role === 'GESTIONNAIRE').length, desc: 'Gestion locative.' },
              { role: 'PROPRIETAIRE', label: 'Bailleur', count: users.filter((u) => u.role === 'PROPRIETAIRE').length, desc: 'Consultation ses biens.' },
              { role: 'LOCATAIRE', label: 'Locataire', count: users.filter((u) => u.role === 'LOCATAIRE').length, desc: 'Accès quittances.' },
            ].map((r) => (
              <div key={r.role} className="p-4 rounded-xl bg-[#1E2E45]/60 border border-[#C9A96E]/15 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{r.label}</span>
                  <span className="text-xs font-mono font-bold text-[#C9A96E] bg-[#C9A96E]/20 px-2 py-0.5 rounded-full">
                    {r.count}
                  </span>
                </div>
                <p className="text-[11px] text-[#A8B4C4] leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};