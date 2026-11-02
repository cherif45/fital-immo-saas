import React, { useState } from 'react';
import {
  WalletCards,
  Plus,
  Search,
  Download,
  Printer,
  FileText,
  Calculator,
  TrendingUp,
  Building2,
  Layers,
  AlertCircle,
  CheckCircle2,
  X,
  Receipt,
} from 'lucide-react';
import {
  OwnerDisbursement,
  Owner,
  Property,
  Building,
  Unit,
  Tenant,
  Payment,
  Invoice,
  MaintenanceTicket,
  OwnerDeduction,
} from '../types';
import { formatCurrency, formatNumber, formatDate } from '../lib/utils';
import { paginateTable } from '../lib/supabase/service';

interface FinanceViewProps {
  disbursements: OwnerDisbursement[];
  payments: Payment[];
  owners: Owner[];
  properties: Property[];
  buildings?: Building[];
  units?: Unit[];
  tenants?: Tenant[];
  invoices?: Invoice[];
  maintenance?: MaintenanceTicket[];
  ownerDeductions?: OwnerDeduction[];
  onAddDisbursement: (
    disbursement: OwnerDisbursement
  ) => Promise<OwnerDisbursement>;
  onOpenBulletin?: (owner: Owner) => void;
  currentUser?: { agencyId?: string } | null;
}

interface ReversementPreview {
  proprietaire: Owner;
  loyersBruts: number;
  commissionAgence: number;
  retenueTVA: number;
  montantNetPaye: number;
  nbPaiements: number;
  biensConcernes: string[];
}

