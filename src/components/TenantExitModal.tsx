import React, { useState } from 'react';
import {
  LogOut,
  Building,
  DollarSign,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  X
} from 'lucide-react';
import { Tenant, Property, Inspection } from '../types';
import { formatCurrencyFCFA } from '../lib/calculations/financial';

interface TenantExitModalProps {
  tenant: Tenant;
  property?: Property;
  onConfirmExit: (data: {
    tenantId: string;
    bienId: string;
    dateSortie: string;
    inspection: Inspection;
    retenueCaution: number;
    restitutionCaution: number;
  }) => void;
  onClose: () => void;
}

export function TenantExitModal({
  tenant,
  property,
  onConfirmExit,
  onClose,
}: TenantExitModalProps) {
  const [dateSortie, setDateSortie] = useState(new Date().toISOString().split('T')[0]);
  const [agentNom, setAgentNom] = useState('Agent Constat FITAL-IMMO');
  const [cautionInitiale, setCautionInitiale] = useState(tenant.loyerMensuel * 2);
  const [coutDegradations, setCoutDegradations] = useState(35000);
  const [observations, setObservations] = useState(
    'Raccords peinture salon nécessaires et nettoyage rideaux.'
  );

  const retenue = Math.min(cautionInitiale, coutDegradations);
  const restitution = Math.max(0, cautionInitiale - retenue);

  const handleConfirm = () => {
    const inspectionExit: Inspection = {
      id: `insp-exit-${Date.now()}`,
      ref: `EDL-S-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      bienId: tenant.bienId,
      bienNom: tenant.bienNom,
      locataireId: tenant.id,
      locataireNom: `${tenant.prenom} ${tenant.nom}`,
      type: 'Sortie',
      date: dateSortie,
      agentNom,
      elements: [
        {
          nom: 'Murs & Peintures',
          etat: 'Moyen',
          commentaire: 'Traces et raccords à prévoir',
          coutReparationEstime: coutDegradations,
        },
      ],
      coutDegradations,
      retenueCaution: retenue,
      montantRestitueCaution: restitution,
      statut: 'Validé',
      commentairesGeneraux: observations,
    };

    onConfirmExit({
      tenantId: tenant.id,
      bienId: tenant.bienId,
      dateSortie,
      inspection: inspectionExit,
      retenueCaution: retenue,
      restitutionCaution: restitution,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#141E30] border border-[#2A3447] text-[#F0EDE8] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-[#2A3447]">
          <div className="flex items-center gap-2.5">
            <LogOut className="w-5 h-5 text-[#EF4444]" />
            <h2 className="text-lg font-bold text-[#F0EDE8]">
              Départ & Extraction Locataire
            </h2>
          </div>
          <button onClick={onClose} className="text-[#A0AEC0] hover:text-[#F0EDE8] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 bg-[#0A111D] border border-[#2A3447] rounded-xl text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#A0AEC0]">Locataire Sortant :</span>
              <span className="font-bold text-[#F0EDE8]">{tenant.prenom} {tenant.nom}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A0AEC0]">Logement Libéré :</span>
              <span className="font-bold text-[#C9A96E]">{tenant.bienNom}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A0AEC0]">Impact sur le Bien :</span>
              <span className="font-bold text-[#10B981]">Repasse au statut « Vacant »</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-[#A0AEC0] mb-1.5">
              Date Effective de Sortie / Remise des Clés
            </label>
            <input
              type="date"
              value={dateSortie}
              onChange={(e) => setDateSortie(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-[#A0AEC0] mb-1.5">
                Dépôt Caution Initial
              </label>
              <input
                type="number"
                value={cautionInitiale}
                onChange={(e) => setCautionInitiale(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-[#A0AEC0] mb-1.5">
                Coût Dégradations
              </label>
              <input
                type="number"
                value={coutDegradations}
                onChange={(e) => setCoutDegradations(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-[#A0AEC0] mb-1.5">
              Observations État des Lieux de Sortie
            </label>
            <textarea
              rows={2}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none"
            />
          </div>

          {/* Balance Calculation */}
          <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-1.5 text-xs">
            <div className="flex justify-between text-[#A0AEC0]">
              <span>Retenue pour réparations :</span>
              <span className="text-[#EF4444] font-bold">- {formatCurrencyFCFA(retenue)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-emerald-400 pt-1 border-t border-[#2A3447]">
              <span>Solde Caution à Restituer au Locataire :</span>
              <span>{formatCurrencyFCFA(restitution)}</span>
            </div>
          </div>
        </div>

        <div className="p-5 bg-[#0A111D] border-t border-[#2A3447] flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#141E30] hover:bg-[#1E2C44] text-[#A0AEC0] rounded-xl text-xs font-semibold cursor-pointer"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2.5 bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg"
          >
            <CheckCircle2 className="w-4 h-4" />
            Clôturer le Bail & Rendre le Bien Vacant
          </button>
        </div>
      </div>
    </div>
  );
}
