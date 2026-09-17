import React from 'react';
import { X, Printer, FileText, CheckCircle2, DollarSign } from 'lucide-react';
import { Owner, OwnerDisbursement } from '../types';
import { formatCurrencyFCFA, numberToWordsFrench } from '../lib/calculations/financial';

interface CashVoucherModalProps {
  owner: Owner;
  disbursement?: OwnerDisbursement;
  montantNet: number;
  loyersBruts: number;
  commission: number;
  travaux?: number;
  periode: string;
  onClose: () => void;
}

export function CashVoucherModal({
  owner,
  disbursement,
  montantNet,
  loyersBruts,
  commission,
  travaux = 0,
  periode,
  onClose,
}: CashVoucherModalProps) {
  const voucherNumber = disbursement?.ref || `BCA-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const dateStr = disbursement?.dateReversement || new Date().toISOString().split('T')[0];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white text-[#1E293B] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl p-8 space-y-6 animate-scale-in">
        {/* Header Voucher */}
        <div className="flex justify-between items-start border-b-2 border-gray-900 pb-4">
          <div>
            <div className="text-2xl font-black tracking-wider text-[#0F172A]">FITAL-IMMO</div>
            <div className="text-xs text-gray-500">Service Caisse & Reversements Bailleurs</div>
            <div className="text-xs text-gray-500">Dakar, Sénégal | Tél : +221 33 824 10 10</div>
          </div>
          <div className="text-right">
            <div className="inline-block px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 font-mono font-bold text-xs rounded-lg uppercase">
              BON DE CAISSE / REVERSEMENT
            </div>
            <div className="font-mono text-base font-bold text-gray-900 mt-1">{voucherNumber}</div>
            <div className="text-xs text-gray-500">Date : {dateStr}</div>
          </div>
        </div>

        {/* Bénéficiaire Box */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm space-y-1">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bénéficiaire (Bailleur Mandant) :</div>
          <div className="text-base font-bold text-gray-900">{owner.prenom} {owner.nom}</div>
          <div className="text-xs text-gray-600">Compte Bancaire : {owner.banque} - {owner.compteBancaire}</div>
          <div className="text-xs text-gray-600">Téléphone : {owner.telephone}</div>
          <div className="text-xs text-gray-600">Période concernée : <strong className="text-gray-900">{periode}</strong></div>
        </div>

        {/* Décomposition Financière */}
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-300 text-xs uppercase font-bold text-gray-500">
              <th className="py-2 text-left">Motif / Désignation</th>
              <th className="py-2 text-right">Montant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="py-2.5 text-gray-700">Total Loyers Bruts Encaissés ({periode})</td>
              <td className="py-2.5 text-right font-medium text-gray-900">{formatCurrencyFCFA(loyersBruts)}</td>
            </tr>
            <tr>
              <td className="py-2.5 text-red-600">Déduction Commission de Gérance ({owner.tauxCommission || 10}%)</td>
              <td className="py-2.5 text-right font-medium text-red-600">- {formatCurrencyFCFA(commission)}</td>
            </tr>
            {travaux > 0 && (
              <tr>
                <td className="py-2.5 text-red-600">Déduction Facture Travaux & Réparations</td>
                <td className="py-2.5 text-right font-medium text-red-600">- {formatCurrencyFCFA(travaux)}</td>
              </tr>
            )}
            <tr className="bg-emerald-50 font-bold text-base">
              <td className="py-3 px-2 text-emerald-950">NET À REVERSER AU BAILLEUR</td>
              <td className="py-3 px-2 text-right text-emerald-700 text-lg">
                {formatCurrencyFCFA(montantNet)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Somme en lettres */}
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950">
          <div>Arrêté le présent bon de caisse à la somme nette de :</div>
          <div className="text-sm font-bold mt-1 text-gray-900">
            {numberToWordsFrench(montantNet)}
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 pt-4 text-xs">
          <div className="border-t border-gray-300 pt-2 text-center">
            <div className="font-bold text-gray-700">Le Caissier / Service Comptable</div>
            <div className="text-gray-400 mt-8">[ Cachet & Signature FITAL-IMMO ]</div>
          </div>
          <div className="border-t border-gray-300 pt-2 text-center">
            <div className="font-bold text-gray-700">Le Bénéficiaire (Pour Acquit)</div>
            <div className="text-gray-400 mt-8">[ Signature du Propriétaire ]</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm cursor-pointer"
          >
            Fermer
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-[#0F172A] hover:bg-black text-white font-bold rounded-xl text-sm flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4" />
            Imprimer le Bon de Caisse
          </button>
        </div>
      </div>
    </div>
  );
}
