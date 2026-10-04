// ============================================================
// COMPOSANT — Calendrier d'activité quotidienne (amélioré)
// ============================================================
import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  AlertTriangle, X, Calendar as CalendarIcon,
  ArrowUpCircle, ArrowDownCircle, Wallet, Activity,
} from 'lucide-react';
import { getDailyActivity, DailyActivity } from '../lib/supabase/service';
import { formatNumber, formatDate } from '../lib/utils';

interface DashboardCalendarProps {
  agencyId?: string;
}

const MOIS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const JOURS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// Formatter compact : 1 500 000 → 1.5M, 125 000 → 125K
function formatCompact(n: number): string {
  if (n === 0) return '0';
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1000) return Math.round(n / 1000) + 'K';
  return String(n);
}

export const DashboardCalendar: React.FC<DashboardCalendarProps> = ({ agencyId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activity, setActivity] = useState<DailyActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DailyActivity | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  useEffect(() => {
    if (!agencyId) return;
    setLoading(true);
    getDailyActivity(agencyId, year, month)
      .then(setActivity)
      .finally(() => setLoading(false));
  }, [agencyId, year, month]);

  const goPrevMonth = () => setCurrentDate(new Date(year, month - 2, 1));
  const goNextMonth = () => setCurrentDate(new Date(year, month, 1));
  const goToday = () => setCurrentDate(new Date());

  // Grille
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayOfMonth = new Date(year, month, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    let firstWeekday = firstDayOfMonth.getDay();
    firstWeekday = firstWeekday === 0 ? 6 : firstWeekday - 1;

    const days: (DailyActivity | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) days.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const found = activity.find((a) => a.jour.startsWith(dayStr));
      days.push(
        found || {
          jour: dayStr,
          encaissements: 0,
          nb_paiements: 0,
          decaissements: 0,
          nb_decaissements: 0,
          solde: 0,
          nb_alertes: 0,
        }
      );
    }

    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [year, month, activity]);

  // Totaux du mois
  const totals = useMemo(() => {
    return activity.reduce(
      (acc, a) => ({
        encaissements: acc.encaissements + a.encaissements,
        decaissements: acc.decaissements + a.decaissements,
        nb_paiements: acc.nb_paiements + a.nb_paiements,
        nb_decaissements: acc.nb_decaissements + a.nb_decaissements,
        nb_alertes: acc.nb_alertes + a.nb_alertes,
      }),
      { encaissements: 0, decaissements: 0, nb_paiements: 0, nb_decaissements: 0, nb_alertes: 0 }
    );
  }, [activity]);

  // Jours actifs (avec activité)
  const activeDays = useMemo(() => {
    return calendarDays.filter((d): d is DailyActivity => 
      d !== null && (d.encaissements > 0 || d.decaissements > 0 || d.nb_alertes > 0)
    ).sort((a, b) => b.jour.localeCompare(a.jour));
  }, [calendarDays]);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      {/* KPIs du mois */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider">Encaissé</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-black font-mono text-emerald-300">
            {formatNumber(totals.encaissements)}
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-0.5">
            {totals.nb_paiements} paiement(s)
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/15 to-rose-500/5 border border-rose-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-rose-300/80 uppercase tracking-wider">Décaissé</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-lg font-black font-mono text-rose-300">
            {formatNumber(totals.decaissements)}
          </div>
          <div className="text-[10px] text-rose-400/80 mt-0.5">
            {totals.nb_decaissements} mouvement(s)
          </div>
        </div>

        <div className={`p-4 rounded-2xl bg-gradient-to-br border ${
          totals.encaissements - totals.decaissements >= 0
            ? 'from-amber-500/15 to-amber-500/5 border-amber-500/30'
            : 'from-rose-500/15 to-rose-500/5 border-rose-500/30'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[#C9A96E]/80 uppercase tracking-wider">Solde</span>
            <Wallet className="w-4 h-4 text-[#C9A96E]" />
          </div>
          <div className={`text-lg font-black font-mono ${
            totals.encaissements - totals.decaissements >= 0 ? 'text-[#C9A96E]' : 'text-rose-300'
          }`}>
            {formatNumber(totals.encaissements - totals.decaissements)}
          </div>
          <div className="text-[10px] text-[#C9A96E]/70 mt-0.5">du mois</div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-amber-300/80 uppercase tracking-wider">Alertes</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-black font-mono text-amber-300">
            {totals.nb_alertes}
          </div>
          <div className="text-[10px] text-amber-400/80 mt-0.5">
            impayés / retards
          </div>
        </div>
      </div>

      {/* Calendrier */}
      <div className="p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/15 text-[#C9A96E] flex items-center justify-center">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Calendrier d'Activité</h3>
              <p className="text-[11px] text-[#A8B4C4]">
                {activity.length > 0 ? `${activeDays.length} jour(s) actif(s)` : 'Chargement...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToday}
              className="px-3 py-1.5 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#C9A96E] text-xs font-bold transition-all cursor-pointer"
            >
              Aujourd'hui
            </button>
            <button
              onClick={goPrevMonth}
              className="p-1.5 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#A8B4C4] hover:text-white transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-sm font-bold text-white min-w-[140px] text-center">
              {MOIS_FR[month - 1]} {year}
            </div>
            <button
              onClick={goNextMonth}
              className="p-1.5 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#A8B4C4] hover:text-white transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Jours semaine */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {JOURS_FR.map((j) => (
            <div key={j} className="text-center text-[10px] font-bold text-[#6B7C94] uppercase py-1">
              {j}
            </div>
          ))}
        </div>

        {/* Grille jours */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((day, idx) => {
            if (!day) {
              return <div key={idx} className="aspect-square rounded-lg bg-[#0F1B2D]/30" />;
            }

            const dayNum = parseInt(day.jour.substring(8, 10));
            const hasEnc = day.encaissements > 0;
            const hasDec = day.decaissements > 0;
            const hasAlertes = day.nb_alertes > 0;
            const hasActivity = hasEnc || hasDec;
            const isToday = day.jour.startsWith(todayStr);
            const isHovered = hoveredDay === idx;

            return (
              <button
                key={idx}
                onClick={() => setSelectedDay(day)}
                onMouseEnter={() => setHoveredDay(idx)}
                onMouseLeave={() => setHoveredDay(null)}
                className={`
                  aspect-square p-1.5 rounded-lg border transition-all cursor-pointer text-left relative overflow-hidden
                  ${isToday ? 'ring-2 ring-[#C9A96E] ring-offset-2 ring-offset-[#162133]' : ''}
                  ${hasEnc && !hasDec ? 'bg-emerald-500/10 border-emerald-500/40 hover:bg-emerald-500/20' : ''}
                  ${hasDec && !hasEnc ? 'bg-rose-500/10 border-rose-500/40 hover:bg-rose-500/20' : ''}
                  ${hasEnc && hasDec ? 'bg-gradient-to-br from-emerald-500/10 to-rose-500/10 border-[#C9A96E]/40 hover:border-[#C9A96E]/60' : ''}
                  ${!hasActivity ? 'bg-[#0F1B2D]/50 border-[#2A3447]/40 hover:bg-[#1E2E45]/60' : ''}
                  ${hasAlertes && !hasActivity ? 'border-amber-500/50' : ''}
                `}
              >
                <div className="flex items-start justify-between">
                  <span className={`text-xs font-bold ${
                    isToday ? 'text-[#C9A96E]' :
                    hasActivity ? 'text-white' :
                    'text-[#6B7C94]'
                  }`}>
                    {dayNum}
                  </span>
                  {hasAlertes && (
                    <span className="px-1 rounded-full bg-amber-500/20 text-amber-300 text-[8px] font-bold">
                      {day.nb_alertes}
                    </span>
                  )}
                </div>

                {hasEnc && (
                  <div className="text-[9px] font-mono font-bold text-emerald-400 mt-1">
                    +{formatCompact(day.encaissements)}
                  </div>
                )}
                {hasDec && (
                  <div className="text-[9px] font-mono font-bold text-rose-400">
                    -{formatCompact(day.decaissements)}
                  </div>
                )}
                {day.nb_paiements > 0 && (
                  <div className="text-[8px] text-[#6B7C94] mt-0.5">
                    {day.nb_paiements} paiement{day.nb_paiements > 1 ? 's' : ''}
                  </div>
                )}

                {/* Indicateur au survol */}
                {isHovered && hasActivity && (
                  <div className="absolute inset-x-0 bottom-0 bg-[#C9A96E] text-[#0F1B2D] text-[7px] font-bold text-center py-0.5">
                    Voir détails
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Légende */}
        <div className="mt-4 pt-3 border-t border-[#C9A96E]/10 flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded bg-emerald-400"></div>
              <span className="text-[#A8B4C4]">Encaissements</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded bg-rose-400"></div>
              <span className="text-[#A8B4C4]">Décaissements</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded bg-amber-400"></div>
              <span className="text-[#A8B4C4]">Alertes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Jours actifs (liste) */}
      {activeDays.length > 0 && (
        <div className="p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-[#C9A96E]" />
            <h4 className="text-sm font-bold text-white">Jours actifs du mois</h4>
            <span className="text-[10px] text-[#6B7C94]">({activeDays.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
            {activeDays.map((day) => {
              const dateObj = new Date(day.jour);
              const dayNum = dateObj.getDate();
              const weekday = JOURS_FR[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1];
              const isToday = day.jour.startsWith(todayStr);

              return (
                <button
                  key={day.jour}
                  onClick={() => setSelectedDay(day)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isToday
                      ? 'bg-[#C9A96E]/10 border-[#C9A96E]/40'
                      : 'bg-[#0F1B2D]/50 border-[#2A3447]/40 hover:bg-[#1E2E45]/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs font-bold text-white">
                        {weekday} {dayNum}
                      </span>
                      {isToday && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-[#C9A96E]/20 text-[#C9A96E] text-[8px] font-bold">
                          Aujourd'hui
                        </span>
                      )}
                    </div>
                    {day.nb_alertes > 0 && (
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                    )}
                  </div>

                  <div className="space-y-1">
                    {day.encaissements > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <ArrowUpCircle className="w-3 h-3 text-emerald-400" />
                          <span className="text-[10px] text-[#A8B4C4]">
                            {day.nb_paiements} paiement(s)
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          +{formatNumber(day.encaissements)}
                        </span>
                      </div>
                    )}
                    {day.decaissements > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <ArrowDownCircle className="w-3 h-3 text-rose-400" />
                          <span className="text-[10px] text-[#A8B4C4]">
                            {day.nb_decaissements} décaissement(s)
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-rose-400">
                          -{formatNumber(day.decaissements)}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal détail */}
      {selectedDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="bg-[#162133] border border-[#C9A96E]/30 rounded-2xl w-full max-w-md p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#C9A96E]/20">
              <div>
                <h4 className="text-sm font-bold text-white">
                  {new Date(selectedDay.jour).toLocaleDateString('fr-FR', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </h4>
                <p className="text-[11px] text-[#A8B4C4]">Détails de la journée</p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-1.5 rounded-lg text-[#A8B4C4] hover:text-white hover:bg-[#1E2E45]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
                    <TrendingUp className="w-4 h-4" />
                    Encaissements
                  </div>
                  <span className="text-emerald-400 font-mono font-bold text-sm">
                    +{formatNumber(selectedDay.encaissements)} FCFA
                  </span>
                </div>
                <div className="text-[10px] text-emerald-300/70">
                  {selectedDay.nb_paiements} paiement(s)
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-rose-300 text-xs font-bold">
                    <TrendingDown className="w-4 h-4" />
                    Décaissements
                  </div>
                  <span className="text-rose-400 font-mono font-bold text-sm">
                    -{formatNumber(selectedDay.decaissements)} FCFA
                  </span>
                </div>
                <div className="text-[10px] text-rose-300/70">
                  {selectedDay.nb_decaissements} mouvement(s)
                </div>
              </div>

              {selectedDay.nb_alertes > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    {selectedDay.nb_alertes} alerte(s) d'impayés
                  </div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-[#1E2E45]/60 border border-[#C9A96E]/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#A8B4C4]">Solde du jour</span>
                  <span
                    className={`font-mono font-bold text-base ${
                      selectedDay.solde >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {selectedDay.solde >= 0 ? '+' : ''}
                    {formatNumber(selectedDay.solde)} FCFA
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedDay(null)}
              className="w-full mt-4 p-2.5 rounded-xl bg-[#1E4E] hover:bg-[#2A3F5C] text-[#A8B4C4] text-xs font-bold"
              style={{ backgroundColor: 'var(--bg-card-hover)' }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
