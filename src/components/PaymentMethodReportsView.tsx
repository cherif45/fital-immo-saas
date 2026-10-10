import React, { useState } from 'react';
import { Payment, PaymentMethodConfig, Owner, Property, Tenant } from '../types';
import { formatCurrencyFCFA } from '../lib/calculations/financial';
import { mapPaymentFromDb, paginateTable } from '../lib/supabase/service';
import { 
  BarChart3, 
  Download, 
  Printer, 
  Filter, 
  Calendar, 
  Smartphone, 
  Coins, 
  Building2, 
  CreditCard, 
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';

interface PaymentMethodReportsViewProps {
  payments: Payment[];
  paymentMethods: PaymentMethodConfig[];
  owners: Owner[];
  properties: Property[];
  tenants: Tenant[];
  currentUser?: { agencyId?: string } | null;
}

export function PaymentMethodReportsView({
  payments,
  paymentMethods,
  owners,
  properties,
  tenants,
  currentUser,
}: PaymentMethodReportsViewProps) {
  // 🆕 Pagination serveur
  const [serverPayments, setServerPayments] = useState<Payment[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 500;

  React.useEffect(() => {
    if (!currentUser?.agencyId) return;
    loadAllPayments(0);
  }, [currentUser?.agencyId]);

  const loadAllPayments = async (page: number) => {
    if (!currentUser?.agencyId) return;
    setIsLoadingMore(true);
    try {
      let currentPage = page;
      let total = 0;
      const allPayments: Payment[] = [];
      while (true) {
        const result = await paginateTable<any>(
          'payments',
          currentUser.agencyId,
          currentPage,
          PAGE_SIZE,
        );
        const batch = result.data.map(mapPaymentFromDb);
        allPayments.push(...batch);
        total = result.total;
        if (batch.length === 0 || allPayments.length >= total) break;
        currentPage += 1;
      }
      setServerPayments(allPayments);
      setServerTotal(total);
    } catch (e) {
      console.warn('loadAllPayments:', e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const displayPayments = serverPayments.length > 0 ? serverPayments : payments;
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [selectedOwner, setSelectedOwner] = useState<string>('ALL');

  const getMethodCode = (payment: Payment): string => {
    const code = (payment.moyenPaiementCode || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (code && !['MOBILE_MONEY', 'MOBILEMONEY'].includes(code)) {
      const normalizedCode = code.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normalizedCode === 'ESPECES' || normalizedCode === 'CASH') return 'ESPECES';
      if (normalizedCode === 'CHEQUE') return 'CHEQUE';
      if (normalizedCode === 'BANK_TRANSFER') return 'VIREMENT';
      return normalizedCode;
    }
    const mode = (payment.modePaiement || '').toLocaleLowerCase('fr-FR');
    if (mode.includes('orange')) return 'ORANGE_MONEY';
    if (mode.includes('wave')) return 'WAVE';
    if (mode.includes('mobile')) {
      const reference = `${payment.referenceTransaction || ''} ${payment.transactionReference || ''}`.toUpperCase();
      return reference.includes('ORANGE') || reference.includes('OM')
        ? 'ORANGE_MONEY'
        : 'WAVE';
    }
    if (mode.includes('virement')) return 'VIREMENT';
    if (mode.includes('chèque') || mode.includes('cheque')) return 'CHEQUE';
    return 'ESPECES';
  };

  const validPayments = displayPayments
    .filter(
      (payment) =>
        (payment.statut === 'Payé' || payment.statut === 'Partiel') &&
        payment.verificationStatut !== 'en_attente' &&
        payment.verificationStatut !== 'rejete',
    )
    .map((payment) => ({
      ...payment,
      montantPaye:
        Number(payment.montantPaye) ||
        (payment.statut === 'Payé' ? Number(payment.montantTotal) || 0 : 0),
    }));
  const filteredPayments = validPayments.filter((p) => {
    const matchMethod = selectedMethod === 'ALL' || getMethodCode(p) === selectedMethod;
    const matchOwner = selectedOwner === 'ALL' || p.proprietaireId === selectedOwner;
    return matchMethod && matchOwner;
  });

  const totalCollected = filteredPayments.reduce((sum, p) => sum + (Number(p.montantPaye) || 0), 0);

  // Group by payment method
  const statsByMethod: Record<string, { count: number; volume: number; code: string; label: string }> = {};

  paymentMethods.forEach((m) => {
    statsByMethod[m.code] = { count: 0, volume: 0, code: m.code, label: m.libelle || m.nom || m.code };
  });
  if (!statsByMethod['ESPECES']) statsByMethod['ESPECES'] = { count: 0, volume: 0, code: 'ESPECES', label: 'Espèces' };
  if (!statsByMethod['WAVE']) statsByMethod['WAVE'] = { count: 0, volume: 0, code: 'WAVE', label: 'Wave' };
  if (!statsByMethod['ORANGE_MONEY']) statsByMethod['ORANGE_MONEY'] = { count: 0, volume: 0, code: 'ORANGE_MONEY', label: 'Orange Money' };
  if (!statsByMethod['VIREMENT']) statsByMethod['VIREMENT'] = { count: 0, volume: 0, code: 'VIREMENT', label: 'Virement' };
  if (!statsByMethod['CHEQUE']) statsByMethod['CHEQUE'] = { count: 0, volume: 0, code: 'CHEQUE', label: 'Chèque' };

  filteredPayments.forEach((payment) => {
    const key = getMethodCode(payment);
    if (!statsByMethod[key]) {
      statsByMethod[key] = {
        count: 0,
        volume: 0,
        code: key,
        label: payment.modePaiement || key,
      };
    }
    statsByMethod[key].count += 1;
    statsByMethod[key].volume += Number(payment.montantPaye) || 0;
  });

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Quittance,Locataire,Bien,Periode,Date,Mode,Montant']
        .concat(
          filteredPayments.map(
            (p) =>
              `"${p.quittanceNumero}","${p.locataireNom}","${p.bienNom}","${p.periode}","${p.datePaiement}","${p.modePaiement}",${p.montantPaye}`
          )
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rapport_encaissements_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-[#111C2E] p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
              Rapports & Audit Financier
            </span>
            <span className="text-xs text-slate-400">• Ventilation Multi-Canaux</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Rapports par Moyen de Paiement</h1>
          <p className="text-xs text-slate-400">
            Analyse comparative des volumes collectés par canal, fréquences d'utilisation et rapprochements bancaires.
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            {isLoadingMore
              ? 'Chargement des encaissements…'
              : `${filteredPayments.length} règlement(s) validé(s) sur ${serverTotal || displayPayments.length} chargé(s)`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold border border-white/10 flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exporter Relevé CSV</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Filtrer par Moyen de Règlement :</label>
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#111C2E] border border-white/10 rounded-xl text-xs text-white"
          >
            <option value="ALL">Tous les moyens de paiement</option>
            <option value="ESPECES">Espèces (Guichet)</option>
            <option value="WAVE">Wave Money</option>
            <option value="ORANGE_MONEY">Orange Money</option>
            <option value="VIREMENT">Virement Bancaire</option>
            <option value="CHEQUE">Chèque</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Filtrer par Propriétaire Bailleur :</label>
          <select
            value={selectedOwner}
            onChange={(e) => setSelectedOwner(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#111C2E] border border-white/10 rounded-xl text-xs text-white"
          >
            <option value="ALL">Tous les propriétaires bailleurs</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.prenom} {o.nom} ({o.totalBiens || 0} biens)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Method Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Object.values(statsByMethod).map((stat) => {
          const percentage = totalCollected > 0 ? Math.round((stat.volume / totalCollected) * 100) : 0;
          return (
            <div key={stat.code} className="bg-[#111C2E] p-4 rounded-2xl border border-white/5 shadow-md space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">{stat.label}</span>
                <span className="text-[10px] text-[#C9A96E] font-bold">{percentage}%</span>
              </div>
              <div className="text-lg font-bold text-white">{formatCurrencyFCFA(stat.volume)}</div>
              <div className="text-[11px] text-slate-400">{stat.count} règlements</div>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#C9A96E] h-full rounded-full" style={{ width: `${percentage}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-[#111C2E] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white">Journal Détaillé des Encaissements</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="py-3 px-3">Quittance</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Locataire</th>
                <th className="py-3 px-3">Bien Loué</th>
                <th className="py-3 px-3">Moyen / Référence</th>
                <th className="py-3 px-3 text-right">Montant Encaissé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <BarChart3 className="w-8 h-8 mx-auto text-slate-500/50 mb-2" />
                    <p className="text-xs font-semibold text-white">Aucun encaissement</p>
                    <p className="text-[11px] text-slate-500 mt-1">Aucun règlement correspondant aux filtres.</p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3 font-mono font-bold text-[#C9A96E]">{p.quittanceNumero}</td>
                    <td className="py-3 px-3 text-slate-300">{p.datePaiement}</td>
                    <td className="py-3 px-3 font-bold text-white">{p.locataireNom}</td>
                    <td className="py-3 px-3 text-slate-400">{p.bienNom}</td>
                    <td className="py-3 px-3">
                      <span className="text-white font-medium">{p.modePaiement}</span>
                      {p.moyenPaiementCode && (
                        <span className="block text-[10px] text-[#C9A96E] font-mono">{p.moyenPaiementCode}</span>
                      )}
                      {(p.transactionReference || p.referenceTransaction) && (
                        <span className="block text-[10px] text-slate-500 font-mono">
                          Réf: {p.transactionReference || p.referenceTransaction}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-white text-sm">
                      {formatCurrencyFCFA(p.montantPaye)}
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