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
  Tenant,
  Payment,
  MaintenanceTicket,
  ActiveTab,
} from '../types';
import { formatCurrency, formatNumber, formatDate } from '../lib/utils';

interface DashboardViewProps {
  properties: Property[];
  tenants: Tenant[];
  payments: Payment[];
  maintenance: MaintenanceTicket[];
  setActiveTab: (tab: ActiveTab) => void;
  onOpenReceipt: (payment: Payment) => void;
  onOpenQuickReminder: (tenant: Tenant) => void;
  onOpenNewPayment: () => void;
  onOpenNewProperty: () => void;
  selectedPeriod: string;
  setSelectedPeriod: (p: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  properties,
  tenants,
  payments,
  maintenance,
  setActiveTab,
  onOpenReceipt,
  onOpenQuickReminder,
  onOpenNewPayment,
  onOpenNewProperty,
  selectedPeriod,
  setSelectedPeriod,
}) => {
  const [aiInsightLoading, setAiInsightLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<{ analysis: string; actionPlan: string[] } | null>(null);

  // Calculate Metrics
  const totalCollected = payments
    .filter((p) => p.statut === 'Payé')
    .reduce((sum, p) => sum + p.montantPaye, 0);

  const totalUnpaid = tenants
    .filter((t) => t.statut === 'Impayé' || t.statut === 'Retard')
    .reduce((sum, t) => sum + (t.arrieresCumules || t.loyerMensuel), 0);

  const overdueTenants = tenants.filter(
    (t) => t.statut === 'Impayé' || t.statut === 'Retard'
  );

  const occupiedProperties = properties.filter((p) => p.statut === 'Occupé').length;
  const vacantProperties = properties.filter((p) => p.statut === 'Vacant').length;
  const maintenanceProperties = properties.filter((p) => p.statut === 'Maintenance').length;
  const totalProperties = properties.length;
  const occupancyRate = totalProperties > 0 ? Math.round((occupiedProperties / totalProperties) * 100) : 0;

  const totalTarget = totalCollected + totalUnpaid;
  const recoveryRate = totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : 0;

  // Monthly Agency Commission estimate (averaging 10%)
  const estimatedCommission = Math.round(totalCollected * 0.095);

  const handleRefreshAI = async () => {
    if (properties.length === 0) {
      setAiInsight({
        analysis: 'Votre portefeuille immobilier ne comporte aucun bien pour le moment. Dès l’ajout de vos premiers contrats et locataires, l’IA générera des diagnostics précis et des recommandations de recouvrement.',
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
      if (data.analysis) {
        setAiInsight(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiInsightLoading(false);
    }
  };

  const periods = ['Aujourd’hui', '7 jours', 'Ce mois (Mai 2026)', 'Trimestre', 'Année 2026'];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Period Selector & Global Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1 border-b border-[#C9A96E]/10">
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                selectedPeriod === p
                  ? 'bg-gradient-to-r from-[#C9A96E]/25 to-[#C9A96E]/10 text-[#E8D5B0] border border-[#C9A96E]/40 font-semibold shadow-sm'
                  : 'text-[#6B7C94] hover:text-[#A8B4C4] hover:bg-[#1E2E45]/40 border border-transparent'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="text-[11px] text-[#A8B4C4] flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Base FITAL-IMMO synchronisée · {totalProperties} biens gérés
        </div>
      </div>

      {/* Quick Actions Ribbon */}
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
        {/* Card 1: Revenus Perçus */}
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
          <div className="text-xs font-medium text-[#A8B4C4] mt-1">Loyers perçus du mois</div>
          <div className="text-[11px] text-[#6B7C94] mt-3 pt-3 border-t border-[#C9A96E]/10 flex items-center justify-between">
            <span>Commissions agence :</span>
            <span className="text-[#C9A96E] font-semibold">
              {formatNumber(estimatedCommission)} FCFA
            </span>
          </div>
        </div>

        {/* Card 2: Loyers Impayés */}
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
            <button
              onClick={() => setActiveTab('reminders')}
              className="text-rose-400 font-semibold hover:underline flex items-center gap-1"
            >
              Lancer relances <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 3: Taux de Recouvrement */}
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
            {recoveryRate}%{' '}
            <span className="text-xs font-normal text-[#A8B4C4]">recouvré</span>
          </div>
          <div className="text-xs font-medium text-[#A8B4C4] mt-1">Efficacité de recouvrement</div>
          {/* Progress bar */}
          <div className="w-full bg-[#1E2E45] h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-[#C9A96E] h-full rounded-full transition-all duration-700"
              style={{ width: `${recoveryRate}%` }}
            />
          </div>
        </div>

        {/* Card 4: Taux d'Occupation */}
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
            {occupancyRate}%{' '}
            <span className="text-xs font-normal text-[#A8B4C4]">occupation</span>
          </div>
          <div className="text-xs font-medium text-[#A8B4C4] mt-1">Parc loué actif</div>
          <div className="text-[11px] text-[#6B7C94] mt-3 pt-3 border-t border-sky-500/15 flex items-center justify-between">
            <span>Biens disponibles :</span>
            <span className="text-sky-300 font-semibold">{vacantProperties} vacants</span>
          </div>
        </div>
      </div>

      {/* AI Recovery Assistant & Smart Recommendations */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#1E2E45] via-[#162133] to-[#1E2E45] border border-[#C9A96E]/35 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[#C9A96E]/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A96E] to-[#A07840] flex items-center justify-center text-[#0F1B2D] shadow-md flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>Assistant IA de Recouvrement & Gestion</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C9A96E]/20 text-[#E8D5B0] border border-[#C9A96E]/30 font-semibold font-mono">
                  Gemini 3.7
                </span>
              </div>
              <p className="text-xs text-[#A8B4C4] mt-0.5">
                Analyse prédictive des encaissements et automatisation des relances locataires
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshAI}
              disabled={aiInsightLoading}
              className="px-3.5 py-1.5 rounded-xl bg-[#162133] hover:bg-[#2A3F5C] border border-[#C9A96E]/30 text-xs font-semibold text-[#E8D5B0] transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${aiInsightLoading ? 'animate-spin' : ''}`} />
              <span>{aiInsightLoading ? 'Analyse en cours...' : 'Réanalyser le parc'}</span>
            </button>
            <button
              onClick={() => setActiveTab('reminders')}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Exécuter les Relances</span>
            </button>
          </div>
        </div>

        {aiInsight ? (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 p-3.5 rounded-xl bg-[#0F1B2D]/60 border border-[#C9A96E]/15 text-xs text-[#F0EDE8] leading-relaxed">
              <div className="font-semibold text-[#C9A96E] mb-1 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Diagnostic de Recouvrement :
              </div>
              <p className="text-[#A8B4C4]">{aiInsight.analysis}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0F1B2D]/60 border border-[#C9A96E]/15">
              <div className="text-xs font-semibold text-[#E8D5B0] mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Actions Prioritaires :
              </div>
              <ul className="space-y-1.5 text-[11px] text-[#A8B4C4]">
                {aiInsight.actionPlan.map((action, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-[#C9A96E] font-bold">0{idx + 1}.</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="mt-4 p-4 rounded-xl bg-[#0F1B2D]/40 border border-white/5 text-center text-xs text-[#A8B4C4]">
            <p>Cliquez sur <strong className="text-[#C9A96E]">« Réanalyser le parc »</strong> pour générer l’audit prédictif de vos loyers et recommandations d'actions prioritaires.</p>
          </div>
        )}
      </div>

      {/* Middle Section: Financial Chart & Occupancy Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Financial Trends */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-bold text-white">Évolution des Loyers & Décaissements</div>
              <div className="text-xs text-[#6B7C94] mt-0.5">Encaissements réels vs Dépenses 2026</div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#C9A96E]" />
                <span className="text-[#A8B4C4]">Loyers Encaissés</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-rose-500/70" />
                <span className="text-[#A8B4C4]">Dépenses & Travaux</span>
              </div>
            </div>
          </div>

          {/* Bar Chart Simulation */}
          <div className="h-56 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-[#C9A96E]/10">
            {[
              { month: 'Jan', income: 3200000, expense: 450000 },
              { month: 'Fév', income: 3450000, expense: 520000 },
              { month: 'Mar', income: 3800000, expense: 380000 },
              { month: 'Avr', income: 4100000, expense: 620000 },
              { month: 'Mai', income: 4820000, expense: 480000, current: true },
              { month: 'Jun', income: 4950000, expense: 400000, forecast: true },
            ].map((bar, idx) => {
              const maxVal = 5500000;
              const incomeHeight = Math.round((bar.income / maxVal) * 100);
              const expenseHeight = Math.round((bar.expense / maxVal) * 100);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="w-full max-w-[48px] flex items-end justify-center gap-1 h-full">
                    {/* Income Bar */}
                    <div
                      className={`w-1/2 rounded-t-lg transition-all duration-500 relative group/bar ${
                        bar.current
                          ? 'bg-gradient-to-t from-[#C9A96E] to-[#E8D5B0] shadow-lg shadow-[#C9A96E]/20'
                          : bar.forecast
                          ? 'bg-[#C9A96E]/40 border border-dashed border-[#C9A96E]'
                          : 'bg-[#C9A96E]/70 hover:bg-[#C9A96E]'
                      }`}
                      style={{ height: `${incomeHeight}%` }}
                    >
                      <div className="opacity-0 group-hover/bar:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1E2E45] border border-[#C9A96E]/30 text-[10px] text-white px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-20 pointer-events-none">
                        {(bar.income / 1000000).toFixed(2)}M FCFA
                      </div>
                    </div>
                    {/* Expense Bar */}
                    <div
                      className={`w-1/2 rounded-t-lg transition-all duration-500 relative group/bar ${
                        bar.forecast ? 'bg-rose-500/30' : 'bg-rose-500/60 hover:bg-rose-500'
                      }`}
                      style={{ height: `${expenseHeight}%` }}
                    >
                      <div className="opacity-0 group-hover/bar:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1E2E45] border border-rose-500/30 text-[10px] text-white px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-20 pointer-events-none">
                        {(bar.expense / 1000).toFixed(0)}k FCFA
                      </div>
                    </div>
                  </div>
                  <div className={`text-[11px] font-medium ${bar.current ? 'text-[#C9A96E] font-bold' : 'text-[#6B7C94]'}`}>
                    {bar.month} {bar.current && '•'}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-[#A8B4C4] mt-3">
            <span>Total Recouvert YTD : <strong className="text-white">19 370 000 FCFA</strong></span>
            <span>Bénéfice Net Agence : <strong className="text-emerald-400">+1 840 000 FCFA</strong></span>
          </div>
        </div>

        {/* Occupancy & Inventory Breakdown */}
        <div className="p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl flex flex-col justify-between">
          <div>
            <div className="text-sm font-bold text-white">Statut du Parc Immobilier</div>
            <div className="text-xs text-[#6B7C94] mt-0.5">Répartition des {totalProperties} biens gérés</div>

            {/* Circular Progress Display */}
            <div className="flex items-center justify-center my-6">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1E2E45" strokeWidth="12" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#4CAF82"
                    strokeWidth="12"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 * (1 - occupancyRate / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute text-center">
                  <div className="text-2xl font-bold text-white">{occupancyRate}%</div>
                  <div className="text-[10px] text-[#A8B4C4] uppercase tracking-wider">Occupé</div>
                </div>
              </div>
            </div>

            {/* Breakdown List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-[#1E2E45]/40 border border-[#C9A96E]/10">
                <div className="flex items-center gap-2 text-white">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4CAF82]" />
                  <span>Biens Loués (Occupés)</span>
                </div>
                <span className="font-bold text-white">{occupiedProperties} biens</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-[#1E2E45]/40 border border-[#C9A96E]/10">
                <div className="flex items-center gap-2 text-white">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4A9BE8]" />
                  <span>Biens Vacants (Disponibles)</span>
                </div>
                <span className="font-bold text-sky-300">{vacantProperties} biens</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-[#1E2E45]/40 border border-[#C9A96E]/10">
                <div className="flex items-center gap-2 text-white">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E8A84A]" />
                  <span>En Travaux / Maintenance</span>
                </div>
                <span className="font-bold text-amber-300">{maintenanceProperties} biens</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('properties')}
            className="w-full mt-4 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] text-xs text-[#C9A96E] font-semibold border border-[#C9A96E]/20 transition-all flex items-center justify-center gap-1.5"
          >
            <Building2 className="w-3.5 h-3.5" /> Gérer le catalogue complet
          </button>
        </div>
      </div>

      {/* Bottom Row: Priority Arrears & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Tenants with 1-Click Relance */}
        <div className="p-5 rounded-2xl bg-[#162133] border border-rose-500/20 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Locataires en Retard & Relances Prioritaires</span>
              </div>
              <div className="text-xs text-[#6B7C94] mt-0.5">
                {overdueTenants.length} dossiers nécessitant une intervention immédiate
              </div>
            </div>
            <button
              onClick={() => setActiveTab('recovery')}
              className="text-xs text-[#C9A96E] hover:underline font-semibold flex items-center gap-1"
            >
              Suivi détaillé <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {overdueTenants.length === 0 ? (
              <div className="py-8 text-center text-[#6B7C94]">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400/60 mb-2" />
                <p className="text-xs font-semibold text-white">Aucun impayé en cours</p>
                <p className="text-[11px] text-[#6B7C94] mt-0.5">Tous les locataires enregistrés sont à jour.</p>
              </div>
            ) : (
              overdueTenants.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-xl bg-[#1E2E45]/60 border border-rose-500/20 hover:border-rose-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs truncate">
                        {t.prenom} {t.nom}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                        {t.joursRetard} jours de retard
                      </span>
                    </div>
                    <div className="text-[11px] text-[#A8B4C4] truncate mt-0.5">
                      {t.bienNom}
                    </div>
                    <div className="text-xs font-bold text-rose-400 mt-1">
                      Arriéré : {formatCurrency(t.arrieresCumules || t.loyerMensuel)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenQuickReminder(t)}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5"
                      title="Envoyer relance WhatsApp 1-clic"
                    >
                      <Send className="w-3.5 h-3.5" /> Relancer
                    </button>
                    <button
                      onClick={onOpenNewPayment}
                      className="px-3 py-1.5 rounded-lg bg-[#162133] hover:bg-[#2A3F5C] border border-[#C9A96E]/30 text-[#C9A96E] font-medium text-xs transition-all"
                    >
                      Encaisser
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Payments & Instant Receipts */}
        <div className="p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#C9A96E]" />
                <span>Derniers Règlements Encaissés</span>
              </div>
              <div className="text-xs text-[#6B7C94] mt-0.5">
                Quittances certifiées avec montants en lettres
              </div>
            </div>
            <button
              onClick={() => setActiveTab('payments')}
              className="text-xs text-[#C9A96E] hover:underline font-semibold flex items-center gap-1"
            >
              Historique complet <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {payments.filter((p) => p.statut === 'Payé').length === 0 ? (
              <div className="py-8 text-center text-[#6B7C94]">
                <Receipt className="w-8 h-8 mx-auto text-[#6B7C94]/40 mb-2" />
                <p className="text-xs font-semibold text-white">Aucun règlement enregistré</p>
                <p className="text-[11px] text-[#6B7C94] mt-0.5">Les quittances apparaîtront ici dès l’encaissement d'un loyer.</p>
              </div>
            ) : (
              payments
                .filter((p) => p.statut === 'Payé')
                .slice(0, 5)
                .map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl bg-[#1E2E45]/40 border border-[#C9A96E]/15 hover:border-[#C9A96E]/35 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs truncate">{p.locataireNom}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#C9A96E]/15 text-[#E8D5B0] font-mono">
                          {p.modePaiement}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#A8B4C4] truncate mt-0.5">
                        {p.bienNom} · {formatDate(p.datePaiement)}
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <div className="text-xs font-bold text-[#C9A96E]">
                          {formatCurrency(p.montantPaye)}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 justify-end">
                          <CheckCircle2 className="w-3 h-3" /> Encaissé
                        </div>
                      </div>
                      <button
                        onClick={() => onOpenReceipt(p)}
                        className="p-2 rounded-lg bg-[#162133] hover:bg-[#2A3F5C] text-[#C9A96E] border border-[#C9A96E]/20 transition-all hover:scale-105"
                        title="Imprimer / Télécharger Quittance de Loyer"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
