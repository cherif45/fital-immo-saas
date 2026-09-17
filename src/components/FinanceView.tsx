import React, { useState } from 'react';
import {
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Search,
  Filter,
  Printer,
  Download,
  Wallet,
  Receipt,
  CheckCircle2,
  Building,
} from 'lucide-react';
import { OwnerDisbursement, Payment, Owner, Property } from '../types';
import { formatCurrency, formatNumber, formatDate, nombreEnLettres, exportToCSV } from '../lib/utils';

interface FinanceViewProps {
  disbursements: OwnerDisbursement[];
  payments: Payment[];
  owners: Owner[];
  properties: Property[];
  onAddDisbursement: (disbursement: OwnerDisbursement) => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  disbursements,
  payments,
  owners,
  properties,
  onAddDisbursement,
}) => {
  const [selectedDisbursementForPrint, setSelectedDisbursementForPrint] = useState<OwnerDisbursement | null>(null);

  // Financial aggregates
  const totalEncaissements = payments
    .filter((p) => p.statut === 'Payé')
    .reduce((sum, p) => sum + p.montantPaye, 0);

  const totalReversementsProprietaires = disbursements
    .filter((d) => d.statut === 'Effectué')
    .reduce((sum, d) => sum + d.montantNet, 0);

  const totalCommissionsAgence = disbursements
    .filter((d) => d.statut === 'Effectué')
    .reduce((sum, d) => sum + d.commissionAgence + d.tvaCommission, 0);

  const soldeCaisse = totalEncaissements - totalReversementsProprietaires;

  return (
    <div className="space-y-6">
      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/20">
          <div className="text-[11px] text-[#A8B4C4] font-medium uppercase tracking-wider">
            Total Encaissé (Brut)
          </div>
          <div className="text-xl font-bold text-white mt-1">
            {formatNumber(totalEncaissements)}{' '}
            <span className="text-xs font-normal text-[#C9A96E]">FCFA</span>
          </div>
          <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> Tous lots confondus
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#162133] border border-amber-500/20">
          <div className="text-[11px] text-amber-300 font-medium uppercase tracking-wider">
            Commissions Agence FITAL
          </div>
          <div className="text-xl font-bold text-[#E8D5B0] mt-1">
            {formatNumber(totalCommissionsAgence)}{' '}
            <span className="text-xs font-normal text-amber-400">FCFA</span>
          </div>
          <div className="text-[10px] text-[#A8B4C4] mt-1">Honoraires de gestion perçus</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#162133] border border-sky-500/20">
          <div className="text-[11px] text-sky-400 font-medium uppercase tracking-wider">
            Reversé aux Propriétaires
          </div>
          <div className="text-xl font-bold text-sky-300 mt-1">
            {formatNumber(totalReversementsProprietaires)}{' '}
            <span className="text-xs font-normal text-sky-400">FCFA</span>
          </div>
          <div className="text-[10px] text-[#6B7C94] mt-1">Virements bancaires & chèques</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#162133] border border-emerald-500/20">
          <div className="text-[11px] text-emerald-400 font-medium uppercase tracking-wider">
            Solde Trésorerie / Caisse
          </div>
          <div className="text-xl font-bold text-emerald-300 mt-1">
            {formatNumber(soldeCaisse)}{' '}
            <span className="text-xs font-normal text-emerald-400">FCFA</span>
          </div>
          <div className="text-[10px] text-[#6B7C94] mt-1">Liquidités disponibles</div>
        </div>
      </div>

      {/* Disbursements Ledger (Décaissements Propriétaires) */}
      <div className="rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-2xl overflow-hidden">
        <div className="p-4 bg-[#1E2E45]/80 border-b border-[#C9A96E]/20 flex items-center justify-between">
          <div className="text-xs font-bold text-white uppercase tracking-wider">
            Registre des Décaissements & Reversements Propriétaires (Doc Page 18 & 21)
          </div>
          <span className="text-xs text-[#E8D5B0] font-mono">{disbursements.length} opérations enregistrées</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#1E2E45]/40 text-[#A8B4C4] font-semibold uppercase tracking-wider text-[10px] border-b border-[#C9A96E]/15">
                <th className="py-3 px-4">Réf & Date</th>
                <th className="py-3 px-3">Propriétaire Bénéficiaire</th>
                <th className="py-3 px-3">Période</th>
                <th className="py-3 px-3 text-right">Brut Encaissé</th>
                <th className="py-3 px-3 text-right text-amber-300">Commission Agence</th>
                <th className="py-3 px-3 text-right text-emerald-400">Net Reversé</th>
                <th className="py-3 px-3">Mode</th>
                <th className="py-3 px-3 text-center">Statut</th>
                <th className="py-3 px-4 text-center">Bon de Caisse</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9A96E]/10">
              {disbursements.map((d) => (
                <tr key={d.id} className="hover:bg-[#1E2E45]/40 transition-colors">
                  <td className="py-3 px-4 font-mono">
                    <div className="font-bold text-white text-[11px]">{d.ref}</div>
                    <div className="text-[10px] text-[#A8B4C4]">{formatDate(d.dateReversement)}</div>
                  </td>
                  <td className="py-3 px-3 font-bold text-white">{d.proprietaireNom}</td>
                  <td className="py-3 px-3 text-[#A8B4C4]">{d.periode}</td>
                  <td className="py-3 px-3 text-right font-mono font-medium text-white">
                    {formatNumber(d.montantBrut)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-amber-300">
                    - {formatNumber(d.commissionAgence + d.tvaCommission)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                    {formatNumber(d.montantNet)} FCFA
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#1E2E45] text-[#E8D5B0] font-medium border border-[#C9A96E]/15">
                      {d.modeReversement}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                      {d.statut}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setSelectedDisbursementForPrint(d)}
                      className="px-2.5 py-1 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#C9A96E] font-medium text-[11px] border border-[#C9A96E]/20 transition-all flex items-center gap-1 mx-auto"
                    >
                      <Printer className="w-3 h-3" /> Bon de Caisse
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Bon de Caisse / Reçu de Décaissement Imprimable (Doc Page 11 & 18) */}
      {selectedDisbursementForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-4 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80 no-print">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Receipt className="w-5 h-5 text-[#C9A96E]" />
                <span>Bon de Caisse & Reçu de Reversement Propriétaire</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimer
                </button>
                <button
                  onClick={() => setSelectedDisbursementForPrint(null)}
                  className="p-1 rounded-lg text-[#A8B4C4] hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-8 bg-white text-neutral-900 rounded-b-3xl font-sans text-xs print-container leading-relaxed">
              <div className="flex justify-between items-start border-b-2 border-neutral-900 pb-3 mb-4">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-wider text-neutral-900">
                    BON DE CAISSE / DÉCAISSEMENT
                  </h2>
                  <div className="text-[10px] text-neutral-600 font-semibold uppercase">
                    FITAL-IMMO GÉRANCE IMMOBILIÈRE
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-sm text-neutral-900">{selectedDisbursementForPrint.ref}</div>
                  <div className="text-[10px] text-neutral-500">Date : {formatDate(selectedDisbursementForPrint.dateReversement)}</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-300 space-y-2 mb-4">
                <div>
                  <span className="text-neutral-500">Bénéficiaire : </span>
                  <strong className="text-neutral-900 font-bold text-sm">{selectedDisbursementForPrint.proprietaireNom}</strong>
                </div>
                <div>
                  <span className="text-neutral-500">Motif du règlement : </span>
                  <strong className="text-neutral-900">Reversement des loyers encaissés — Période {selectedDisbursementForPrint.periode}</strong>
                </div>
                <div>
                  <span className="text-neutral-500">Mode de paiement : </span>
                  <strong className="text-neutral-900">{selectedDisbursementForPrint.modeReversement}</strong>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-neutral-100 border-2 border-neutral-900 mb-4 flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-neutral-700">MONTANT NET PAYÉ :</span>
                <span className="text-xl font-black font-mono text-neutral-900">
                  {formatNumber(selectedDisbursementForPrint.montantNet)} FCFA
                </span>
              </div>

              <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 mb-6 italic text-neutral-800">
                Somme arrêtée en toutes lettres à : <strong>{nombreEnLettres(selectedDisbursementForPrint.montantNet)}</strong>.
              </div>

              <div className="grid grid-cols-2 gap-8 pt-4 border-t border-neutral-300">
                <div>
                  <div className="font-bold text-neutral-700">Signature du Bénéficiaire :</div>
                  <div className="h-14 border border-dashed border-neutral-400 rounded-lg mt-1 p-1">
                    <span className="text-[10px] text-neutral-400 italic">Pour acquit</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-neutral-700">Le Caissier / Gérance :</div>
                  <div className="h-14 border border-dashed border-neutral-400 rounded-lg mt-1 p-1 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-amber-800 uppercase">★ PAYÉ EN CAISSE ★</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
