import React, { useState } from 'react';
import {
  Coins,
  AlertTriangle,
  DoorOpen,
  Building2,
  TrendingUp,
  CreditCard,
  UserPlus,
  FileSignature,
  Receipt,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Send,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  Wrench,
  ChevronRight,
  ShieldAlert,
  Percent,
} from 'lucide-react';
import {
  Property,
  Unit,
  Tenant,
  Payment,
  MaintenanceTicket,
  ActiveTab,
} from '../types';
import { formatCurrency, formatNumber, formatDate } from '../lib/utils';
import { DashboardCalendar } from './DashboardCalendar';

interface DashboardViewProps {
  properties: Property[];
  units?: Unit[];
  tenants: Tenant[];
  payments: Payment[];
  maintenance: MaintenanceTicket[];
  setActiveTab: (tab: ActiveTab) => void;
  onOpenReceipt: (payment: Payment) => void;
  onOpenQuickReminder: (tenant: Tenant) => void;
  onOpenNewPayment: () => void;
  onOpenNewProperty: () => void;
  currentUser?: { id?: string; agencyId?: string; role?: string } | null;
}

type DashboardPeriod = 'today' | 'last7days' | 'month' | 'quarter' | 'year';

export const DashboardView: React.FC<DashboardViewProps> = ({
  properties,
  units = [],
  tenants,
  payments,
  maintenance,
  setActiveTab,
  onOpenReceipt,
  onOpenQuickReminder,
  onOpenNewPayment,
  onOpenNewProperty,
  currentUser,
}) => {
  const [aiInsightLoading, setAiInsightLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<{ analysis: string; actionPlan: string[] } | null>(null);
  const [dashboardPeriod, setDashboardPeriod] = useState<DashboardPeriod>('month');

  // ============================================================
  // FILTRAGE PAR PÉRIODE
  // ============================================================
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const getPeriodRange = () => {
    switch (dashboardPeriod) {
      case 'today':
        return { start: today, end: now };
      case 'last7days': {
        const start = new Date(today);
        start.setDate(start.getDate() - 6);
        return { start, end: now };
      }
      case 'quarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        const start = new Date(now.getFullYear(), quarter * 3, 1);
        return { start, end: now };
      }
      case 'year': {
        const start = new Date(now.getFullYear(), 0, 1);
        return { start, end: now };
      }
      case 'month':
      default: {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start, end: now };
      }
    }
  };

  const { start: periodStart, end: periodEnd } = getPeriodRange();

  const parseDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      ? new Date(`${dateStr}T00:00:00`)
      : new Date(dateStr);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const isInPeriod = (dateStr?: string) => {
    const date = parseDate(dateStr);
    return date !== null && date >= periodStart && date <= periodEnd;
  };

  const isToday = (dateStr?: string) => {
    const date = parseDate(dateStr);
    return date !== null && date.toDateString() === today.toDateString();
  };

  // ============================================================
  // MÉTRIQUES
  // ============================================================
  const isCollectedPayment = (payment: Payment) =>
    (payment.statut === 'Payé' || payment.statut === 'Partiel') &&
    payment.verificationStatut !== 'en_attente' &&
    payment.verificationStatut !== 'rejete';
  const getReceivedAmount = (payment: Payment) =>
    Number.isFinite(payment.montantPaye) ? Math.max(0, payment.montantPaye) : 0;

  const filteredPayments = payments.filter(
    (p) => isCollectedPayment(p) && isInPeriod(p.datePaiement)
  );

  const totalCollected = filteredPayments.reduce((sum, p) => sum + getReceivedAmount(p), 0);

  const overdueTenants = tenants.filter(
    (t) => t.statut === 'Impayé' || t.statut === 'Retard'
  );
  const totalUnpaid = overdueTenants.reduce((sum, tenant) => {
    const balance = tenant.arrieresCumules ?? tenant.loyerMensuel;
    return sum + (Number.isFinite(balance) ? Math.max(0, balance) : 0);
  }, 0);

  const totalCollectedToday = payments
    .filter((p) => isCollectedPayment(p) && isToday(p.datePaiement))
    .reduce((sum, p) => sum + getReceivedAmount(p), 0);

  const paymentsToday = payments.filter((p) => isCollectedPayment(p) && isToday(p.datePaiement));

  // 🆕 ADDITIONNER properties + units
  const allLots: any[] = [...properties, ...units];
  const occupiedProperties = allLots.filter((p: any) => p.statut === 'Occupé').length;
  const vacantProperties = allLots.filter((p: any) => p.statut === 'Vacant').length;
  const maintenanceProperties = allLots.filter((p: any) => p.statut === 'Maintenance').length;
  const totalProperties = allLots.length;
  const occupancyRate = totalProperties > 0 ? Math.round((occupiedProperties / totalProperties) * 100) : 0;

  const totalCollectedAllTime = payments
    .filter(isCollectedPayment)
    .reduce((sum, payment) => sum + getReceivedAmount(payment), 0);
  const totalTarget = totalCollectedAllTime + totalUnpaid;
  const recoveryRate = totalTarget > 0 ? Math.round((totalCollectedAllTime / totalTarget) * 100) : 0;

  const estimatedCommission = Math.round(totalCollected * 0.095);

  // ============================================================
  // ACTIVITÉ DU JOUR
  // ============================================================
  const tenantsToday = tenants.filter((t) => isToday(t.dateEntree));
  const propertiesToday = properties.filter((p) => isToday(p.dateCreation));
  const maintenanceToday = maintenance.filter((m) => isToday(m.dateSignalement));
  const totalActionsToday = tenantsToday.length + propertiesToday.length + paymentsToday.length + maintenanceToday.length;

  const handleRefreshAI = async () => {
    if (properties.length === 0 && units.length === 0) {
      setAiInsight({
        analysis: 'Votre portefeuille immobilier ne comporte aucun bien pour le moment.',
        actionPlan: [
          'Ajouter vos propriétaires bailleurs',
          'Enregistrer vos premiers biens immobiliers',
          'Rattacher des locataires avec leurs baux',
        ],
      });
      return;
    }

    setAiInsightLoading(true);
    try {
      const res = await fetch('/api/gemini/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unpaidCount: overdueTenants.length,
          totalUnpaid,
          totalCollected,
          occupancyRate,
        }),
      });
      const data = await res.json();
      if (data.analysis) setAiInsight(data);
    } catch (e) {
      console.error(e);
    } finally {
      setAiInsightLoading(false);
    }
  };

  const periods: { id: DashboardPeriod; label: string }[] = [
    { id: 'today', label: 'Aujourd’hui' },
    { id: 'last7days', label: '7 jours' },
    {
      id: 'month',
      label: `Ce mois (${now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })})`,
    },
    { id: 'quarter', label: 'Trimestre' },
    { id: 'year', label: `Année ${now.getFullYear()}` },
  ];
  const selectedPeriodLabel = periods.find((period) => period.id === dashboardPeriod)?.label ?? '';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Period Selector */}
      {/* 🆕 Calendrier d'activité */}
      <DashboardCalendar agencyId={currentUser?.agencyId} />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1 border-b border-[#C9A96E]/10">
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
          {periods.map((period) => (
            <button
              key={period.id}
              onClick={() => setDashboardPeriod(period.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                dashboardPeriod === period.id
                  ? 'bg-gradient-to-r from-[#C9A96E]/25 to-[#C9A96E]/10 text-[#E8D5B0] border border-[#C9A96E]/40 font-semibold shadow-sm'
                  : 'text-[#6B7C94] hover:text-[#A8B4C4] hover:bg-[#1E2E45]/40 border border-transparent'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
        <div className="text-[11px] text-[#A8B4C4] flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Base FITAL-IMMO synchronisée · {totalProperties} biens gérés
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <button
          onClick={onOpenNewPayment}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 hover:border-[#C9A96E]/60 hover:bg-[#1E2E45]/80 transition-all text-left group shadow-lg shadow-[#0F1B2D]/40"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-[#C9A96E] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform border border-amber-500/20">
            <Coins className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white group-hover:text-[#C9A96E] transition-colors">
              Encaisser Loyer
            </div>
            <div className="text-[11px] text-[#6B7C94]">Édition quittance immédiate</div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('reminders')}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#162133] border border-rose-500/20 hover:border-rose-500/50 hover:bg-[#1E2E45]/80 transition-all text-left group shadow-lg shadow-[#0F1B2D]/40"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform border border-rose-500/20">
            <Send className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white group-hover:text-rose-400 transition-colors flex items-center gap-1.5">
              <span>Relances IA</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono">
                {overdueTenants.length}
              </span>
            </div>
            <div className="text-[11px] text-[#6B7C94]">WhatsApp / SMS 1-clic</div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('contracts')}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#162133] border border-sky-500/20 hover:border-sky-500/50 hover:bg-[#1E2E45]/80 transition-all text-left group shadow-lg shadow-[#0F1B2D]/40"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform border border-sky-500/20">
            <FileSignature className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors">
              Nouveau Contrat
            </div>
            <div className="text-[11px] text-[#6B7C94]">Bail, taxes & cautions</div>
          </div>
        </button>

        <button
          onClick={onOpenNewProperty}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#162133] border border-emerald-500/20 hover:border-emerald-500/50 hover:bg-[#1E2E45]/80 transition-all text-left group shadow-lg shadow-[#0F1B2D]/40"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform border border-emerald-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
              Ajouter un Bien
            </div>
            <div className="text-[11px] text-[#6B7C94]">Immeuble, lot ou villa</div>
          </div>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 hover:border-[#C9A96E]/40 transition-all relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-28 h-28 bg-[#C9A96E]/5 rounded-full blur-2xl group-hover:bg-[#C9A96E]/10 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/15 text-[#C9A96E] flex items-center justify-center border border-[#C9A96E]/25">
              <Coins className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> +12.4%
            </span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatNumber(totalCollected)}{' '}
            <span className="text-xs font-normal text-[#C9A96E]">FCFA</span>
          </div>
          <div className="text-xs font-medium text-[#A8B4C4] mt-1">
            Loyers perçus · {selectedPeriodLabel}
          </div>
          <div className="text-[11px] text-[#6B7C94] mt-3 pt-3 border-t border-[#C9A96E]/10 flex items-center justify-between">
            <span>Commissions agence :</span>
            <span className="text-[#C9A96E] font-semibold">{formatNumber(estimatedCommission)} FCFA</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#162133] border border-rose-500/25 hover:border-rose-500/45 transition-all relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-28 h-28 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center border border-rose-500/25">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/25 flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3" /> {overdueTenants.length} locataires
            </span>
          </div>
          <div className="text-2xl font-bold text-rose-300 tracking-tight">
            {formatNumber(totalUnpaid)}{' '}
            <span className="text-xs font-normal text-rose-400/80">FCFA</span>
          </div>
          <div className="text-xs font-medium text-[#A8B4C4] mt-1">Loyers impayés & arriérés</div>
          <div className="text-[11px] text-[#6B7C94] mt-3 pt-3 border-t border-rose-500/15 flex items-center justify-between">
            <span>Action requise :</span>
            <button onClick={() => setActiveTab('reminders')} className="text-rose-400 font-semibold hover:underline flex items-center gap-1">
              Lancer relances <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#162133] border border-emerald-500/20 hover:border-emerald-500/40 transition-all relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/25">
              <Percent className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
              Objectif: 95%
            </span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {recoveryRate}% <span className="text-xs font-normal text-[#A8B4C4]">recouvré</span>
          </div>
          <div className="text-xs font-medium text-[#A8B4C4] mt-1">Efficacité de recouvrement</div>
          <div className="w-full bg-[#1E2E45] h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-[#C9A96E] h-full rounded-full transition-all duration-700" style={{ width: `${recoveryRate}%` }} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#162133] border border-sky-500/20 hover:border-sky-500/40 transition-all relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-28 h-28 bg-sky-500/5 rounded-full blur-2xl group-hover:bg-sky-500/10 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center border border-sky-500/25">
              <DoorOpen className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/25">
              {occupiedProperties}/{totalProperties} loués
            </span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {occupancyRate}% <span className="text-xs font-normal text-[#A8B4C4]">occupation</span>
          </div>
          <div className="text-xs font-medium text-[#A8B4C4] mt-1">Parc loué actif</div>
          <div className="text-[11px] text-[#6B7C94] mt-3 pt-3 border-t border-sky-500/15 flex items-center justify-between">
            <span>Biens disponibles :</span>
            <span className="text-sky-300 font-semibold">{vacantProperties} vacants</span>
          </div>
        </div>
      </div>

      {/* Carte Encaissé aujourd'hui */}
      <div className="grid grid-cols-1 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1E2E45] to-[#162133] border-2 border-[#C9A96E]/40 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#C9A96E]/10 rounded-full blur-3xl" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C9A96E] to-[#A07840] flex items-center justify-center text-[#0A111D] shadow-lg">
                <Coins className="w-7 h-7" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#A8B4C4] uppercase tracking-wider">💰 Encaissé aujourd'hui</div>
                <div className="text-3xl font-black text-[#E8D5B0] tracking-tight mt-1">
                  {formatNumber(totalCollectedToday)} <span className="text-base font-normal text-[#C9A96E]">FCFA</span>
                </div>
                <div className="text-xs text-[#6B7C94] mt-1">
                  {paymentsToday.length} paiement{paymentsToday.length > 1 ? 's' : ''} enregistré{paymentsToday.length > 1 ? 's' : ''} aujourd'hui
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[#6B7C94] uppercase tracking-wider">Date du jour</div>
              <div className="text-sm font-bold text-white">
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statut du Parc Immobilier */}
      <div className="p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl">
        <div className="text-sm font-bold text-white">Statut du Parc Immobilier</div>
        <div className="text-xs text-[#6B7C94] mt-0.5">Répartition des {totalProperties} biens gérés</div>

        <div className="flex items-center justify-center my-6">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1E2E45" strokeWidth="12" />
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#4CAF82" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - occupancyRate / 100)} strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
            <div className="absolute text-center">
              <div className="text-2xl font-bold text-white">{occupancyRate}%</div>
              <div className="text-[10px] text-[#A8B4C4] uppercase tracking-wider">Occupé</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-[#1E2E45]/40 border border-[#C9A96E]/10">
            <div className="flex items-center gap-2 text-white">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4CAF82]" />
              <span>Occupés</span>
            </div>
            <span className="font-bold text-white">{occupiedProperties}</span>
          </div>
          <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-[#1E2E45]/40 border border-[#C9A96E]/10">
            <div className="flex items-center gap-2 text-white">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4A9BE8]" />
              <span>Vacants</span>
            </div>
            <span className="font-bold text-sky-300">{vacantProperties}</span>
          </div>
          <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-[#1E2E45]/40 border border-[#C9A96E]/10">
            <div className="flex items-center gap-2 text-white">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E8A84A]" />
              <span>Maintenance</span>
            </div>
            <span className="font-bold text-amber-300">{maintenanceProperties}</span>
          </div>
        </div>

        <button onClick={() => setActiveTab('properties')} className="w-full mt-4 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] text-xs text-[#C9A96E] font-semibold border border-[#C9A96E]/20 transition-all flex items-center justify-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" /> Gérer le catalogue complet
        </button>
      </div>

      {/* Locataires en retard */}
      <div className="p-5 rounded-2xl bg-[#162133] border border-rose-500/20 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Locataires en Retard</span>
            </div>
            <div className="text-xs text-[#6B7C94] mt-0.5">{overdueTenants.length} dossiers nécessitant une action</div>
          </div>
        </div>

        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {overdueTenants.length === 0 ? (
            <div className="py-8 text-center text-[#6B7C94]">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400/60 mb-2" />
              <p className="text-xs font-semibold text-white">Aucun impayé en cours</p>
            </div>
          ) : (
            overdueTenants.slice(0, 5).map((t) => (
              <div key={t.id} className="p-3.5 rounded-xl bg-[#1E2E45]/60 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs truncate">{t.prenom} {t.nom}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">{t.joursRetard}j</span>
                  </div>
                  <div className="text-xs font-bold text-rose-400 mt-1">Arriéré : {formatCurrency(t.arrieresCumules || t.loyerMensuel)}</div>
                </div>
                <button onClick={() => onOpenQuickReminder(t)} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" /> Relancer
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};