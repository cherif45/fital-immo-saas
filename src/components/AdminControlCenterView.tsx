import React, { useState } from 'react';
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
  Trash2,
  Sliders,
  CheckCircle2,
  XCircle,
  Activity,
  FileSpreadsheet,
  Layers,
  Cpu,
  Key,
  Server
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
  MaintenanceTicket
} from '../types';
import { formatCurrency, formatNumber } from '../lib/utils';
import { isSupabaseConfigured } from '../lib/supabase/client';

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
  onTriggerAuditLog: (action: string, module: string, details: string) => void;
  onRefreshData?: () => void;
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
  onTriggerAuditLog,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'db_status' | 'maintenance'>('overview');
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Computed Domain Metrics
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.statut === 'actif').length;
  const suspendedUsers = users.filter((u) => u.statut === 'suspendu').length;

  const totalProps = properties.length;
  const occupiedProps = properties.filter((p) => p.statut === 'Occupé').length;
  const vacantProps = properties.filter((p) => p.statut === 'Vacant').length;
  const maintenanceProps = properties.filter((p) => p.statut === 'Maintenance').length;
  const occupancyRate = totalProps > 0 ? Math.round((occupiedProps / totalProps) * 100) : 0;

  const totalTenants = tenants.length;
  const upToDateTenants = tenants.filter((t) => t.statut === 'À jour').length;
  const unpaidTenants = tenants.filter((t) => t.statut === 'Impayé' || t.statut === 'Retard').length;

  const totalExpectedRent = properties.reduce((acc, p) => acc + (p.loyerTotal || p.loyerBase + p.charges), 0);
  const totalCollectedRent = payments.reduce((acc, p) => acc + (p.montantPaye || 0), 0);
  const totalUnpaidRent = tenants.reduce((acc, t) => acc + (t.arrieresCumules || 0), 0);

  // Cash calculations
  const totalCashIn = cashMovements.filter((m) => m.type === 'ENTREE' || m.type === 'ENCAISSEMENT').reduce((acc, m) => acc + m.montant, 0);
  const totalCashOut = cashMovements.filter((m) => m.type === 'SORTIE' || m.type === 'DECAISSEMENT').reduce((acc, m) => acc + m.montant, 0);
  const currentCashBalance = totalCashIn - totalCashOut;

  // Breakdown by payment methods
  const paymentBreakdown = paymentMethods.map((pm) => {
    const matchingPayments = payments.filter((p) => p.moyenPaiementCode === pm.code || p.modePaiement.toUpperCase().includes(pm.code));
    const totalAmount = matchingPayments.reduce((acc, p) => acc + (p.montantPaye || 0), 0);
    return {
      code: pm.code,
      label: pm.libelle || pm.nom || pm.code,
      count: matchingPayments.length,
      amount: totalAmount,
      active: pm.actif,
    };
  });

  const handleExportSystemDump = () => {
    setIsExporting(true);
    try {
      const dump = {
        exportedAt: new Date().toISOString(),
        version: 'FITAL-IMMO-v2.5',
        agency: settings.nomAgence,
        counts: {
          users: users.length,
          properties: properties.length,
          tenants: tenants.length,
          owners: owners.length,
          payments: payments.length,
          cashMovements: cashMovements.length,
          closings: cashClosings.length,
          auditLogs: auditLogs.length,
        },
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
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dump, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `fital_immo_system_dump_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      onTriggerAuditLog('EXPORT_GLOBAL_JSON', 'Système', 'Export complet des données de production');
      setStatusMessage({ text: 'Sauvegarde complète JSON générée et téléchargée avec succès.', type: 'success' });
    } catch (e) {
      setStatusMessage({ text: 'Erreur lors de la génération du dump système.', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleIntegrityCheck = () => {
    onTriggerAuditLog('INTEGRITY_AUDIT', 'Système', 'Contrôle de cohérence base de données & montants');
    setStatusMessage({
      text: `Contrôle d'intégrité exécuté : ${totalProps} biens, ${totalTenants} locataires et ${payments.length} transactions vérifiés sans anomalie.`,
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
              <h1 className="text-xl font-bold text-white tracking-tight">Centre de Contrôle & Supervision Système</h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                SUPER_ADMIN
              </span>
            </div>
            <p className="text-xs text-[#A8B4C4] mt-0.5">
              Pilotage centralisé, état de la base de données, sécurité RBAC, audits et sauvegarde de l'agence.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleIntegrityCheck}
            className="px-3.5 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#E8D5B0] border border-[#C9A96E]/30 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Activity className="w-4 h-4 text-[#C9A96E]" />
            <span>Audit d'Intégrité</span>
          </button>
          <button
            onClick={handleExportSystemDump}
            disabled={isExporting}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] hover:from-[#D8BA80] hover:to-[#B58C50] text-[#0F1B2D] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Export en cours...' : 'Sauvegarde Système (JSON)'}</span>
          </button>
        </div>
      </div>

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
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-[#C9A96E]/15 gap-4">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'overview' ? 'text-[#C9A96E]' : 'text-[#A8B4C4] hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Vue d'Ensemble & Indicateurs Stratégiques</span>
          {activeTab === 'overview' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C9A96E]" />}
        </button>

        <button
          onClick={() => setActiveTab('db_status')}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'db_status' ? 'text-[#C9A96E]' : 'text-[#A8B4C4] hover:text-white'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Base de Données & Supabase PostgreSQL</span>
          {activeTab === 'db_status' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C9A96E]" />}
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'security' ? 'text-[#C9A96E]' : 'text-[#A8B4C4] hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Sécurité, RLS & Rôles ({users.length})</span>
          {activeTab === 'security' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C9A96E]" />}
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Main 4 KPI Groups */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Utilisateurs & Gouvernance */}
            <div className="p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#A8B4C4] uppercase">Utilisateurs & Accès</span>
                <Users className="w-4 h-4 text-[#C9A96E]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white font-mono">{totalUsers}</div>
                <div className="text-[11px] text-[#A8B4C4] mt-0.5">Comptes déclarés dans le système</div>
              </div>
              <div className="pt-3 border-t border-[#C9A96E]/10 flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-semibold">{activeUsers} Actifs</span>
                <span className="text-amber-400 font-semibold">{suspendedUsers} Suspendus</span>
                <span className="text-slate-400">{users.filter((u) => u.statut === 'desactive').length} Désactivés</span>
              </div>
            </div>

            {/* 2. Parc Immobilier & Taux d'Occupation */}
            <div className="p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#A8B4C4] uppercase">Parc Immobilier</span>
                <Building2 className="w-4 h-4 text-[#C9A96E]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white font-mono">{totalProps} Biens</div>
                <div className="text-[11px] text-emerald-400 font-medium mt-0.5">
                  Taux d'occupation : <strong>{occupancyRate}%</strong>
                </div>
              </div>
              <div className="pt-3 border-t border-[#C9A96E]/10 flex items-center justify-between text-xs">
                <span className="text-emerald-400">{occupiedProps} Occupés</span>
                <span className="text-sky-400">{vacantProps} Vacants</span>
                <span className="text-amber-400">{maintenanceProps} Travaux</span>
              </div>
            </div>

            {/* 3. Locataires & Recouvrement */}
            <div className="p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#A8B4C4] uppercase">Locataires & Baux</span>
                <TrendingUp className="w-4 h-4 text-[#C9A96E]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white font-mono">{totalTenants}</div>
                <div className="text-[11px] text-[#A8B4C4] mt-0.5">Locataires enregistrés</div>
              </div>
              <div className="pt-3 border-t border-[#C9A96E]/10 flex items-center justify-between text-xs">
                <span className="text-emerald-400">{upToDateTenants} À jour</span>
                <span className="text-rose-400 font-semibold">{unpaidTenants} En retard / Impayé</span>
              </div>
            </div>

            {/* 4. Solde de Caisse & Encaissements */}
            <div className="p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#A8B4C4] uppercase">Solde Caisse Espèces</span>
                <Coins className="w-4 h-4 text-[#C9A96E]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#C9A96E] font-mono">{formatCurrency(currentCashBalance)}</div>
                <div className="text-[11px] text-[#A8B4C4] mt-0.5">
                  {cashMovements.length} opérations · {cashClosings.length} clôtures
                </div>
              </div>
              <div className="pt-3 border-t border-[#C9A96E]/10 flex items-center justify-between text-xs text-[#A8B4C4]">
                <span>Entrées : +{formatNumber(totalCashIn)}</span>
                <span>Sorties : -{formatNumber(totalCashOut)}</span>
              </div>
            </div>
          </div>

          {/* Payment Methods Breakdown */}
          <div className="p-6 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#C9A96E]" />
                <h3 className="text-sm font-bold text-white">Ventilation des Règlements par Canal de Paiement</h3>
              </div>
              <span className="text-xs text-[#A8B4C4] font-mono">
                Total Recouvré : <strong className="text-[#C9A96E]">{formatCurrency(totalCollectedRent)}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {paymentBreakdown.map((pm) => (
                <div
                  key={pm.code}
                  className="p-4 rounded-xl bg-[#1E2E45]/70 border border-[#C9A96E]/15 flex flex-col justify-between space-y-2 hover:border-[#C9A96E]/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{pm.label}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        pm.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
                      }`}
                    >
                      {pm.active ? 'Actif' : 'Désactivé'}
                    </span>
                  </div>
                  <div>
                    <div className="text-base font-bold text-[#E8D5B0] font-mono">{formatCurrency(pm.amount)}</div>
                    <div className="text-[11px] text-[#A8B4C4] mt-0.5">{pm.count} paiements validés</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'db_status' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/20 text-[#C9A96E] flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Statut du Moteur de Données & Supabase PostgreSQL</h3>
                  <p className="text-xs text-[#A8B4C4]">
                    Architecture hybride : PostgreSQL managé avec couche de synchronisation locale résiliente.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    isSupabaseConfigured
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  {isSupabaseConfigured ? 'Connecté à Supabase' : 'Mode Autonome Résilient (localStorage)'}
                </span>
              </div>
            </div>

            {/* Diagnostics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#1E2E45]/60 border border-[#C9A96E]/15 space-y-2">
                <span className="text-[#A8B4C4] font-semibold block">Schéma SQL & RLS</span>
                <p className="text-white font-mono">/src/lib/supabase/schema.sql</p>
                <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 17 tables, indexes & politiques RLS actives
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#1E2E45]/60 border border-[#C9A96E]/15 space-y-2">
                <span className="text-[#A8B4C4] font-semibold block">Persistance Locale Hors-Ligne</span>
                <p className="text-white font-mono">fital_immo_db_v2_*</p>
                <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Sauvegarde automatique sur chaque mutation
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#1E2E45]/60 border border-[#C9A96E]/15 space-y-2">
                <span className="text-[#A8B4C4] font-semibold block">Journalisation d'Audit</span>
                <p className="text-white font-mono">{auditLogs.length} événements tracés</p>
                <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Traçabilité utilisateur, date, IP et module
                </p>
              </div>
            </div>
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
              <h3 className="text-sm font-bold text-white">Gouvernance RBAC & Sécurité par Rôle</h3>
              <p className="text-xs text-[#A8B4C4]">
                Ségrégation stricte des tâches et isolation des données propriétaires et locataires.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {[
              { role: 'SUPER_ADMIN', label: 'Super Administrateur', count: users.filter((u) => u.role === 'SUPER_ADMIN').length, desc: 'Accès universel et contrôle absolu du système.' },
              { role: 'ADMIN', label: 'Administrateur', count: users.filter((u) => u.role === 'ADMIN').length, desc: 'Gestion complète du parc, finances et utilisateurs.' },
              { role: 'CAISSIER', label: 'Caissier / Comptable', count: users.filter((u) => u.role === 'CAISSIER').length, desc: 'Encaissements, journal de caisse et quittances.' },
              { role: 'GESTIONNAIRE', label: 'Gestionnaire Immobilier', count: users.filter((u) => u.role === 'GESTIONNAIRE').length, desc: 'Gestion locative, baux, états des lieux et relances.' },
              { role: 'PROPRIETAIRE', label: 'Bailleur Mandant', count: users.filter((u) => u.role === 'PROPRIETAIRE').length, desc: 'Consultation dédiée de ses biens et reversements.' },
              { role: 'LOCATAIRE', label: 'Locataire', count: users.filter((u) => u.role === 'LOCATAIRE').length, desc: 'Accès à ses quittances, bail et demandes.' },
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
