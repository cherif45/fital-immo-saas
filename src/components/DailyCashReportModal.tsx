import React, { useMemo } from 'react';
import { X, Printer, Calendar, Download } from 'lucide-react';
import { CashMovement, UserAccount } from '../types';
import { formatNumber } from '../lib/utils';

interface DailyCashReportModalProps {
  date: string; // YYYY-MM-DD
  cashMovements: CashMovement[];
  currentUser: UserAccount;
  onClose: () => void;
}

// Helper : montant en lettres
function nombreEnLettres(n: number): string {
  if (n === 0) return 'zéro';
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

export const DailyCashReportModal: React.FC<DailyCashReportModalProps> = ({
  date,
  cashMovements,
  currentUser,
  onClose,
}) => {
  // ============================================================
  // FILTRAGE PAR DATE
  // ============================================================
  const mouvementsDuJour = useMemo(() => {
    return cashMovements.filter((m) => {
      const mDate = (m.dateOperation || m.dateHeure || '').split(' ')[0].split('T')[0];
      return mDate === date;
    });
  }, [cashMovements, date]);

  // ============================================================
  // VENTILATION
  // ============================================================
  const loyersEncaisses = mouvementsDuJour.filter(
    (m) => (m.type === 'ENTREE' || m.type === 'ENCAISSEMENT') && m.categorie === 'ENCAISSEMENT_LOYER'
  );

  const autresEncaissements = mouvementsDuJour.filter(
    (m) => (m.type === 'ENTREE' || m.type === 'ENCAISSEMENT') && m.categorie !== 'ENCAISSEMENT_LOYER'
  );

  const decaissementsProprietaire = mouvementsDuJour.filter(
    (m) => (m.type === 'SORTIE' || m.type === 'DECAISSEMENT') && m.categorie === 'AVANCE_PROPRIETAIRE'
  );

  const autresDecaissements = mouvementsDuJour.filter(
    (m) => (m.type === 'SORTIE' || m.type === 'DECAISSEMENT') && m.categorie !== 'AVANCE_PROPRIETAIRE'
  );

  // ============================================================
  // TOTAUX
  // ============================================================
  const totalLoyers = loyersEncaisses.reduce((s, m) => s + m.montant, 0);
  const totalAutresEnc = autresEncaissements.reduce((s, m) => s + m.montant, 0);
  const totalDecProp = decaissementsProprietaire.reduce((s, m) => s + m.montant, 0);
  const totalAutresDec = autresDecaissements.reduce((s, m) => s + m.montant, 0);

  const totalEncaissement = totalLoyers + totalAutresEnc;
  const totalDecaissement = totalDecProp + totalAutresDec;
  const soldeCaisse = totalEncaissement - totalDecaissement;

  const dateFormatee = new Date(date + 'T00:00:00').toLocaleDateString('fr-FR');

  // ============================================================
  // EXPORT CSV
  // ============================================================
  const handleDownloadCSV = () => {
    const rows: string[][] = [];
    rows.push(['OPÉRATIONS CAISSE DU JOUR']);
    rows.push([dateFormatee]);
    rows.push([]);

    rows.push(['Loyers_Encaissés']);
    rows.push(['Locataire', 'Ref', 'Observation', 'Montant']);
    loyersEncaisses.forEach((m) => {
      rows.push([
        m.beneficiaireOuPayeur || m.beneficiaire || '—',
        m.justificatifRef || m.reference || m.ref || '—',
        m.moyenPaiementCode || '—',
        String(m.montant),
      ]);
    });
    rows.push(['', '', 'Total:', String(totalLoyers)]);
    rows.push([]);

    rows.push(['Autres Encaissements']);
    rows.push(['Nature_Opération', 'Montant']);
    autresEncaissements.forEach((m) => {
      rows.push([m.description || m.libelle || '—', String(m.montant)]);
    });
    rows.push(['Total:', String(totalAutresEnc)]);
    rows.push([]);

    rows.push(['Décaissements à la Charge du Propriétaire']);
    rows.push(['Nature_Opération', 'Montant']);
    decaissementsProprietaire.forEach((m) => {
      rows.push([m.description || m.libelle || '—', String(m.montant)]);
    });
    rows.push(['Total:', String(totalDecProp)]);
    rows.push([]);

    rows.push(['Autres Décaissements']);
    rows.push(['Nature_Opération', 'Montant']);
    autresDecaissements.forEach((m) => {
      rows.push([m.description || m.libelle || '—', String(m.montant)]);
    });
    rows.push(['Total:', String(totalAutresDec)]);
    rows.push([]);

    rows.push(['Solde']);
    rows.push(['Total Encaissement', String(totalEncaissement)]);
    rows.push(['Total Décaissement', String(totalDecaissement)]);
    rows.push(['Solde Caisse', String(soldeCaisse)]);

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `operations-caisse-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header (masqué à l'impression) */}
        <div className="p-5 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80 sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/20 text-[#E8D5B0] flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Rapport Opérations Caisse</h2>
              <p className="text-xs text-[#A8B4C4]">Date : {dateFormatee}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCSV}
              className="px-4 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] border border-[#C9A96E]/30 text-[#E8D5B0] font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Excel</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer / PDF</span>
            </button>
            <button onClick={onClose} className="p-2 rounded-lg text-[#A8B4C4] hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document imprimable */}
        <div className="p-8 bg-white text-neutral-900 overflow-y-auto print:p-4">
          <div className="print-page">
            {/* En-tête */}
            <div className="text-center border-b-2 border-neutral-900 pb-3 mb-4">
              <h1 className="text-xl font-black uppercase tracking-widest text-neutral-900 border-2 border-neutral-900 inline-block px-6 py-2">
                OPÉRATIONS CAISSE DU JOUR
              </h1>
              <div className="text-sm font-bold text-neutral-800 mt-2">{dateFormatee}</div>
            </div>

            {/* Loyers Encaissés */}
            <div className="mb-5">
              <div className="font-bold text-sm mb-1">Loyers_Encaissés</div>
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="border border-neutral-400">
                    <th className="p-1 text-left font-bold">Locataire</th>
                    <th className="p-1 text-left font-bold w-[60px]">Ref.</th>
                    <th className="p-1 text-left font-bold w-[80px]">Observation</th>
                    <th className="p-1 text-right font-bold w-[90px]">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {loyersEncaisses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-2 text-center text-neutral-400 italic border border-neutral-300">
                        Aucun encaissement
                      </td>
                    </tr>
                  ) : (
                    loyersEncaisses.map((m) => (
                      <tr key={m.id} className="border border-neutral-300">
                        <td className="p-1">{m.beneficiaireOuPayeur || m.beneficiaire || '—'}</td>
                        <td className="p-1 font-mono">{m.justificatifRef || m.reference?.slice(-6) || '—'}</td>
                        <td className="p-1">{m.moyenPaiementCode || '—'}</td>
                        <td className="p-1 text-right font-mono">{formatNumber(m.montant)}</td>
                      </tr>
                    ))
                  )}
                  <tr className="font-bold">
                    <td colSpan={3} className="p-1 text-right">Total :</td>
                    <td className="p-1 text-right font-mono border-t-2 border-neutral-900">
                      {formatNumber(totalLoyers)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Encaissement Contrat */}
            <div className="mb-5">
              <div className="font-bold text-sm mb-1">Encaissement Contrat</div>
              <div className="border border-neutral-300 p-2 text-[10px] italic text-neutral-400">
                (Aucun encaissement contrat enregistré)
              </div>
            </div>

            {/* Autres Encaissements */}
            <div className="mb-5">
              <div className="font-bold text-sm mb-1">Autres Encaissements</div>
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="border border-neutral-400">
                    <th className="p-1 text-left font-bold">Nature_Opération</th>
                    <th className="p-1 text-right font-bold w-[100px]">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {autresEncaissements.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="p-2 text-center text-neutral-400 italic border border-neutral-300">
                        Aucune opération
                      </td>
                    </tr>
                  ) : (
                    autresEncaissements.map((m) => (
                      <tr key={m.id} className="border border-neutral-300">
                        <td className="p-1">{m.description || m.libelle || '—'}</td>
                        <td className="p-1 text-right font-mono">{formatNumber(m.montant)}</td>
                      </tr>
                    ))
                  )}
                  <tr className="font-bold">
                    <td className="p-1 text-right">Total :</td>
                    <td className="p-1 text-right font-mono border-t-2 border-neutral-900">
                      {formatNumber(totalAutresEnc)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Décaissements Propriétaire */}
            <div className="mb-5">
              <div className="font-bold text-sm mb-1">Décaissements à la Charge du Propriétaire</div>
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="border border-neutral-400">
                    <th className="p-1 text-left font-bold">Nature_Opération</th>
                    <th className="p-1 text-right font-bold w-[100px]">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {decaissementsProprietaire.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="p-2 text-center text-neutral-400 italic border border-neutral-300">
                        Aucune opération
                      </td>
                    </tr>
                  ) : (
                    decaissementsProprietaire.map((m) => (
                      <tr key={m.id} className="border border-neutral-300">
                        <td className="p-1">{m.description || m.libelle || '—'}</td>
                        <td className="p-1 text-right font-mono">{formatNumber(m.montant)}</td>
                      </tr>
                    ))
                  )}
                  <tr className="font-bold">
                    <td className="p-1 text-right">Total :</td>
                    <td className="p-1 text-right font-mono border-t-2 border-neutral-900">
                      {formatNumber(totalDecProp)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Autres Décaissements */}
            <div className="mb-5">
              <div className="font-bold text-sm mb-1">Autres Décaissements</div>
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="border border-neutral-400">
                    <th className="p-1 text-left font-bold">Nature_Opération</th>
                    <th className="p-1 text-right font-bold w-[100px]">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {autresDecaissements.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="p-2 text-center text-neutral-400 italic border border-neutral-300">
                        Aucune opération
                      </td>
                    </tr>
                  ) : (
                    autresDecaissements.map((m) => (
                      <tr key={m.id} className="border border-neutral-300">
                        <td className="p-1">{m.description || m.libelle || '—'}</td>
                        <td className="p-1 text-right font-mono">{formatNumber(m.montant)}</td>
                      </tr>
                    ))
                  )}
                  <tr className="font-bold">
                    <td className="p-1 text-right">Total :</td>
                    <td className="p-1 text-right font-mono border-t-2 border-neutral-900">
                      {formatNumber(totalAutresDec)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Solde */}
            <div className="mt-8">
              <div className="font-bold text-sm mb-2">Solde</div>
              <table className="w-full text-[11px] border-collapse max-w-md">
                <tbody>
                  <tr className="border border-neutral-300">
                    <td className="p-1.5 bg-neutral-50 font-bold">Total Encaissement</td>
                    <td className="p-1.5 text-right font-mono font-bold">{formatNumber(totalEncaissement)}</td>
                  </tr>
                  <tr className="border border-neutral-300">
                    <td className="p-1.5 bg-neutral-50 font-bold">Total Décaissement</td>
                    <td className="p-1.5 text-right font-mono font-bold">{formatNumber(totalDecaissement)}</td>
                  </tr>
                  <tr className="border-2 border-neutral-900">
                    <td className="p-1.5 bg-neutral-900 text-white font-bold">Solde Caisse</td>
                    <td className="p-1.5 text-right font-mono font-black text-base">
                      {formatNumber(soldeCaisse)}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="text-[10px] italic text-neutral-600 mt-2">
                Arrêté à la somme de : <strong>{nombreEnLettres(soldeCaisse)} Francs CFA</strong>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-10 pt-3 border-t border-neutral-300 text-center text-[9px] text-neutral-500">
              Rapport généré le {new Date().toLocaleDateString('fr-FR')} à{' '}
              {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              {' '}par {currentUser.prenom} {currentUser.nom}
              <br />
              FITAL-IMMO SAS · RC : SN-DKR-2023.B.12158 · N.I.N.E.A : 0101576352V5
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};