import React from 'react';
import {
  Printer,
  Download,
  X,
  ShieldCheck,
  CheckCircle2,
  QrCode,
  Building,
  User,
} from 'lucide-react';
import { Payment } from '../types';
import { formatCurrency, formatNumber, formatDate, nombreEnLettres } from '../lib/utils';

interface ReceiptModalProps {
  payment: Payment | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ payment, onClose }) => {
  if (!payment) return null;

  const montantLettres = nombreEnLettres(payment.montantPaye);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-2xl sm:rounded-3xl w-full max-w-3xl max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Top Actions (hidden on print) */}
        <div className="p-4 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80 no-print">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <ShieldCheck className="w-5 h-5 text-[#C9A96E]" />
            <span>Quittance Officielle de Loyer & Reçu de Paiement</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#162133] text-[#A8B4C4] hover:text-white hover:bg-[#2A3F5C] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="p-8 bg-white text-neutral-900 rounded-b-3xl font-sans print-container">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-neutral-900 pb-5 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-neutral-900 text-[#C9A96E] font-serif font-black text-xl flex items-center justify-center">
                  FI
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-neutral-900">
                    FITAL<span className="text-amber-700">-IMMO</span>
                  </h2>
                  <p className="text-[10px] font-semibold tracking-wider uppercase text-neutral-600">
                    Agence Immobilière & Gestion Locative Agréée
                  </p>
                </div>
              </div>
              <div className="text-[11px] text-neutral-600 mt-2 space-y-0.5">
                <p>Siège : SICAP Baobabs Immeuble N°500, Dakar — Sénégal</p>
                <p>Tél : +221 33 824 00 00 / +221 77 638 12 34</p>
                <p>NINEA : 002938421 2R3 · RCCM : SN.DKR.2021.B.14890</p>
              </div>
            </div>

            <div className="text-right">
              <div className="inline-block border-2 border-neutral-900 px-4 py-2 rounded-lg bg-neutral-50">
                <div className="text-xs uppercase font-bold tracking-wider text-neutral-600">
                  QUITTANCE DE LOYER N°
                </div>
                <div className="text-base font-mono font-black text-neutral-900 mt-0.5">
                  {payment.quittanceNumero || `QUITT-${payment.ref}`}
                </div>
              </div>
              <div className="text-xs text-neutral-600 mt-2 font-medium">
                Délivrée le : <strong>{formatDate(payment.datePaiement || new Date().toISOString())}</strong>
              </div>
            </div>
          </div>

          {/* Details Grid: Tenant & Property */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-neutral-50 border border-neutral-200 mb-6 text-xs">
            <div>
              <div className="font-bold text-neutral-500 uppercase text-[10px] tracking-wider mb-1">
                LOCATAIRE DÉSIGNÉ
              </div>
              <div className="text-sm font-bold text-neutral-900">{payment.locataireNom}</div>
              <div className="text-neutral-600 mt-0.5">Compte N° : {payment.locataireId}</div>
            </div>
            <div>
              <div className="font-bold text-neutral-500 uppercase text-[10px] tracking-wider mb-1">
                BIEN LOUÉ & PROPRIÉTAIRE
              </div>
              <div className="text-sm font-bold text-neutral-900">{payment.bienNom}</div>
              <div className="text-neutral-600 mt-0.5">
                Propriétaire : <strong>{payment.proprietaireNom}</strong>
              </div>
            </div>
          </div>

          {/* Period Notice */}
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs mb-6 text-amber-900 flex items-center justify-between">
            <div>
              Quittance délivrée pour la période de loyer : <strong>{payment.periode}</strong>
            </div>
            <div className="font-semibold text-[11px] uppercase tracking-wider">
              Mode : {payment.modePaiement}
            </div>
          </div>

          {/* Breakdown Table */}
          <table className="w-full text-left text-xs mb-6 border-collapse">
            <thead>
              <tr className="border-b-2 border-neutral-900 text-[11px] uppercase font-bold text-neutral-700">
                <th className="py-2">Désignation des sommes perçues</th>
                <th className="py-2 text-right">Montant (FCFA)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              <tr>
                <td className="py-2.5">Loyer principal net</td>
                <td className="py-2.5 text-right font-mono font-semibold">
                  {formatNumber(payment.loyerBase)}
                </td>
              </tr>
              {payment.charges > 0 && (
                <tr>
                  <td className="py-2.5">Provisions pour charges locatives & gardiennage</td>
                  <td className="py-2.5 text-right font-mono font-semibold">
                    {formatNumber(payment.charges)}
                  </td>
                </tr>
              )}
              {payment.tva > 0 && (
                <tr>
                  <td className="py-2.5">TVA légale applicable (18%)</td>
                  <td className="py-2.5 text-right font-mono font-semibold">
                    {formatNumber(payment.tva)}
                  </td>
                </tr>
              )}
              {payment.tom > 0 && (
                <tr>
                  <td className="py-2.5">Taxe d'Ordures Ménagères (TOM)</td>
                  <td className="py-2.5 text-right font-mono font-semibold">
                    {formatNumber(payment.tom)}
                  </td>
                </tr>
              )}
              {payment.penalites > 0 && (
                <tr>
                  <td className="py-2.5 text-rose-700 font-medium">
                    Pénalités contractuelles de retard
                  </td>
                  <td className="py-2.5 text-right font-mono font-semibold text-rose-700">
                    {formatNumber(payment.penalites)}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-neutral-900 font-bold text-sm bg-neutral-100">
                <td className="py-3 px-2">MONTANT TOTAL ENCAISSÉ</td>
                <td className="py-3 px-2 text-right font-mono text-base font-black">
                  {formatNumber(payment.montantPaye)} FCFA
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Amount in French Words (Spelled out) */}
          <div className="p-3.5 rounded-xl bg-neutral-100 border border-neutral-300 text-xs mb-8">
            <span className="font-semibold text-neutral-700">Arrêté la présente quittance à la somme de : </span>
            <span className="font-bold text-neutral-950 uppercase italic underline">
              {montantLettres}
            </span>
          </div>

          {/* Signatures and Stamp */}
          <div className="grid grid-cols-2 gap-8 pt-4 border-t border-neutral-200 text-xs">
            <div>
              <div className="font-bold text-neutral-700 mb-1">Cachet de Sécurité & QR Code :</div>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 border-2 border-neutral-900 p-1 flex items-center justify-center bg-neutral-50 rounded">
                  <QrCode className="w-12 h-12 text-neutral-800" />
                </div>
                <div className="text-[10px] text-neutral-500 leading-tight">
                  Document certifié FITAL-IMMO.<br />
                  Vérifiable via le portail de gestion.<br />
                  Ref: {payment.ref}
                </div>
              </div>
            </div>

            <div className="text-right flex flex-col justify-between items-end">
              <div className="font-bold text-neutral-800">
                Pour la Gérance FITAL-IMMO
                <div className="text-[10px] text-neutral-500 font-normal">
                  Agent habilité : {payment.recuPar || 'Amadou Sow'}
                </div>
              </div>
              <div className="border-2 border-dashed border-amber-800/60 rounded-xl px-4 py-2 text-center text-amber-900 bg-amber-50/50 mt-2">
                <div className="text-[10px] font-black uppercase tracking-wider">
                  ★ FITAL-IMMO GÉRANCE ★
                </div>
                <div className="text-[9px] font-medium text-emerald-800">
                  ✓ ENCAISSEMENT CERTIFIÉ
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
