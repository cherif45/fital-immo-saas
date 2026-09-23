import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Building2,
  User,
  FileText,
  Plus,
  Trash2,
  Calculator,
  Download,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Owner, Property, Building, Unit, Tenant, Payment, Invoice, MaintenanceTicket, OwnerDeduction, BulletinVersement } from '../types';
import { formatCurrency, formatNumber } from '../lib/utils';

interface OwnerBulletinModalProps {
  owner: Owner;
  properties: Property[];
  buildings: Building[];
  units: Unit[];
  tenants: Tenant[];
  payments: Payment[];
  invoices: Invoice[];
  maintenance: MaintenanceTicket[];
  deductions: OwnerDeduction[];
  selectedPeriod: string;
  onClose: () => void;
  onSaveDeduction?: (deduction: OwnerDeduction) => void;
  onDeleteDeduction?: (deductionId: string) => void;
  onSaveBulletin?: (bulletin: BulletinVersement) => void;
}

export const OwnerBulletinModal: React.FC<OwnerBulletinModalProps> = ({
  owner,
  properties,
  buildings,
  units,
  tenants,
  payments,
  invoices,
  maintenance,
  deductions,
  selectedPeriod,
  onClose,
  onSaveDeduction,
  onDeleteDeduction,
  onSaveBulletin,
}) => {
  const [showDeductionForm, setShowDeductionForm] = useState(false);
  const [deductionType, setDeductionType] = useState<'FACTURE' | 'PRET' | 'CREDIT' | 'REQUISITION' | 'AUTRE'>('FACTURE');
  const [deductionLibelle, setDeductionLibelle] = useState('');
  const [deductionMontant, setDeductionMontant] = useState(0);
  const [deductionRef, setDeductionRef] = useState('');
  const [deductionNotes, setDeductionNotes] = useState('');

  // ============================================================
  // RÉCUPÉRATION DES BIENS DU PROPRIÉTAIRE
  // ============================================================
  const ownerProperties = properties.filter((p) => p.proprietaireId === owner.id);
  const ownerBuildings = buildings.filter((b) => b.proprietaireId === owner.id);

  // Tous les espaces louables du propriétaire (units + properties)
  const ownerUnits = units.filter((u) => u.proprietaireId === owner.id);

  // ============================================================
  // CALCUL DES LOYERS DU MOIS
  // ============================================================
  // 1. Loyers venant des PROPERTIES (biens simples)
  const propertyLoyers = ownerProperties.map((prop) => {
    const tenant = tenants.find((t) => t.bienId === prop.id && !t.dateSortie);
    const payment = payments.find(
      (p) => p.bienId === prop.id && p.periode === selectedPeriod && p.statut === 'Payé'
    );
    return {
      bienId: prop.id,
      bienNom: prop.nom,
      type: prop.type,
      locataire: tenant ? `${tenant.prenom} ${tenant.nom}` : '—',
      loyerBase: prop.loyerBase || 0,
      charges: prop.charges || 0,
      montantPaye: payment?.montantPaye || 0,
      loyerAttendu: (prop.loyerBase || 0) + (prop.charges || 0),
    };
  });

  // 2. Loyers venant des UNITS (espaces d'immeubles)
  const unitLoyers = ownerUnits.map((unit) => {
    const tenant = tenants.find((t) => t.id === unit.locataireActuelId);
    const payment = payments.find(
      (p) => p.bienId === unit.id && p.periode === selectedPeriod && p.statut === 'Payé'
    );
    return {
      bienId: unit.id,
      bienNom: unit.nom,
      buildingNom: unit.buildingNom || buildings.find((b) => b.id === unit.buildingId)?.nom || '',
      type: unit.type,
      locataire: tenant ? `${tenant.prenom} ${tenant.nom}` : '—',
      loyerBase: unit.loyerBase || 0,
      charges: unit.charges || 0,
      montantPaye: payment?.montantPaye || 0,
      loyerAttendu: (unit.loyerBase || 0) + (unit.charges || 0),
    };
  });

  const allLoyers = [...propertyLoyers, ...unitLoyers];

  // ============================================================
  // CALCUL DES TOTAUX
  // ============================================================
  const totalLoyersBruts = allLoyers.reduce((sum, l) => sum + l.montantPaye, 0);
  const tauxCommission = owner.tauxCommission || 10;
  const totalCommission = Math.round((totalLoyersBruts * tauxCommission) / 100);
  const totalTvaCommission = Math.round(totalCommission * 0.18);

  // Déductions
  const ownerDeductions = deductions.filter(
    (d) => d.proprietaireId === owner.id && d.periode === selectedPeriod
  );
  const totalDecaissements = ownerDeductions.reduce((sum, d) => sum + d.montant, 0);

  // Factures du propriétaire (dans la période)
  const ownerInvoices = invoices.filter(
    (inv) => inv.proprietaireId === owner.id && inv.periode === selectedPeriod && inv.statut !== 'Payée'
  );
  const totalFactures = ownerInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

  // Travaux imputés au propriétaire
  const ownerMaintenance = maintenance.filter(
    (m) =>
      m.proprietaireId === owner.id &&
      m.imputableA === 'Propriétaire' &&
      m.dateSignalement?.startsWith(selectedPeriod.split(' ')[1] || '') // filtre basique
  );
  const totalTravaux = ownerMaintenance.reduce((sum, m) => sum + (m.coutReel || m.coutEstime || 0), 0);

  // Net à reverser
  const netAReverser = Math.max(
    0,
    totalLoyersBruts - totalCommission - totalDecaissements - totalFactures - totalTravaux
  );

  // ============================================================
  // GESTION DES DÉDUCTIONS
  // ============================================================
  const handleAddDeduction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deductionLibelle || deductionMontant <= 0) {
      alert('Veuillez remplir le libellé et le montant.');
      return;
    }
    if (!onSaveDeduction) return;

    const newDeduction: OwnerDeduction = {
      id: crypto.randomUUID(),
      proprietaireId: owner.id,
      periode: selectedPeriod,
      typeDeduction: deductionType,
      libelle: deductionLibelle,
      montant: deductionMontant,
      referenceDocument: deductionRef || undefined,
      dateDeduction: new Date().toISOString().split('T')[0],
      notes: deductionNotes || undefined,
    };

    onSaveDeduction(newDeduction);
    setShowDeductionForm(false);
    setDeductionLibelle('');
    setDeductionMontant(0);
    setDeductionRef('');
    setDeductionNotes('');
  };

  const handleDeleteDeduction = (id: string) => {
    if (!onDeleteDeduction) return;
    if (window.confirm('Supprimer cette déduction ?')) {
      onDeleteDeduction(id);
    }
  };

  // ============================================================
  // IMPRESSION
  // ============================================================
  const handlePrint = () => {
    window.print();
  };

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-6xl max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80 sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/20 text-[#E8D5B0] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Bulletin de Versement — {owner.prenom} {owner.nom}
              </h2>
              <p className="text-xs text-[#A8B4C4]">
                Période : {selectedPeriod} · Taux commission : {tauxCommission}%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
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
        <div className="p-8 bg-white text-neutral-900 overflow-y-auto print:p-4">
          {/* En-tête Bulletin */}
          <div className="text-center border-b-2 border-neutral-900 pb-3 mb-6">
            <h1 className="text-2xl font-black uppercase tracking-wide text-neutral-900">
              BULLETIN DE VERSEMENT
            </h1>
            <div className="text-sm text-neutral-700 font-bold mt-1">
              FITAL-IMMO · Gestion Immobilière & Recouvrement
            </div>
            <div className="text-xs text-neutral-600 mt-0.5">
              Dakar, Sénégal · NINEA : 008920194 2V8
            </div>
          </div>

          {/* Infos Propriétaire & Période */}
          <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
            <div className="border border-neutral-300 rounded-lg p-4 bg-neutral-50">
              <div className="text-[10px] uppercase font-bold text-neutral-500 mb-1">
                Propriétaire Bénéficiaire
              </div>
              <div className="text-lg font-bold text-neutral-900">
                {owner.prenom} {owner.nom}
              </div>
              <div className="text-xs text-neutral-600 mt-1">
                Tél : {owner.telephone}
              </div>
              {owner.banque && (
                <div className="text-xs text-neutral-600">
                  Banque : {owner.banque}
                </div>
              )}
              {owner.compteBancaire && (
                <div className="text-xs text-neutral-600 font-mono">
                  Compte : {owner.compteBancaire}
                </div>
              )}
            </div>

            <div className="border border-neutral-300 rounded-lg p-4 bg-neutral-50">
              <div className="text-[10px] uppercase font-bold text-neutral-500 mb-1">
                Période du Bulletin
              </div>
              <div className="text-lg font-bold text-neutral-900">
                {selectedPeriod}
              </div>
              <div className="text-xs text-neutral-600 mt-1">
                Taux de commission : <strong>{tauxCommission}%</strong>
              </div>
              <div className="text-xs text-neutral-600">
                Date d'émission : {new Date().toLocaleDateString('fr-FR')}
              </div>
              <div className="text-xs text-neutral-600">
                Référence : BV-{new Date().getFullYear()}-
                {String(new Date().getMonth() + 1).padStart(2, '0')}-
                {owner.nom.slice(0, 4).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Tableau des Loyers */}
          <div className="mb-6">
            <h2 className="text-sm font-black uppercase text-neutral-900 mb-2 border-b border-neutral-300 pb-1">
              1. DÉTAIL DES LOYERS ENCAISSÉS
            </h2>

            <table className="w-full text-xs border border-neutral-300">
              <thead>
                <tr className="bg-neutral-800 text-white">
                  <th className="p-2 text-left font-bold border-r border-neutral-600">
                    N°
                  </th>
                  <th className="p-2 text-left font-bold border-r border-neutral-600">
                    Bien / Immeuble
                  </th>
                  <th className="p-2 text-left font-bold border-r border-neutral-600">
                    Type
                  </th>
                  <th className="p-2 text-left font-bold border-r border-neutral-600">
                    Locataire
                  </th>
                  <th className="p-2 text-right font-bold border-r border-neutral-600">
                    Loyer Attendu
                  </th>
                  <th className="p-2 text-right font-bold">
                    Montant Encaissé
                  </th>
                </tr>
              </thead>
              <tbody>
                {allLoyers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-neutral-500 italic">
                      Aucun loyer encaissé pour cette période
                    </td>
                  </tr>
                ) : (
                  allLoyers.map((l, idx) => (
                    <tr key={l.bienId} className="border-b border-neutral-200">
                      <td className="p-2 text-neutral-700 border-r border-neutral-200">
                        {idx + 1}
                      </td>
                      <td className="p-2 text-neutral-900 border-r border-neutral-200">
                        <strong>{l.bienNom}</strong>
                        {'buildingNom' in l && l.buildingNom && (
                          <div className="text-[10px] text-neutral-500">
                            ({l.buildingNom})
                          </div>
                        )}
                      </td>
                      <td className="p-2 text-neutral-600 border-r border-neutral-200">
                        {l.type}
                      </td>
                      <td className="p-2 text-neutral-800 border-r border-neutral-200">
                        {l.locataire}
                      </td>
                      <td className="p-2 text-right text-neutral-700 font-mono border-r border-neutral-200">
                        {formatNumber(l.loyerAttendu)} F
                      </td>
                      <td className="p-2 text-right text-neutral-900 font-bold font-mono">
                        {formatNumber(l.montantPaye)} F
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-neutral-100 font-bold border-t-2 border-neutral-400">
                  <td colSpan={5} className="p-2 text-right text-neutral-900 border-r border-neutral-300">
                    TOTAL LOYERS BRUTS
                  </td>
                  <td className="p-2 text-right text-neutral-900 font-mono text-sm">
                    {formatNumber(totalLoyersBruts)} FCFA
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Section Déductions */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2 border-b border-neutral-300 pb-1">
              <h2 className="text-sm font-black uppercase text-neutral-900">
                2. DÉDUCTIONS & DÉCAISSEMENTS
              </h2>
              <button
                onClick={() => setShowDeductionForm(true)}
                className="print:hidden px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Ajouter déduction
              </button>
            </div>

            <table className="w-full text-xs border border-neutral-300">
              <thead>
                <tr className="bg-neutral-800 text-white">
                  <th className="p-2 text-left font-bold border-r border-neutral-600">
                    Type
                  </th>
                  <th className="p-2 text-left font-bold border-r border-neutral-600">
                    Libellé
                  </th>
                  <th className="p-2 text-left font-bold border-r border-neutral-600">
                    Réf Document
                  </th>
                  <th className="p-2 text-right font-bold border-r border-neutral-600">
                    Montant
                  </th>
                  <th className="p-2 text-center font-bold print:hidden">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Déductions manuelles */}
                {ownerDeductions.length === 0 && ownerInvoices.length === 0 && ownerMaintenance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-neutral-500 italic">
                      Aucune déduction pour cette période
                    </td>
                  </tr>
                ) : (
                  <>
                    {ownerDeductions.map((d) => (
                      <tr key={d.id} className="border-b border-neutral-200">
                        <td className="p-2 text-neutral-700 border-r border-neutral-200 font-bold">
                          {d.typeDeduction}
                        </td>
                        <td className="p-2 text-neutral-800 border-r border-neutral-200">
                          {d.libelle}
                        </td>
                        <td className="p-2 text-neutral-500 font-mono border-r border-neutral-200">
                          {d.referenceDocument || '—'}
                        </td>
                        <td className="p-2 text-right text-rose-700 font-bold font-mono border-r border-neutral-200">
                          {formatNumber(d.montant)} F
                        </td>
                        <td className="p-2 text-center print:hidden">
                          <button
                            onClick={() => handleDeleteDeduction(d.id)}
                            className="p-1 rounded text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* Factures */}
                    {ownerInvoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-neutral-200 bg-amber-50">
                        <td className="p-2 text-amber-800 border-r border-neutral-200 font-bold">
                          FACTURE
                        </td>
                        <td className="p-2 text-neutral-800 border-r border-neutral-200">
                          {inv.type} — {inv.numero}
                        </td>
                        <td className="p-2 text-neutral-500 font-mono border-r border-neutral-200">
                          {inv.numero}
                        </td>
                        <td className="p-2 text-right text-rose-700 font-bold font-mono border-r border-neutral-200">
                          {formatNumber(inv.total)} F
                        </td>
                        <td className="p-2 text-center print:hidden text-[10px] text-neutral-500 italic">
                          Auto
                        </td>
                      </tr>
                    ))}

                    {/* Travaux */}
                    {ownerMaintenance.map((m) => (
                      <tr key={m.id} className="border-b border-neutral-200 bg-sky-50">
                        <td className="p-2 text-sky-800 border-r border-neutral-200 font-bold">
                          TRAVAUX
                        </td>
                        <td className="p-2 text-neutral-800 border-r border-neutral-200">
                          {m.titre}
                        </td>
                        <td className="p-2 text-neutral-500 font-mono border-r border-neutral-200">
                          {m.ref}
                        </td>
                        <td className="p-2 text-right text-rose-700 font-bold font-mono border-r border-neutral-200">
                          {formatNumber(m.coutReel || m.coutEstime)} F
                        </td>
                        <td className="p-2 text-center print:hidden text-[10px] text-neutral-500 italic">
                          Auto
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-neutral-100 font-bold border-t-2 border-neutral-400">
                  <td colSpan={3} className="p-2 text-right text-neutral-900 border-r border-neutral-300">
                    TOTAL DÉDUCTIONS
                  </td>
                  <td className="p-2 text-right text-rose-700 font-mono text-sm">
                    -{formatNumber(totalDecaissements + totalFactures + totalTravaux)} FCFA
                  </td>
                  <td className="print:hidden"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Section Récapitulatif */}
          <div className="mb-6 border-2 border-neutral-900 rounded-lg overflow-hidden">
            <div className="bg-neutral-900 text-white p-2 text-center text-sm font-black uppercase">
              3. RÉCAPITULATIF DU BULLETIN
            </div>

            <div className="grid grid-cols-2 text-xs">
              <div className="p-3 border-r border-b border-neutral-300 flex justify-between">
                <span className="text-neutral-600">Total Loyers Bruts :</span>
                <strong className="font-mono text-neutral-900">
                  {formatNumber(totalLoyersBruts)} F
                </strong>
              </div>
              <div className="p-3 border-b border-neutral-300 flex justify-between">
                <span className="text-neutral-600">Commission ({tauxCommission}%) :</span>
                <strong className="font-mono text-neutral-900">
                  -{formatNumber(totalCommission)} F
                </strong>
              </div>
              <div className="p-3 border-r border-b border-neutral-300 flex justify-between">
                <span className="text-neutral-600">TVA sur Commission (18%) :</span>
                <strong className="font-mono text-neutral-900">
                  -{formatNumber(totalTvaCommission)} F
                </strong>
              </div>
              <div className="p-3 border-b border-neutral-300 flex justify-between">
                <span className="text-neutral-600">Total Décaissements :</span>
                <strong className="font-mono text-rose-700">
                  -{formatNumber(totalDecaissements)} F
                </strong>
              </div>
              <div className="p-3 border-r border-b border-neutral-300 flex justify-between">
                <span className="text-neutral-600">Total Factures :</span>
                <strong className="font-mono text-rose-700">
                  -{formatNumber(totalFactures)} F
                </strong>
              </div>
              <div className="p-3 border-b border-neutral-300 flex justify-between">
                <span className="text-neutral-600">Total Travaux :</span>
                <strong className="font-mono text-rose-700">
                  -{formatNumber(totalTravaux)} F
                </strong>
              </div>
            </div>

            <div className="p-4 bg-neutral-900 text-white flex justify-between items-center">
              <span className="font-bold uppercase text-sm">
                NET À REVERSER AU PROPRIÉTAIRE :
              </span>
              <span className="font-black font-mono text-2xl">
                {formatNumber(netAReverser)} FCFA
              </span>
            </div>
          </div>

          {/* Montant en lettres */}
          <div className="mb-6 p-3 bg-neutral-50 border border-neutral-300 rounded text-xs italic">
            Arrêté le présent Bulletin à la somme de :{' '}
            <strong className="text-neutral-900 not-italic">
              {nombreEnLettres(netAReverser)} Francs CFA
            </strong>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 mt-12 pt-6 border-t border-neutral-300">
            <div>
              <div className="font-bold text-neutral-700 text-sm">
                Signature du Gérant :
              </div>
              <div className="h-20 border border-dashed border-neutral-400 rounded-lg mt-2"></div>
            </div>
            <div className="text-right">
              <div className="font-bold text-neutral-700 text-sm">
                Cachet & Signature de l'Agence :
              </div>
              <div className="h-20 border border-dashed border-neutral-400 rounded-lg mt-2"></div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-neutral-300 text-center text-[10px] text-neutral-500">
            FITAL-IMMO — Bulletin généré automatiquement le{' '}
            {new Date().toLocaleDateString('fr-FR')} à{' '}
            {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* Modal Ajout Déduction */}
        {showDeductionForm && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 print:hidden">
            <div className="bg-[#162133] border border-[#C9A96E]/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-bold text-white text-base">
                  Ajouter une Déduction
                </h3>
                <button
                  onClick={() => setShowDeductionForm(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddDeduction} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Type de déduction
                  </label>
                  <select
                    value={deductionType}
                    onChange={(e) => setDeductionType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  >
                    <option value="FACTURE">Facture (eau, électricité...)</option>
                    <option value="PRET">Prêt au propriétaire</option>
                    <option value="CREDIT">Crédit accordé</option>
                    <option value="REQUISITION">Réquisitionnement de loyer</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Libellé *
                  </label>
                  <input
                    type="text"
                    value={deductionLibelle}
                    onChange={(e) => setDeductionLibelle(e.target.value)}
                    required
                    placeholder="Ex: Prêt personnel août 2026"
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#C9A96E] uppercase mb-1">
                    Montant (FCFA) *
                  </label>
                  <input
                    type="number"
                    value={deductionMontant || ''}
                    onChange={(e) => setDeductionMontant(Number(e.target.value))}
                    required
                    min={1}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E] text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Référence document
                  </label>
                  <input
                    type="text"
                    value={deductionRef}
                    onChange={(e) => setDeductionRef(e.target.value)}
                    placeholder="Ex: FACT-2026-041"
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Notes
                  </label>
                  <textarea
                    value={deductionNotes}
                    onChange={(e) => setDeductionNotes(e.target.value)}
                    rows={2}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowDeductionForm(false)}
                    className="px-4 py-2 rounded-xl bg-[#1E2E45] text-slate-300"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold"
                  >
                    Ajouter
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

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