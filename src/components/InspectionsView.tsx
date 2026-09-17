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

  const filtered = inspections.filter((i) => {
    if (search) {
      const q = search.toLowerCase();
      return (
        i.locataireNom.toLowerCase().includes(q) ||
        i.bienNom.toLowerCase().includes(q) ||
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
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-[#1E2E45]/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-white text-xs">{item.type}</div>
                    <div className="text-[10px] text-[#A8B4C4]">{formatDate(item.date)}</div>
                  </td>

                  <td className="py-3 px-3 font-medium text-white max-w-[180px] truncate">
                    {item.bienNom}
                  </td>

                  <td className="py-3 px-3 font-bold text-[#E8D5B0]">{item.locataireNom}</td>

                  <td className="py-3 px-3 text-[#A8B4C4]">{item.agentNom}</td>

                  <td className="py-3 px-3 text-right font-mono font-bold text-rose-400">
                    {item.coutDegradations > 0 ? `${formatNumber(item.coutDegradations)} FCFA` : '0 FCFA (Impeccable)'}
                  </td>

                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                    {item.montantRestitueCaution ? `${formatNumber(item.montantRestitueCaution)} FCFA` : '—'}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setSelectedInspectionForPrint(item)}
                      className="px-2.5 py-1 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#C9A96E] font-medium text-[11px] border border-[#C9A96E]/20 transition-all flex items-center gap-1 mx-auto"
                    >
                      <Printer className="w-3 h-3" /> Imprimer PV
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Print État des Lieux (Doc Page 6) */}
      {selectedInspectionForPrint && (
        <InspectionPrintModal
          inspection={selectedInspectionForPrint}
          onClose={() => setSelectedInspectionForPrint(null)}
        />
      )}
    </div>
  );
};
