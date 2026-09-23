import React, { useState } from 'react';
import {
  ClipboardCheck,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Calendar,
  Building,
  User,
  Download,
} from 'lucide-react';
import { Inspection, Tenant, Property } from '../types';
import { formatCurrency, formatNumber, formatDate, exportToCSV } from '../lib/utils';
import { InspectionPrintModal } from './InspectionPrintModal';

interface InspectionsViewProps {
  inspections: Inspection[];
  tenants: Tenant[];
  properties: Property[];
  onAddInspection: (inspection: Inspection) => void;
}

export const InspectionsView: React.FC<InspectionsViewProps> = ({
  inspections,
  tenants,
  properties,
  onAddInspection,
}) => {
  const [search, setSearch] = useState('');
  const [selectedInspectionForPrint, setSelectedInspectionForPrint] = useState<Inspection | null>(null);

  // ============================================================
  // 🔧 HELPERS : Récupérer les noms même si les champs sont vides
  // ============================================================
  const getBienNom = (i: Inspection): string => {
    if (i.bienNom && i.bienNom.trim() && i.bienNom !== 'Bien') return i.bienNom;
    const p = properties.find((x) => x.id === i.bienId);
    return p ? p.nom : 'Bien non référencé';
  };

  const getLocataireNom = (i: Inspection): string => {
    if (i.locataireNom && i.locataireNom.trim()) return i.locataireNom;
    const t = tenants.find((x) => x.id === i.locataireId);
    return t ? `${t.prenom} ${t.nom}` : 'Locataire non référencé';
  };

  const filtered = inspections.filter((i) => {
    if (search) {
      const q = search.toLowerCase();
      return (
        getLocataireNom(i).toLowerCase().includes(q) ||
        getBienNom(i).toLowerCase().includes(q) ||
        i.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/15 text-[#C9A96E] flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">États des Lieux d'Entrée & de Sortie</div>
            <div className="text-xs text-[#A8B4C4]">
              {inspections.length} procès-verbaux contradictoires · Inventaires, chiffrage des dégradations et retenues sur caution
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/15 flex items-center justify-between gap-4">
        <div className="text-xs font-medium text-slate-300">
          Liste des PV d'états des lieux certifiés
        </div>
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par locataire, bien..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-[#1E2E45]/80 text-[#A8B4C4] font-semibold uppercase tracking-wider text-[10px] border-b border-[#C9A96E]/20">
                <th className="py-3 px-4">Date & Type</th>
                <th className="py-3 px-3">Bien / Lot</th>
                <th className="py-3 px-3">Locataire</th>
                <th className="py-3 px-3">Agent Constat</th>
                <th className="py-3 px-3 text-right">Frais Dégradations</th>
                <th className="py-3 px-3 text-right text-emerald-400">Caution Restituée</th>
                <th className="py-3 px-4 text-center">Procès-Verbal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9A96E]/10">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B7C94]">
                    <ClipboardCheck className="w-8 h-8 mx-auto text-[#6B7C94]/50 mb-2" />
                    <p className="text-xs font-semibold text-white">Aucun état des lieux</p>
                    <p className="text-[11px] text-[#6B7C94] mt-1">Les PV apparaîtront ici après enregistrement.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-[#1E2E45]/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-xs">{item.type}</div>
                      <div className="text-[10px] text-[#A8B4C4]">{formatDate(item.date)}</div>
                    </td>

                    <td className="py-3 px-3 font-medium text-white max-w-[180px] truncate">
                      {getBienNom(item)}
                    </td>

                    <td className="py-3 px-3 font-bold text-[#E8D5B0]">{getLocataireNom(item)}</td>

                    <td className="py-3 px-3 text-[#A8B4C4]">{item.agentNom || item.inspecteurNom || 'Agent FITAL-IMMO'}</td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-400">
                      {(item.coutDegradations || item.totalDegats || 0) > 0
                        ? `${formatNumber(item.coutDegradations || item.totalDegats || 0)} FCFA`
                        : '0 FCFA (Impeccable)'}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                      {item.montantRestitueCaution ? `${formatNumber(item.montantRestitueCaution)} FCFA` : '—'}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedInspectionForPrint(item)}
                        className="px-2.5 py-1 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#C9A96E] font-medium text-[11px] border border-[#C9A96E]/20 transition-all flex items-center gap-1 mx-auto cursor-pointer"
                      >
                        <Printer className="w-3 h-3" /> Imprimer PV
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Print État des Lieux */}
      {selectedInspectionForPrint && (
        <InspectionPrintModal
          inspection={selectedInspectionForPrint}
          onClose={() => setSelectedInspectionForPrint(null)}
        />
      )}
    </div>
  );
};