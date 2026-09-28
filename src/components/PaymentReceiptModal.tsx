import React, { useState, useMemo } from 'react';
import { Printer, X } from 'lucide-react';
import { Payment, AgencySettings, ReceiptType, Unit, Building } from '../types';
import { formatNumber, formatDate } from '../lib/utils';

interface PaymentReceiptModalProps {
  payment: Payment;
  settings?: AgencySettings;
  units?: Unit[];
  buildings?: Building[];
  currentUser?: { nom: string; prenom: string; role?: string } | null;
  onClose: () => void;
}

// ============================================================
// Helper : Montant en lettres
// ============================================================
function nombreEnLettres(n: number): string {
  if (n === 0) return 'zéro';
  if (n < 0) return 'moins ' + nombreEnLettres(Math.abs(n));
  const unites = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const dizaines = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
  const centaines = ['', 'cent', 'deux cent', 'trois cent', 'quatre cent', 'cinq cent', 'six cent', 'sept cent', 'huit cent', 'neuf cent'];

  function convert(num: number): string {
    if (num === 0) return '';
    if (num < 10) return unites[num];
    if (num < 20) {
      const speciaux = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
      return speciaux[num - 10];
    }
    if (num < 100) {
      const d = Math.floor(num / 10);
      const u = num % 10;
      if (d === 7 || d === 9) return dizaines[d - 1] + '-' + convert(10 + u);
      if (d === 8 && u === 0) return 'quatre-vingts';
      return dizaines[d] + (u > 0 ? '-' + unites[u] : '');
    }
    const c = Math.floor(num / 100);
    const r = num % 100;
    let prefix = centaines[c];
    if (c > 1 && r === 0) prefix += 's';
    return prefix + (r > 0 ? ' ' + convert(r) : '');
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

// ============================================================
// Helper : Observation par défaut
// ============================================================
function getDefaultObservation(receiptType: ReceiptType, periode: string): string {
  const mois = (periode || '').toUpperCase();
  if (receiptType === 'RECU_ACOMPTE') return `ACOMPTE ${mois}`;
  if (receiptType === 'QUITTANCE_SOLDE' || receiptType === 'QUITTANCE') return `SOLDE ${mois}`;
  return '';
}

// ============================================================
// Helper : Dates de période
// ============================================================
function getPeriodeDates(periode: string): { debut: string; fin: string } {
  const now = new Date();
  let mois = now.getMonth();
  let annee = now.getFullYear();

  const moisMap: Record<string, number> = {
    'janvier': 0, 'février': 1, 'fevrier': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
    'juillet': 6, 'août': 7, 'aout': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11, 'decembre': 11,
  };

  const parts = (periode || '').toLowerCase().trim().split(' ');
  if (parts.length >= 1 && moisMap[parts[0]] !== undefined) mois = moisMap[parts[0]];
  if (parts.length >= 2 && !isNaN(parseInt(parts[1]))) annee = parseInt(parts[1]);

  const debut = new Date(annee, mois, 1);
  const fin = new Date(annee, mois + 1, 0);

  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return { debut: fmt(debut), fin: fmt(fin) };
}

// ============================================================
// COMPOSANT
// ============================================================
export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  payment,
  settings,
  units = [],
  buildings = [],
  currentUser,
  onClose,
}) => {
  const montantTotal = payment.montantTotal || 0;
  const montantPaye = payment.montantPaye || 0;
  const montantRestant = payment.montantRestant ?? (montantTotal - montantPaye);

  const [receiptType, setReceiptType] = useState<ReceiptType>(() => {
    if (payment.typeRecu) return payment.typeRecu;
    if (montantPaye >= montantTotal && montantRestant === 0) {
      if (payment.referencePaiementInitial && payment.referencePaiementInitial !== payment.ref) {
        return 'QUITTANCE_SOLDE';
      }
      return 'QUITTANCE';
    }
    if (montantPaye > 0 && montantPaye < montantTotal) return 'RECU_ACOMPTE';
    return 'QUITTANCE';
  });

  const [observation, setObservation] = useState<string>(
    payment.observation || getDefaultObservation(receiptType, payment.periode)
  );

  const [numeroQuittance, setNumeroQuittance] = useState<number>(
    (payment as any).numero_quittance || parseInt(payment.quittanceNumero?.replace(/\D/g, '') || '0') || Math.floor(Math.random() * 900000) + 100000
  );

  const [referenceCaissier, setReferenceCaissier] = useState<number>(
    (payment as any).reference_caissier || Math.floor(Math.random() * 9000) + 1000
  );

  const unite = useMemo(
    () => units.find((u) => u.id === payment.bienId),
    [units, payment.bienId]
  );
  const immeuble = useMemo(
    () => unite ? buildings.find((b) => b.id === unite.buildingId) : null,
    [buildings, unite]
  );

  const nomUnite = unite
    ? `${unite.type} - ${unite.nom}${unite.etage ? ` (${unite.etage})` : ''}`
    : (payment.bienNom || '—');

  const adresseImmeuble = immeuble
    ? `${immeuble.adresse || ''} ${immeuble.nom || ''}`.trim()
    : (immeuble?.nom || payment.bienNom || '—');

  const nomAgence = settings?.nomAgence || 'TRANS IMMOBILIER SARL';
  const slogan = 'GÉRANCE · LOCATION · VENTE · ACHAT · RECOUVREMENT DE CRÉANCE';
  const adresse = settings?.adresse || 'Grand Dakar Pile N° 224 B.P. : 10 055 Dakar Liberté';
  const telephone = settings?.standardTelephone || settings?.telephone || '+221 77 551 16 70 / 77 786 45 45';
  const ninea = settings?.ninea || '0050875072C2';
  const rc = 'SN-DKR-2014B10248';
  const email = settings?.email || 'tiser.immo@gmail.com';

  const { debut: dateDebut, fin: dateFin } = getPeriodeDates(payment.periode);
  const datePaiement = payment.datePaiement
    ? formatDate(payment.datePaiement)
    : new Date().toLocaleDateString('fr-FR');

  const nomSignataire = currentUser
    ? `${currentUser.prenom} ${currentUser.nom}`.trim()
    : (payment.auteurNom || payment.createdByNom || payment.recuPar || 'Service Caisse');
  const roleSignataire = currentUser?.role || payment.createdByRole || '—';

  const titre = receiptType === 'RECU_ACOMPTE' ? 'REÇU DE LOYER' : 'QUITTANCE DE LOYER';
  const isRecu = receiptType === 'RECU_ACOMPTE';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col">

        <div className="p-4 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80 sticky top-0 z-10 print:hidden">
          <h2 className="text-base font-bold text-white">{titre}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer</span>
            </button>
            <button onClick={onClose} className="p-2 rounded-lg text-[#A8B4C4] hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 bg-[#0F1B2D] border-b border-[#C9A96E]/20 flex flex-wrap gap-3 text-xs print:hidden">
          <div>
            <label className="block text-[10px] text-[#A8B4C4] uppercase mb-1">Type</label>
            <select
              value={receiptType}
              onChange={(e) => {
                const newType = e.target.value as ReceiptType;
                setReceiptType(newType);
                setObservation(getDefaultObservation(newType, payment.periode));
              }}
              className="px-3 py-1.5 rounded-lg bg-[#1E2E45] border border-[#C9A96E]/30 text-white"
            >
              <option value="QUITTANCE">Quittance de Loyer</option>
              <option value="RECU_ACOMPTE">Reçu de Loyer (Acompte)</option>
              <option value="QUITTANCE_SOLDE">Quittance de Solde</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-[#A8B4C4] uppercase mb-1">N° Quittance</label>
            <input
              type="number"
              value={numeroQuittance}
              onChange={(e) => setNumeroQuittance(Number(e.target.value))}
              className="w-28 px-3 py-1.5 rounded-lg bg-[#1E2E45] border border-[#C9A96E]/30 text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] text-[#A8B4C4] uppercase mb-1">Réf Caissier</label>
            <input
              type="number"
              value={referenceCaissier}
              onChange={(e) => setReferenceCaissier(Number(e.target.value))}
              className="w-24 px-3 py-1.5 rounded-lg bg-[#1E2E45] border border-[#C9A96E]/30 text-white font-mono"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] text-[#A8B4C4] uppercase mb-1">Observation</label>
            <input
              type="text"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="SOLDE JUILLET 2026"
              className="w-full px-3 py-1.5 rounded-lg bg-[#1E2E45] border border-[#C9A96E]/30 text-white"
            />
          </div>
        </div>

        {/* CONTENU IMPRIMABLE */}
        <div className="print-container p-6 bg-white text-neutral-900">

          {/* En-tête TISER */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="w-14 h-14 flex-shrink-0 border border-neutral-900 flex items-center justify-center">
              <div className="text-center">
                <div className="text-xl font-black text-neutral-900">T</div>
                <div className="text-[6px] text-neutral-700 leading-tight">T.I.SER</div>
              </div>
            </div>

            <div className="flex-1 text-center">
              <div className="text-[11px] font-black text-neutral-900 uppercase tracking-wide">
                {nomAgence}
              </div>
              <div className="text-[7px] text-neutral-700 mt-0.5 leading-tight">
                {slogan}
              </div>
              <div className="text-[7px] text-neutral-700 mt-1 leading-tight">
                RC : {rc} N.I.N.E.A : {ninea}
              </div>
              <div className="text-[7px] text-neutral-700 leading-tight">
                {adresse}
              </div>
              <div className="text-[7px] text-neutral-700 leading-tight">
                Tél : {telephone} E-mail : {email}
              </div>
            </div>

            <div className="w-14 h-14 flex-shrink-0"></div>
          </div>

          {/* Titre */}
          <div className="text-center my-4">
            <div className="inline-block border-2 border-neutral-900 px-6 py-1">
              <span className="text-base font-black uppercase tracking-widest text-neutral-900">
                {titre}
              </span>
            </div>
          </div>

          {/* N° et Montant */}
          <div className="flex justify-end items-center gap-3 mb-5 pr-8">
            <div className="border-2 border-neutral-900 px-3 py-1 text-[10px] font-bold">
              N° <span className="font-mono">{numeroQuittance}</span>
            </div>
            <div className="border-2 border-dashed border-neutral-900 px-4 py-2">
              <div className="text-[8px] text-neutral-600 text-center">Montant</div>
              <div className="text-base font-black text-neutral-900 font-mono text-center">
                {formatNumber(montantPaye)}
              </div>
            </div>
          </div>

          {/* Corps */}
          <div className="text-[11px] text-neutral-900 leading-relaxed space-y-3 px-4">
            <div>
              Reçu de Mr (mme) : <strong className="underline">{payment.locataireNom}</strong>
            </div>

            <div>
              {isRecu ? 'la somme de : ' : 'La somme de : '}
              <strong>{nombreEnLettres(montantPaye)}</strong> Francs
            </div>

            <div>
              {isRecu ? 'Désignation : ' : 'pour la Location de : '}
              <strong>{nomUnite}</strong>
            </div>

            <div>
              Lieux qu'il occupe dans la maison située : <strong>{adresseImmeuble}</strong>
            </div>

            {!isRecu ? (
              <>
                <div>
                  Le dit commençant le : <strong>{dateDebut}</strong>
                </div>
                <div>
                  et finissant le : <strong>{dateFin}</strong>
                </div>
              </>
            ) : (
              <div className="pt-2">
                Dakar le : <strong>{datePaiement}</strong>
              </div>
            )}

            <div className="pt-2">
              Observation : <strong>{observation}</strong>
            </div>
          </div>

          {/* Signature */}
          <div className="mt-8 grid grid-cols-2 gap-6 px-4 text-[10px]">
            <div>
              <div className="font-bold text-neutral-900 mb-1">Signature Caissier</div>
              <div className="h-14 border-b border-dotted border-neutral-400 flex items-end pb-1">
                <span className="text-[9px] text-neutral-700 italic">{nomSignataire} ({roleSignataire})</span>
              </div>
            </div>
            <div>
              <div className="font-bold text-neutral-900 mb-1">Réf Caissier</div>
              <div className="h-14 border-b border-dotted border-neutral-400 flex items-end justify-center">
                <span className="font-mono text-sm font-bold">{referenceCaissier}</span>
              </div>
            </div>
          </div>

          {/* NOTA */}
          <div className="mt-6 pt-3 border-t border-neutral-400 text-[8px] text-neutral-800 leading-relaxed px-4">
            <div className="font-bold text-neutral-900 mb-1">NOTA :</div>
            <div>1. Le locataire ne peut déménager sans prévenir par écrit au propriétaire ou à l'agence.</div>
            <div>2. Un reçu écrit doit être délivré dans les délais prescrits.</div>
            <div>3. Le bail est établi pour toutes réparations locatives à charge du locataire, sauf cas de force majeure.</div>
          </div>

          {/* Pied de page fixe */}
          <div className="print-footer">
            <div className="font-bold">
              TRANS IMMOBILIER & SERVICES SARL (T.I.SER) Grand Dakar Pile N° 224 B.P. : 10 055 Dakar Liberté
            </div>
            <div>
              Tél : 33 825 17 38 RC : SN-DKR-2014B10248 NINEA : 0050875072C2 E-mail : tiser.immo@gmail.com
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};