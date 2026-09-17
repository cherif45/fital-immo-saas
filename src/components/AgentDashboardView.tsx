import React, { useState } from 'react';
import { 
  Property, 
  Tenant, 
  PropertyInspection, 
  MaintenanceTicket, 
  RecoveryReminder,
  UserAccount,
  ActiveTab
} from '../types';
import { 
  ClipboardCheck, 
  Wrench, 
  Home, 
  Phone, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Eye, 
  PlusCircle, 
  FileText,
  MapPin
} from 'lucide-react';

interface AgentDashboardViewProps {
  currentUser: UserAccount;
  properties: Property[];
  tenants: Tenant[];
  inspections: PropertyInspection[];
  maintenance: MaintenanceTicket[];
  reminders: RecoveryReminder[];
  onOpenInspectionModal: () => void;
  onOpenMaintenanceModal: () => void;
  setActiveTab: (tab: ActiveTab) => void;
}

export function AgentDashboardView({
  currentUser,
  properties,
  tenants,
  inspections,
  maintenance,
  reminders,
  onOpenInspectionModal,
  onOpenMaintenanceModal,
  setActiveTab,
}: AgentDashboardViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'inspections' | 'maintenance' | 'visits'>('overview');

  const vacantProperties = properties.filter((p) => p.statut === 'Vacant');
  const pendingMaintenance = maintenance.filter((m) => m.statut !== 'Terminé');
  const urgentReminders = reminders.filter((r) => r.joursRetard > 10 || r.niveau.includes('Niveau 2') || r.niveau.includes('Niveau 3') || r.niveau.includes('Niveau 4'));

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#111C2E] p-6 rounded-2xl border border-teal-500/20 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={currentUser.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'}
            alt={currentUser.nom}
            className="w-14 h-14 rounded-2xl object-cover border-2 border-teal-500/30 shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/20 text-teal-400 border border-teal-500/30">
                Espace Agent de Terrain
              </span>
              <span className="text-xs text-slate-400">Secteur : Dakar & Banlieue</span>
            </div>
            <h1 className="text-xl font-bold text-white mt-1">
              Bonjour, {currentUser.prenom} {currentUser.nom}
            </h1>
            <p className="text-xs text-slate-400">
              Gestion opérationnelle des états des lieux, visites de relocation et suivi des pannes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenInspectionModal}
            className="px-4 py-2.5 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>+ Nouvel État des Lieux</span>
          </button>
        </div>
      </div>

      {/* KPI Cards for Field Ops */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Biens Vacants à Faire Visiter */}
        <div className="bg-[#111C2E] p-5 rounded-2xl border border-white/5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Logements Vacants</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Home className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{vacantProperties.length} biens</div>
            <div className="text-xs text-blue-400 mt-1">Disponibles pour visites prospect</div>
          </div>
        </div>

        {/* Interventions Maintenance */}
        <div className="bg-[#111C2E] p-5 rounded-2xl border border-white/5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pannes & Travaux</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{pendingMaintenance.length} en cours</div>
            <div className="text-xs text-amber-400 mt-1">Plomberie, serrurerie, étanchéité</div>
          </div>
        </div>

        {/* États des Lieux Réalisés */}
        <div className="bg-[#111C2E] p-5 rounded-2xl border border-white/5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">États des Lieux</span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <ClipboardCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{inspections.length} dossiers</div>
            <div className="text-xs text-teal-400 mt-1">Avec PV photos contradictoire</div>
          </div>
        </div>

        {/* Visites de Recouvrement Terrain */}
        <div className="bg-[#111C2E] p-5 rounded-2xl border border-white/5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Relances Terrain</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-400">{urgentReminders.length} sommations</div>
            <div className="text-xs text-slate-400 mt-1">Remise en main propre / Huissier</div>
          </div>
        </div>
      </div>

      {/* Two columns: Inspections & Maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Inspections */}
        <div className="bg-[#111C2E] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-teal-400" />
              Derniers États des Lieux Enregistrés
            </h3>
            <button onClick={onOpenInspectionModal} className="text-xs text-[#C9A96E] hover:underline">
              + Nouveau PV
            </button>
          </div>

          <div className="divide-y divide-white/5">
            {inspections.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                <ClipboardCheck className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p className="text-white font-medium">Aucun état des lieux enregistré</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Cliquez sur "+ Nouveau PV" pour rédiger un procès-verbal contradictoire.</p>
              </div>
            ) : (
              inspections.slice(0, 5).map((ins) => (
                <div key={ins.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">{ins.type} — {ins.bienNom}</div>
                    <div className="text-slate-400 text-[11px]">
                      Locataire : {ins.locataireNom} • Date : {ins.dateInspection || ins.date}
                    </div>
                    <div className="text-[10px] text-teal-400 font-mono mt-0.5">Clés remises : {ins.clefsRemises || 2}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    ins.statut === 'Signé' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {ins.statut}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Maintenance / Pannes signalées */}
        <div className="bg-[#111C2E] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400" />
              Pannes et Réparations en Cours
            </h3>
            <button onClick={onOpenMaintenanceModal} className="text-xs text-amber-400 hover:underline">
              + Déclarer panne
            </button>
          </div>

          <div className="divide-y divide-white/5">
            {pendingMaintenance.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/50 mb-2" />
                <p className="text-white font-medium">Aucune intervention en cours</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Toutes les pannes ont été traitées ou aucun ticket actif.</p>
              </div>
            ) : (
              pendingMaintenance.slice(0, 5).map((m) => (
                <div key={m.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">{m.titre}</div>
                    <div className="text-slate-400 text-[11px]">{m.bienNom} • Signalé le {m.dateSignalement}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Artisan : {m.artisanNom || m.technicienNom || m.prestataire || 'En attente devis'}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    m.priorite === 'Urgente' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {m.priorite}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
