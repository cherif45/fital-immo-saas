import React, { useState } from 'react';
import { Payment, PaymentMethodConfig, Owner, Property, Tenant } from '../types';
import { formatCurrencyFCFA } from '../lib/calculations/financial';
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
}

export function PaymentMethodReportsView({
  payments,
  paymentMethods,
  owners,
  properties,
  tenants,
}: PaymentMethodReportsViewProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [selectedOwner, setSelectedOwner] = useState<string>('ALL');

  const filteredPayments = payments.filter((p) => {
    const matchMethod = selectedMethod === 'ALL' || p.moyenPaiementCode === selectedMethod || p.modePaiement === selectedMethod;
    const matchOwner = selectedOwner === 'ALL' || p.proprietaireId === selectedOwner;
    return matchMethod && matchOwner;
  });

  const totalCollected = filteredPayments
    .filter((p) => p.statut === 'Payé' || p.statut === 'Partiel')
    .reduce((sum, p) => sum + p.montantPaye, 0);

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

  payments.forEach((p) => {
    let key = p.moyenPaiementCode || (p.modePaiement === 'Mobile Money' ? 'WAVE' : p.modePaiement === 'Espèces' ? 'ESPECES' : p.modePaiement === 'Virement' ? 'VIREMENT' : 'CHEQUE');
    if (statsByMethod[key]) {
      statsByMethod[key].count += 1;
      statsByMethod[key].volume += p.montantPaye;
    }
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

      {/* Method Cards & Percentages */}
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

      {/* Itemized Payments Table */}
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
              {filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-3 font-mono font-bold text-[#C9A96E]">{p.quittanceNumero}</td>
                  <td className="py-3 px-3 text-slate-300">{p.datePaiement}</td>
                  <td className="py-3 px-3 font-bold text-white">{p.locataireNom}</td>
                  <td className="py-3 px-3 text-slate-400">{p.bienNom}</td>
                  <td className="py-3 px-3">
                    <span className="text-white font-medium">{p.modePaiement}</span>
                    {(p.transactionReference || p.referenceTransaction) && (
                      <span className="block text-[10px] text-slate-500 font-mono">Réf: {p.transactionReference || p.referenceTransaction}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-white text-sm">
                    {formatCurrencyFCFA(p.montantPaye)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
