import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  DollarSign,
  TrendingDown,
  Home,
  Building,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  PieChart
} from 'lucide-react';
import { Property, Tenant, Payment, Owner, OwnerDisbursement } from '../types';
import { formatCurrencyFCFA, calculateCollectionRate } from '../lib/calculations/financial';
import { exportToCsv } from '../lib/utils';

interface ReportsViewProps {
  properties: Property[];
  tenants: Tenant[];
  payments: Payment[];
  owners: Owner[];
  disbursements: OwnerDisbursement[];
  selectedPeriod: string;
}

export function ReportsView({
  properties,
  tenants,
  payments,
  owners,
  disbursements,
  selectedPeriod,
}: ReportsViewProps) {
  const [reportType, setReportType] = useState<
    'unpaid' | 'paid' | 'vacant' | 'agency_management' | 'owner_summary'
  >('unpaid');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Date filtering logic
  const now = new Date();
  const todayStr = now.toISOString().substring(0, 10);
  const dayOfWeek = now.getDay() || 7;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
  const startOfWeekStr = startOfWeek.toISOString().substring(0, 10);
  const currentMonthStr = todayStr.substring(0, 7);

  const filteredPayments = payments.filter((p) => {
    const pDate = p.datePaiement || '';
    if (!pDate) return true;
    if (periodFilter === 'today') {
      return pDate.startsWith(todayStr);
    }
    if (periodFilter === 'week') {
      return pDate >= startOfWeekStr && pDate <= todayStr;
    }
    if (periodFilter === 'month') {
      return pDate.startsWith(currentMonthStr);
    }
    if (periodFilter === 'custom') {
      if (customStartDate && pDate < customStartDate) return false;
      if (customEndDate && pDate > customEndDate) return false;
      return true;
    }
    return true;
  });

  // Calculations
  const unpaidTenants = tenants.filter((t) => (t.arrieresCumules || 0) > 0 || t.statut === 'Impayé' || t.statut === 'Retard');
  const totalUnpaidAmount = unpaidTenants.reduce((acc, t) => acc + (t.arrieresCumules || t.loyerMensuel || 0), 0);

  const totalPaidAmount = filteredPayments.reduce((acc, p) => acc + (p.montantPaye || 0), 0);
  const totalExpectedAmount = totalPaidAmount + totalUnpaidAmount;
  const collectionRate = calculateCollectionRate(totalPaidAmount, totalExpectedAmount);

  const vacantProperties = properties.filter((p) => p.statut === 'Vacant');
  const totalVacantRentPotential = vacantProperties.reduce((acc, p) => acc + (p.loyerBase + p.charges), 0);

  const totalCommissions = filteredPayments.reduce((acc, p) => {
    const prop = properties.find((pr) => pr.id === p.bienId);
    const rate = prop?.tauxCommission || 10;
    return acc + Math.round((p.montantPaye * rate) / 100);
  }, 0);

  const handleExportCSV = () => {
    if (reportType === 'unpaid') {
      const headers = ['Référence', 'Locataire', 'Téléphone', 'Bien', 'Loyer Mensuel', 'Arriérés', 'Jours Retard', 'Statut'];
      const data = unpaidTenants.map((t) => [
        t.ref || t.id,
        `${t.prenom} ${t.nom}`,
        t.telephone,
        t.bienNom,
        t.loyerMensuel,
        t.arrieresCumules,
        t.joursRetard,
        t.statut
      ]);
      exportToCsv(`Rapport_Impayes_${selectedPeriod.replace(/\s+/g, '_')}`, headers, data);
    } else if (reportType === 'paid') {
      const headers = ['Quittance N°', 'Date', 'Locataire', 'Bien', 'Propriétaire', 'Montant Payé', 'Mode', 'Statut'];
      const data = payments.map((p) => [
        p.quittanceNumero,
        p.datePaiement,
        p.locataireNom,
        p.bienNom,
        p.proprietaireNom,
        p.montantPaye,
        p.modePaiement,
        p.statut
      ]);
      exportToCsv(`Rapport_Loyers_Payes_${selectedPeriod.replace(/\s+/g, '_')}`, headers, data);
    } else if (reportType === 'vacant') {
      const headers = ['Réf Bien', 'Nom du Bien', 'Type', 'Quartier', 'Loyer Base', 'Charges', 'Loyer Total', 'Propriétaire'];
      const data = vacantProperties.map((p) => [
        p.ref,
        p.nom,
        p.type,
        p.quartier,
        p.loyerBase,
        p.charges,
        p.loyerBase + p.charges,
        p.proprietaireNom
      ]);
      exportToCsv(`Rapport_Biens_Vacants`, headers, data);
    } else {
      const headers = ['Propriétaire', 'Téléphone', 'Banque', 'Taux Gérance', 'Total Biens'];
      const data = owners.map((o) => [
        `${o.prenom} ${o.nom}`,
        o.telephone,
        o.banque,
        `${o.tauxCommission}%`,
        properties.filter((p) => p.proprietaireId === o.id).length
      ]);
      exportToCsv(`Rapport_Gerance_Mandataires`, headers, data);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2A3447] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#F0EDE8] tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-[#C9A96E]" />
            Rapports & Audit Financier
          </h1>
          <p className="text-sm text-[#A0AEC0] mt-1">
            Génération des états périodiques, balances des impayés, états de vacance et décomptes de gérance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-[#141E30] hover:bg-[#1E2C44] border border-[#2A3447] text-[#E8D5B0] rounded-xl text-sm font-medium transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4 text-[#C9A96E]" />
            Exporter CSV
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4" />
            Imprimer le rapport
          </button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#141E30]/90 border border-[#2A3447] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">
            <span>Taux de Recouvrement</span>
            <PieChart className="w-4 h-4 text-[#10B981]" />
          </div>
          <p className="text-2xl font-bold text-[#10B981]">{collectionRate}%</p>
          <p className="text-xs text-[#A0AEC0] mt-1">{formatCurrencyFCFA(totalPaidAmount)} encaissés</p>
        </div>

        <div className="bg-[#141E30]/90 border border-[#2A3447] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">
            <span>Total Impayés & Retards</span>
            <TrendingDown className="w-4 h-4 text-[#EF4444]" />
          </div>
          <p className="text-2xl font-bold text-[#EF4444]">{formatCurrencyFCFA(totalUnpaidAmount)}</p>
          <p className="text-xs text-[#A0AEC0] mt-1">{unpaidTenants.length} locataire(s) en souffrance</p>
        </div>

        <div className="bg-[#141E30]/90 border border-[#2A3447] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">
            <span>Commissions Agence</span>
            <DollarSign className="w-4 h-4 text-[#C9A96E]" />
          </div>
          <p className="text-2xl font-bold text-[#C9A96E]">{formatCurrencyFCFA(totalCommissions)}</p>
          <p className="text-xs text-[#A0AEC0] mt-1">Sur loyers perçus (taux 8-10%)</p>
        </div>

        <div className="bg-[#141E30]/90 border border-[#2A3447] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">
            <span>Biens Vacants</span>
            <Building className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <p className="text-2xl font-bold text-[#F59E0B]">{vacantProperties.length} lot(s)</p>
          <p className="text-xs text-[#A0AEC0] mt-1">Perte potentielle : {formatCurrencyFCFA(totalVacantRentPotential)}/mois</p>
        </div>
      </div>

      {/* Navigation Pills for Report Types */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#2A3447] pb-3">
        <button
          onClick={() => setReportType('unpaid')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 cursor-pointer ${
            reportType === 'unpaid'
              ? 'bg-[#EF4444]/20 border border-[#EF4444]/40 text-[#EF4444]'
              : 'bg-[#141E30] text-[#A0AEC0] hover:text-[#F0EDE8]'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Rapport des Impayés & Arriérés
        </button>

        <button
          onClick={() => setReportType('paid')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 cursor-pointer ${
            reportType === 'paid'
              ? 'bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981]'
              : 'bg-[#141E30] text-[#A0AEC0] hover:text-[#F0EDE8]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Rapport des Loyers Encaissés
        </button>

        <button
          onClick={() => setReportType('vacant')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 cursor-pointer ${
            reportType === 'vacant'
              ? 'bg-[#F59E0B]/20 border border-[#F59E0B]/40 text-[#F59E0B]'
              : 'bg-[#141E30] text-[#A0AEC0] hover:text-[#F0EDE8]'
          }`}
        >
          <Building className="w-4 h-4" />
          État du Parc & Biens Vacants
        </button>

        <button
          onClick={() => setReportType('agency_management')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 cursor-pointer ${
            reportType === 'agency_management'
              ? 'bg-[#C9A96E]/20 border border-[#C9A96E]/40 text-[#C9A96E]'
              : 'bg-[#141E30] text-[#A0AEC0] hover:text-[#F0EDE8]'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Gérance Globale & Commissions
        </button>
      </div>

      {/* Period Selector (P2: Aujourd'hui, Cette semaine, Ce mois, Personnalisé) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#141E30]/60 border border-[#2A3447] rounded-xl">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#C9A96E]" />
          <span className="text-xs font-semibold text-[#A0AEC0] uppercase tracking-wider">Période :</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: 'today', label: "Aujourd'hui" },
              { key: 'week', label: 'Cette semaine' },
              { key: 'month', label: 'Ce mois' },
              { key: 'all', label: 'Tout' },
              { key: 'custom', label: 'Personnalisé' },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => setPeriodFilter(item.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                periodFilter === item.key
                  ? 'bg-[#C9A96E] text-[#0A111D] font-bold shadow-sm'
                  : 'bg-[#1E2E45]/40 text-[#A8B4C4] hover:bg-[#1E2E45] hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {periodFilter === 'custom' && (
          <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[#2A3447]/50">
            <span className="text-xs text-[#A0AEC0]">Du</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1 bg-[#0A111D] border border-[#2A3447] rounded-lg text-xs text-white focus:outline-none focus:border-[#C9A96E]"
            />
            <span className="text-xs text-[#A0AEC0]">Au</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1 bg-[#0A111D] border border-[#2A3447] rounded-lg text-xs text-white focus:outline-none focus:border-[#C9A96E]"
            />
          </div>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A0AEC0]" />
          <input
            type="text"
            placeholder="Filtrer par nom de locataire, propriétaire, référence ou quartier..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#141E30] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] placeholder-[#64748B] focus:outline-none focus:border-[#C9A96E]"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedOwnerId}
            onChange={(e) => setSelectedOwnerId(e.target.value)}
            className="px-3.5 py-2.5 bg-[#141E30] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:outline-none focus:border-[#C9A96E]"
          >
            <option value="all">Tous les propriétaires</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.prenom} {o.nom}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab Content Display */}
      <div className="bg-[#141E30]/90 border border-[#2A3447] rounded-2xl overflow-hidden shadow-xl">
        {reportType === 'unpaid' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#F0EDE8]">
              <thead className="bg-[#0A111D]/80 text-xs uppercase tracking-wider text-[#A0AEC0] border-b border-[#2A3447]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Locataire</th>
                  <th className="py-3.5 px-4 font-semibold">Logement</th>
                  <th className="py-3.5 px-4 font-semibold">Propriétaire</th>
                  <th className="py-3.5 px-4 font-semibold">Loyer Mensuel</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Arriérés Dûs</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Retard</th>
                  <th className="py-3.5 px-4 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3447]/60">
                {unpaidTenants
                  .filter((t) => {
                    const matchSearch =
                      `${t.prenom} ${t.nom}`.toLowerCase().includes(searchFilter.toLowerCase()) ||
                      t.bienNom.toLowerCase().includes(searchFilter.toLowerCase());
                    const matchOwner = selectedOwnerId === 'all' || t.proprietaireId === selectedOwnerId;
                    return matchSearch && matchOwner;
                  })
                  .map((t) => (
                    <tr key={t.id} className="hover:bg-[#1E2C44]/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#F0EDE8]">{t.prenom} {t.nom}</div>
                        <div className="text-xs text-[#A0AEC0]">{t.telephone}</div>
                      </td>
                      <td className="py-3.5 px-4 text-[#C9A96E] font-medium">{t.bienNom}</td>
                      <td className="py-3.5 px-4 text-xs text-[#A0AEC0]">
                        {owners.find((o) => o.id === t.proprietaireId)?.nom || 'Propriétaire'}
                      </td>
                      <td className="py-3.5 px-4 font-medium">{formatCurrencyFCFA(t.loyerMensuel)}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#EF4444]">
                        {formatCurrencyFCFA(t.arrieresCumules || t.loyerMensuel)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#EF4444]/20 text-[#EF4444]">
                          {t.joursRetard} jours
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444]">
                          {t.statut}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'paid' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#F0EDE8]">
              <thead className="bg-[#0A111D]/80 text-xs uppercase tracking-wider text-[#A0AEC0] border-b border-[#2A3447]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Quittance</th>
                  <th className="py-3.5 px-4 font-semibold">Date Encaissée</th>
                  <th className="py-3.5 px-4 font-semibold">Locataire</th>
                  <th className="py-3.5 px-4 font-semibold">Bien</th>
                  <th className="py-3.5 px-4 font-semibold">Propriétaire</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Montant Perçu</th>
                  <th className="py-3.5 px-4 font-semibold">Mode Règlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3447]/60">
                {(() => {
                  const displayList = filteredPayments.filter((p) => {
                    const matchSearch =
                      p.locataireNom.toLowerCase().includes(searchFilter.toLowerCase()) ||
                      p.bienNom.toLowerCase().includes(searchFilter.toLowerCase()) ||
                      p.quittanceNumero.toLowerCase().includes(searchFilter.toLowerCase());
                    const matchOwner = selectedOwnerId === 'all' || p.proprietaireId === selectedOwnerId;
                    return matchSearch && matchOwner;
                  });

                  if (displayList.length === 0) {
                    return (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-[#A0AEC0]">
                          <CheckCircle2 className="w-8 h-8 mx-auto text-[#A0AEC0]/40 mb-2" />
                          <p className="font-semibold text-white text-xs">Aucun encaissement sur cette période</p>
                          <p className="text-[11px] text-[#64748B] mt-1">Sélectionnez une autre période ou réinitialisez les filtres.</p>
                        </td>
                      </tr>
                    );
                  }

                  return displayList.map((p) => (
                    <tr key={p.id} className="hover:bg-[#1E2C44]/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-[#C9A96E]">{p.quittanceNumero}</td>
                      <td className="py-3.5 px-4 text-xs text-[#A0AEC0]">{p.datePaiement}</td>
                      <td className="py-3.5 px-4 font-semibold text-[#F0EDE8]">{p.locataireNom}</td>
                      <td className="py-3.5 px-4 text-xs text-[#E8D5B0]">{p.bienNom}</td>
                      <td className="py-3.5 px-4 text-xs text-[#A0AEC0]">{p.proprietaireNom}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#10B981]">
                        {formatCurrencyFCFA(p.montantPaye)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#1E2C44] text-[#F0EDE8] border border-[#2A3447]">
                          {p.modePaiement}
                        </span>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'vacant' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#F0EDE8]">
              <thead className="bg-[#0A111D]/80 text-xs uppercase tracking-wider text-[#A0AEC0] border-b border-[#2A3447]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Référence</th>
                  <th className="py-3.5 px-4 font-semibold">Bien Immobilier</th>
                  <th className="py-3.5 px-4 font-semibold">Type</th>
                  <th className="py-3.5 px-4 font-semibold">Localisation</th>
                  <th className="py-3.5 px-4 font-semibold">Propriétaire</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Loyer Demandé</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3447]/60">
                {vacantProperties.map((p) => (
                  <tr key={p.id} className="hover:bg-[#1E2C44]/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs text-[#A0AEC0]">{p.ref}</td>
                    <td className="py-3.5 px-4 font-semibold text-[#F0EDE8]">{p.nom}</td>
                    <td className="py-3.5 px-4 text-xs text-[#E8D5B0]">{p.type}</td>
                    <td className="py-3.5 px-4 text-xs text-[#A0AEC0]">{p.quartier}, {p.ville}</td>
                    <td className="py-3.5 px-4 text-xs text-[#A0AEC0]">{p.proprietaireNom}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#F59E0B]">
                      {formatCurrencyFCFA(p.loyerBase + p.charges)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
                        Vacant (À louer)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'agency_management' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#F0EDE8]">
              <thead className="bg-[#0A111D]/80 text-xs uppercase tracking-wider text-[#A0AEC0] border-b border-[#2A3447]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Propriétaire Mandant</th>
                  <th className="py-3.5 px-4 font-semibold">Banque & Compte</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Biens Gérés</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Taux Gérance</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Loyers Perçus</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Commissions Agence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3447]/60">
                {owners.map((o) => {
                  const ownerBiens = properties.filter((pr) => pr.proprietaireId === o.id);
                  const ownerPayments = payments.filter((py) => py.proprietaireId === o.id);
                  const loyersPerçus = ownerPayments.reduce((acc, py) => acc + py.montantPaye, 0);
                  const commissions = Math.round((loyersPerçus * (o.tauxCommission || 10)) / 100);

                  return (
                    <tr key={o.id} className="hover:bg-[#1E2C44]/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#F0EDE8]">{o.prenom} {o.nom}</div>
                        <div className="text-xs text-[#A0AEC0]">{o.telephone}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#A0AEC0]">
                        <div>{o.banque}</div>
                        <div className="font-mono text-[11px] text-[#E8D5B0]">{o.compteBancaire}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-[#E8D5B0]">{ownerBiens.length} lots</td>
                      <td className="py-3.5 px-4 text-center font-bold text-[#C9A96E]">{o.tauxCommission || 10}%</td>
                      <td className="py-3.5 px-4 text-right font-medium text-[#10B981]">{formatCurrencyFCFA(loyersPerçus)}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#C9A96E]">{formatCurrencyFCFA(commissions)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
