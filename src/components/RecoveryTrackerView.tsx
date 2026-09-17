import React, { useState } from 'react';
import {
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Download,
  Printer,
  Filter,
  Send,
  Coins,
  FileText,
  Building,
  User,
  Search,
  ArrowUpDown,
  FileSpreadsheet,
  PhoneCall,
  MessageSquare,
  Smartphone,
} from 'lucide-react';
import {
  Property,
  Owner,
  Tenant,
  Payment,
  ActiveTab,
} from '../types';
import { formatCurrency, formatNumber, exportToCSV } from '../lib/utils';
import { triggerPhoneCall, triggerSMS, triggerWhatsApp, generateLateRentMessage } from '../lib/comms/commsHelper';
import { QuickCommsModal } from './QuickCommsModal';
import { MobileMoneyPaymentModal } from './MobileMoneyPaymentModal';

interface RecoveryTrackerViewProps {
  properties: Property[];
  owners: Owner[];
  tenants: Tenant[];
  payments: Payment[];
  selectedPeriod: string;
  onOpenQuickReminder: (tenant: Tenant) => void;
  onOpenNewPayment: (tenant?: Tenant) => void;
  onOpenOwnerSlip: (owner: Owner) => void;
  onAddPayment?: (payment: Payment) => void;
}

export const RecoveryTrackerView: React.FC<RecoveryTrackerViewProps> = ({
  properties,
  owners,
  tenants,
  payments,
  selectedPeriod,
  onOpenQuickReminder,
  onOpenNewPayment,
  onOpenOwnerSlip,
  onAddPayment,
}) => {
  const [selectedOwnerFilter, setSelectedOwnerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedTenantForComms, setSelectedTenantForComms] = useState<Tenant | null>(null);
  const [selectedTenantForPayment, setSelectedTenantForPayment] = useState<Tenant | null>(null);

  // Map each tenant with their property, owner, and payment status for this period
  const recoveryRows = tenants.map((tenant) => {
    const property = properties.find((p) => p.id === tenant.bienId);
    const owner = owners.find((o) => o.id === (property?.proprietaireId || tenant.proprietaireId));
    const payment = payments.find(
      (p) => p.locataireId === tenant.id && p.statut === 'Payé'
    );

    const loyerMensuel = tenant.loyerMensuel || (property?.loyerBase ? property.loyerBase + property.charges : 0);
    const arrieres = tenant.arrieresCumules || 0;
    const montantTotalARecouvrer = loyerMensuel + (tenant.statut !== 'À jour' ? arrieres : 0);
    const montantRecouvre = payment ? payment.montantPaye : 0;
    const reliquat = Math.max(0, montantTotalARecouvrer - montantRecouvre);
    const tauxRecouvrement =
      montantTotalARecouvrer > 0
        ? Math.min(100, Math.round((montantRecouvre / montantTotalARecouvrer) * 100))
        : 0;

    const isPaid = montantRecouvre >= montantTotalARecouvrer && montantTotalARecouvrer > 0;
    const isUnpaid = reliquat > 0;

    return {
      tenant,
      property,
      owner,
      payment,
      loyerMensuel,
      arrieres,
      montantTotalARecouvrer,
      montantRecouvre,
      reliquat,
      tauxRecouvrement,
      isPaid,
      isUnpaid,
    };
  });

  // Filtered rows
  const filteredRows = recoveryRows.filter((row) => {
    if (selectedOwnerFilter !== 'all' && row.owner?.id !== selectedOwnerFilter) return false;
    if (statusFilter === 'unpaid' && !row.isUnpaid) return false;
    if (statusFilter === 'paid' && !row.isPaid) return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      const matchLoc = `${row.tenant.nom} ${row.tenant.prenom}`.toLowerCase().includes(q);
      const matchBien = row.tenant.bienNom.toLowerCase().includes(q);
      const matchOwner = row.owner ? `${row.owner.nom} ${row.owner.prenom}`.toLowerCase().includes(q) : false;
      if (!matchLoc && !matchBien && !matchOwner) return false;
    }
    return true;
  });

  // Totals calculations
  const totalMensuel = filteredRows.reduce((acc, r) => acc + r.loyerMensuel, 0);
  const totalArrieres = filteredRows.reduce((acc, r) => acc + r.arrieres, 0);
  const totalARecouvrer = filteredRows.reduce((acc, r) => acc + r.montantTotalARecouvrer, 0);
  const totalRecouvre = filteredRows.reduce((acc, r) => acc + r.montantRecouvre, 0);
  const totalReliquat = filteredRows.reduce((acc, r) => acc + r.reliquat, 0);
  const globalTaux = totalARecouvrer > 0 ? Math.round((totalRecouvre / totalARecouvrer) * 100) : 0;

  const handleExportCSV = () => {
    const headers = [
      'Locataire',
      'Téléphone',
      'Bien / Immeuble',
      'Propriétaire',
      'Loyer Mensuel (FCFA)',
      'Arriérés (FCFA)',
      'Total à Recouvrer (FCFA)',
      'Montant Recouvré (FCFA)',
      'Taux (%)',
      'Reliquat Dû (FCFA)',
      'Statut',
    ];
    const rows = filteredRows.map((r) => [
      `${r.tenant.nom} ${r.tenant.prenom}`,
      r.tenant.telephone,
      r.property?.nom || r.tenant.bienNom,
      r.owner ? `${r.owner.prenom} ${r.owner.nom}` : '—',
      r.loyerMensuel,
      r.arrieres,
      r.montantTotalARecouvrer,
      r.montantRecouvre,
      `${r.tauxRecouvrement}%`,
      r.reliquat,
      r.isPaid ? 'Payé' : 'Impayé',
    ]);
    exportToCSV(`Suivi_Recouvrement_FITAL_IMMO_${selectedPeriod.replace(/\s+/g, '_')}`, rows, headers);
  };

  return (
    <div className="space-y-6">
      {/* Header & KPI Summary Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/20">
          <div className="text-[11px] text-[#A8B4C4] font-medium uppercase tracking-wider">
            Total à Recouvrer
          </div>
          <div className="text-xl font-bold text-white mt-1">
            {formatNumber(totalARecouvrer)}{' '}
            <span className="text-xs font-normal text-[#C9A96E]">FCFA</span>
          </div>
          <div className="text-[10px] text-[#6B7C94] mt-1">Loyer échu + Arriérés</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#162133] border border-emerald-500/25">
          <div className="text-[11px] text-emerald-400 font-medium uppercase tracking-wider">
            Montant Recouvré
          </div>
          <div className="text-xl font-bold text-emerald-300 mt-1">
            {formatNumber(totalRecouvre)}{' '}
            <span className="text-xs font-normal text-emerald-400">FCFA</span>
          </div>
          <div className="text-[10px] text-[#6B7C94] mt-1">Encaissements validés</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#162133] border border-rose-500/25">
          <div className="text-[11px] text-rose-400 font-medium uppercase tracking-wider">
            Reliquat & Impayés
          </div>
          <div className="text-xl font-bold text-rose-300 mt-1">
            {formatNumber(totalReliquat)}{' '}
            <span className="text-xs font-normal text-rose-400">FCFA</span>
          </div>
          <div className="text-[10px] text-[#6B7C94] mt-1">Reste à encaisser</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#162133] border border-sky-500/25">
          <div className="text-[11px] text-sky-400 font-medium uppercase tracking-wider">
            Taux Global Recouvrement
          </div>
          <div className="text-xl font-bold text-sky-300 mt-1">{globalTaux}%</div>
          <div className="w-full bg-[#1E2E45] h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-sky-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${globalTaux}%` }}
            />
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-gradient-to-br from-[#1E2E45] to-[#162133] border border-[#C9A96E]/30 flex flex-col justify-between">
          <div className="text-[11px] text-[#E8D5B0] font-medium">Reversements Propriétaires</div>
          <button
            onClick={() => {
              if (owners.length > 0) onOpenOwnerSlip(owners[0]);
            }}
            className="mt-2 py-2 px-3 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md hover:scale-105 transition-all text-center flex items-center justify-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" /> Bulletins de Versement
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Owner Filter */}
          <div className="flex items-center gap-1.5 text-xs text-[#A8B4C4]">
            <User className="w-3.5 h-3.5 text-[#C9A96E]" />
            <select
              value={selectedOwnerFilter}
              onChange={(e) => setSelectedOwnerFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-xs text-white focus:outline-none focus:border-[#C9A96E]"
            >
              <option value="all">Tous les Propriétaires</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nom} {o.prenom} ({o.mandatGerance})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-[#1E2E45] p-1 rounded-xl border border-[#C9A96E]/15 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'all'
                  ? 'bg-[#C9A96E] text-[#0F1B2D] font-bold shadow-sm'
                  : 'text-[#A8B4C4] hover:text-white'
              }`}
            >
              Tous ({recoveryRows.length})
            </button>
            <button
              onClick={() => setStatusFilter('unpaid')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'unpaid'
                  ? 'bg-rose-500 text-white font-bold shadow-sm'
                  : 'text-rose-400 hover:text-white'
              }`}
            >
              Impayés ({recoveryRows.filter((r) => r.isUnpaid).length})
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'paid'
                  ? 'bg-emerald-500 text-white font-bold shadow-sm'
                  : 'text-emerald-400 hover:text-white'
              }`}
            >
              Soldés ({recoveryRows.filter((r) => r.isPaid).length})
            </button>
          </div>
        </div>

        {/* Search & Export Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 text-[#6B7C94] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrer..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-xs text-white focus:outline-none focus:border-[#C9A96E]"
            />
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] border border-[#C9A96E]/30 text-xs font-medium text-[#E8D5B0] transition-all flex items-center gap-1.5"
            title="Exporter le tableau sous format CSV Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] border border-[#C9A96E]/30 text-xs font-medium text-[#A8B4C4] hover:text-white transition-all flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimer</span>
          </button>
        </div>
      </div>

      {/* Main Recovery Ledger Table (Faithful to Document Page 18) */}
      <div className="rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[980px]">
            <thead>
              <tr className="bg-[#1E2E45]/80 text-[#A8B4C4] font-semibold uppercase tracking-wider text-[10px] border-b border-[#C9A96E]/20">
                <th className="py-3.5 px-4">Locataire & Contact</th>
                <th className="py-3.5 px-3">Bien / Immeuble</th>
                <th className="py-3.5 px-3">Propriétaire</th>
                <th className="py-3.5 px-3 text-right">Loyer Mensuel</th>
                <th className="py-3.5 px-3 text-right">Arriérés</th>
                <th className="py-3.5 px-3 text-right">À Recouvrer</th>
                <th className="py-3.5 px-3 text-right text-emerald-400">Recouvré</th>
                <th className="py-3.5 px-3 text-center">Taux (%)</th>
                <th className="py-3.5 px-3 text-right text-rose-400">Reliquat Dû</th>
                <th className="py-3.5 px-4 text-center">Actions & Relances</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9A96E]/10">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#6B7C94]">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400/50 mb-2" />
                    <p className="text-xs font-semibold text-white">Aucun dossier de recouvrement</p>
                    <p className="text-[11px] text-[#6B7C94] mt-1">Aucun locataire ne correspond aux critères de recherche actuels.</p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                <tr
                  key={row.tenant.id}
                  className={`hover:bg-[#1E2E45]/40 transition-colors ${
                    row.isUnpaid ? 'bg-rose-500/[0.03]' : ''
                  }`}
                >
                  {/* Locataire */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                          row.isPaid
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {row.tenant.prenom[0]}
                        {row.tenant.nom[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">
                          {row.tenant.prenom} {row.tenant.nom}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-[#A8B4C4] font-mono">{row.tenant.telephone}</span>
                          <button
                            type="button"
                            onClick={() => triggerPhoneCall(row.tenant.telephone)}
                            className="p-0.5 rounded text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                            title="Appeler directement"
                          >
                            <PhoneCall className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerWhatsApp(row.tenant.telephone, generateLateRentMessage(row.tenant.prenom, row.tenant.nom, row.tenant.bienNom, row.reliquat, row.tenant.joursRetard || 5))}
                            className="p-0.5 rounded text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20"
                            title="Message WhatsApp officiel"
                          >
                            <Send className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Bien */}
                  <td className="py-3 px-3">
                    <div className="font-medium text-white truncate max-w-[170px]">
                      {row.property?.nom || row.tenant.bienNom}
                    </div>
                    <div className="text-[10px] text-[#6B7C94] truncate">
                      {row.property?.quartier || 'Dakar'}
                    </div>
                  </td>

                  {/* Propriétaire */}
                  <td className="py-3 px-3 text-[#A8B4C4]">
                    {row.owner ? (
                      <div>
                        <div className="font-medium text-[#F0EDE8] truncate max-w-[130px]">
                          {row.owner.nom} {row.owner.prenom}
                        </div>
                        <div className="text-[9px] text-[#C9A96E] font-mono">
                          Taux {row.owner.tauxCommission}%
                        </div>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>

                  {/* Loyer Mensuel */}
                  <td className="py-3 px-3 text-right font-medium text-white font-mono">
                    {formatNumber(row.loyerMensuel)}
                  </td>

                  {/* Arriérés */}
                  <td className="py-3 px-3 text-right font-mono">
                    {row.arrieres > 0 ? (
                      <span className="text-rose-400 font-semibold">
                        {formatNumber(row.arrieres)}
                      </span>
                    ) : (
                      <span className="text-[#6B7C94]">0</span>
                    )}
                  </td>

                  {/* Total à Recouvrer */}
                  <td className="py-3 px-3 text-right font-bold text-white font-mono">
                    {formatNumber(row.montantTotalARecouvrer)}
                  </td>

                  {/* Montant Recouvré */}
                  <td className="py-3 px-3 text-right font-bold text-emerald-400 font-mono">
                    {formatNumber(row.montantRecouvre)}
                  </td>

                  {/* Taux (%) */}
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                        row.tauxRecouvrement === 100
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : row.tauxRecouvrement > 0
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {row.tauxRecouvrement}%
                    </span>
                  </td>

                  {/* Reliquat Dû */}
                  <td className="py-3 px-3 text-right font-mono font-bold">
                    {row.reliquat > 0 ? (
                      <span className="text-rose-400">{formatNumber(row.reliquat)}</span>
                    ) : (
                      <span className="text-emerald-400 flex items-center justify-end gap-1 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Soldé
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {row.isUnpaid ? (
                        <>
                          <button
                            onClick={() => setSelectedTenantForComms(row.tenant)}
                            className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 transition-all"
                            title="Contacter (Appel, SMS, WhatsApp)"
                          >
                            <PhoneCall className="w-3 h-3" />
                            <span>Contact</span>
                          </button>
                          <button
                            onClick={() => setSelectedTenantForPayment(row.tenant)}
                            className="px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[11px] font-semibold flex items-center gap-1 transition-all"
                            title="Paiement Mobile Money Wave / Orange Money"
                          >
                            <Smartphone className="w-3 h-3" />
                            <span>Wave</span>
                          </button>
                          <button
                            onClick={() => onOpenNewPayment(row.tenant)}
                            className="px-2 py-1 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] border border-[#C9A96E]/30 text-[#C9A96E] font-medium text-[11px] transition-all"
                            title="Encaisser paiement comptable"
                          >
                            <Coins className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Quittance émise
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>

            {/* Total Footer Row (Document Page 18 Totals Bar) */}
            <tfoot>
              <tr className="bg-[#1E2E45] text-white font-bold border-t-2 border-[#C9A96E]/40 text-xs">
                <td className="py-3.5 px-4" colSpan={3}>
                  <div className="flex items-center gap-2">
                    <span className="text-[#C9A96E] uppercase tracking-wider">TOTAL GÉNÉRAL DU MOIS</span>
                    <span className="text-[10px] font-normal text-[#A8B4C4]">({filteredRows.length} lots)</span>
                  </div>
                </td>
                <td className="py-3.5 px-3 text-right font-mono text-white">
                  {formatNumber(totalMensuel)}
                </td>
                <td className="py-3.5 px-3 text-right font-mono text-rose-400">
                  {formatNumber(totalArrieres)}
                </td>
                <td className="py-3.5 px-3 text-right font-mono text-white">
                  {formatNumber(totalARecouvrer)}
                </td>
                <td className="py-3.5 px-3 text-right font-mono text-emerald-400">
                  {formatNumber(totalRecouvre)}
                </td>
                <td className="py-3.5 px-3 text-center font-mono text-[#C9A96E]">
                  {globalTaux}%
                </td>
                <td className="py-3.5 px-3 text-right font-mono text-rose-400">
                  {formatNumber(totalReliquat)}
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="text-[10px] text-[#A8B4C4]">FCFA</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Quick Comms Modal (Appel, SMS, WhatsApp) */}
      {selectedTenantForComms && (
        <QuickCommsModal
          isOpen={!!selectedTenantForComms}
          onClose={() => setSelectedTenantForComms(null)}
          recipientName={`${selectedTenantForComms.prenom} ${selectedTenantForComms.nom}`}
          recipientPhone={selectedTenantForComms.telephone}
          recipientRole="Locataire"
          propertyNom={selectedTenantForComms.bienNom}
          dueAmount={selectedTenantForComms.arrieresCumules || selectedTenantForComms.loyerMensuel}
          daysLate={selectedTenantForComms.joursRetard || 5}
        />
      )}

      {/* Mobile Money Payment Modal */}
      {selectedTenantForPayment && (
        <MobileMoneyPaymentModal
          isOpen={!!selectedTenantForPayment}
          onClose={() => setSelectedTenantForPayment(null)}
          amount={selectedTenantForPayment.arrieresCumules || selectedTenantForPayment.loyerMensuel}
          tenantName={`${selectedTenantForPayment.prenom} ${selectedTenantForPayment.nom}`}
          tenantPhone={selectedTenantForPayment.telephone}
          propertyNom={selectedTenantForPayment.bienNom}
          period={selectedPeriod}
          reference={`RECOV-${selectedTenantForPayment.nom.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}`}
          onConfirmPayment={(amount, method, ref) => {
            if (onAddPayment) {
              const quittanceNum = `QUITT-2026-${Math.floor(100 + Math.random() * 900)}`;
              const p = properties.find((item) => item.id === selectedTenantForPayment.bienId);
              const o = owners.find((item) => item.id === (p?.proprietaireId || selectedTenantForPayment.proprietaireId));
              const newPayment: Payment = {
                id: `pay-${Date.now()}`,
                ref: ref || `PAY-MM-${Date.now().toString().slice(-6)}`,
                quittanceNumero: quittanceNum,
                locataireId: selectedTenantForPayment.id,
                locataireNom: `${selectedTenantForPayment.prenom} ${selectedTenantForPayment.nom}`,
                bienId: selectedTenantForPayment.bienId || 'bien-1',
                bienNom: selectedTenantForPayment.bienNom || 'Bien FITAL-IMMO',
                proprietaireId: o?.id || 'prop-1',
                proprietaireNom: o ? `${o.prenom} ${o.nom}` : 'Propriétaire',
                periode: selectedPeriod,
                loyerBase: amount,
                charges: 0,
                tva: 0,
                tom: 0,
                penalites: 0,
                montantTotal: amount,
                montantPaye: amount,
                montantRestant: 0,
                modePaiement: 'Mobile Money',
                moyenPaiementCode: method === 'WAVE' ? 'WAVE' : 'ORANGE_MONEY',
                numeroTransaction: ref,
                datePaiement: new Date().toISOString().split('T')[0],
                statut: 'Payé',
                observation: `Règlement direct validé via ${method === 'WAVE' ? 'Wave Sénégal' : 'Orange Money'} (Tx: ${ref})`,
              };
              onAddPayment(newPayment);
            }
            setSelectedTenantForPayment(null);
          }}
        />
      )}
    </div>
  );
};
