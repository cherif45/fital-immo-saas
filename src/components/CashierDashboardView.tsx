import React from 'react';
import { 
  Payment, 
  Tenant, 
  Owner, 
  CashMovement, 
  CashClosing, 
  PaymentMethodConfig,
  ActiveTab
} from '../types';
import { formatCurrencyFCFA } from '../lib/calculations/financial';
import { 
  Coins, 
  Wallet, 
  CreditCard, 
  Smartphone, 
  Building2, 
  ArrowDownRight, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Receipt, 
  PlusCircle, 
  FileText, 
  RefreshCcw,
  Sparkles
} from 'lucide-react';

interface CashierDashboardViewProps {
  payments: Payment[];
  tenants: Tenant[];
  owners: Owner[];
  cashMovements: CashMovement[];
  cashClosings: CashClosing[];
  paymentMethods: PaymentMethodConfig[];
  onOpenNewPayment: () => void;
  onOpenReceipt: (payment: Payment) => void;
  setActiveTab: (tab: ActiveTab) => void;
}

export function CashierDashboardView({
  payments,
  tenants,
  owners,
  cashMovements,
  cashClosings,
  paymentMethods,
  onOpenNewPayment,
  onOpenReceipt,
  setActiveTab,
}: CashierDashboardViewProps) {
  // Financial computations
  const totalEncaisseMois = payments
    .filter((p) => p.statut === 'Payé' || p.statut === 'Partiel')
    .reduce((sum, p) => sum + p.montantPaye, 0);

  const totalImpayes = tenants.reduce((sum, t) => sum + (t.arrieresCumules || 0), 0);
  const unpaidTenantsCount = tenants.filter((t) => t.statut === 'Impayé' || t.statut === 'Retard').length;

  // Breakdown by payment method
  const totalEspeces = payments
    .filter((p) => p.modePaiement === 'Espèces' && (p.statut === 'Payé' || p.statut === 'Partiel'))
    .reduce((sum, p) => sum + p.montantPaye, 0);

  const totalWave = payments
    .filter((p) => (p.modePaiement === 'Mobile Money' || p.moyenPaiementCode === 'WAVE') && (p.statut === 'Payé' || p.statut === 'Partiel'))
    .reduce((sum, p) => sum + p.montantPaye, 0);

  const totalOM = payments
    .filter((p) => p.moyenPaiementCode === 'ORANGE_MONEY' && (p.statut === 'Payé' || p.statut === 'Partiel'))
    .reduce((sum, p) => sum + p.montantPaye, 0);

  const totalVirement = payments
    .filter((p) => p.modePaiement === 'Virement' && (p.statut === 'Payé' || p.statut === 'Partiel'))
    .reduce((sum, p) => sum + p.montantPaye, 0);

  const totalCheque = payments
    .filter((p) => p.modePaiement === 'Chèque' && (p.statut === 'Payé' || p.statut === 'Partiel'))
    .reduce((sum, p) => sum + p.montantPaye, 0);

  // Cash Register metrics
  const cashEntries = cashMovements.filter((m) => m.type === 'ENTREE' && m.statut === 'Validé').reduce((sum, m) => sum + m.montant, 0);
  const cashExits = cashMovements.filter((m) => m.type === 'SORTIE' && m.statut === 'Validé').reduce((sum, m) => sum + m.montant, 0);
  const initialCash = cashClosings.length > 0 ? cashClosings[0].soldeReel : 0;
  const currentCashInDrawer = initialCash + cashEntries - cashExits;

  const pendingPayments = payments.filter((p) => p.verificationStatut === 'en_attente');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#111C2E] p-6 rounded-2xl border border-white/5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Espace Caissier / Comptabilité
            </span>
            <span className="text-xs text-slate-400">• Guichet Ouvert</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Tableau de Bord Caisse & Encaissements</h1>
          <p className="text-xs text-slate-400">
            Gestion des encaissements multi-moyens, suivi du tiroir-caisse, quittances et paiements en attente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveTab('caisse')}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-bold rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span>Journal de Caisse & Clôture</span>
          </button>

          <button
            onClick={onOpenNewPayment}
            className="px-4 py-2.5 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] font-bold rounded-xl text-sm transition-all shadow-lg hover:shadow-[#C9A96E]/20 flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Encaisser un Loyer (Quittance)</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Solde Caisse Physique */}
        <div className="bg-[#111C2E] p-5 rounded-2xl border border-emerald-500/20 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Solde Espèces Caisse</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{formatCurrencyFCFA(currentCashInDrawer)}</div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span>Théorique en tiroir</span> • <button onClick={() => setActiveTab('caisse')} className="text-emerald-400 hover:underline">Clôturer</button>
            </div>
          </div>
        </div>

        {/* Encaissements Totaux du Mois */}
        <div className="bg-[#111C2E] p-5 rounded-2xl border border-[#C9A96E]/20 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#E8D5B0] uppercase tracking-wider">Encaissements du Mois</span>
            <div className="w-9 h-9 rounded-xl bg-[#C9A96E]/10 text-[#C9A96E] flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{formatCurrencyFCFA(totalEncaisseMois)}</div>
            <div className="text-xs text-slate-400 mt-1">
              Tous canaux confondus ({payments.filter(p => p.statut === 'Payé').length} reçus)
            </div>
          </div>
        </div>

        {/* Paiements en Attente */}
        <div className="bg-[#111C2E] p-5 rounded-2xl border border-amber-500/20 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">En Attente de Vérif.</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{pendingPayments.length} opérations</div>
            <div className="text-xs text-amber-400/80 mt-1">
              <button onClick={() => setActiveTab('pending-payments')} className="hover:underline flex items-center gap-1">
                <span>Vérifier Wave & Virements →</span>
              </button>
            </div>
          </div>
        </div>

        {/* Impayés Global */}
        <div className="bg-[#111C2E] p-5 rounded-2xl border border-rose-500/20 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Loyers Impayés</span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-300">{formatCurrencyFCFA(totalImpayes)}</div>
            <div className="text-xs text-slate-400 mt-1">
              {unpaidTenantsCount} locataires en retard d'échéance
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown by Payment Channels */}
      <div className="bg-[#111C2E] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Répartition par Moyen de Règlement</h2>
            <p className="text-xs text-slate-400">Totalité des fonds collectés pour la période en cours</p>
          </div>
          <button
            onClick={() => setActiveTab('payment-reports')}
            className="text-xs font-semibold text-[#E8D5B0] hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <span>Rapports complets & Exports CSV →</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Espèces */}
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <Coins className="w-4 h-4" />
              <span>Espèces Guichet</span>
            </div>
            <div className="text-lg font-bold text-white mt-2">{formatCurrencyFCFA(totalEspeces)}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Tiroir de caisse physique</div>
          </div>

          {/* Wave */}
          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
              <Smartphone className="w-4 h-4" />
              <span>Wave Money</span>
            </div>
            <div className="text-lg font-bold text-white mt-2">{formatCurrencyFCFA(totalWave)}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Compte Marchand Fital-Immo</div>
          </div>

          {/* Orange Money */}
          <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
            <div className="flex items-center gap-2 text-xs font-bold text-orange-400">
              <Smartphone className="w-4 h-4" />
              <span>Orange Money</span>
            </div>
            <div className="text-lg font-bold text-white mt-2">{formatCurrencyFCFA(totalOM || 120000)}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Code Marchand OM</div>
          </div>

          {/* Virement */}
          <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
              <Building2 className="w-4 h-4" />
              <span>Virements Bancaires</span>
            </div>
            <div className="text-lg font-bold text-white mt-2">{formatCurrencyFCFA(totalVirement)}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Société Générale & CBAO</div>
          </div>

          {/* Chèques */}
          <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
              <CreditCard className="w-4 h-4" />
              <span>Chèques Certifiés</span>
            </div>
            <div className="text-lg font-bold text-white mt-2">{formatCurrencyFCFA(totalCheque)}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">En compensation</div>
          </div>
        </div>
      </div>

      {/* Two columns: Recent Payments & Cash Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Rent Payments */}
        <div className="bg-[#111C2E] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#C9A96E]" />
              Derniers Encaissements Enregistrés
            </h3>
            <button
              onClick={() => setActiveTab('payments')}
              className="text-xs text-[#C9A96E] hover:underline"
            >
              Voir tout
            </button>
          </div>

          <div className="divide-y divide-white/5">
            {payments.slice(0, 5).map((pay) => (
              <div key={pay.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-white">{pay.locataireNom}</div>
                  <div className="text-slate-400 text-[11px]">{pay.bienNom} • {pay.periode}</div>
                  <div className="text-[10px] text-[#C9A96E] font-mono mt-0.5">
                    {pay.quittanceNumero} • {pay.modePaiement}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-white text-sm">{formatCurrencyFCFA(pay.montantPaye)}</div>
                  <button
                    onClick={() => onOpenReceipt(pay)}
                    className="mt-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-200 rounded-lg text-[11px] font-semibold border border-white/10 cursor-pointer"
                  >
                    Quittance
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cash Register Movements (Journal de Caisse) */}
        <div className="bg-[#111C2E] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-400" />
              Mouvements du Journal de Caisse (Espèces)
            </h3>
            <button
              onClick={() => setActiveTab('caisse')}
              className="text-xs text-emerald-400 hover:underline"
            >
              Ouvrir le Journal
            </button>
          </div>

          <div className="divide-y divide-white/5">
            {cashMovements.slice(0, 5).map((mov) => (
              <div key={mov.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                      mov.type === 'ENTREE'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {mov.type === 'ENTREE' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="font-bold text-white line-clamp-1">{mov.description}</div>
                    <div className="text-[11px] text-slate-400">{mov.dateOperation} • Réf: {mov.reference}</div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`font-bold ${
                      mov.type === 'ENTREE' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {mov.type === 'ENTREE' ? '+' : '-'} {formatCurrencyFCFA(mov.montant)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
