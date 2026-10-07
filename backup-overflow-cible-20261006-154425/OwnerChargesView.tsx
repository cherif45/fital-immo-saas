import React, { useState } from 'react';
import {
  WalletCards,
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  X,
  FileText,
  DollarSign,
  Users,
  AlertCircle,
} from 'lucide-react';
import { OwnerCharge, Owner, UserAccount, OwnerChargeType } from '../types';
import { formatCurrency, formatNumber, formatDate } from '../lib/utils';
import { paginateTable } from '../lib/supabase/service';

interface OwnerChargesViewProps {
  ownerCharges: OwnerCharge[];
  owners: Owner[];
  currentUser?: UserAccount;
  onAddOwnerCharge: (charge: OwnerCharge) => void;
  onDeleteOwnerCharge: (chargeId: string) => void;
}

const TYPE_CONFIG: Record<OwnerChargeType, { label: string; color: string; bg: string }> = {
  FACTURE: { label: 'Facture', color: 'text-amber-300', bg: 'bg-amber-500/20' },
  PRET: { label: 'Prêt', color: 'text-blue-300', bg: 'bg-blue-500/20' },
  CREDIT: { label: 'Crédit', color: 'text-purple-300', bg: 'bg-purple-500/20' },
  REQUISITION: { label: 'Réquisition', color: 'text-rose-300', bg: 'bg-rose-500/20' },
  TRAVAUX: { label: 'Travaux', color: 'text-cyan-300', bg: 'bg-cyan-500/20' },
  AUTRE: { label: 'Autre', color: 'text-slate-300', bg: 'bg-slate-500/20' },
};

