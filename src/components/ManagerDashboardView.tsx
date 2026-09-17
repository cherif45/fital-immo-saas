import React from 'react';
import { 
  Property, 
  Tenant, 
  Owner, 
  LeaseContract, 
  Payment, 
  MaintenanceTicket, 
  RecoveryReminder,
  ActiveTab
} from '../types';
import { formatCurrencyFCFA } from '../lib/calculations/financial';
import { 
  Building2, 
  Home, 
  Users, 
  FileText, 
  Receipt, 
  AlertTriangle, 
  Wrench, 
  Clock, 
  CheckCircle2, 
  Send, 
  PlusCircle, 
  TrendingUp 
} from 'lucide-react';

interface ManagerDashboardViewProps {
  properties: Property[];
  tenants: Tenant[];
  owners: Owner[];
  contracts: LeaseContract[];
  payments: Payment[];
  maintenance: MaintenanceTicket[];
  reminders: RecoveryReminder[];
  onOpenNewContract: () => void;
  onOpenNewTenant: () => void;
  onOpenNewReminder: () => void;
  setActiveTab: (tab: ActiveTab) => void;
}

export function ManagerDashboardView({
  properties,
  tenants,
  owners,
  contracts,
  payments,
  maintenance,
  reminders,
  onOpenNewContract,
  onOpenNewTenant,
  onOpenNewReminder,
  setActiveTab,
}: ManagerDashboardViewProps) {
  const totalBiens = properties.length;
  const occupiedBiens = properties.filter((p) => p.statut === 'Occupé').length;
  const vacantBiens = properties.filter((p) => p.statut === 'Vacant').length;
  const occupancyRate = totalBiens > 0 ? Math.round((occupiedBiens / totalBiens) * 100) : 0;

  const totalMonthlyPotential = properties.reduce((sum, p) => sum + p.loyerBase + p.charges, 0);
  const totalLateTenants = tenants.filter((t) => t.statut === 'Retard' || t.statut === 'Impayé').length;
  const totalActiveRepairs = maintenance.filter((m) => m.statut !== 'Terminé').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#111C2E] p-6 rounded-2xl border border-amber-500/20 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Espace Gestionnaire Immobilier
            </span>
            <span className="text-xs text-slate-400">• Gérance Locative & Recouvrement</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Pilotage du Parc Locatif</h1>
          <p className="text-xs text-slate-400">
            Suivi des baux, signatures de contrats, taux d'occupation, relances locataires et gestion des prestataires.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenNewContract}
            className="px-4 py-2.5 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>+ Rédiger un Bail</span>
          </button>
          <button
            onClick={onOpenNewReminder}
            className="px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Envoyer Relance Recouvrement</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Taux d'Occupation */}
        <div className="bg-[#111C2E] p-5 rounded-2xl border border-blue-500/20 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Taux d'Occupation</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{occupancyRate}%</div>
            <div className="text-xs text-slate-400 mt-1">
              {occupiedBiens} occupés / {vacantBiens} vacants ({totalBiens} lots au total)
            </div>
          </div>
        </div>

        {/* Potentiel Locatif Mensuel */}
        <div className="bg-[#111C2E] p-5 rounded-2xl border border-[#C9A96E]/20 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#E8D5B0] uppercase tracking-wider">Valeur Locative / Mois</span>
            <div className="w-8 h-8 rounded-lg bg-[#C9A96E]/10 text-[#C9A96E] flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{formatCurrencyFCFA(totalMonthlyPotential)}</div>
            <div className="text-xs text-slate-400 mt-1">Portefeuille sous gestion active</div>
          </div>
        </div>

        {/* Dossiers en Recouvrement */}
        <div className="bg-[#111C2E] p-5 rounded-2xl border border-rose-500/20 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Dossiers Impayés</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-400">{totalLateTenants} locataires</div>
            <div className="text-xs text-rose-400/80 mt-1">
              <button onClick={() => setActiveTab('recovery')} className="hover:underline">
                Ouvrir module de recouvrement →
              </button>
            </div>
          </div>
        </div>

        {/* Pannes en Cours */}
        <div className="bg-[#111C2E] p-5 rounded-2xl border border-amber-500/20 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Travaux en Cours</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-400">{totalActiveRepairs} chantiers</div>
            <div className="text-xs text-slate-400 mt-1">Devis & interventions prestataires</div>
          </div>
        </div>
      </div>

      {/* Action Blocks: Quick Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setActiveTab('properties')}
          className="p-5 bg-[#111C2E] hover:bg-[#16243A] rounded-2xl border border-white/5 text-left transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Home className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 group-hover:text-white">Gérer →</span>
          </div>
          <h3 className="font-bold text-white text-base mt-3">Parc Immobilier & Lots</h3>
          <p className="text-xs text-slate-400 mt-1">{totalBiens} biens répertoriés avec fiches techniques.</p>
        </button>

        <button
          onClick={() => setActiveTab('contracts')}
          className="p-5 bg-[#111C2E] hover:bg-[#16243A] rounded-2xl border border-white/5 text-left transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 group-hover:text-white">Gérer →</span>
          </div>
          <h3 className="font-bold text-white text-base mt-3">Baux & Contrats Légaux</h3>
          <p className="text-xs text-slate-400 mt-1">{contracts.length} contrats rédigés et signatures enregistrées.</p>
        </button>

        <button
          onClick={() => setActiveTab('recovery')}
          className="p-5 bg-[#111C2E] hover:bg-[#16243A] rounded-2xl border border-white/5 text-left transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 group-hover:text-white">Gérer →</span>
          </div>
          <h3 className="font-bold text-white text-base mt-3">Relances & Recouvrement</h3>
          <p className="text-xs text-slate-400 mt-1">Automatisation SMS/WhatsApp & Mises en demeure.</p>
        </button>
      </div>

      {/* Recent Contracts & Tenant List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#111C2E] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#C9A96E]" />
              Derniers Contrats Signés
            </h3>
            <button onClick={() => setActiveTab('contracts')} className="text-xs text-[#C9A96E] hover:underline">
              Tous les contrats
            </button>
          </div>

          <div className="divide-y divide-white/5">
            {contracts.slice(0, 5).map((ctr) => (
              <div key={ctr.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white">{ctr.locataireNom}</div>
                  <div className="text-slate-400 text-[11px]">{ctr.bienNom} • Réf: {ctr.ref}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#E8D5B0]">{formatCurrencyFCFA(ctr.loyerMensuel || ctr.loyerBase)}/m</div>
                  <span className="text-[10px] text-emerald-400 font-bold">{ctr.statut}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#111C2E] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Locataires Nécessitant Relance Immédiate
            </h3>
            <button onClick={() => setActiveTab('recovery')} className="text-xs text-rose-400 hover:underline">
              Module Recouvrement
            </button>
          </div>

          <div className="divide-y divide-white/5">
            {tenants.filter((t) => t.statut === 'Retard' || t.statut === 'Impayé').slice(0, 5).map((t) => (
              <div key={t.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white">{t.prenom} {t.nom}</div>
                  <div className="text-slate-400 text-[11px]">{t.bienNom} • {t.telephone}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-rose-400">{formatCurrencyFCFA(t.arrieresCumules)}</div>
                  <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full font-bold">
                    {t.joursRetard}j de retard
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
