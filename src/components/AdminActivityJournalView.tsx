import React, { useState } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  Printer,
  ShieldCheck,
  Calendar,
  User,
  Tag,
  FileText,
  Clock,
  ArrowUpDown
} from 'lucide-react';
import { AuditLog } from '../types';

interface AdminActivityJournalViewProps {
  auditLogs: AuditLog[];
  onTriggerAuditLog?: (action: string, module: string, details: string) => void;
}

export const AdminActivityJournalView: React.FC<AdminActivityJournalViewProps> = ({
  auditLogs,
  onTriggerAuditLog,
}) => {
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const modules = Array.from(new Set(auditLogs.map((l) => l.module).filter(Boolean)));

  const filteredLogs = auditLogs.filter((log) => {
    if (moduleFilter !== 'ALL' && log.module !== moduleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        log.userNom.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.entityRef?.toLowerCase().includes(q) ||
        log.module.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExportCSV = () => {
    const headers = ['ID', 'Date & Heure', 'Utilisateur', 'Module', 'Action', 'Référence', 'Détails'];
    const rows = filteredLogs.map((l) => [
      l.id,
      `"${l.date}"`,
      `"${l.userNom}"`,
      `"${l.module}"`,
      `"${l.action}"`,
      `"${l.entityRef || ''}"`,
      `"${l.details.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `journal_audit_fital_immo_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  const getActionBadgeColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('SUPPRESSION') || act.includes('ANNULATION') || act.includes('DELETE')) {
      return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    }
    if (act.includes('CREATION') || act.includes('AJOUT') || act.includes('INSERT') || act.includes('PAIEMENT')) {
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
    if (act.includes('CLOTURE') || act.includes('MODIFICATION') || act.includes('UPDATE')) {
      return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    }
    return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#C9A96E]/15 border border-[#C9A96E]/30 flex items-center justify-center text-[#C9A96E] shadow-md">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Journal d'Activité & Audit Système</h1>
              <span className="text-xs bg-[#C9A96E]/20 text-[#E8D5B0] px-2.5 py-0.5 rounded-full font-semibold border border-[#C9A96E]/30">
                {auditLogs.length} événements
              </span>
            </div>
            <p className="text-xs text-[#A8B4C4] mt-0.5">
              Historique immuable de toutes les actions, paiements, clôtures, mutations et connexions de la plateforme.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#E8D5B0] border border-[#C9A96E]/30 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Download className="w-4 h-4 text-[#C9A96E]" />
            <span>Exporter CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] text-white border border-[#C9A96E]/20 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4 text-[#A8B4C4]" />
            <span>Imprimer</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-[#1E2E45] p-1 rounded-xl border border-[#C9A96E]/15 text-xs">
            <button
              onClick={() => setModuleFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                moduleFilter === 'ALL' ? 'bg-[#C9A96E] text-[#0F1B2D] font-bold shadow-sm' : 'text-[#A8B4C4] hover:text-white'
              }`}
            >
              Tous ({auditLogs.length})
            </button>
            {modules.map((m) => (
              <button
                key={m}
                onClick={() => setModuleFilter(m)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  moduleFilter === m ? 'bg-[#C9A96E] text-[#0F1B2D] font-bold shadow-sm' : 'text-[#A8B4C4] hover:text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#6B7C94] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par utilisateur, action, réf..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#1E2E45] border border-[#C9A96E]/20 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C9A96E]"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#162133] rounded-2xl border border-[#C9A96E]/20 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#1E2E45]/80 border-b border-[#C9A96E]/20 text-[#A8B4C4] font-bold uppercase text-[10px]">
                <th className="py-3 px-4">Horodatage</th>
                <th className="py-3 px-4">Auteur / Compte</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Action Réalisée</th>
                <th className="py-3 px-4">Réf. Cible</th>
                <th className="py-3 px-4">Description des Modifications</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9A96E]/10">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#A8B4C4]">
                    Aucun événement correspondant aux critères de recherche.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-[#1E2E45]/50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 text-[#A8B4C4] font-mono whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-[#6B7C94]" />
                        <span>{log.date}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#C9A96E]" />
                        <span>{log.userNom}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-[#1E2E45] border border-[#C9A96E]/20 text-[#E8D5B0] font-mono text-[10px]">
                        {log.module}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#E8D5B0] whitespace-nowrap">
                      {log.entityRef || '—'}
                    </td>
                    <td className="py-3 px-4 text-[#A8B4C4] max-w-md truncate">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Log Detail */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#C9A96E]/20 pb-3">
              <div className="flex items-center gap-2 text-white font-bold">
                <History className="w-5 h-5 text-[#C9A96E]" />
                <span>Détails de l'Événement d'Audit</span>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-[#A8B4C4] hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/15 space-y-1">
                <div className="text-[10px] text-[#A8B4C4] uppercase">Action & Module</div>
                <div className="text-sm font-bold text-white">
                  {selectedLog.action} <span className="text-[#C9A96E]">({selectedLog.module})</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/15">
                  <div className="text-[10px] text-[#A8B4C4] uppercase">Auteur</div>
                  <div className="text-white font-semibold">{selectedLog.userNom}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/15">
                  <div className="text-[10px] text-[#A8B4C4] uppercase">Date & Heure</div>
                  <div className="text-white font-mono">{selectedLog.date}</div>
                </div>
              </div>

              {selectedLog.entityRef && (
                <div className="p-3 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/15">
                  <div className="text-[10px] text-[#A8B4C4] uppercase">Référence Concernée</div>
                  <div className="text-[#E8D5B0] font-mono font-bold">{selectedLog.entityRef}</div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/15 space-y-1">
                <div className="text-[10px] text-[#A8B4C4] uppercase">Détails de l'Opération</div>
                <p className="text-[#F0EDE8] leading-relaxed whitespace-pre-wrap">{selectedLog.details}</p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#C9A96E]/20">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-[#1E2E45] text-white hover:bg-[#2A3F5C] text-xs font-semibold"
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