export const OwnerChargesView: React.FC<OwnerChargesViewProps> = ({
  ownerCharges,
  owners,
  currentUser,
  onAddOwnerCharge,
  onDeleteOwnerCharge,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // 🆕 Pagination serveur
  const [serverCharges, setServerCharges] = useState<OwnerCharge[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [serverPage, setServerPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 50;

  React.useEffect(() => {
    if (!currentUser?.agencyId) return;
    loadChargesPage(0);
  }, [currentUser?.agencyId]);

  const loadChargesPage = async (page: number) => {
    if (!currentUser?.agencyId) return;
    setIsLoadingMore(true);
    const result = await paginateTable<any>('owner_charges', currentUser.agencyId, page, PAGE_SIZE);
    const mapped: OwnerCharge[] = result.data.map((r: any) => ({
      ...r,
      id: r.id,
      ownerId: r.owner_id || r.proprietaire_id,
      typeCharge: r.type_charge || 'AUTRE',
      proprietaireNom: r.proprietaire_nom || '—',
      libelle: r.libelle || r.description || '',
      montant: Number(r.montant) || 0,
      dateCharge: r.date_charge || r.created_at,
      referenceDocument: r.reference_document || null,
      periode: r.periode || '',
      statut: r.statut,
      notes: r.notes,
    }));
    if (page === 0) {
      setServerCharges(mapped);
    } else {
      setServerCharges(prev => [...prev, ...mapped]);
    }
    setServerTotal(result.total);
    setServerPage(page);
    setIsLoadingMore(false);
  };

  const displayCharges = serverCharges.length > 0 ? serverCharges : ownerCharges;

  // Form state
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [typeCharge, setTypeCharge] = useState<OwnerChargeType>('FACTURE');
  const [libelle, setLibelle] = useState('');
  const [montant, setMontant] = useState(0);
  const [referenceDocument, setReferenceDocument] = useState('');
  const [periode, setPeriode] = useState(new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
  const [dateCharge, setDateCharge] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Permissions
  const role = currentUser?.role || 'ADMIN';
  const canManage = ['ADMIN', 'SUPER_ADMIN', 'GESTIONNAIRE', 'CAISSIER'].includes(role);

  // Filtres
  const filteredCharges = displayCharges.filter((c) => {
    // Filtre par année
    if (yearFilter !== 'all') {
      const chargeYear = c.dateCharge ? new Date(c.dateCharge).getFullYear().toString() : '';
      if (chargeYear !== yearFilter) return false;
    }
    if (typeFilter !== 'all' && c.typeCharge !== typeFilter) return false;
    if (ownerFilter !== 'all' && c.proprietaireId !== ownerFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.libelle.toLowerCase().includes(q) ||
        (c.proprietaireNom || '').toLowerCase().includes(q) ||
        (c.referenceDocument || '').toLowerCase().includes(q) ||
        c.periode.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Stats
  const totalCharges = displayCharges.reduce((sum, c) => sum + c.montant, 0);
  const totalFactures = displayCharges.filter((c) => c.typeCharge === 'FACTURE').reduce((sum, c) => sum + c.montant, 0);
  const totalPretsCredits = displayCharges.filter((c) => c.typeCharge === 'PRET' || c.typeCharge === 'CREDIT').reduce((sum, c) => sum + c.montant, 0);

  // Handlers
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    if (!selectedOwnerId || !libelle || montant <= 0) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    const owner = owners.find((o) => o.id === selectedOwnerId);
    if (!owner) return;

    const newCharge: OwnerCharge = {
      id: crypto.randomUUID(),
      agencyId: currentUser?.agencyId,
      proprietaireId: owner.id,
      proprietaireNom: `${owner.prenom} ${owner.nom}`,
      periode,
      typeCharge,
      libelle,
      montant: Number(montant),
      referenceDocument: referenceDocument || undefined,
      dateCharge,
      statut: 'Validé',
      notes: notes || undefined,
    };

    onAddOwnerCharge(newCharge);
    setIsNewModalOpen(false);

    // Reset
    setSelectedOwnerId('');
    setTypeCharge('FACTURE');
    setLibelle('');
    setMontant(0);
    setReferenceDocument('');
    setNotes('');
  };

  const handleDelete = (charge: OwnerCharge) => {
    if (!canManage) return;
    if (window.confirm(`Supprimer la charge "${charge.libelle}" (${formatNumber(charge.montant)} FCFA) ?`)) {
      onDeleteOwnerCharge(charge.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
            <WalletCards className="w-6 h-6" />
          </div>
          <div>
            <div className="text-base font-bold text-white">
              Décaissements & Charges Propriétaires
            </div>
            <div className="text-xs text-[#A8B4C4] mt-0.5">
              {serverTotal || ownerCharges.length} charge(s) · {formatNumber(totalCharges)} FCFA au total
            </div>
          </div>
        </div>

        {canManage && (
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Charge</span>
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/20">
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-[#A8B4C4] uppercase font-semibold">Total Charges</div>
            <DollarSign className="w-4 h-4 text-[#C9A96E]" />
          </div>
          <div className="text-2xl font-bold text-[#E8D5B0] mt-2 font-mono">
            {formatNumber(totalCharges)} <span className="text-xs">FCFA</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#162133] border border-amber-500/20">
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-amber-300 uppercase font-semibold">Factures</div>
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2 font-mono">
            {formatNumber(totalFactures)} <span className="text-xs">FCFA</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#162133] border border-blue-500/20">
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-blue-300 uppercase font-semibold">Prêts & Crédits</div>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400 mt-2 font-mono">
            {formatNumber(totalPretsCredits)} <span className="text-xs">FCFA</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/15 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-xs text-white"
          >
            <option value="all">Tous les propriétaires</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>{o.prenom} {o.nom}</option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-xs text-white"
          >
            <option value="all">Tous les types</option>
            <option value="FACTURE">Factures</option>
            <option value="PRET">Prêts</option>
            <option value="CREDIT">Crédits</option>
            <option value="REQUISITION">Réquisitions</option>
            <option value="TRAVAUX">Travaux</option>
            <option value="AUTRE">Autres</option>
          </select>
                    <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-xs text-white"
          >
            <option value="all">Toutes les années</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
            <option value="2021">2021</option>
            <option value="2020">2020</option>
            <option value="2019">2019</option>
            <option value="2018">2018</option>
            <option value="2017">2017</option>
            <option value="2016">2016</option>
          </select>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-[#6B7C94] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-xs text-white focus:outline-none focus:border-[#C9A96E]"
          />
        </div>
      </div>

      {/* Tableau */}
      <div className="rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#1E2E45]/80 text-[#A8B4C4] font-semibold uppercase tracking-wider text-[10px] border-b border-[#C9A96E]/20">
                <th className="py-3 px-4">Propriétaire</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Libellé</th>
                <th className="py-3 px-3">Réf. Document</th>
                
                <th className="py-3 px-3 text-right">Montant</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9A96E]/10">
              {filteredCharges.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#6B7C94]">
                    <WalletCards className="w-8 h-8 mx-auto text-[#6B7C94]/50 mb-2" />
                    <p className="text-xs font-semibold text-white">Aucune charge enregistrée</p>
                    <p className="text-[11px] text-[#6B7C94] mt-1">
                      Ajoutez une charge pour la déduire du bulletin propriétaire.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCharges.map((c) => {
                  const cfg = TYPE_CONFIG[c.typeCharge] || TYPE_CONFIG.AUTRE;
                  return (
                    <tr key={c.id} className="hover:bg-[#1E2E45]/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">{c.proprietaireNom}</td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#A8B4C4] max-w-[200px] truncate">{c.libelle}</td>
                      <td className="py-3 px-3 text-[#6B7C94] font-mono text-[11px]">
                        {c.referenceDocument || '—'}
                      </td>
                      
                      <td className="py-3 px-3 text-right font-mono font-bold text-rose-400">
                        -{formatNumber(c.montant)} F
                      </td>
                      <td className="py-3 px-4 text-center">
                        {canManage && (
                          <button
                            onClick={() => handleDelete(c)}
                            className="p-1.5 rounded-lg bg-[#1E2E45] hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>

            {/* 🆕 Bouton Charger plus */}
            {serverCharges.length > 0 && serverCharges.length < serverTotal && (
              <div className="flex justify-center mt-4 mb-6">
                <button
                  onClick={() => loadChargesPage(serverPage + 1)}
                  disabled={isLoadingMore}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-sm shadow-lg hover:scale-105 transition-all disabled:opacity-50"
                >
                  {isLoadingMore ? '⏳ Chargement...' : `📥 Charger plus (${serverCharges.length} / ${serverTotal})`}
                </button>
              </div>
            )}
        </div>
      </div>

      {/* Modal : Nouvelle Charge */}
      {canManage && isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <WalletCards className="w-5 h-5 text-rose-400" />
                <span>Nouvelle Charge Propriétaire</span>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-[#A8B4C4] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                  Propriétaire *
                </label>
                <select
                  value={selectedOwnerId}
                  onChange={(e) => setSelectedOwnerId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                >
                  <option value="">— Choisir —</option>
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>{o.prenom} {o.nom}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Type *
                  </label>
                  <select
                    value={typeCharge}
                    onChange={(e) => setTypeCharge(e.target.value as OwnerChargeType)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  >
                    <option value="FACTURE">Facture</option>
                    <option value="PRET">Prêt</option>
                    <option value="CREDIT">Crédit</option>
                    <option value="REQUISITION">Réquisition</option>
                    <option value="TRAVAUX">Travaux</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#C9A96E] uppercase mb-1">
                    Montant (FCFA) *
                  </label>
                  <input
                    type="number"
                    value={montant || ''}
                    onChange={(e) => setMontant(Number(e.target.value))}
                    required
                    min={1}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E] text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                  Libellé *
                </label>
                <input
                  type="text"
                  value={libelle}
                  onChange={(e) => setLibelle(e.target.value)}
                  required
                  placeholder="Ex: Facture SENELEC Mars 2026"
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Réf. Document
                  </label>
                  <input
                    type="text"
                    value={referenceDocument}
                    onChange={(e) => setReferenceDocument(e.target.value)}
                    placeholder="Ex: FACT-2026-041"
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={dateCharge}
                    onChange={(e) => setDateCharge(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                  Période *
                </label>
                <input
                  type="text"
                  value={periode}
                  onChange={(e) => setPeriode(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                />
              </div>

              <div className="pt-4 border-t border-[#C9A96E]/15 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1E2E45] text-[#A8B4C4] cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-bold shadow-lg hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Créer la Charge</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};