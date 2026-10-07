import React from 'react';
import {
  Printer,
  X,
  FileCheck,
  QrCode,
  Building,
  User,
  Wrench,
} from 'lucide-react';
import { Owner, Property, Tenant, Payment, MaintenanceTicket, AgencySettings } from '../types';
import { PrintHeader } from './PrintHeader';
import { formatCurrency, formatNumber, formatDate, nombreEnLettres } from '../lib/utils';


// ============================================================
// FALLBACK (si l'agence n'a pas rempli ses paramètres)
// ============================================================
const FALLBACK_SETTINGS: any = {
  nomAgence: 'MON AGENCE',
  slogan1: '',
  slogan2: '',
  adresse: '',
  telephone: '',
  email: '',
  rcNumero: '',
  nineaNumero: '',
  gerantNom: 'Le Gérant',
  gerantTitre: 'Gérant',
  logoUrl: null,
  cachetUrl: null,
  enteteUrl: null,
  piedPageUrl: null,
  gerantSignatureUrl: null,
};


interface PaymentBulletinModalProps {
  owner: Owner | null;
  properties: Property[];
  tenants: Tenant[];
  payments: Payment[];
  tickets?: MaintenanceTicket[];
  selectedPeriod: string;
  settings?: AgencySettings | null;
  onClose: () => void;
}

