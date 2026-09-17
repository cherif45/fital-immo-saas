import React from 'react';
import { FileSignature, Printer, X } from 'lucide-react';
import { LeaseContract } from '../types';
import { formatCurrency, formatNumber, formatDate, nombreEnLettres } from '../lib/utils';

interface LeaseContractModalProps {
  contract: LeaseContract;
  onClose: () => void;
}

export const LeaseContractModal: React.FC<LeaseContractModalProps> = ({ contract, onClose }) => {
  const totalMensuel = contract.loyerBase + contract.charges + contract.tva + contract.tom + (contract.tlv || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-3xl my-8 shadow-2xl overflow-hidden">
        {/* Modal Toolbar (hidden on print) */}
        <div className="p-4 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80 no-print">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <FileSignature className="w-5 h-5 text-[#C9A96E]" />
            <span>Contrat de Bail Officiel — {contract.ref}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#A8B4C4] hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Contract Document */}
        <div className="p-8 bg-white text-neutral-900 rounded-b-3xl font-sans text-xs print-container leading-relaxed space-y-4">
          <div className="text-center border-b-2 border-neutral-900 pb-3">
            <div className="text-xs font-bold uppercase tracking-widest text-neutral-700">
              RÉPUBLIQUE DU SÉNÉGAL
            </div>
            <h2 className="text-xl font-black uppercase tracking-wider text-neutral-900 mt-1">
              CONTRAT DE BAIL À USAGE {contract.typeContrat === 'Commercial' ? 'COMMERCIAL' : 'D\'HABITATION'}
            </h2>
            <div className="text-[10px] text-neutral-500 font-semibold uppercase">
              RÉFÉRENCE : {contract.ref} · MODÈLE AGRÉÉ OHADA / CODE DES OBLIGATIONS CIVILES ET COMMERCIALES DU SÉNÉGAL
            </div>
          </div>

          <div className="space-y-3">
            <p>
              <strong>ENTRE LES SOUSSIGNÉS :</strong>
            </p>
            <p className="pl-3 border-l-2 border-neutral-400">
              <strong>Le Bailleur :</strong> Représenté par le cabinet <strong>FITAL-IMMO SERVICES SARL</strong> (NINEA: 008945213 2V3),
              agissant en vertu d'un mandat exclusif de gérance, au nom et pour le compte du propriétaire <strong>{contract.proprietaireNom}</strong>.
            </p>
            <p className="pl-3 border-l-2 border-neutral-400">
              <strong>Le Preneur (Locataire) :</strong> <strong>{contract.locataireNom}</strong>,
              titulaire du bail relatif au local désigné ci-après.
            </p>

            <div className="font-bold uppercase text-[11px] pt-2 text-neutral-900 border-t border-neutral-200">
              ARTICLE 1 : DÉSIGNATION DU BIEN LOUÉ
            </div>
            <p>
              Le bailleur donne en location au preneur, qui accepte, les locaux ci-après désignés :{' '}
              <strong>{contract.bienNom}</strong>, situé à Dakar, avec toutes ses aisances et dépendances.
            </p>

            <div className="font-bold uppercase text-[11px] pt-2 text-neutral-900 border-t border-neutral-200">
              ARTICLE 2 : DURÉE ET PRISE D'EFFET
            </div>
            <p>
              Le présent bail est consenti pour une durée ferme de <strong>un (1) an renouvelable</strong> par tacite reconduction,
              prenant effet à compter du <strong>{formatDate(contract.dateDebut)}</strong> pour
              expirer le <strong>{formatDate(contract.dateFin)}</strong>.
            </p>

            <div className="font-bold uppercase text-[11px] pt-2 text-neutral-900 border-t border-neutral-200">
              ARTICLE 3 : LOYER, CHARGES ET TAXES
            </div>
            <div className="p-3 bg-neutral-100 rounded-lg border border-neutral-300">
              <div className="grid grid-cols-2 gap-2">
                <div>Loyer mensuel principal : <strong>{formatNumber(contract.loyerBase)} FCFA</strong></div>
                <div>Provisions charges locatives : <strong>{formatNumber(contract.charges)} FCFA</strong></div>
                <div>Taxes applicables (TOM/TVA) : <strong>{formatNumber(contract.tva + contract.tom + (contract.tlv || 0))} FCFA</strong></div>
                <div>Total mensuel exigible d'avance : <strong>{formatCurrency(totalMensuel)}</strong></div>
              </div>
              <div className="mt-2 text-[11px] italic text-neutral-700">
                Arrêté le loyer mensuel charges comprises à la somme de : <strong>{nombreEnLettres(totalMensuel)}</strong>.
              </div>
            </div>

            <div className="font-bold uppercase text-[11px] pt-2 text-neutral-900 border-t border-neutral-200">
              ARTICLE 4 : DÉPÔT DE GARANTIE (CAUTION)
            </div>
            <p>
              À titre de garantie de l'exécution de ses obligations, le preneur a versé la somme de{' '}
              <strong>{formatCurrency(contract.cautionMontant)}</strong> correspondant à{' '}
              {contract.cautionMois} mois de loyer. Cette somme est consignée et sera restituée en fin de bail après
              état des lieux de sortie contradictoire et apurement complet de toute dette locative.
            </p>

            <div className="font-bold uppercase text-[11px] pt-2 text-neutral-900 border-t border-neutral-200">
              ARTICLE 5 : CLAUSE RÉSOLUTOIRE ET LOI APPLICABLE
            </div>
            <p className="text-[11px] text-neutral-700">
              À défaut de paiement d'un seul terme de loyer à son échéance (au plus tard le 5 de chaque mois), ou en cas d'inexécution de l'une des clauses du présent contrat, le bail sera résilié de plein droit un mois après un commandement de payer demeuré infructueux, conformément aux dispositions de la législation sénégalaise en vigueur.
            </p>
          </div>

          {/* Signatures & Cachets */}
          <div className="grid grid-cols-2 gap-8 pt-6 mt-6 border-t-2 border-neutral-900">
            <div>
              <div className="font-bold text-neutral-800">Le Locataire (Preneur) :</div>
              <div className="h-16 border border-dashed border-neutral-400 rounded-lg mt-2 p-1">
                <span className="text-[10px] text-neutral-400 italic">Signature précédée de la mention manuscrite "Lu et approuvé"</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-neutral-800">Pour la Gérance FITAL-IMMO :</div>
              <div className="h-16 border border-dashed border-neutral-400 rounded-lg mt-2 p-1 flex items-center justify-center">
                <span className="text-[10px] font-black text-amber-800 uppercase">★ CACHET & SIGNATURE AGRÉÉE ★</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
