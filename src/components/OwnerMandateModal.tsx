import React from 'react';
import {
  FileText,
  Printer,
  X,
} from 'lucide-react';
import { Owner, Property, AgencySettings } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';

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

  const agencyName = agencySettings?.nomAgence || 'FITAL-IMMO SERVICES SARL';
  const agencyPhone = agencySettings?.telephone || '+221 33 820 00 00';
  const agencyEmail = agencySettings?.email || 'contact@fital-immo.sn';
  const agencyAddress = agencySettings?.adresse || 'Avenue Cheikh Anta Diop, Dakar';
  const agencyNinea = agencySettings?.ninea || '008920194 2V8';

  const mandateRef = owner.mandatGerance || `MANDAT-${new Date().getFullYear()}-${owner.nom.slice(0, 4).toUpperCase()}`;
  const dateMandat = owner.dateMandat || new Date().toISOString().split('T')[0];
  const tauxCommission = owner.tauxCommission || 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#162133] border border-[#C9A96E]/40 rounded-3xl w-full max-w-4xl max-h-[94vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Top Bar (Hidden on Print) */}
        <div className="p-4 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/90 no-print rounded-t-3xl sticky top-0 z-10">
          <div className="flex items-center gap-2.5 text-white font-bold text-sm">
            <FileText className="w-5 h-5 text-[#C9A96E]" />
            <span>Mandat de Gérance — {mandateRef}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#A8B4C4] hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document */}
        <div className="p-8 sm:p-12 bg-white text-neutral-900 font-sans text-xs print-container leading-relaxed space-y-5 rounded-b-3xl">
          {/* Header */}
          <div className="border-b-2 border-neutral-900 pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-black tracking-tight text-neutral-950 uppercase">
                  {agencyName}
                </h1>
                <p className="text-[10px] text-neutral-600 font-medium mt-0.5">
                  Gérance · Location · Vente · Achat · Recouvrement de Créances
                </p>
                <p className="text-[10px] text-neutral-500">
                  {agencyAddress} · Tél : {agencyPhone} · Email : {agencyEmail}
                </p>
                <p className="text-[9px] text-neutral-400 font-mono">
                  NINEA : {agencyNinea}
                </p>
              </div>

              <div className="text-right">
                <div className="inline-block px-3 py-1 bg-neutral-900 text-white font-mono font-bold text-xs uppercase tracking-wider rounded">
                  {mandateRef}
                </div>
                <p className="text-[10px] text-neutral-600 mt-1">
                  Date : <strong>{formatDate(dateMandat)}</strong>
                </p>
              </div>
            </div>

            <div className="text-center mt-4 pt-3 border-t border-neutral-300">
              <h2 className="text-lg font-black uppercase tracking-wider text-neutral-900 mt-0.5 underline">
                MANDAT DE GÉRANCE
              </h2>
            </div>
          </div>

          {/* Préambule */}
          <div className="space-y-3 text-[11px] text-justify">
                        <p>
              Je soussigné <strong>Monsieur/Madame {owner.prenom} {owner.nom}</strong>,
              {owner.cni && (
                <>
                  {' '}
                  {owner.typePiece === 'PASSEPORT' ? 'Passeport'
                    : owner.typePiece === 'CARTE_CONSULAIRE' ? 'Carte Consulaire'
                    : owner.typePiece === 'AUTRE' ? "Pièce d'identité"
                    : 'CNI'}{' '}
                  N° <strong>{owner.cni}</strong>,
                </>
              )}
              {!owner.cni && owner.ninea && <> NINEA N° <strong>{owner.ninea}</strong>,</>}
              Propriétaire,
            </p>
            <p>
              Certifie avoir mandaté l'agence <strong>{agencyName}</strong> sise à {agencyAddress},
              représentée par son Gérant, <strong>dûment habilité aux fins des présentes</strong>,
            </p>
            <p>
              Pour la gestion du patrimoine immobilier ci-après désigné :
            </p>

            {/* Tableau des biens */}
            <div className="mt-2 border border-neutral-300 rounded overflow-hidden">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-neutral-100 text-neutral-700 uppercase font-semibold border-b border-neutral-300">
                  <tr>
                    <th className="p-2">Réf & Nom du Lot</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Adresse / Quartier</th>
                    <th className="p-2 text-right">Loyer Mensuel</th>
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
                        Ensemble du patrimoine immobilier rattaché au mandat {mandateRef}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MISSIONS — Reproduites du document client */}
          <div className="space-y-3 text-[11px]">
            <div>
              <div className="font-bold uppercase text-neutral-900 border-b border-neutral-300 pb-0.5">
                MISSIONS CONFIÉES AU MANDATAIRE
              </div>
              <ul className="list-disc list-inside mt-2 space-y-1.5 text-neutral-800">
                <li>De <strong>veiller sur la maison</strong> et son patrimoine ;</li>
                <li>D'<strong>encaisser les loyers mensuels</strong> auprès des locataires ;</li>
                <li>De <strong>recouvrir les arriérés éventuels</strong> et faire les relances nécessaires ;</li>
                <li>De <strong>poursuivre les locataires qui ne sont pas en règle jusqu'à leur expulsion et d'en trouver d'autres</strong> ;</li>
                <li>De <strong>faire les réfections avec l'accord du propriétaire</strong>.</li>
              </ul>
            </div>

            <div>
              <div className="font-bold uppercase text-neutral-900 border-b border-neutral-300 pb-0.5 mt-4">
                CLAUSES FINANCIÈRES
              </div>
              <ul className="list-disc list-inside mt-2 space-y-1.5 text-neutral-800">
                <li>
                  Et tous ces frais seront à déduire du montant à verser. Les <strong>déclarations foncières, de revenus et fiscales</strong> sont faites par le propriétaire.
                </li>
                <li>
                  La <strong>commission de gérance</strong> est de <strong className="text-neutral-950 font-mono">{tauxCommission}%</strong> sur le montant total encaissé.
                </li>
                <li>
                  Ce présent mandat de gérance est conclu pour une <strong>durée indéterminée</strong> si aucune des parties n'exprime le désir d'y mettre fin. Avant la résiliation, la partie résiliante doit donner un <strong>préavis au moins de deux (2) mois par écrit</strong>.
                </li>
              </ul>
            </div>
          </div>

          {/* Mention finale */}
          <div className="text-[11px] italic text-neutral-700 pt-2">
            Fait en double à Dakar, le <strong>{formatDate(dateMandat)}</strong>
          </div>
          <div className="text-[10px] text-neutral-500 italic">
            Fait foi de quoi, il est établi pour servir et valoir ce que de droit.
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-6 mt-4 border-t-2 border-neutral-900 text-[11px]">
            <div>
              <div className="font-bold text-neutral-900">Le Propriétaire :</div>
              <div className="text-[10px] text-neutral-500 italic mt-0.5">
                Précédé de la mention « Lu et approuvé »
              </div>
              <div className="h-24 border border-dashed border-neutral-400 rounded-lg mt-2 p-2 flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-neutral-800">
                  {owner.prenom} {owner.nom}
                </span>
                <span className="text-[9px] text-neutral-400">Date et Signature :</span>
              </div>
            </div>

            <div className="text-right">
              <div className="font-bold text-neutral-900">Le Gérant :</div>
              <div className="text-[10px] text-neutral-500 italic mt-0.5">
                La Direction Générale
              </div>
              <div className="h-24 border border-dashed border-neutral-400 rounded-lg mt-2 p-2 flex flex-col justify-center items-center bg-neutral-50">
                <span className="text-[10px] font-black text-amber-900 uppercase">
                  ★ CACHET & VISA OFFICIEL ★
                </span>
                <span className="text-[9px] text-neutral-500 mt-1 font-mono">
                  {agencyName}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-3 border-t border-neutral-300 text-center text-[9px] text-neutral-500">
            {agencyName} · NINEA : {agencyNinea} · {agencyAddress} · Tél : {agencyPhone}
            <br />
            « La transparence, notre crédo »
          </div>
        </div>
      </div>
    </div>
  );
};