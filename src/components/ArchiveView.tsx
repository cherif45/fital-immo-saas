import React, { useState } from 'react';
import {
  Archive,
  Search,
  Filter,
  Eye,
  Download,
  Building2,
  User,
  Users,
  FileText,
  Layers,
  FileSignature,
  WalletCards,
  ClipboardList,
  Wrench,
  Receipt,
  Calendar,
  X,
  Printer,
} from 'lucide-react';
import { ArchiveRecord, UserAccount } from '../types';
import { formatCurrency, formatNumber, formatDate } from '../lib/utils';

interface ArchiveViewProps {
  archives: ArchiveRecord[];
  currentUser?: UserAccount;
}

const ENTITY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  tenant: { label: 'Locataire', icon: User, color: 'text-purple-400' },
  owner: { label: 'Propriétaire', icon: Users, color: 'text-blue-400' },
  property: { label: 'Bien', icon: Building2, color: 'text-emerald-400' },
  building: { label: 'Immeuble', icon: Building2, color: 'text-cyan-400' },
  unit: { label: 'Espace', icon: Layers, color: 'text-teal-400' },
  contract: { label: 'Contrat', icon: FileSignature, color: 'text-amber-400' },
  payment: { label: 'Paiement', icon: WalletCards, color: 'text-[#C9A96E]' },
  inspection: { label: 'État des Lieux', icon: ClipboardList, color: 'text-orange-400' },
  maintenance: { label: 'Travaux', icon: Wrench, color: 'text-rose-400' },
  invoice: { label: 'Facture', icon: Receipt, color: 'text-indigo-400' },
  bulletin: { label: 'Bulletin', icon: FileText, color: 'text-sky-400' },
};