export const PaymentBulletinModal: React.FC<PaymentBulletinModalProps> = ({
  owner,
  properties,
  tenants,
  payments,
  tickets = [],
  selectedPeriod,
  settings,
  onClose,
}) => {
  if (!owner) return null;

  // Find properties belonging to this owner
  const ownerProperties = properties.filter((p) => p.proprietaireId === owner.id);
  const ownerPropertyIds = ownerProperties.map((p) => p.id);

  // Find tenants and payments for these properties
  const ownerTenants = tenants.filter((t) => ownerPropertyIds.includes(t.bienId));

  const items = ownerTenants.map((t) => {
    const p = properties.find((prop) => prop.id === t.bienId);
    const pay = payments.find((pm) => pm.locataireId === t.id && pm.statut === 'Payé');
    const loyerRecouvre = pay ? pay.montantPaye : 0;
    const isPaid = loyerRecouvre > 0;
    const commission = isPaid ? Math.round(loyerRecouvre * (owner.tauxCommission / 100)) : 0;
    const net = loyerRecouvre - commission;

    return {
      tenant: t,
      property: p,
      loyerRecouvre,
      isPaid,
      commission,
      net,
      observation: isPaid ? 'Loyer encaissé avec succès' : 'NON PAYÉ (Impayé)',
    };
  });

  // Calculate maintenance deductions for this owner's properties
  const ownerWorks = tickets.filter((tk) => {
    const isOwnerProp = ownerPropertyIds.includes(tk.bienId) || tk.proprietaireId === owner.id;
    const isOwnerImputed = tk.imputableA === 'Propriétaire';
    const isCompletedOrPaid = tk.statut === 'Traité et Réglé' || tk.statut === 'Terminé' || tk.statutReglement === 'Réglé' || tk.statutReglement === 'Déduit loyer';
    return isOwnerProp && isOwnerImputed && isCompletedOrPaid;
  });

  const totalTravauxDeduits = ownerWorks.reduce((sum, w) => sum + (w.coutReel || w.coutEstime || 0), 0);

  const totalBrut = items.reduce((acc, i) => acc + i.loyerRecouvre, 0);
  const totalCommission = items.reduce((acc, i) => acc + i.commission, 0);
  const tvaCommission = Math.round(totalCommission * 0.18);
  const totalNetAReverser = Math.max(0, totalBrut - totalCommission - tvaCommission - totalTravauxDeduits);
  const totalNetLettres = nombreEnLettres(totalNetAReverser);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bulletin-print-modal bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-4xl max-h-[94vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Top action bar (no-print) */}
        <div className="p-4 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80 no-print">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <FileCheck className="w-5 h-5 text-[#C9A96E]" />
            <span>Bulletin de Versement Propriétaire (Réf Document FITAL-IMMO P.18)</span>
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

        {/* Printable Bulletin Document */}
        <div className="bulletin-print-container p-8 bg-white text-neutral-900 rounded-b-3xl font-sans print-container">
          {/* Header dynamique */}
          <PrintHeader 
            agency={settings || FALLBACK_SETTINGS} 
            documentType="BULLETIN DE VERSEMENT" 
            documentRef={`Mois de : ${selectedPeriod} · Réf Mandat : ${owner.mandatGerance}`}
          />

          {/* Owner & Account Details Box */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-neutral-50 border border-neutral-300 text-xs mb-5">
            <div>
              <div className="text-[10px] font-bold uppercase text-neutral-500">BÉNÉFICIAIRE (PROPRIÉTAIRE)</div>
              <div className="text-sm font-bold text-neutral-900 mt-0.5">
                {owner.prenom} {owner.nom}
              </div>
              <div className="text-neutral-600 mt-0.5">{owner.adresse}</div>
              <div className="text-neutral-600">Tél : {owner.telephone}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase text-neutral-500">COORDONNÉES BANCAIRES & GÉRANCE</div>
              <div className="text-xs font-semibold text-neutral-900 mt-0.5">
                Banque : {owner.banque}
              </div>
              <div className="font-mono text-[11px] text-neutral-700">{owner.compteBancaire}</div>
              <div className="text-xs font-bold text-amber-900 mt-1">
                Taux de Commission Agence : {owner.tauxCommission}%
              </div>
            </div>
          </div>

          {/* Detailed Lots Table */}
          <table className="w-full text-left text-xs mb-5 border-collapse">
            <thead>
              <tr className="bg-neutral-900 text-white font-bold text-[10px] uppercase">
                <th className="py-2.5 px-3">Bien / Lot Loué</th>
                <th className="py-2.5 px-3">Locataire</th>
                <th className="py-2.5 px-3 text-right">Loyer Recouvré</th>
                <th className="py-2.5 px-3 text-right">Com. ({owner.tauxCommission}%)</th>
                <th className="py-2.5 px-3 text-right">Net Reversé</th>
                <th className="py-2.5 px-3 text-center">Observations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 border-b border-neutral-300">
              {items.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}>
                  <td className="py-2.5 px-3 font-semibold text-neutral-900">
                    {item.property?.nom || item.tenant.bienNom}
                  </td>
                  <td className="py-2.5 px-3">
                    {item.tenant.prenom} {item.tenant.nom}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold">
                    {formatNumber(item.loyerRecouvre)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-neutral-600">
                    {formatNumber(item.commission)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-900">
                    {formatNumber(item.net)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                        item.isPaid
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-rose-100 text-rose-900'
                      }`}
                    >
                      {item.observation}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold text-xs bg-neutral-100 border-t-2 border-neutral-900">
                <td className="py-2.5 px-3" colSpan={2}>
                  SOUS-TOTAL GÉRANCE
                </td>
                <td className="py-2.5 px-3 text-right font-mono">{formatNumber(totalBrut)}</td>
                <td className="py-2.5 px-3 text-right font-mono">{formatNumber(totalCommission)}</td>
                <td className="py-2.5 px-3 text-right font-mono" colSpan={2}>
                  {formatNumber(totalBrut - totalCommission)} FCFA
                </td>
              </tr>
              {tvaCommission > 0 && (
                <tr className="text-neutral-600 text-xs">
                  <td className="py-1.5 px-3" colSpan={4}>
                    TVA sur Commission Gérance (18%)
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono text-rose-700" colSpan={2}>
                    - {formatNumber(tvaCommission)} FCFA
                  </td>
                </tr>
              )}
              {totalTravauxDeduits > 0 && (
                <tr className="bg-amber-50 text-amber-900 text-xs font-semibold">
                  <td className="py-2 px-3" colSpan={4}>
                    <div className="flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-amber-700" />
                      <span>Frais de Travaux & Réparations Déduits ({ownerWorks.length} intervention{ownerWorks.length > 1 ? 's' : ''}) :</span>
                      <span className="text-[10px] text-neutral-600 font-normal">
                        {ownerWorks.map(w => w.titre).join(', ')}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-rose-700 font-bold" colSpan={2}>
                    - {formatNumber(totalTravauxDeduits)} FCFA
                  </td>
                </tr>
              )}
            </tfoot>
          </table>

          {/* Net to pay box */}
          <div className="p-4 rounded-xl border-2 border-neutral-900 bg-neutral-100 flex items-center justify-between mb-4">
            <div className="text-sm font-black uppercase text-neutral-900">
              NET GLOBAL À REVERSER AU PROPRIÉTAIRE :
            </div>
            <div className="text-2xl font-black font-mono text-neutral-900">
              {formatNumber(totalNetAReverser)} FCFA
            </div>
          </div>

          {/* Amount in French Letters */}
          <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-300 text-xs mb-6">
            <span className="font-semibold text-neutral-700">Arrêté le présent Bulletin à la somme de : </span>
            <span className="font-bold text-neutral-950 uppercase italic underline">
              {totalNetLettres}
            </span>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-4 border-t border-neutral-300 text-xs">
            <div>
              <div className="font-bold text-neutral-700 mb-1">Visa du Propriétaire :</div>
              <div className="h-16 border border-dashed border-neutral-400 rounded-lg p-2 flex items-end">
                <span className="text-[10px] text-neutral-400 italic">Signature & Date de réception</span>
              </div>
            </div>
            <div className="text-right flex flex-col justify-between">
              <div>
                <div className="font-bold text-neutral-800">Pour {settings?.nomAgence || 'FITAL IMMO'}</div>
                <div className="text-[10px] text-neutral-500">{settings?.ville || 'Dakar'}, le {formatDate(new Date().toISOString())}</div>
              </div>
              <div className="text-center p-2 border-2 border-dashed border-amber-800/60 bg-amber-50 rounded-lg text-[10px] font-black text-amber-900 uppercase">
                ★ BON POUR VIREMENT BANCAIRE ★
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