export function FinanceView({
  disbursements,
  payments,
  owners,
  properties,
  buildings = [],
  units = [],
  tenants = [],
  invoices = [],
  maintenance = [],
  ownerDeductions = [],
  onAddDisbursement,
  onOpenBulletin,
  currentUser,
}: FinanceViewProps) {
  // 🆕 Pagination serveur pour payments + disbursements
  const [serverPayments, setServerPayments] = useState<Payment[]>([]);
  const [serverDisbursements, setServerDisbursements] = useState<OwnerDisbursement[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [serverPage, setServerPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 100;

  React.useEffect(() => {
    if (!currentUser?.agencyId) return;
    loadFinancePage(0);
  }, [currentUser?.agencyId]);

  const loadFinancePage = async (page: number) => {
    if (!currentUser?.agencyId) return;
    setIsLoadingMore(true);
    try {
      const [paymentsResult, disbursementsResult] = await Promise.all([
        paginateTable<any>('payments', currentUser.agencyId, page, PAGE_SIZE),
        paginateTable<any>('disbursements', currentUser.agencyId, page, PAGE_SIZE),
      ]);
      if (paymentsResult.error) {
        throw new Error("Chargement des paiements : " + paymentsResult.error);
      }
      if (disbursementsResult.error) {
        throw new Error("Chargement des reversements : " + disbursementsResult.error);
      }
      const mappedPayments: Payment[] = paymentsResult.data.map((r: any) => ({
        ...r,
        id: r.id,
        montantPaye: Number(r.montant_paye) || 0,
        datePaiement: r.date_paiement,
        statut: r.statut,
        modePaiement: r.mode_paiement,
        proprietaireId: r.proprietaire_id,
      }));
      const mappedDisbursements: OwnerDisbursement[] = disbursementsResult.data.map((r: any) => ({
        ...r,
        id: r.id,
        proprietaireId: r.proprietaire_id || r.owner_id,
        montant: Number(r.montant) || 0,
        dateDisbursement: r.date_disbursement || r.created_at,
        statut: r.statut,
      }));
      if (page === 0) {
        setServerPayments(mappedPayments);
        setServerDisbursements(mappedDisbursements);
      } else {
        setServerPayments(prev => [...prev, ...mappedPayments]);
        setServerDisbursements(prev => [...prev, ...mappedDisbursements]);
      }
      setServerTotal(paymentsResult.total);
      setServerPage(page);
    } catch (e) {
      console.warn('loadFinancePage:', e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const displayPayments = currentUser?.agencyId ? serverPayments : payments;
  const displayDisbursements = currentUser?.agencyId ? serverDisbursements : disbursements;
  const [search, setSearch] = useState('');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Mai 2026');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<ReversementPreview[]>([]);

  // ============================================================
  // CALCUL DES REVERSEMENTS
  // ============================================================
  const calculerReversements = (): ReversementPreview[] => {
    const paiementsValides = displayPayments.filter(
      (p) =>
        p.statut === 'Payé' &&
        p.proprietaireId &&
        !displayDisbursements.some(
          (d) =>
            d.proprietaireId === p.proprietaireId &&
            d.periode === p.periode &&
            d.statut === 'Effectué'
        )
    );

    const grouped = new Map<string, ReversementPreview>();

    paiementsValides.forEach((p) => {
      const owner = owners.find((o) => o.id === p.proprietaireId);
      if (!owner) return;

      if (!grouped.has(owner.id)) {
        grouped.set(owner.id, {
          proprietaire: owner,
          loyersBruts: 0,
          commissionAgence: 0,
          retenueTVA: 0,
          montantNetPaye: 0,
          nbPaiements: 0,
          biensConcernes: [],
        });
      }

      const entry = grouped.get(owner.id)!;
      entry.loyersBruts += p.montantPaye || p.loyerBase || 0;
      entry.nbPaiements += 1;
      const bien = properties.find((pr) => pr.id === p.bienId);
      if (bien && !entry.biensConcernes.includes(bien.nom)) {
        entry.biensConcernes.push(bien.nom);
      }
    });

    const results: ReversementPreview[] = [];
    grouped.forEach((entry) => {
      const tauxCommission = entry.proprietaire.tauxCommission || 10;
      entry.commissionAgence = Math.round((entry.loyersBruts * tauxCommission) / 100);
      entry.retenueTVA = Math.round(entry.commissionAgence * 0.18);
      entry.montantNetPaye = entry.loyersBruts - entry.commissionAgence;
      results.push(entry);
    });

    return results.sort((a, b) => b.montantNetPaye - a.montantNetPaye);
  };

  const previews = calculerReversements();

  const filteredPreviews = previews.filter((p) => {
    if (selectedOwner !== 'all' && p.proprietaire.id !== selectedOwner) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.proprietaire.nom.toLowerCase().includes(q) ||
        p.proprietaire.prenom.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ============================================================
  // STATS GLOBALES
  // ============================================================
  const totalLoyersBruts = previews.reduce((sum, p) => sum + p.loyersBruts, 0);
  const totalCommissions = previews.reduce((sum, p) => sum + p.commissionAgence, 0);
  const totalNetAPayer = previews.reduce((sum, p) => sum + p.montantNetPaye, 0);
  const totalReverses = displayDisbursements
    .filter((d) => d.statut === 'Effectué')
    .reduce((sum, d) => sum + (d.montantNetPaye || d.montantNet || 0), 0);

  // ============================================================
  // IMPRIMER / EXPORTER
  // ============================================================
  const handleExportCSV = () => {
    const headers = ['Propriétaire', 'Loyers Bruts', 'Commission', 'TVA', 'Net à Payer', 'Nb Paiements'];
    const rows = filteredPreviews.map((p) => [
      `${p.proprietaire.prenom} ${p.proprietaire.nom}`,
      p.loyersBruts,
      p.commissionAgence,
      p.retenueTVA,
      p.montantNetPaye,
      p.nbPaiements,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(',')].concat(rows.map((r) => r.join(','))).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reversements_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

    return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#C9A96E]/15 text-[#C9A96E] flex items-center justify-center">
            <WalletCards className="w-6 h-6" />
          </div>
          <div>
            <div className="text-base font-bold text-white">
              Comptabilité & Reversements Propriétaires
            </div>
            <div className="text-xs text-[#A8B4C4] mt-0.5">
              {previews.length} propriétaire(s) à reverser · {displayDisbursements.filter((d) => d.statut === 'Effectué').length} reversement(s) effectué(s)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] border border-[#C9A96E]/30 text-xs font-semibold text-[#E8D5B0] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter CSV</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/20">
          <div className="text-[11px] text-[#A8B4C4] uppercase font-semibold">
            Loyers Bruts à Reverser
          </div>
          <div className="text-xl font-bold text-[#E8D5B0] mt-1 font-mono">
            {formatNumber(totalLoyersBruts)} <span className="text-xs">FCFA</span>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-[#162133] border border-emerald-500/20">
          <div className="text-[11px] text-emerald-300 uppercase font-semibold">
            Commissions Agence
          </div>
          <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
            {formatNumber(totalCommissions)} <span className="text-xs">FCFA</span>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-[#162133] border border-sky-500/20">
          <div className="text-[11px] text-sky-300 uppercase font-semibold">
            Net à Payer aux Bailleurs
          </div>
          <div className="text-xl font-bold text-sky-300 mt-1 font-mono">
            {formatNumber(totalNetAPayer)} <span className="text-xs">FCFA</span>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/20">
          <div className="text-[11px] text-[#A8B4C4] uppercase font-semibold">
            Déjà Reversé
          </div>
          <div className="text-xl font-bold text-white mt-1 font-mono">
            {formatNumber(totalReverses)} <span className="text-xs">FCFA</span>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/15 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
                            <select
            value={selectedOwner}
            onChange={(e) => setSelectedOwner(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-xs text-white focus:outline-none focus:border-[#C9A96E]"
          >
            <option value="all">Tous les propriétaires ({previews.length})</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.prenom} {o.nom}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C9A96E]"
          />
        </div>
      </div>

      {/* Tableau des reversements à effectuer */}
      <div className="rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-[#C9A96E]/15">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#C9A96E]" />
            Reversements en Attente
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#1E2E45]/80 text-[#A8B4C4] font-semibold uppercase tracking-wider text-[10px] border-b border-[#C9A96E]/20">
                <th className="py-3 px-4">Propriétaire</th>
                <th className="py-3 px-3">Biens Concernés</th>
                <th className="py-3 px-3 text-right">Loyers Bruts</th>
                <th className="py-3 px-3 text-right">Commission</th>
                <th className="py-3 px-3 text-right">TVA</th>
                <th className="py-3 px-3 text-right text-emerald-400">Net à Payer</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9A96E]/10">
              {filteredPreviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B7C94]">
                    <WalletCards className="w-8 h-8 mx-auto text-[#6B7C94]/50 mb-2" />
                    <p className="text-xs font-semibold text-white">Aucun reversement en attente</p>
                    <p className="text-[11px] text-[#6B7C94] mt-1">
                      Tous les paiements ont été reversés ou aucun paiement encaissé.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPreviews.map((p) => (
                  <tr key={p.proprietaire.id} className="hover:bg-[#1E2E45]/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">
                        {p.proprietaire.prenom} {p.proprietaire.nom}
                      </div>
                      <div className="text-[10px] text-[#6B7C94]">
                        Taux : {p.proprietaire.tauxCommission || 10}% · {p.nbPaiements} paiement(s)
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-[#A8B4C4] truncate max-w-[200px]">
                        {p.biensConcernes.join(', ') || '—'}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-white">
                      {formatNumber(p.loyersBruts)} F
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-300">
                      -{formatNumber(p.commissionAgence)} F
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-rose-300">
                      -{formatNumber(p.retenueTVA)} F
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatNumber(p.montantNetPaye)} F
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {onOpenBulletin && (
                          <button
                            onClick={() => onOpenBulletin(p.proprietaire)}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#C9A96E] to-[#A07840] hover:from-[#D8BA80] hover:to-[#B08850] text-[#0F1B2D] font-bold text-[11px] shadow-md transition-all flex items-center gap-1 cursor-pointer"
                            title="Générer le Bulletin de Versement officiel"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Bulletin de Versement</span>
                          </button>
                        )}
                        <button
  onClick={async () => {
    try {
      const newDisbursement: OwnerDisbursement = {
        id: crypto.randomUUID(),
        ref: `REV-${Date.now()}`,
        proprietaireId: p.proprietaire.id,
        proprietaireNom: `${p.proprietaire.prenom} ${p.proprietaire.nom}`,
        periode: selectedPeriod,
        loyersBruts: p.loyersBruts,
        montantBrut: p.loyersBruts,
        tauxCommission: p.proprietaire.tauxCommission || 10,
        commissionAgence: p.commissionAgence,
        retenueTVA: p.retenueTVA,
        montantNetPaye: p.montantNetPaye,
        montantNet: p.montantNetPaye,
        statut: "Effectué",
        modeReglement: "Virement",
        dateReglement: new Date().toISOString().split("T")[0],
      };

      await onAddDisbursement(newDisbursement);
      alert("Reversement enregistré avec succès.");
    } catch (error) {
      console.error("Erreur reversement :", error);
      alert(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer le reversement."
      );
    }
  }}
  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-all flex items-center gap-1 cursor-pointer"
  title="Marquer comme reversé"
>
  <CheckCircle2 className="w-3 h-3" />
  <span>Marquer Reversé</span>
</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historique des reversements effectués */}
      <div className="rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-[#C9A96E]/15">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#C9A96E]" />
            Historique des Reversements Effectués
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-[#1E2E45]/80 text-[#A8B4C4] font-semibold uppercase tracking-wider text-[10px] border-b border-[#C9A96E]/20">
                <th className="py-3 px-4">Réf</th>
                <th className="py-3 px-3">Propriétaire</th>
                <th className="py-3 px-3">Période</th>
                <th className="py-3 px-3 text-right">Loyers Bruts</th>
                <th className="py-3 px-3 text-right">Commission</th>
                <th className="py-3 px-3 text-right">Net Payé</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-4 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9A96E]/10">
              {displayDisbursements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#6B7C94] italic">
                    Aucun reversement effectué pour le moment
                  </td>
                </tr>
              ) : (
                displayDisbursements.slice(0, 20).map((d) => (
                  <tr key={d.id} className="hover:bg-[#1E2E45]/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-[10px] text-[#C9A96E]">
                      {d.ref}
                    </td>
                    <td className="py-3 px-3 font-bold text-white">
                      {d.proprietaireNom}
                    </td>
                    <td className="py-3 px-3 text-[#A8B4C4]">{d.periode}</td>
                    <td className="py-3 px-3 text-right font-mono text-white">
                      {formatNumber(d.loyersBruts || d.montantBrut)} F
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-300">
                      -{formatNumber(d.commissionAgence)} F
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatNumber(d.montantNetPaye || d.montantNet)} F
                    </td>
                    <td className="py-3 px-3 text-[#A8B4C4] text-[11px]">
                      {d.dateReglement ? formatDate(d.dateReglement) : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                        {d.statut}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}