export const ArchiveView: React.FC<ArchiveViewProps> = ({ archives, currentUser }) => {
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [selectedArchive, setSelectedArchive] = useState<ArchiveRecord | null>(null);

  const filteredArchives = archives.filter((a) => {
    if (entityFilter !== 'all' && a.entityType !== entityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (a.entityNom || '').toLowerCase().includes(q) ||
        (a.entityRef || '').toLowerCase().includes(q) ||
        (a.archivedBy || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Stats
  const statsByType: Record<string, number> = {};
  archives.forEach((a) => {
    statsByType[a.entityType] = (statsByType[a.entityType] || 0) + 1;
  });

  const renderArchiveData = (archive: ArchiveRecord) => {
    const data = archive.data || {};
    const keys = Object.keys(data).filter((k) => data[k] !== null && data[k] !== undefined && data[k] !== '');

    if (keys.length === 0) {
      return <div className="text-xs text-[#6B7C94] italic p-4 text-center">Aucune donnée détaillée</div>;
    }

    return (
      <div className="space-y-1.5 text-xs">
        {keys.slice(0, 30).map((k) => {
          const val = data[k];
          let displayVal: string;
          if (typeof val === 'object') displayVal = JSON.stringify(val);
          else displayVal = String(val);

          return (
            <div key={k} className="flex justify-between items-start gap-4 py-1.5 border-b border-white/5">
              <span className="text-[#6B7C94] font-mono text-[10px] uppercase flex-shrink-0">
                {k.replace(/_/g, ' ')}
              </span>
              <span className="text-white text-right truncate max-w-[300px]" title={displayVal}>
                {displayVal}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#C9A96E]/15 text-[#C9A96E] flex items-center justify-center">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <div className="text-base font-bold text-white">
              Archives & Historique Complet
            </div>
            <div className="text-xs text-[#A8B4C4] mt-0.5">
              {archives.length} élément(s) archivé(s) · Rien n'est jamais supprimé
            </div>
          </div>
        </div>
      </div>

      {/* Stats par type */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {Object.entries(statsByType).map(([type, count]) => {
          const cfg = ENTITY_CONFIG[type] || { label: type, icon: Archive, color: 'text-slate-400' };
          const Icon = cfg.icon;
          return (
            <button
              key={type}
              onClick={() => setEntityFilter(type)}
              className={`p-3 rounded-xl bg-[#162133] border transition-all text-left cursor-pointer ${
                entityFilter === type ? 'border-[#C9A96E] shadow-lg' : 'border-[#C9A96E]/20 hover:border-[#C9A96E]/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${cfg.color} mb-1.5`} />
              <div className="text-[10px] text-[#A8B4C4] uppercase font-semibold truncate">{cfg.label}</div>
              <div className="text-lg font-bold text-white font-mono">{count}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setEntityFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              entityFilter === 'all'
                ? 'bg-[#C9A96E] text-[#0F1B2D] font-bold'
                : 'bg-[#1E2E45] text-[#A8B4C4] hover:text-white'
            }`}
          >
            Tous ({archives.length})
          </button>

          {Object.entries(statsByType).map(([type, count]) => {
            const cfg = ENTITY_CONFIG[type] || { label: type };
            return (
              <button
                key={type}
                onClick={() => setEntityFilter(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  entityFilter === type
                    ? 'bg-[#C9A96E] text-[#0F1B2D] font-bold'
                    : 'bg-[#1E2E45] text-[#A8B4C4] hover:text-white'
                }`}
              >
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-[#6B7C94] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-xs text-white focus:outline-none focus:border-[#C9A96E]"
          />
        </div>
      </div>

      {/* Archives List */}
      <div className="rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-[#1E2E45]/80 text-[#A8B4C4] font-semibold uppercase tracking-wider text-[10px] border-b border-[#C9A96E]/20">
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-3">Référence</th>
                <th className="py-3 px-3">Nom</th>
                <th className="py-3 px-3">Archivé le</th>
                <th className="py-3 px-3">Par</th>
                <th className="py-3 px-3">Motif</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9A96E]/10">
              {filteredArchives.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B7C94]">
                    <Archive className="w-8 h-8 mx-auto text-[#6B7C94]/50 mb-2" />
                    <p className="text-xs font-semibold text-white">Aucune archive</p>
                    <p className="text-[11px] text-[#6B7C94] mt-1">
                      Les éléments archivés apparaîtront ici.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredArchives.map((a) => {
                  const cfg = ENTITY_CONFIG[a.entityType] || { label: a.entityType, icon: Archive, color: 'text-slate-400' };
                  const Icon = cfg.icon;
                  return (
                    <tr key={a.id} className="hover:bg-[#1E2E45]/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${cfg.color}`} />
                          <span className="text-white font-medium text-xs">{cfg.label}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[#C9A96E] text-[11px]">
                        {a.entityRef || '—'}
                      </td>
                      <td className="py-3 px-3 font-bold text-white truncate max-w-[200px]">
                        {a.entityNom || '—'}
                      </td>
                      <td className="py-3 px-3 text-[#A8B4C4]">
                        {a.archivedAt ? formatDate(a.archivedAt) : '—'}
                      </td>
                      <td className="py-3 px-3 text-[#A8B4C4]">{a.archivedBy || '—'}</td>
                      <td className="py-3 px-3 text-[#6B7C94] italic text-[11px] truncate max-w-[150px]">
                        {a.reason || '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedArchive(a)}
                          className="px-2.5 py-1 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#C9A96E] font-medium text-[11px] border border-[#C9A96E]/20 transition-all flex items-center gap-1 mx-auto cursor-pointer"
                          title="Voir les détails"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Voir</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal détail archive */}
      {selectedArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#162133] border border-[#C9A96E]/40 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-4 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80 sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                {(() => {
                  const cfg = ENTITY_CONFIG[selectedArchive.entityType] || { icon: Archive };
                  const Icon = cfg.icon;
                  return <Icon className="w-5 h-5 text-[#C9A96E]" />;
                })()}
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {selectedArchive.entityNom || selectedArchive.entityRef || 'Détail Archive'}
                  </h3>
                  <p className="text-[10px] text-[#A8B4C4] font-mono">
                    {selectedArchive.entityType} · {selectedArchive.entityRef}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedArchive(null)}
                className="p-1.5 rounded-lg text-[#A8B4C4] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#1E2E45]/40 rounded-xl border border-[#C9A96E]/10">
                  <div className="text-[10px] text-[#6B7C94] uppercase font-bold">Archivé le</div>
                  <div className="text-white font-bold mt-0.5">
                    {selectedArchive.archivedAt ? formatDate(selectedArchive.archivedAt) : '—'}
                  </div>
                </div>
                <div className="p-3 bg-[#1E2E45]/40 rounded-xl border border-[#C9A96E]/10">
                  <div className="text-[10px] text-[#6B7C94] uppercase font-bold">Archivé par</div>
                  <div className="text-white font-bold mt-0.5">
                    {selectedArchive.archivedBy || '—'}
                  </div>
                </div>
              </div>

              {selectedArchive.reason && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs">
                  <div className="text-[10px] text-amber-300 uppercase font-bold mb-1">Motif d'archivage</div>
                  <div className="text-amber-100">{selectedArchive.reason}</div>
                </div>
              )}

              <div>
                <div className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#C9A96E]" />
                  Données complètes
                </div>
                <div className="p-4 bg-[#0F1B2D] rounded-xl border border-white/5">
                  {renderArchiveData(selectedArchive)}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#C9A96E]/20 bg-[#1E2E45]/40 flex justify-end gap-2">
              <button
                onClick={() => setSelectedArchive(null)}
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