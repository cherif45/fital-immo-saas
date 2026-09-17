import React, { useState } from 'react';
import { Payment, UserAccount } from '../types';
import { formatCurrencyFCFA } from '../lib/calculations/financial';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Smartphone, 
  Building2, 
  Search, 
  Filter, 
  ExternalLink, 
  Download,
  AlertCircle,
  FileCheck
} from 'lucide-react';

interface PendingPaymentsViewProps {
  payments: Payment[];
  currentUser: UserAccount;
  onValidatePayment: (paymentId: string) => void;
  onRejectPayment: (paymentId: string, reason: string) => void;
  onOpenReceipt: (payment: Payment) => void;
}

export function PendingPaymentsView({
  payments,
  currentUser,
  onValidatePayment,
  onRejectPayment,
  onOpenReceipt,
}: PendingPaymentsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [selectedRejectPayment, setSelectedRejectPayment] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const pendingList = payments.filter((p) => p.verificationStatut === 'en_attente');
  const validatedList = payments.filter((p) => p.verificationStatut === 'valide').slice(0, 10);

  const filteredPending = pendingList.filter((p) => {
    const matchSearch =
      p.locataireNom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.transactionReference && p.transactionReference.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.quittanceNumero && p.quittanceNumero.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchMethod = methodFilter === 'ALL' || p.moyenPaiementCode === methodFilter || p.modePaiement === methodFilter;
    return matchSearch && matchMethod;
  });

  const totalPendingAmount = pendingList.reduce((sum, p) => sum + p.montantPaye, 0);

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRejectPayment || !rejectReason) return;
    onRejectPayment(selectedRejectPayment.id, rejectReason);
    setSelectedRejectPayment(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#111C2E] p-6 rounded-2xl border border-amber-500/20 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Paiements en Attente de Validation
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full font-bold border border-amber-500/30">
                {pendingList.length} à vérifier
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Vérification des téléversements de captures Wave, virements bancaires et règlements dématérialisés.
            </p>
          </div>
        </div>

        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-right">
          <div className="text-[11px] text-amber-400 font-semibold uppercase">Total en Instance</div>
          <div className="text-lg font-bold text-white">{formatCurrencyFCFA(totalPendingAmount)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par locataire, référence de transaction..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#111C2E] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C9A96E]"
          />
        </div>

        <div>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-[#111C2E] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#C9A96E]"
          >
            <option value="ALL">Tous les canaux ({pendingList.length})</option>
            <option value="WAVE">Wave Money</option>
            <option value="ORANGE_MONEY">Orange Money</option>
            <option value="FREE_MONEY">Free Money</option>
            <option value="VIREMENT">Virement bancaire</option>
            <option value="CHEQUE">Chèque</option>
          </select>
        </div>
      </div>

      {/* Pending Items List */}
      <div className="space-y-4">
        {filteredPending.length === 0 ? (
          <div className="bg-[#111C2E] p-12 rounded-2xl border border-white/5 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto opacity-75" />
            <h3 className="text-base font-bold text-white">Tous les paiements ont été traités !</h3>
            <p className="text-xs text-slate-400">Aucun règlement dématérialisé n'est en attente de vérification.</p>
          </div>
        ) : (
          filteredPending.map((p) => (
            <div
              key={p.id}
              className="bg-[#111C2E] p-5 rounded-2xl border border-amber-500/20 hover:border-amber-500/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    En attente de validation
                  </span>
                  <span className="text-xs font-mono text-[#C9A96E] font-bold">Réf: {p.transactionReference || 'N/A'}</span>
                  <span className="text-xs text-slate-400">• Soumis le {p.datePaiement}</span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">{p.locataireNom}</h3>
                  <p className="text-xs text-slate-400">{p.bienNom} — Période : <strong className="text-slate-200">{p.periode}</strong></p>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-300">
                  <span>Moyen : <strong className="text-white">{p.modePaiement}</strong></span>
                  {p.numeroTelephoneEmetteur && (
                    <span>Émetteur : <strong className="text-[#E8D5B0] font-mono">{p.numeroTelephoneEmetteur}</strong></span>
                  )}
                  {p.banqueEmettrice && (
                    <span>Banque : <strong className="text-white">{p.banqueEmettrice}</strong></span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                <div className="text-right">
                  <div className="text-xs text-slate-400">Montant Déclaré</div>
                  <div className="text-xl font-bold text-white">{formatCurrencyFCFA(p.montantPaye)}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedRejectPayment(p)}
                    className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Rejeter</span>
                  </button>

                  <button
                    onClick={() => onValidatePayment(p.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Valider & Émettre Quittance</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reject Modal */}
      {selectedRejectPayment && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111C2E] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-base text-rose-400 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Motif du Rejet du Paiement
              </h3>
              <button onClick={() => setSelectedRejectPayment(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <p className="text-xs text-slate-300">
                Paiement de <strong className="text-white">{selectedRejectPayment.locataireNom}</strong> ({formatCurrencyFCFA(selectedRejectPayment.montantPaye)}).
              </p>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Précisez la raison du refus *</label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ex: Référence introuvable sur le relevé bancaire / Montant insuffisant..."
                  className="w-full px-3 py-2 bg-[#0A111D] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRejectPayment(null)}
                  className="px-3.5 py-1.5 bg-white/5 text-white rounded-lg text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs cursor-pointer"
                >
                  Confirmer le Rejet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
