import React from 'react';
import { ClipboardCheck, Printer, X } from 'lucide-react';
import { Inspection } from '../types';
import { formatCurrency, formatNumber, formatDate } from '../lib/utils';

interface InspectionPrintModalProps {
  inspection: Inspection;
  onClose: () => void;
}

export const InspectionPrintModal: React.FC<InspectionPrintModalProps> = ({ inspection, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-3xl my-8 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80 no-print">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <ClipboardCheck className="w-5 h-5 text-[#C9A96E]" />
            <span>Procès-Verbal d'État des Lieux — {inspection.type}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#A8B4C4] hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-8 bg-white text-neutral-900 rounded-b-3xl font-sans text-xs print-container leading-relaxed">
          <div className="text-center border-b-2 border-neutral-900 pb-3 mb-4">
            <div className="text-xs font-bold uppercase tracking-widest text-neutral-700">FITAL-IMMO SERVICES SARL</div>
            <h2 className="text-xl font-black uppercase text-neutral-900 mt-1">
              ÉTAT DES LIEUX CONTRADICTOIRE D'{inspection.type.toUpperCase()}
            </h2>
            <div className="text-[10px] text-neutral-500 font-semibold uppercase">
              Établi en application de la législation en vigueur · Date : {formatDate(inspection.date)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-3 bg-neutral-50 rounded-xl border border-neutral-300 mb-4">
            <div>
              <span className="text-neutral-500 font-bold uppercase text-[10px]">LOCAL CONCERNÉ : </span>
              <div className="text-sm font-bold text-neutral-900">{inspection.bienNom}</div>
            </div>
            <div>
              <span className="text-neutral-500 font-bold uppercase text-[10px]">LOCATAIRE CONCERNÉ : </span>
              <div className="text-sm font-bold text-neutral-900">{inspection.locataireNom}</div>
            </div>
          </div>

          {/* Elements Table */}
          <table className="w-full text-left text-xs mb-4 border-collapse">
            <thead>
              <tr className="bg-neutral-900 text-white font-bold text-[10px] uppercase">
                <th className="py-2 px-3">Éléments & Pièces</th>
                <th className="py-2 px-3">État Constaté</th>
                <th className="py-2 px-3">Observations & Dégradations</th>
                <th className="py-2 px-3 text-right">Chiffrage Réparation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 border-b border-neutral-300">
              {inspection.elements.map((el, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}>
                  <td className="py-2 px-3 font-semibold text-neutral-900">{el.nom}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      el.etat === 'Très bon état' ? 'bg-emerald-100 text-emerald-800' :
                      el.etat === 'Bon état' ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {el.etat}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-neutral-600">{el.commentaire}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-neutral-900">
                    {el.coutReparationEstime > 0 ? `${formatNumber(el.coutReparationEstime)} FCFA` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total deduction */}
          <div className="p-3 rounded-lg bg-neutral-100 border border-neutral-300 flex justify-between items-center text-xs mb-6">
            <div>
              <strong>Total retenues réparations :</strong>{' '}
              <span className="text-rose-700 font-bold">{formatCurrency(inspection.coutDegradations)}</span>
            </div>
            <div>
              <strong>Caution nette à restituer :</strong>{' '}
              <span className="text-emerald-700 font-bold font-mono text-sm">
                {formatCurrency(inspection.montantRestitueCaution || 0)}
              </span>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-4 border-t border-neutral-300 text-xs">
            <div>
              <div className="font-bold text-neutral-800">Signature du Locataire :</div>
              <div className="h-14 border border-dashed border-neutral-400 rounded-lg mt-1 p-1">
                <span className="text-[10px] text-neutral-400 italic">Mention "Lu et approuvé sans réserve"</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-neutral-800">Pour l'Agence FITAL-IMMO :</div>
              <div className="h-14 border border-dashed border-neutral-400 rounded-lg mt-1 p-1 flex items-center justify-center">
                <span className="text-[10px] font-black text-amber-800 uppercase">★ VISA DE CONFORMITÉ ★</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
