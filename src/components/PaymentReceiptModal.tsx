import React from 'react';
import { Printer, X, Building2, User, FileText, CreditCard, Calendar, Hash } from 'lucide-react';
import { Payment, AgencySettings, ReceiptType } from '../types';
import { formatCurrency, formatNumber, formatDate } from '../lib/utils';

interface PaymentReceiptModalProps {
  payment: Payment;
  settings?: AgencySettings;
  onClose: () => void;
}

// ============================================================
// Helper : Montant en lettres
// ============================================================
function nombreEnLettres(n: number): string {
  if (n === 0) return 'zéro';
  const unites = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const dizaines = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
  const centaines = ['', 'cent', 'deux cent', 'trois cent', 'quatre cent', 'cinq cent', 'six cent', 'sept cent', 'huit cent', 'neuf cent'];

  function convert(num: number): string {
    if (num === 0) return '';
    if (num < 10) return unites[num];
    if (num < 20) return num === 10 ? 'dix' : num === 11 ? 'onze' : num === 12 ? 'douze' : num === 13 ? 'treize' : num === 14 ? 'quatorze' : num === 15 ? 'quinze' : num === 16 ? 'seize' : 'dix-' + unites[num - 10];
    if (num < 100) {
      const d = Math.floor(num / 10);
      const u = num % 10;
      if (d === 7 || d === 9) return dizaines[d - 1] + '-' + convert(10 + u);
      return dizaines[d] + (u > 0 ? '-' + unites[u] : '');
    }
    const c = Math.floor(num / 100);
    const r = num % 100;
    return centaines[c] + (r > 0 ? ' ' + convert(r) : '');
  }

  const milliards = Math.floor(n / 1000000000);
  const millions = Math.floor((n % 1000000000) / 1000000);
  const milliers = Math.floor((n % 1000000) / 1000);
  const reste = n % 1000;

  let result = '';
  if (milliards > 0) result += convert(milliards) + ' milliard' + (milliards > 1 ? 's' : '') + ' ';
  if (millions > 0) result += convert(millions) + ' million' + (millions > 1 ? 's' : '') + ' ';
  if (milliers > 0) result += (milliers === 1 ? 'mille' : convert(milliers) + ' mille') + ' ';
  if (reste > 0) result += convert(reste);

  return result.trim();
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  payment,
  settings,
  onClose,
}) => {
  // ============================================================
  // DÉTERMINER LE TYPE DE DOCUMENT
  // ============================================================
  const montantTotal = payment.montantTotal || 0;
  const montantPaye = payment.montantPaye || 0;
  const montantRestant = payment.montantRestant ?? (montantTotal - montantPaye);
  const montantInitialDu = payment.montantInitialDu || montantTotal;

  // Déterminer le type
  let receiptType: ReceiptType = payment.typeRecu || 'QUITTANCE';

  // Auto-détection si non spécifié
  if (!payment.typeRecu) {
    if (montantPaye >= montantTotal && montantRestant === 0) {
      // Paiement complet
      if (payment.referencePaiementInitial && payment.referencePaiementInitial !== payment.ref) {
        receiptType = 'QUITTANCE_SOLDE';
      } else {
        receiptType = 'QUITTANCE';
      }
    } else if (montantPaye < montantTotal && montantPaye > 0) {
      // Paiement partiel
      receiptType = 'RECU_ACOMPTE';
    }
  }

  // ============================================================
  // TITRE ET COULEURS SELON LE TYPE
  // ============================================================
  const config = {
    QUITTANCE: {
      titre: 'QUITTANCE DE LOYER',
      sousTitre: 'Reçu officiel de paiement de loyer',
      couleur: '#0F1B2D',
      badgeColor: '#C9A96E',
      badgeText: 'QUITTANCE',
    },
    RECU_ACOMPTE: {
      titre: 'REÇU DE LOYER',
      sousTitre: 'Acompte sur loyer — Document provisoire',
      couleur: '#1E40AF',
      badgeColor: '#3B82F6',
      badgeText: 'ACOMPTE',
    },
    QUITTANCE_SOLDE: {
      titre: 'QUITTANCE DE SOLDE',
      sousTitre: 'Règlement final du loyer — Solde intégralement réglé',
      couleur: '#047857',
      badgeColor: '#10B981',
      badgeText: 'SOLDE',
    },
  }[receiptType];

  const nomAgence = settings?.nomAgence || 'FITAL-IMMO';
  const ninea = settings?.ninea || '008920194 2V8';
  const adresse = settings?.adresse || 'Avenue Cheikh Anta Diop, Dakar';
  const telephone = settings?.standardTelephone || settings?.telephone || '+221 33 820 40 50';
  const waveNumero = settings?.waveNumero || '+221 76 328 58 29';
  const omCode = settings?.orangeMoneyCode || '784912';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-3xl max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header (masqué à l'impression) */}
        <div className="p-4 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80 sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/20 text-[#E8D5B0] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{config.titre}</h2>
              <p className="text-xs text-[#A8B4C4]">
                {config.sousTitre} · N° {payment.quittanceNumero}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#A8B4C4] hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenu imprimable */}
        <div className="p-6 sm:p-10 bg-white text-neutral-900 print:p-4">
          {/* Badge type document */}
          <div className="flex justify-between items-start mb-6">
            <div
              className="px-4 py-2 rounded-lg text-white font-black text-xs uppercase tracking-wider"
              style={{ backgroundColor: config.couleur }}
            >
              {config.badgeText}
            </div>
            <div className="text-right text-xs text-neutral-600">
              <div className="font-mono font-bold text-neutral-900">
                N° {payment.quittanceNumero}
              </div>
              <div className="font-mono">Réf : {payment.ref}</div>
            </div>
          </div>

          {/* En-tête Agence */}
          <div className="text-center border-b-2 border-neutral-900 pb-4 mb-6">
            <h1 className="text-2xl font-black uppercase tracking-wide text-neutral-900">
              {nomAgence}
            </h1>
            <div className="text-xs text-neutral-600 mt-1 font-semibold uppercase tracking-wider">
              Gestion Immobilière · Location · Vente · Syndic
            </div>
            <div className="text-[11px] text-neutral-600 mt-2">
              {adresse} · Tél : {telephone}
            </div>
            <div className="text-[11px] text-neutral-600">
              NINEA : {ninea} · Wave : {waveNumero} · OM : {omCode}
            </div>
          </div>

          {/* Titre principal */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-black uppercase text-neutral-900">
              {config.titre}
            </h2>
            <p className="text-xs text-neutral-600 italic mt-1">
              {config.sousTitre}
            </p>
          </div>

          {/* Informations principales */}
          <div className="space-y-4 mb-6 text-sm">
            <div className="border border-neutral-300 rounded-lg overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2">
                <div className="p-4 border-b sm:border-b-0 sm:border-r border-neutral-300 bg-neutral-50">
                  <div className="text-[10px] uppercase font-bold text-neutral-500 mb-1">
                    Reçu de
                  </div>
                  <div className="text-base font-bold text-neutral-900">
                    {payment.locataireNom}
                  </div>
                  <div className="text-xs text-neutral-600 mt-1">
                    Bien : <strong>{payment.bienNom}</strong>
                  </div>
                </div>
                <div className="p-4 bg-neutral-50">
                  <div className="text-[10px] uppercase font-bold text-neutral-500 mb-1">
                    Période / Nature
                  </div>
                  <div className="text-base font-bold text-neutral-900">
                    {payment.periode}
                  </div>
                  <div className="text-xs text-neutral-600 mt-1">
                    {receiptType === 'RECU_ACOMPTE' && 'Acompte sur loyer'}
                    {receiptType === 'QUITTANCE_SOLDE' && 'Solde du loyer'}
                    {receiptType === 'QUITTANCE' && 'Règlement intégral'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Montant en lettres */}
          <div className="mb-6 p-4 bg-neutral-100 border-l-4 border-neutral-900 rounded">
            <div className="text-[10px] uppercase font-bold text-neutral-500 mb-1">
              La somme de
            </div>
            <div className="text-lg font-bold text-neutral-900 italic">
              {nombreEnLettres(montantPaye)} Francs CFA
            </div>
          </div>

          {/* Détail des montants */}
          <div className="mb-6">
            <table className="w-full text-xs border border-neutral-300">
              <thead>
                <tr className="text-white" style={{ backgroundColor: config.couleur }}>
                  <th className="p-2 text-left font-bold border-r border-white/20">
                    Désignation
                  </th>
                  <th className="p-2 text-right font-bold">
                    Montant (FCFA)
                  </th>
                </tr>
              </thead>
              <tbody>
                {payment.loyerBase > 0 && (
                  <tr className="border-b border-neutral-200">
                    <td className="p-2 text-neutral-700 border-r border-neutral-200">
                      Loyer de base
                    </td>
                    <td className="p-2 text-right font-mono text-neutral-900">
                      {formatNumber(payment.loyerBase)}
                    </td>
                  </tr>
                )}
                {payment.charges > 0 && (
                  <tr className="border-b border-neutral-200">
                    <td className="p-2 text-neutral-700 border-r border-neutral-200">
                      Charges locatives
                    </td>
                    <td className="p-2 text-right font-mono text-neutral-900">
                      {formatNumber(payment.charges)}
                    </td>
                  </tr>
                )}
                {payment.tva > 0 && (
                  <tr className="border-b border-neutral-200">
                    <td className="p-2 text-neutral-700 border-r border-neutral-200">
                      TVA (18%)
                    </td>
                    <td className="p-2 text-right font-mono text-neutral-900">
                      {formatNumber(payment.tva)}
                    </td>
                  </tr>
                )}
                {payment.tom > 0 && (
                  <tr className="border-b border-neutral-200">
                    <td className="p-2 text-neutral-700 border-r border-neutral-200">
                      TOM
                    </td>
                    <td className="p-2 text-right font-mono text-neutral-900">
                      {formatNumber(payment.tom)}
                    </td>
                  </tr>
                )}
                {payment.penalites > 0 && (
                  <tr className="border-b border-neutral-200">
                    <td className="p-2 text-neutral-700 border-r border-neutral-200">
                      Pénalités de retard
                    </td>
                    <td className="p-2 text-right font-mono text-red-700">
                      {formatNumber(payment.penalites)}
                    </td>
                  </tr>
                )}
                <tr className="bg-neutral-100 font-bold border-t-2 border-neutral-400">
                  <td className="p-2 text-neutral-900 border-r border-neutral-300">
                    MONTANT TOTAL DÛ
                  </td>
                  <td className="p-2 text-right font-mono text-neutral-900 text-sm">
                    {formatNumber(montantTotal)}
                  </td>
                </tr>
                <tr className="text-white font-bold" style={{ backgroundColor: config.couleur }}>
                  <td className="p-2 border-r border-white/20">
                    {receiptType === 'RECU_ACOMPTE' ? 'MONTANT DE L\'ACOMPTE VERSÉ' : 'MONTANT PAYÉ'}
                  </td>
                  <td className="p-2 text-right font-mono text-base">
                    {formatNumber(montantPaye)}
                  </td>
                </tr>
                {montantRestant > 0 && (
                  <tr className="bg-red-50 font-bold">
                    <td className="p-2 text-red-800 border-r border-red-200">
                      RESTE À PAYER
                    </td>
                    <td className="p-2 text-right font-mono text-red-800 text-sm">
                      {formatNumber(montantRestant)}
                    </td>
                  </tr>
                )}
                {montantRestant === 0 && montantPaye > 0 && (
                  <tr className="bg-green-50 font-bold">
                    <td className="p-2 text-green-800 border-r border-green-200">
                      STATUT
                    </td>
                    <td className="p-2 text-right text-green-800 text-sm">
                      ✓ SOLDE INTÉGRALEMENT RÉGLÉ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Informations complémentaires */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
            <div className="p-3 bg-neutral-50 border border-neutral-300 rounded">
              <div className="text-[10px] uppercase font-bold text-neutral-500 mb-1">
                Date de paiement
              </div>
              <div className="font-bold text-neutral-900">
                {payment.datePaiement ? formatDate(payment.datePaiement) : '—'}
              </div>
            </div>
            <div className="p-3 bg-neutral-50 border border-neutral-300 rounded">
              <div className="text-[10px] uppercase font-bold text-neutral-500 mb-1">
                Mode de règlement
              </div>
              <div className="font-bold text-neutral-900">
                {payment.modePaiement || '—'}
                {payment.moyenPaiementCode && (
                  <span className="ml-2 text-[10px] font-mono text-neutral-500">
                    ({payment.moyenPaiementCode})
                  </span>
                )}
              </div>
            </div>
            {payment.numeroTransaction && (
              <div className="p-3 bg-neutral-50 border border-neutral-300 rounded col-span-2">
                <div className="text-[10px] uppercase font-bold text-neutral-500 mb-1">
                  Référence de transaction
                </div>
                <div className="font-mono font-bold text-neutral-900">
                  {payment.numeroTransaction}
                </div>
              </div>
            )}
          </div>

          {/* NOTA juridique */}
          <div className="mb-6 p-3 bg-neutral-100 border border-neutral-300 rounded text-[10px] text-neutral-700 leading-relaxed">
            <div className="font-bold text-neutral-900 mb-1 uppercase">NOTA IMPORTANT :</div>
            <div>1. Le locataire ne peut déménager sans prévenir par écrit au propriétaire ou à l'agence.</div>
            <div>2. Un reçu écrit doit être délivré dans les délais prescrits par la réglementation.</div>
            <div>3. Le bail est établi pour toutes réparations locatives à charge du locataire, sauf cas de force majeure.</div>
            {receiptType === 'RECU_ACOMPTE' && (
              <div className="mt-2 pt-2 border-t border-neutral-300 font-bold text-blue-800">
                ⚠️ Ce document est un REÇU D'ACOMPTE. Il ne vaut pas quittance définitive.
                La quittance officielle sera délivrée après règlement intégral du solde.
              </div>
            )}
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 mt-10 pt-6 border-t border-neutral-300">
            <div>
              <div className="font-bold text-neutral-700 text-xs">
                Signature du Caissier :
              </div>
              <div className="h-16 border border-dashed border-neutral-400 rounded-lg mt-2"></div>
              <div className="text-[10px] text-neutral-500 mt-1 italic">
                {payment.recuPar || 'Service Caisse'}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-neutral-700 text-xs">
                Cachet & Signature Agence :
              </div>
              <div className="h-16 border border-dashed border-neutral-400 rounded-lg mt-2"></div>
              <div className="text-[10px] text-neutral-500 mt-1 italic">
                {nomAgence}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-neutral-300 text-center text-[10px] text-neutral-500">
            {nomAgence} — Document généré le {new Date().toLocaleDateString('fr-FR')} à{' '}
            {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            <br />
            Ce document fait foi de paiement et doit être conservé précieusement.
          </div>
        </div>
      </div>
    </div>
  );
};