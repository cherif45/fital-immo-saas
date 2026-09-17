import React from 'react';
import { Printer, X, Wrench, Building, CheckCircle2, DollarSign } from 'lucide-react';
import { MaintenanceTicket, Property, Tenant, Owner } from '../types';
import { formatCurrency, formatNumber, formatDate, nombreEnLettres } from '../lib/utils';

interface MaintenanceWorkOrderModalProps {
  ticket: MaintenanceTicket | null;
  property?: Property;
  tenant?: Tenant;
  owner?: Owner;
  onClose: () => void;
}

export const MaintenanceWorkOrderModal: React.FC<MaintenanceWorkOrderModalProps> = ({
  ticket,
  property,
  tenant,
  owner,
  onClose,
}) => {
  if (!ticket) return null;

  const montantDefinitif = ticket.coutReel || ticket.coutEstime || 0;
  const montantLettres = nombreEnLettres(montantDefinitif);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Top action bar */}
        <div className="p-4 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80 no-print">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Wrench className="w-5 h-5 text-[#C9A96E]" />
            <span>Ordre de Service & Bon de Règlement Travaux #{ticket.ref || ticket.id.slice(0, 8)}</span>
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

        {/* Printable Document */}
        <div className="p-8 bg-white text-neutral-900 rounded-b-3xl font-sans print-container">
          {/* Header */}
          <div className="text-center border-b-2 border-neutral-900 pb-4 mb-5">
            <div className="text-xs font-black uppercase tracking-widest text-neutral-800">
              FITAL-IMMO SERVICES SARL
            </div>
            <div className="text-[10px] text-neutral-600 font-semibold uppercase tracking-wider">
              DÉPARTEMENT GESTION LOCATIVE, MAINTENANCE & TRAVAUX
            </div>
            <div className="inline-block mt-3 px-6 py-1.5 border-2 border-neutral-900 bg-neutral-100 rounded-lg">
              <h2 className="text-base font-black tracking-wider uppercase text-neutral-900">
                ORDRE D'INTERVENTION & BON DE RÈGLEMENT TRAVAUX
              </h2>
            </div>
            <div className="text-xs font-semibold text-neutral-700 mt-2">
              Réf : <span className="font-mono font-bold text-neutral-900">{ticket.ref || `TRV-${ticket.id.slice(0, 8)}`}</span> · Date :{' '}
              <strong>{formatDate(ticket.dateResolution || ticket.dateSignalement)}</strong>
            </div>
          </div>

          {/* Grid Metadata */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-neutral-50 border border-neutral-300 text-xs mb-5">
            <div>
              <div className="text-[10px] font-bold uppercase text-neutral-500">LOCALISATION DU BIEN & OCCUPANT</div>
              <div className="text-sm font-bold text-neutral-900 mt-0.5">{property?.nom || ticket.bienNom}</div>
              <div className="text-neutral-600">{property?.adresse || 'Adresse du bien'}</div>
              <div className="text-neutral-700 mt-1">
                Locataire en place : <strong>{tenant ? `${tenant.prenom} ${tenant.nom}` : ticket.locataireNom || 'N/A'}</strong>
              </div>
              <div className="text-neutral-600 text-[11px]">Tél Locataire : {tenant?.telephone || 'Non renseigné'}</div>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase text-neutral-500">PRESTATAIRE & IMPUTATION FINANCIÈRE</div>
              <div className="text-sm font-bold text-neutral-900 mt-0.5">
                Artisan : {ticket.artisanNom || ticket.prestataire || 'Artisan Référencé'}
              </div>
              <div className="text-neutral-700 mt-1">
                Propriétaire Bailleur : <strong>{owner ? `${owner.prenom} ${owner.nom}` : ticket.proprietaireNom || 'Gérance'}</strong>
              </div>
              <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                Imputation des frais : {ticket.imputableA || 'Propriétaire'}
              </div>
            </div>
          </div>

          {/* Nature of Works */}
          <div className="p-4 rounded-xl border border-neutral-300 mb-5 text-xs bg-white">
            <div className="text-[10px] font-bold uppercase text-neutral-500 mb-1">OBJET DE L'INTERVENTION TECHNIQUE</div>
            <div className="text-sm font-bold text-neutral-900 mb-2">{ticket.titre}</div>
            <div className="p-3 bg-neutral-50 rounded-lg text-neutral-700 border border-neutral-200 whitespace-pre-wrap leading-relaxed">
              {ticket.description}
            </div>
            {ticket.observationsReglement && (
              <div className="mt-2 text-[11px] text-neutral-600 italic">
                <strong>Observations d'exécution / Réception :</strong> {ticket.observationsReglement}
              </div>
            )}
          </div>

          {/* Financial Breakdown Table */}
          <table className="w-full text-left text-xs mb-5 border-collapse">
            <thead>
              <tr className="bg-neutral-900 text-white font-bold text-[10px] uppercase">
                <th className="py-2.5 px-3">Désignation des Prestations / Fournitures</th>
                <th className="py-2.5 px-3 text-center">Priorité</th>
                <th className="py-2.5 px-3 text-right">Coût Estimé</th>
                <th className="py-2.5 px-3 text-right">Coût Réel Réglé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 border-b border-neutral-300">
              <tr>
                <td className="py-3 px-3">
                  <div className="font-semibold text-neutral-900">{ticket.titre}</div>
                  <div className="text-[10px] text-neutral-500">
                    Facture artisan réf : {ticket.factureArtisanRef || 'Acquit sur bon de gérance'}
                  </div>
                </td>
                <td className="py-3 px-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 text-[10px] font-bold">
                    {ticket.priorite}
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-mono text-neutral-600">
                  {formatNumber(ticket.coutEstime)} FCFA
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-neutral-900">
                  {formatNumber(montantDefinitif)} FCFA
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="font-bold text-xs bg-neutral-100 border-t-2 border-neutral-900">
                <td className="py-2.5 px-3" colSpan={3}>
                  MONTANT TOTAL DES TRAVAUX TRAITÉS & RÉGLÉS
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-sm text-neutral-950">
                  {formatNumber(montantDefinitif)} FCFA
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Settlement Status Banner */}
          <div className="p-4 rounded-xl border-2 border-neutral-900 bg-neutral-50 flex items-center justify-between mb-4 text-xs">
            <div>
              <div className="font-bold text-neutral-900 uppercase">
                Statut : <span className="text-emerald-700">TRAITÉ ET RÉGLÉ</span>
              </div>
              <div className="text-neutral-600 mt-0.5">
                Mode de paiement : <strong>{ticket.modeReglement || 'Espèces (Caisse Agence)'}</strong> · Date règlement :{' '}
                <strong>{formatDate(ticket.dateReglement || ticket.dateResolution || ticket.dateSignalement)}</strong>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block">Total Net Réglé</span>
              <span className="text-xl font-black font-mono text-neutral-950">{formatNumber(montantDefinitif)} FCFA</span>
            </div>
          </div>

          {/* French amount */}
          <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-300 text-xs mb-6">
            <span className="font-semibold text-neutral-700">Arrêté le présent décompte de travaux à la somme de : </span>
            <span className="font-bold text-neutral-950 uppercase italic underline">
              {montantLettres}
            </span>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-4 border-t border-neutral-300 text-xs">
            <div className="border border-dashed border-neutral-400 p-4 rounded-xl min-h-[110px] flex flex-col justify-between">
              <div className="font-bold text-neutral-800 uppercase text-[10px]">
                Pour l'Artisan / Prestataire (Bon pour Réception & Paiement) :
              </div>
              <div className="text-[10px] text-neutral-500 italic mt-6">Signature & Date :</div>
            </div>
            <div className="border border-dashed border-neutral-400 p-4 rounded-xl min-h-[110px] flex flex-col justify-between">
              <div className="font-bold text-neutral-800 uppercase text-[10px]">
                Pour l'Agence FITAL-IMMO (Visa & Bon à Déduire/Imputer) :
              </div>
              <div className="text-[10px] text-neutral-500 italic mt-6">Signature de la Gérance & Cachet :</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
