import React from 'react';
import { Printer, X, AlertTriangle } from 'lucide-react';
import { Tenant, Property, LeaseContract, AgencySettings } from '../types';
import { formatCurrency, formatNumber, formatDate } from '../lib/utils';

interface PaymentReminderLetterModalProps {
  tenant: Tenant;
  property?: Property;
  contract?: LeaseContract;
  settings?: AgencySettings;
  montantDu: number;
  penalites: number;
  joursRetard: number;
  periode: string;
  referencePaiementInitial?: string;
  onClose: () => void;
}

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

export const PaymentReminderLetterModal: React.FC<PaymentReminderLetterModalProps> = ({
  tenant,
  property,
  contract,
  settings,
  montantDu,
  penalites,
  joursRetard,
  periode,
  referencePaiementInitial,
  onClose,
}) => {
  const nomAgence = settings?.nomAgence || 'FITAL-IMMO';
  const slogan = settings?.slogan || 'Gérance · Location · Vente · Achat · Recouvrement';
  const ninea = settings?.ninea || '008920194 2V8';
  const adresse = settings?.adresse || 'Avenue Cheikh Anta Diop, Dakar';
  const telephone = settings?.standardTelephone || settings?.telephone || '+221 33 820 40 50';
  const email = settings?.email || 'contact@fital-immo.sn';

  const montantTotal = montantDu + penalites;
  const dateDuJour = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const dateLimite = new Date(Date.now() + 8 * 86400000).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const refContrat = contract?.ref || referencePaiementInitial || `BAIL-${tenant.id.slice(0, 6).toUpperCase()}`;
  const bienNom = property?.nom || tenant.bienNom || 'Logement';
  const bienAdresse = property?.adresse || '—';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#162133] border border-rose-500/30 rounded-3xl w-full max-w-3xl max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header (masqué à l'impression) */}
        <div className="p-4 border-b border-rose-500/20 flex items-center justify-between bg-[#1E2E45]/80 sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Lettre de Mise en Demeure Juridique
              </h2>
              <p className="text-xs text-[#A8B4C4]">
                Préalable obligatoire à toute procédure judiciaire
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
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
        <div className="p-8 sm:p-12 bg-white text-neutral-900 print:p-8">
          {/* En-tête Agence */}
          <div className="border-b-2 border-neutral-900 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-black uppercase text-neutral-900">
                  {nomAgence}
                </h1>
                <p className="text-[10px] text-neutral-600 font-medium mt-0.5">
                  {slogan}
                </p>
                <p className="text-[10px] text-neutral-500 mt-1">
                  {adresse}
                </p>
                <p className="text-[10px] text-neutral-500">
                  Tél : {telephone} · Email : {email}
                </p>
                <p className="text-[9px] text-neutral-400 font-mono">
                  NINEA : {ninea}
                </p>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-neutral-500">Réf. dossier :</div>
                <div className="font-mono font-bold text-neutral-900 text-xs">
                  {refContrat}
                </div>
                <div className="text-[10px] text-neutral-500 mt-1">
                  {dateDuJour}
                </div>
              </div>
            </div>
          </div>

          {/* Destinataire */}
          <div className="mb-8 text-sm">
            <div className="font-bold text-neutral-700 mb-1">À l'attention de :</div>
            <div className="font-bold text-neutral-900 text-base">
              {tenant.prenom} {tenant.nom}
            </div>
            <div className="text-neutral-700">
              {bienNom}
            </div>
            <div className="text-neutral-600 text-xs">
              {bienAdresse}
            </div>
            <div className="text-neutral-600 text-xs font-mono">
              Tél : {tenant.telephone}
            </div>
          </div>

          {/* Objet */}
          <div className="mb-6 p-3 bg-rose-50 border-l-4 border-rose-600">
            <div className="text-sm font-black uppercase text-rose-900 tracking-wide">
              OBJET : MISE EN DEMEURE DE PAYER
            </div>
            <div className="text-[11px] text-rose-800 mt-1">
              Lettre recommandée avec accusé de réception (LRAR) — Préalable obligatoire à toute action judiciaire
            </div>
          </div>

          {/* Corps */}
          <div className="space-y-4 text-sm text-neutral-800 leading-relaxed text-justify">
            <p>
              Madame, Monsieur,
            </p>

            <p>
              En notre qualité de mandataire de gestion du bien immobilier désigné ci-dessus,
              nous vous informons que votre compte locatif présente à ce jour un <strong>solde débiteur</strong>.
            </p>

            <p>
              En effet, malgré nos précédentes relances amiables, nous constatons que les loyers
              ci-après demeurent impayés :
            </p>

            {/* Tableau des montants */}
            <div className="border border-neutral-300 rounded my-4">
              <table className="w-full text-xs">
                <thead className="bg-neutral-100 border-b border-neutral-300">
                  <tr>
                    <th className="p-2 text-left font-bold text-neutral-700">Désignation</th>
                    <th className="p-2 text-right font-bold text-neutral-700">Montant (FCFA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  <tr>
                    <td className="p-2">Loyers impayés ({periode})</td>
                    <td className="p-2 text-right font-mono font-bold">
                      {formatNumber(montantDu)}
                    </td>
                  </tr>
                  {penalites > 0 && (
                    <tr>
                      <td className="p-2">Pénalités de retard ({joursRetard} jours — 10% du loyer)</td>
                      <td className="p-2 text-right font-mono font-bold text-rose-700">
                        {formatNumber(penalites)}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-neutral-100 font-black border-t-2 border-neutral-400">
                    <td className="p-2">TOTAL DÛ</td>
                    <td className="p-2 text-right font-mono text-sm">
                      {formatNumber(montantTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              Soit un total de <strong>{formatNumber(montantTotal)} FCFA</strong> ({nombreEnLettres(montantTotal)} Francs CFA).
            </p>

            <p>
              En conséquence, nous vous <strong>METTONS EN DEMEURE</strong> de nous régler
              l'intégralité de cette somme dans un délai de <strong>HUIT (8) JOURS</strong> à compter
              de la réception de la présente, soit au plus tard le <strong>{dateLimite}</strong>.
            </p>

            <p>
              Vous pouvez effectuer ce règlement :
            </p>
            <ul className="list-disc ml-6 space-y-1">
              <li>En espèces au guichet de l'agence ;</li>
              <li>Par virement bancaire sur le compte de l'agence ;</li>
              <li>Par Wave au <strong>{settings?.waveNumero || '+221 76 328 58 29'}</strong> ;</li>
              <li>Par Orange Money au code marchand <strong>{settings?.orangeMoneyCode || '784912'}</strong>.</li>
            </ul>

            <p className="font-bold text-rose-900 pt-3">
              À DÉFAUT DE RÈGLEMENT DANS CE DÉLAI :
            </p>

            <p>
              Nous serons contraints d'engager à votre encontre, sans nouvel avis, la
              <strong> procédure judiciaire de recouvrement forcé</strong> et de résiliation du bail
              devant les juridictions compétentes de Dakar, conformément :
            </p>

            <ul className="list-disc ml-6 space-y-1">
              <li>À l'Article 15 (clause résolutoire) du contrat de bail n° <strong>{refContrat}</strong> ;</li>
              <li>Au Code des Obligations Civiles et Commerciales (COCC) du Sénégal ;</li>
              <li>À la loi n° 2011-07 sur les baux à usage d'habitation.</li>
            </ul>

            <p className="font-bold text-rose-900">
              Les frais de procédure, de signification d'huissier et d'exécution resteront intégralement
              à votre charge.
            </p>

            <p className="pt-3">
              Nous espérons vivement que cette mise en demeure n'aura pas à être suivie d'effet et que
              vous procéderez au règlement dans le délai imparti.
            </p>

            <p>
              Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.
            </p>
          </div>

          {/* Signature */}
          <div className="mt-10 pt-6 border-t border-neutral-300">
            <div className="flex justify-end">
              <div className="text-center w-64">
                <div className="font-bold text-neutral-700 text-xs mb-2">
                  Pour {nomAgence}
                </div>
                <div className="text-[10px] text-neutral-500 italic mb-4">
                  La Direction Générale
                </div>
                <div className="h-24 border border-dashed border-neutral-400 rounded-lg"></div>
                <div className="text-[10px] text-neutral-500 mt-2">
                  Cachet & Signature
                </div>
              </div>
            </div>
          </div>

          {/* Mentions légales */}
          <div className="mt-8 pt-4 border-t border-neutral-300 text-[9px] text-neutral-500 space-y-1">
            <div className="font-bold text-neutral-700">MENTIONS LÉGALES :</div>
            <div>• La présente mise en demeure est établie en double exemplaire, dont un est adressé au locataire par lettre recommandée avec accusé de réception.</div>
            <div>• Copie est transmise au propriétaire bailleur du bien.</div>
            <div>• Ce document peut être produit en justice comme preuve du préalable obligatoire de mise en demeure.</div>
            <div>• Le défaut de paiement dans le délai imparti constitue une cause de résiliation du bail.</div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-3 border-t border-neutral-300 text-center text-[9px] text-neutral-500">
            {nomAgence} · NINEA : {ninea} · {adresse} · Tél : {telephone}
            <br />
            Document généré le {dateDuJour} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};