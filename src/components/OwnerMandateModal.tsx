import React from 'react';
import {
  FileText,
  Printer,
  X,
  Building,
  User,
  ShieldCheck,
  Calendar,
  Percent,
  Download,
} from 'lucide-react';
import { Owner, Property, AgencySettings } from '../types';
import { formatCurrency, formatNumber, formatDate, nombreEnLettres } from '../lib/utils';

interface OwnerMandateModalProps {
  owner: Owner | null;
  properties: Property[];
  agencySettings?: AgencySettings;
  onClose: () => void;
}

export const OwnerMandateModal: React.FC<OwnerMandateModalProps> = ({
  owner,
  properties,
  agencySettings,
  onClose,
}) => {
  if (!owner) return null;

  const ownerProperties = properties.filter((p) => p.proprietaireId === owner.id);
  const totalPotential = ownerProperties.reduce((sum, p) => sum + (p.loyerBase || 0), 0);

  const agencyName = agencySettings?.nomAgence || 'FITAL-IMMO SERVICES SARL';
  const agencyPhone = agencySettings?.telephone || '+221 33 820 00 00';
  const agencyEmail = agencySettings?.email || 'contact@fital-immo.sn';
  const agencyAddress = agencySettings?.adresse || 'Avenue Cheikh Anta Diop, Dakar';
  const agencyNinea = agencySettings?.ninea || '008920194 2V8';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#162133] border border-[#C9A96E]/40 rounded-3xl w-full max-w-4xl max-h-[94vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Top Bar (Hidden on Print) */}
        <div className="p-4 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/90 no-print rounded-t-3xl">
          <div className="flex items-center gap-2.5 text-white font-bold text-sm">
            <FileText className="w-5 h-5 text-[#C9A96E]" />
            <span>Mandat Exclusif de Gérance Immobilière — {owner.mandatGerance}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer / Télécharger PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#A8B4C4] hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Contract Document */}
        <div className="p-8 sm:p-12 bg-white text-neutral-900 font-sans text-xs print-container leading-relaxed space-y-5 rounded-b-3xl">
          {/* Header */}
          <div className="border-b-2 border-neutral-900 pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-black tracking-tight text-neutral-950 uppercase">
                  {agencyName}
                </h1>
                <p className="text-[10px] text-neutral-600 font-medium mt-0.5">
                  Gestion Immobilière, Syndic de Copropriété & Recouvrement
                </p>
                <p className="text-[10px] text-neutral-500">
                  {agencyAddress} · Tél : {agencyPhone} · Email : {agencyEmail}
                </p>
                <p className="text-[9px] text-neutral-400 font-mono">
                  NINEA : {agencyNinea} · RCCM : SN.DKR.2023.B.14890
                </p>
              </div>

              <div className="text-right">
                <div className="inline-block px-3 py-1 bg-neutral-900 text-white font-mono font-bold text-xs uppercase tracking-wider rounded">
                  {owner.mandatGerance}
                </div>
                <p className="text-[10px] text-neutral-600 mt-1">
                  Date d’effet : <strong>{formatDate(owner.dateMandat || new Date().toISOString())}</strong>
                </p>
              </div>
            </div>

            <div className="text-center mt-4 pt-3 border-t border-neutral-300">
              <div className="text-[11px] font-bold uppercase tracking-widest text-neutral-600">
                RÉPUBLIQUE DU SÉNÉGAL
              </div>
              <h2 className="text-lg font-black uppercase tracking-wider text-neutral-900 mt-0.5">
                MANDAT EXCLUSIF DE GÉRANCE & D’ADMINISTRATION DE BIENS
              </h2>
              <div className="text-[10px] text-neutral-500 font-semibold uppercase">
                Réglementé par le Code des Obligations Civiles et Commerciales (COCC) du Sénégal
              </div>
            </div>
          </div>

          {/* Parties */}
          <div className="space-y-3 text-[11px]">
            <p className="font-bold text-neutral-900 uppercase">ENTRE LES SOUSSIGNÉS :</p>
            
            <div className="pl-3 border-l-2 border-neutral-900 space-y-1">
              <p>
                <strong>LE MANDANT (Propriétaire Bailleur) :</strong>
              </p>
              <p className="font-semibold text-neutral-950 text-xs">
                {owner.prenom} {owner.nom}
              </p>
              <p className="text-neutral-700">
                Demeurant à : {owner.adresse || 'Dakar, Sénégal'} · Téléphone : <strong>{owner.telephone}</strong> · Email : {owner.email}
              </p>
              <p className="text-neutral-600 font-mono text-[10px]">
                Coordonnées bancaires : {owner.banque} — Compte : {owner.compteBancaire || 'Non renseigné'}
              </p>
            </div>

            <div className="pl-3 border-l-2 border-amber-600 space-y-1">
              <p>
                <strong>LE MANDATAIRE (La Gérance Immobilière) :</strong>
              </p>
              <p className="font-semibold text-neutral-950 text-xs">
                {agencyName}
              </p>
              <p className="text-neutral-700">
                Représenté par sa Direction Générale, dûment habilitée aux fins des présentes.
              </p>
            </div>
          </div>

          {/* Clauses */}
          <div className="space-y-3.5 text-[11px] pt-2">
            <div>
              <div className="font-bold uppercase text-neutral-900 border-b border-neutral-300 pb-0.5">
                ARTICLE 1 : OBJET DU MANDAT & BIENS CONFIÉS
              </div>
              <p className="mt-1">
                Le Mandant confie au Mandataire, qui l’accepte à titre exclusif, la gestion administrative, locative, comptable et financière des biens immobiliers suivants :
              </p>
              
              <div className="mt-2 border border-neutral-300 rounded overflow-hidden">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-neutral-100 text-neutral-700 uppercase font-semibold border-b border-neutral-300">
                    <tr>
                      <th className="p-2">Réf & Nom du Lot</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">Adresse / Quartier</th>
                      <th className="p-2 text-right">Loyer Mensuel Estimé</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {ownerProperties.length > 0 ? (
                      ownerProperties.map((p) => (
                        <tr key={p.id}>
                          <td className="p-2 font-medium">{p.ref} — {p.nom}</td>
                          <td className="p-2">{p.type}</td>
                          <td className="p-2">{p.quartier}, {p.ville}</td>
                          <td className="p-2 text-right font-mono font-bold">{formatCurrency(p.loyerBase)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-2 text-center text-neutral-500 italic">
                          Ensemble du patrimoine immobilier rattaché au mandat {owner.mandatGerance}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="font-bold uppercase text-neutral-900 border-b border-neutral-300 pb-0.5">
                ARTICLE 2 : MISSIONS ET POUVOIRS DU MANDATAIRE
              </div>
              <ul className="list-disc list-inside mt-1 space-y-1 text-neutral-800">
                <li>Rechercher des locataires solvables et vérifier scrupuleusement leurs garanties financières.</li>
                <li>Rédiger et faire enregistrer les contrats de bail aux normes légales de la République du Sénégal.</li>
                <li>Établir les états des lieux d'entrée et de sortie contradictoires certifiés avec inventaire photographique.</li>
                <li>Percevoir les loyers, charges locatives, taxes légales (TOM, TVA, TLV) et cautions de garantie.</li>
                <li>Éditer et délivrer les quittances de loyer officielles et sécurisées avec QR Code d'authentification.</li>
                <li>Assurer le recouvrement amiable et engager, en cas de défaut, les poursuites et procédures d'expulsion requises.</li>
              </ul>
            </div>

            <div>
              <div className="font-bold uppercase text-neutral-900 border-b border-neutral-300 pb-0.5">
                ARTICLE 3 : COMMISSION DE GÉRANCE & RÉMUNÉRATION
              </div>
              <p className="mt-1">
                En contrepartie de l'accomplissement de sa mission, le Mandataire percevra des honoraires de gestion fixés à :{' '}
                <strong className="text-neutral-950 font-mono text-xs">{owner.tauxCommission}% HT</strong> sur les sommes brutes effectivement recouvrées au titre des loyers.
              </p>
            </div>

            <div>
              <div className="font-bold uppercase text-neutral-900 border-b border-neutral-300 pb-0.5">
                ARTICLE 4 : REDDITION DES COMPTES & REVERSEMENTS
              </div>
              <p className="mt-1">
                Les loyers encaissés, déduction faite de la commission de gérance et des éventuelles réparations locatives justifiées, sont reversés mensuellement au Mandant le 10 de chaque mois, accompagnés d'un <strong>Bulletin de Versement Propriétaire</strong> détaillé et certifié.
              </p>
            </div>

            <div>
              <div className="font-bold uppercase text-neutral-900 border-b border-neutral-300 pb-0.5">
                ARTICLE 5 : DURÉE DU MANDAT
              </div>
              <p className="mt-1">
                Le présent mandat est consenti pour une durée ferme de <strong>un (1) an renouvelable par tacite reconduction</strong>, sauf préavis de dénonciation notifié par lettre recommandée trois (3) mois avant l'échéance.
              </p>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-6 mt-4 border-t-2 border-neutral-900 text-[11px]">
            <div>
              <div className="font-bold text-neutral-900">Le Mandant (Propriétaire Bailleur) :</div>
              <div className="text-[10px] text-neutral-500 italic mt-0.5">
                Précédé de la mention manuscrite « Bon pour mandat de gérance exclusif »
              </div>
              <div className="h-20 border border-dashed border-neutral-400 rounded-lg mt-2 p-2 flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-neutral-800">{owner.prenom} {owner.nom}</span>
                <span className="text-[9px] text-neutral-400">Date et Signature :</span>
              </div>
            </div>

            <div className="text-right">
              <div className="font-bold text-neutral-900">Pour le Mandataire (L'Agence FITAL-IMMO) :</div>
              <div className="text-[10px] text-neutral-500 italic mt-0.5">
                La Direction Générale
              </div>
              <div className="h-20 border border-dashed border-neutral-400 rounded-lg mt-2 p-2 flex flex-col justify-center items-center bg-neutral-50">
                <span className="text-[10px] font-black text-amber-900 uppercase">
                  ★ CACHET & VISA OFFICIEL FITAL-IMMO ★
                </span>
                <span className="text-[9px] text-neutral-500 mt-1 font-mono">
                  Dakar, le {formatDate(owner.dateMandat || new Date().toISOString())}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
