import React, { useState } from 'react';
import {
  CalendarDays,
  Search,
  Filter,
  Eye,
  WalletCards,
  FileSignature,
  User,
  UserCheck,
  Wrench,
  ClipboardList,
  Receipt,
  BellRing,
  TrendingUp,
  Clock,
  X,
  ArrowRight,
  Download,
} from 'lucide-react';
import { ActivityLog, UserAccount } from '../types';
import { formatCurrency, formatNumber, formatDate } from '../lib/utils';

interface ActivityLogViewProps {
  activities: ActivityLog[];
  currentUser?: UserAccount;
}

const ACTIVITY_CONFIG: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  PAYMENT: { label: 'Paiement', icon: WalletCards, color: 'text-[#C9A96E]', bgColor: 'bg-[#C9A96E]/20' },
  CONTRACT: { label: 'Contrat', icon: FileSignature, color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  TENANT_CREATED: { label: 'Nouveau Locataire', icon: User, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  TENANT_EXIT: { label: 'Sortie Locataire', icon: User, color: 'text-rose-400', bgColor: 'bg-rose-500/20' },
  MAINTENANCE: { label: 'Travaux', icon: Wrench, color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  INSPECTION: { label: 'État des Lieux', icon: ClipboardList, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
  DISBURSEMENT: { label: 'Reversement', icon: TrendingUp, color: 'text-sky-400', bgColor: 'bg-sky-500/20' },
  CASH_MOVEMENT: { label: 'Mouvement Caisse', icon: Receipt, color: 'text-teal-400', bgColor: 'bg-teal-500/20' },
  REMINDER: { label: 'Relance', icon: BellRing, color: 'text-indigo-400', bgColor: 'bg-indigo-500/20' },
  OTHER: { label: 'Autre', icon: Clock, color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
};

export const ActivityLogView: React.FC<ActivityLogViewProps> = ({ activities, currentUser }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRangeMode, setDateRangeMode] = useState<'day' | 'week' | 'month' | 'all'>('day');
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);

  // ============================================================
  // FILTRAGE PAR DATE
  // ============================================================
  const getDateRange = () => {
    if (dateRangeMode === 'all') return null;
    const ref = new Date(selectedDate);
    const start = new Date(ref);
    const end = new Date(ref);

    if (dateRangeMode === 'day') {
      // selectedDate → selectedDate
    } else if (dateRangeMode === 'week') {
      start.setDate(ref.getDate() - ref.getDay());
      end.setDate(start.getDate() + 6);
    } else if (dateRangeMode === 'month') {
      start.setDate(1);
      end.setMonth(ref.getMonth() + 1, 0);
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  };

  const filteredActivities = activities.filter((a) => {
    // Filtre par date
    const range = getDateRange();
    if (range) {
      if (a.activityDate < range.start || a.activityDate > range.end) return false;
    }

    // Filtre par type
    if (typeFilter !== 'all' && a.activityType !== typeFilter) return false;

    // Recherche
    if (search) {
      const q = search.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q) ||
        (a.userNom || '').toLowerCase().includes(q) ||
        (a.entityRef || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Tri par date décroissante + heure
  const sortedActivities = [...filteredActivities].sort((a, b) => {
    if (a.activityDate !== b.activityDate) return b.activityDate.localeCompare(a.activityDate);
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  // ============================================================
  // STATS
  // ============================================================
  const statsByType: Record<string, number> = {};
  filteredActivities.forEach((a) => {
    statsByType[a.activityType] = (statsByType[a.activityType] || 0) + 1;
  });

  const totalMontant = filteredActivities
    .filter((a) => a.montant && a.montant > 0)
    .reduce((sum, a) => sum + (a.montant || 0), 0);

  // ============================================================
  // EXPORT CSV
  // ============================================================
  const handleExportCSV = () => {
    const headers = ['Date', 'Heure', 'Type', 'Titre', 'Description', 'Utilisateur', 'Montant'];
    const rows = sortedActivities.map((a) => [
      a.activityDate,
      a.activityHour || '',
      ACTIVITY_CONFIG[a.activityType]?.label || a.activityType,
      a.title,
      a.description || '',
      a.userNom || '',
      a.montant || 0,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(',')].concat(rows.map((r) => r.map((c) => `"${c}"`).join(','))).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `activites_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ============================================================
  // RACCOURCIS DATES
  // ============================================================
  const setQuickDate = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#C9A96E]/15 text-[#C9A96E] flex items-center justify-center">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <div className="text-base font-bold text-white">
              Journal des Activités & Recherche par Date
            </div>
            <div className="text-xs text-[#A8B4C4] mt-0.5">
              {filteredActivities.length} activité(s) · Total montants : {formatNumber(totalMontant)} FCFA
            </div>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-3.5 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] border border-[#C9A96E]/30 text-xs font-semibold text-[#E8D5B0] transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exporter CSV</span>
        </button>
      </div>

      {/* Filtres par date */}
      <div className="p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#C9A96E]" />
            <span>Recherche par date</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setQuickDate(0)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedDate === new Date().toISOString().split('T')[0] && dateRangeMode === 'day'
                  ? 'bg-[#C9A96E] text-[#0F1B2D]'
                  : 'bg-[#1E2E45] text-[#A8B4C4] hover:text-white'
              }`}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => setQuickDate(-1)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] && dateRangeMode === 'day'
                  ? 'bg-[#C9A96E] text-[#0F1B2D]'
                  : 'bg-[#1E2E45] text-[#A8B4C4] hover:text-white'
              }`}
            >
              Hier
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Sélecteur de date */}
          <div>
            <label className="text-[11px] font-bold text-[#A8B4C4] uppercase block mb-1">
              Date de référence
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white text-sm focus:outline-none focus:border-[#C9A96E]"
            />
          </div>

          {/* Mode de période */}
          <div>
            <label className="text-[11px] font-bold text-[#A8B4C4] uppercase block mb-1">
              Période
            </label>
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20">
              {[
                { id: 'day' as const, label: 'Jour' },
                { id: 'week' as const, label: 'Sem.' },
                { id: 'month' as const, label: 'Mois' },
                { id: 'all' as const, label: 'Tout' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setDateRangeMode(m.id)}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    dateRangeMode === m.id
                      ? 'bg-[#C9A96E] text-[#0F1B2D]'
                      : 'text-[#A8B4C4] hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recherche */}
          <div>
            <label className="text-[11px] font-bold text-[#A8B4C4] uppercase block mb-1">
              Recherche
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#6B7C94] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white text-sm focus:outline-none focus:border-[#C9A96E]"
              />
            </div>
          </div>
        </div>

        {/* Filtres par type */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-white/5">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              typeFilter === 'all'
                ? 'bg-[#C9A96E] text-[#0F1B2D] font-bold'
                : 'bg-[#1E2E45] text-[#A8B4C4] hover:text-white'
            }`}
          >
            Tous ({filteredActivities.length})
          </button>

          {Object.entries(statsByType).map(([type, count]) => {
            const cfg = ACTIVITY_CONFIG[type] || ACTIVITY_CONFIG.OTHER;
            const Icon = cfg.icon;
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  typeFilter === type
                    ? 'bg-[#C9A96E] text-[#0F1B2D] font-bold'
                    : 'bg-[#1E2E45] text-[#A8B4C4] hover:text-white'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{cfg.label} ({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-[#C9A96E]/15 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#C9A96E]" />
            Chronologie des Activités
          </h2>
          <span className="text-xs text-[#A8B4C4]">
            {dateRangeMode === 'day' && `Journée du ${formatDate(selectedDate)}`}
            {dateRangeMode === 'week' && `Semaine du ${formatDate(selectedDate)}`}
            {dateRangeMode === 'month' && `Mois de ${formatDate(selectedDate)}`}
            {dateRangeMode === 'all' && 'Toutes les activités'}
          </span>
        </div>

        <div className="divide-y divide-[#C9A96E]/10 max-h-[600px] overflow-y-auto">
          {sortedActivities.length === 0 ? (
            <div className="py-16 text-center text-[#6B7C94]">
              <CalendarDays className="w-10 h-10 mx-auto text-[#6B7C94]/50 mb-3" />
              <p className="text-sm font-semibold text-white">Aucune activité trouvée</p>
              <p className="text-xs text-[#6B7C94] mt-1">
                Aucune action n'a été enregistrée pour cette période.
              </p>
            </div>
          ) : (
            sortedActivities.map((a) => {
              const cfg = ACTIVITY_CONFIG[a.activityType] || ACTIVITY_CONFIG.OTHER;
              const Icon = cfg.icon;
              return (
                <div
                  key={a.id}
                  className="p-4 hover:bg-[#1E2E45]/40 transition-colors cursor-pointer"
                  onClick={() => setSelectedActivity(a)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl ${cfg.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${cfg.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${cfg.bgColor} ${cfg.color} uppercase`}>
                              {cfg.label}
                            </span>
                            <span className="text-xs font-mono text-[#6B7C94]">
                              {a.activityHour || ''}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-white mt-1">
                            {a.title}
                          </div>
                          {a.description && (
                            <div className="text-xs text-[#A8B4C4] mt-0.5 truncate">
                              {a.description}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-[#6B7C94]">
                            {a.userNom && (
                              <span className="flex items-center gap-1">
                                <UserCheck className="w-3 h-3" />
                                {a.userNom}
                              </span>
                            )}
                            {a.entityRef && (
                              <span className="font-mono">{a.entityRef}</span>
                            )}
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          {a.montant && a.montant > 0 ? (
                            <div className="text-sm font-bold font-mono text-[#C9A96E]">
                              {formatNumber(a.montant)} <span className="text-[10px]">FCFA</span>
                            </div>
                          ) : null}
                          <div className="text-[10px] text-[#6B7C94] mt-1">
                            {formatDate(a.activityDate)}
                          </div>
                          <ArrowRight className="w-4 h-4 text-[#6B7C94] mt-2 ml-auto" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal détail */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#162133] border border-[#C9A96E]/40 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-4 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80">
              {(() => {
                const cfg = ACTIVITY_CONFIG[selectedActivity.activityType] || ACTIVITY_CONFIG.OTHER;
                const Icon = cfg.icon;
                return (
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-xl ${cfg.bgColor} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${cfg.color}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{cfg.label}</h3>
                      <p className="text-[10px] text-[#A8B4C4] font-mono">
                        {formatDate(selectedActivity.activityDate)} {selectedActivity.activityHour}
                      </p>
                    </div>
                  </div>
                );
              })()}
              <button
                onClick={() => setSelectedActivity(null)}
                className="p-1.5 rounded-lg text-[#A8B4C4] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <div className="text-[10px] text-[#6B7C94] uppercase font-bold mb-1">Titre</div>
                <div className="text-white font-bold">{selectedActivity.title}</div>
              </div>

              {selectedActivity.description && (
                <div>
                  <div className="text-[10px] text-[#6B7C94] uppercase font-bold mb-1">Description</div>
                  <div className="text-[#A8B4C4] leading-relaxed">{selectedActivity.description}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {selectedActivity.userNom && (
                  <div className="p-3 bg-[#1E2E45]/40 rounded-xl border border-[#C9A96E]/10">
                    <div className="text-[10px] text-[#6B7C94] uppercase font-bold mb-1">Utilisateur</div>
                    <div className="text-white font-semibold">{selectedActivity.userNom}</div>
                  </div>
                )}
                {selectedActivity.entityRef && (
                  <div className="p-3 bg-[#1E2E45]/40 rounded-xl border border-[#C9A96E]/10">
                    <div className="text-[10px] text-[#6B7C94] uppercase font-bold mb-1">Référence</div>
                    <div className="text-white font-mono">{selectedActivity.entityRef}</div>
                  </div>
                )}
                {selectedActivity.montant !== undefined && selectedActivity.montant > 0 && (
                  <div className="p-3 bg-[#C9A96E]/10 rounded-xl border border-[#C9A96E]/30 col-span-2">
                    <div className="text-[10px] text-[#C9A96E] uppercase font-bold mb-1">Montant</div>
                    <div className="text-[#E8D5B0] font-bold font-mono text-lg">
                      {formatCurrency(selectedActivity.montant)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-[#C9A96E]/20 bg-[#1E2E45]/40 flex justify-end">
              <button
                onClick={() => setSelectedActivity(null)}
                className="px-4 py-2 rounded-xl bg-[#0F1B2D] text-[#A8B4C4] hover:text-white text-xs font-semibold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};