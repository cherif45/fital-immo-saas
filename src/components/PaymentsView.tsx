import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  Download,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign,
  User,
  Building,
  Printer,
  Sparkles,
  PhoneCall,
  Send,
  MessageSquare,
  Smartphone,
} from 'lucide-react';
import { Payment, Tenant, Property, Owner, PaymentMethod, PaymentStatus, UserAccount, AgencySettings } from '../types';
import { formatCurrency, formatNumber, formatDate, exportToCSV } from '../lib/utils';
import { triggerPhoneCall, triggerSMS, triggerWhatsApp, getPaymentReceiptTemplate } from '../lib/comms/commsHelper';
import { MobileMoneyPaymentModal } from './MobileMoneyPaymentModal';
import confetti from 'canvas-confetti';

interface PaymentsViewProps {
  payments: Payment[];
  tenants: Tenant[];
  properties: Property[];
  owners: Owner[];
  currentUser?: UserAccount;
  settings?: AgencySettings;
  onAddPayment: (payment: Payment) => void;
  onOpenReceipt: (payment: Payment) => void;
  isNewPaymentModalOpen: boolean;
  setIsNewPaymentModalOpen: (open: boolean) => void;
  initialTenantForPayment?: Tenant | null;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  payments,
  tenants,
  properties,
  owners,
  currentUser,
  settings,
  onAddPayment,
  onOpenReceipt,
  isNewPaymentModalOpen,
  setIsNewPaymentModalOpen,
  initialTenantForPayment,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Payé' | 'Impayé'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  const [selectedTenantId, setSelectedTenantId] = useState<string>(initialTenantForPayment?.id || '');
  const [selectedPaymentForMobileMoney, setSelectedPaymentForMobileMoney] = useState<Payment | null>(null);
  const [periode, setPeriode] = useState<string>('Mai 2026');
  const [montantPaye, setMontantPaye] = useState<number>(0);
  const [modePaiement, setModePaiement] = useState<PaymentMethod>('Virement');
  const [penalites, setPenalites] = useState<number>(0);
  const [charges, setCharges] = useState<number>(0);
  const [tva, setTva] = useState<number>(0);
  const [tom, setTom] = useState<number>(0);
  const [datePaiement, setDatePaiement] = useState<string>(new Date().toISOString().split('T')[0]);
  const [observation, setObservation] = useState<string>('Règlement loyer régulier');
  // ⬇️ NOUVEAU : Gestion acompte/solde
  const [referencePaiementInitial, setReferencePaiementInitial] = useState<string>('');

  // 🔒 MATRICE DE PERMISSIONS
  const role = currentUser?.role || 'ADMIN';
  const isLocataire = role === 'LOCATAIRE';
  const canEncaisser = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'CAISSIER' || role === 'GESTIONNAIRE';
  const canUseMobileMoney = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'CAISSIER' || role === 'GESTIONNAIRE' || role === 'LOCATAIRE';
  const canSeeOthers = !isLocataire;

  React.useEffect(() => {
    if (selectedTenantId) {
      const t = tenants.find((item) => item.id === selectedTenantId);
      if (t) {
        const p = properties.find((prop) => prop.id === t.bienId);
        const base = t.loyerMensuel || (p?.loyerBase || 0);
        setCharges(p?.charges || 0);
        setPenalites(t.joursRetard > 10 ? Math.round(base * 0.1) : 0);
        setMontantPaye(base + (p?.charges || 0) + (t.joursRetard > 10 ? Math.round(base * 0.1) : 0));
      }
    }
  }, [selectedTenantId]);

  React.useEffect(() => {
    if (isLocataire && isNewPaymentModalOpen) {
      setIsNewPaymentModalOpen(false);
    }
  }, [isLocataire, isNewPaymentModalOpen, setIsNewPaymentModalOpen]);

  const filteredPayments = payments.filter((p) => {
    if (statusFilter !== 'all' && p.statut !== statusFilter) return false;
    if (methodFilter !== 'all' && p.modePaiement !== methodFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.locataireNom.toLowerCase().includes(q) ||
        p.bienNom.toLowerCase().includes(q) ||
        p.quittanceNumero.toLowerCase().includes(q) ||
        p.ref.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalCollected = filteredPayments
    .filter((p) => p.statut === 'Payé')
    .reduce((sum, p) => sum + p.montantPaye, 0);

  const totalPaidSum = filteredPayments
    .filter((p) => p.statut === 'Payé' || p.statut === 'Partiel')
    .reduce((sum, p) => sum + p.montantPaye, 0);

  const virementSum = filteredPayments
    .filter((p) => (p.modePaiement === 'Virement' || p.modePaiement === 'Chèque') && (p.statut === 'Payé' || p.statut === 'Partiel'))
    .reduce((sum, p) => sum + p.montantPaye, 0);

  const mobileSum = filteredPayments
    .filter((p) => (p.modePaiement === 'Mobile Money' || p.moyenPaiementCode === 'WAVE' || p.moyenPaiementCode === 'ORANGE_MONEY') && (p.statut === 'Payé' || p.statut === 'Partiel'))
    .reduce((sum, p) => sum + p.montantPaye, 0);

  const especesSum = filteredPayments
    .filter((p) => p.modePaiement === 'Espèces' && (p.statut === 'Payé' || p.statut === 'Partiel'))
    .reduce((sum, p) => sum + p.montantPaye, 0);

  const virementPct = totalPaidSum > 0 ? Math.round((virementSum / totalPaidSum) * 100) : 0;
  const mobilePct = totalPaidSum > 0 ? Math.round((mobileSum / totalPaidSum) * 100) : 0;
  const especesPct = totalPaidSum > 0 ? Math.round((especesSum / totalPaidSum) * 100) : 0;

  // ============================================================
  // HANDLER : ENREGISTRER UN PAIEMENT
  // ============================================================
  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();

    if (!canEncaisser) {
      alert("Vous n'avez pas les droits pour enregistrer un encaissement.");
      return;
    }

    const t = tenants.find((item) => item.id === selectedTenantId);
    if (!t) return;

    const p = properties.find((prop) => prop.id === t.bienId);
    const o = owners.find((owner) => owner.id === (p?.proprietaireId || t.proprietaireId));

    const totalCalculated = (t.loyerMensuel || 0) + charges + tva + tom + penalites;
    const isFull = montantPaye >= totalCalculated;

    // ⬇️ NOUVEAU : Récupérer le paiement initial si lié
    const initialPayment = referencePaiementInitial
      ? payments.find((p) => p.ref === referencePaiementInitial)
      : null;

    // Déterminer le type de reçu
    let typeRecu: 'QUITTANCE' | 'RECU_ACOMPTE' | 'QUITTANCE_SOLDE';
    if (referencePaiementInitial && isFull) {
      typeRecu = 'QUITTANCE_SOLDE';
    } else if (!isFull) {
      typeRecu = 'RECU_ACOMPTE';
    } else {
      typeRecu = 'QUITTANCE';
    }

    const isMobileMoney = modePaiement === 'Wave' || modePaiement === 'Orange Money' || modePaiement === 'Mobile Money';
const moyenCode = modePaiement === 'Wave' ? 'WAVE' 
                : modePaiement === 'Orange Money' ? 'ORANGE_MONEY'
                : modePaiement === 'Mobile Money' ? 'WAVE'
                : modePaiement === 'Virement' ? 'VIREMENT'
                : modePaiement === 'Chèque' ? 'CHEQUE'
                : 'ESPECES';

const newPayment: Payment = {
  id: crypto.randomUUID(),
  ref: `PAY-2026-${Math.floor(1000 + Math.random() * 9000)}`,
  quittanceNumero: `QUITT-2026-${Math.floor(100 + Math.random() * 900)}`,
  locataireId: t.id,
  locataireNom: `${t.prenom} ${t.nom}`,
  bienId: t.bienId,
  bienNom: p?.nom || t.bienNom,
  proprietaireId: o?.id || p?.proprietaireId || t.proprietaireId || '',
  proprietaireNom: o ? `${o.prenom} ${o.nom}` : 'Propriétaire',
  periode,
  loyerBase: t.loyerMensuel || 0,
  charges,
  tva,
  tom,
  penalites,
  indemnitesOccupation: 0,
  montantTotal: totalCalculated,
  montantPaye: Number(montantPaye),
  montantRestant: Math.max(0, totalCalculated - Number(montantPaye)),
  statut: isMobileMoney ? 'En attente' : (isFull ? 'Payé' : 'Partiel'),
  modePaiement,
  moyenPaiementCode: moyenCode,
  verificationStatut: isMobileMoney ? 'en_attente' : 'valide',
  datePaiement,
  dateEcheance: '2026-05-05',
  recuPar: currentUser ? `${currentUser.prenom} ${currentUser.nom} (${currentUser.role})` : 'Caisse FITAL-IMMO',
  observation,
  typeRecu,
  referencePaiementInitial: referencePaiementInitial || undefined,
  montantInitialDu: initialPayment?.montantTotal || totalCalculated,
};

    onAddPayment(newPayment);
    setIsNewPaymentModalOpen(false);

    // Reset
    setReferencePaiementInitial('');

    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#C9A96E', '#4CAF82', '#E8D5B0'],
      });
    } catch {}

    onOpenReceipt(newPayment);
  };

  const handleExportCSV = () => {
    const headers = ['N° Quittance', 'Locataire', 'Bien Loué', 'Période', 'Montant Payé (FCFA)', 'Mode', 'Date', 'Statut'];
    const rows = filteredPayments.map((p) => [
      p.quittanceNumero,
      p.locataireNom,
      p.bienNom,
      p.periode,
      p.montantPaye,
      p.modePaiement,
      p.datePaiement,
      p.statut,
    ]);
    exportToCSV('Registre_Paiements_FITAL_IMMO', rows, headers);
  };

  const getPayablePayment = (): Payment | null => {
    if (isLocataire) {
      return payments.find((p) => p.statut !== 'Payé') || payments[0] || null;
    }
    return payments.find((p) => p.statut !== 'Payé') || payments[0] || null;
  };

  // Paiements partiels du locataire sélectionné (pour lier acompte → solde)
  const partialPaymentsForTenant = payments.filter(
    (p) => p.locataireId === selectedTenantId && p.statut === 'Partiel'
  );
  
  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/20">
          <div className="text-[11px] text-[#A8B4C4] font-medium uppercase tracking-wider">
            {isLocataire ? 'Total Encaissé par moi' : 'Total Encaissé (Filtre actif)'}
          </div>
          <div className="text-2xl font-bold text-[#E8D5B0] mt-1">
            {formatNumber(totalCollected)}{' '}
            <span className="text-xs font-normal text-[#C9A96E]">FCFA</span>
          </div>
          <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> {filteredPayments.filter((p) => p.statut === 'Payé').length} quittances validées
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/20">
          <div className="text-[11px] text-[#A8B4C4] font-medium uppercase tracking-wider">
            Modes d'Encaissement
          </div>
          <div className="text-xs text-white mt-2 space-y-1">
            <div className="flex justify-between">
              <span className="text-[#6B7C94]">Virements & Banques :</span>
              <span className="font-semibold text-white">{virementPct}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7C94]">Wave / Mobile Money :</span>
              <span className="font-semibold text-[#C9A96E]">{mobilePct}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7C94]">Espèces / Caisse :</span>
              <span className="font-semibold text-white">{especesPct}%</span>
            </div>
          </div>
        </div>

        {canUseMobileMoney && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1E2E45] to-[#162133] border border-[#C9A96E]/30 flex flex-col justify-between">
            <div className="text-xs text-white font-bold flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-[#C9A96E]" />
              <span>{isLocataire ? 'Payer mon Loyer' : 'Encaissements & Moyens Mobiles'}</span>
            </div>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              {canEncaisser && (
                <button
                  onClick={() => setIsNewPaymentModalOpen(true)}
                  className="py-2 px-3 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md hover:scale-105 transition-all text-center flex items-center justify-center gap-1.5 flex-1"
                >
                  <Plus className="w-4 h-4" /> Enregistrer
                </button>
              )}
              <button
                onClick={() => {
                  const target = getPayablePayment();
                  if (target) setSelectedPaymentForMobileMoney(target);
                  else alert('Aucune quittance disponible pour le paiement.');
                }}
                className={`py-2 px-3 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 font-bold text-xs shadow-md hover:scale-105 transition-all text-center flex items-center justify-center gap-1.5 ${canEncaisser ? 'flex-1' : 'w-full'}`}
                title={isLocataire ? 'Payer mon loyer via Wave / OM' : 'Générer un lien ou encaisser par Wave / OM'}
              >
                <Smartphone className="w-4 h-4 text-blue-400" /> Wave / OM
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-[#1E2E45] p-1 rounded-xl border border-[#C9A96E]/15 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'all' ? 'bg-[#C9A96E] text-[#0F1B2D] font-bold shadow-sm' : 'text-[#A8B4C4] hover:text-white'
              }`}
            >
              Tous ({payments.length})
            </button>
            <button
              onClick={() => setStatusFilter('Payé')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'Payé' ? 'bg-emerald-500 text-white font-bold shadow-sm' : 'text-emerald-400 hover:text-white'
              }`}
            >
              Payés ({payments.filter((p) => p.statut === 'Payé').length})
            </button>
            <button
              onClick={() => setStatusFilter('Impayé')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'Impayé' ? 'bg-rose-500 text-white font-bold shadow-sm' : 'text-rose-400 hover:text-white'
              }`}
            >
              Impayés ({payments.filter((p) => p.statut === 'Impayé').length})
            </button>
          </div>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-xs text-white focus:outline-none focus:border-[#C9A96E]"
          >
            <option value="all">Tous les Modes</option>
            <option value="Virement">Virement bancaire</option>
            <option value="Mobile Money">Mobile Money (Wave / OM)</option>
            <option value="Espèces">Espèces (Caisse)</option>
            <option value="Chèque">Chèque</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 text-[#6B7C94] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher quittance..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-xs text-white focus:outline-none focus:border-[#C9A96E]"
            />
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] border border-[#C9A96E]/30 text-xs font-medium text-[#E8D5B0] transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-[#1E2E45]/80 text-[#A8B4C4] font-semibold uppercase tracking-wider text-[10px] border-b border-[#C9A96E]/20">
                <th className="py-3 px-4">Réf & Quittance</th>
                <th className="py-3 px-3">Locataire</th>
                <th className="py-3 px-3">Bien / Lot</th>
                <th className="py-3 px-3 text-right">Montant Payé</th>
                <th className="py-3 px-3">Mode</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3 text-center">Statut</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9A96E]/10">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#6B7C94]">
                    <CreditCard className="w-8 h-8 mx-auto text-[#6B7C94]/50 mb-2" />
                    <p className="text-xs font-semibold text-white">Aucun paiement enregistré</p>
                    <p className="text-[11px] text-[#6B7C94] mt-1">
                      {isLocataire ? 'Vous n\'avez pas encore de quittance.' : 'Aucun encaissement correspondant aux filtres.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const isPaid = p.statut === 'Payé';
                  const isAcompte = p.typeRecu === 'RECU_ACOMPTE';
                  const isSolde = p.typeRecu === 'QUITTANCE_SOLDE';
                  return (
                    <tr key={p.id} className="hover:bg-[#1E2E45]/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-white text-[11px]">{p.quittanceNumero}</div>
                        <div className="text-[10px] text-[#6B7C94] font-mono">{p.ref}</div>
                      </td>
                      <td className="py-3 px-3 font-bold text-white">{p.locataireNom}</td>
                      <td className="py-3 px-3 text-[#A8B4C4] max-w-[200px] truncate">{p.bienNom}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        <span className={isPaid ? 'text-[#C9A96E]' : isAcompte ? 'text-blue-400' : 'text-rose-400'}>
                          {formatCurrency(p.montantPaye)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                            p.modePaiement === 'Virement'
                              ? 'bg-sky-500/20 text-sky-300'
                              : p.modePaiement === 'Mobile Money'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {p.modePaiement}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#A8B4C4]">{p.datePaiement ? formatDate(p.datePaiement) : '—'}</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                            isSolde
                              ? 'bg-green-500/20 text-green-300 border-green-500/30'
                              : isAcompte
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              : isPaid
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {isSolde ? 'SOLDE' : isAcompte ? 'ACOMPTE' : p.statut}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => onOpenReceipt(p)}
                            className="px-2.5 py-1 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#C9A96E] font-medium text-[11px] border border-[#C9A96E]/20 transition-all flex items-center gap-1"
                            title="Voir le document officiel"
                          >
                            <Printer className="w-3 h-3" />
                            {isSolde ? 'Solde' : isAcompte ? 'Reçu' : 'Quittance'}
                          </button>

                          {canSeeOthers && (() => {
                            const t = tenants.find((item) => item.id === p.locataireId);
                            if (!t?.telephone) return null;
                            return (
                              <>
                                <button
                                  onClick={() => {
                                    const text = getPaymentReceiptTemplate({
                                      tenantName: p.locataireNom,
                                      propertyNom: p.bienNom,
                                      period: p.periode,
                                      amount: p.montantPaye,
                                      quittanceNumber: p.quittanceNumero,
                                    });
                                    triggerWhatsApp(t.telephone, text);
                                  }}
                                  className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 transition-all"
                                  title="Envoyer par WhatsApp"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => triggerPhoneCall(t.telephone)}
                                  className="p-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/40 text-sky-400 border border-sky-500/30 transition-all"
                                  title="Appeler"
                                >
                                  <PhoneCall className="w-3 h-3" />
                                </button>
                              </>
                            );
                          })()}

                          {!isPaid && canEncaisser && (
                            <button
                              onClick={() => {
                                setSelectedTenantId(p.locataireId);
                                setIsNewPaymentModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-all"
                            >
                              Encaisser
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Enregistrer un Nouveau Paiement */}
      {isNewPaymentModalOpen && canEncaisser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[95vh] overflow-y-auto">
            <div className="p-5 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80 sticky top-0 z-10">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <CreditCard className="w-5 h-5 text-[#C9A96E]" />
                <span>Encaisser un Règlement de Loyer</span>
              </div>
              <button
                onClick={() => {
                  setIsNewPaymentModalOpen(false);
                  setReferencePaiementInitial('');
                }}
                className="text-[#A8B4C4] hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                  1. Sélectionner le Locataire & Bien
                </label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white focus:outline-none focus:border-[#C9A96E]"
                >
                  <option value="">-- Choisir un locataire --</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nom} {t.prenom} — {t.bienNom} (Loyer : {formatNumber(t.loyerMensuel)} FCFA)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Période Concernée
                  </label>
                  <input
                    type="text"
                    value={periode}
                    onChange={(e) => setPeriode(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white focus:outline-none focus:border-[#C9A96E]"
                    placeholder="Mai 2026"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#C9A96E] uppercase mb-1">
                    Montant Encaissé (FCFA)
                  </label>
                  <input
                    type="number"
                    value={montantPaye || ''}
                    onChange={(e) => setMontantPaye(Number(e.target.value))}
                    required
                    min={1}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E] text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#C9A96E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#1E2E45]/40 border border-[#C9A96E]/15">
                <div>
                  <label className="block text-[10px] text-[#6B7C94] uppercase">Charges</label>
                  <input
                    type="number"
                    value={charges || 0}
                    onChange={(e) => setCharges(Number(e.target.value))}
                    className="w-full p-1.5 rounded-lg bg-[#0F1B2D] border border-[#C9A96E]/20 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#6B7C94] uppercase">Pénalités</label>
                  <input
                    type="number"
                    value={penalites || 0}
                    onChange={(e) => setPenalites(Number(e.target.value))}
                    className="w-full p-1.5 rounded-lg bg-[#0F1B2D] border border-rose-500/30 text-rose-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#6B7C94] uppercase">Taxes (TVA/TOM)</label>
                  <input
                    type="number"
                    value={tva + tom || 0}
                    onChange={(e) => setTva(Number(e.target.value))}
                    className="w-full p-1.5 rounded-lg bg-[#0F1B2D] border border-[#C9A96E]/20 text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Mode de Règlement
                  </label>
                  <select
                    value={modePaiement}
                    onChange={(e) => setModePaiement(e.target.value as PaymentMethod)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white focus:outline-none focus:border-[#C9A96E]"
                  >
                    <option value="Virement">Virement bancaire</option>
                    <option value="Mobile Money">Mobile Money (Wave / Orange Money)</option>
                    <option value="Espèces">Espèces (Dépôt direct en caisse)</option>
                    <option value="Chèque">Chèque bancaire</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Date du Paiement
                  </label>
                  <input
                    type="date"
                    value={datePaiement}
                    onChange={(e) => setDatePaiement(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white focus:outline-none focus:border-[#C9A96E]"
                  />
                </div>
              </div>

              {/* ⬇️ NOUVEAU : Lier à un acompte existant */}
              {partialPaymentsForTenant.length > 0 && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 space-y-2">
                  <label className="block text-[11px] font-bold text-blue-300 uppercase">
                    Lier à un acompte existant (optionnel)
                  </label>
                  <select
                    value={referencePaiementInitial}
                    onChange={(e) => setReferencePaiementInitial(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-blue-500/30 text-white text-xs"
                  >
                    <option value="">— Aucun (paiement indépendant) —</option>
                    {partialPaymentsForTenant.map((p) => (
                      <option key={p.id} value={p.ref}>
                        {p.ref} — {formatNumber(p.montantPaye)} / {formatNumber(p.montantTotal)} FCFA ({p.periode})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-blue-200/70">
                    Si ce paiement complète un acompte, sélectionnez-le. La quittance générée sera automatiquement une <strong>QUITTANCE DE SOLDE</strong>.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                  Observations / Référence reçu
                </label>
                <input
                  type="text"
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white focus:outline-none focus:border-[#C9A96E]"
                  placeholder="Ex: Reçu Wave #TX-892137 ou Chèque BOA N°00412"
                />
              </div>

              <div className="pt-4 border-t border-[#C9A96E]/15 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewPaymentModalOpen(false);
                    setReferencePaiementInitial('');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#A8B4C4] font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold shadow-lg shadow-[#C9A96E]/30 hover:scale-105 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Encaisser & Émettre Document</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Mobile Money */}
      {selectedPaymentForMobileMoney && canUseMobileMoney && (
        <MobileMoneyPaymentModal
          isOpen={!!selectedPaymentForMobileMoney}
          onClose={() => setSelectedPaymentForMobileMoney(null)}
          amount={selectedPaymentForMobileMoney.montantPaye || selectedPaymentForMobileMoney.loyerBase || 150000}
          tenantName={selectedPaymentForMobileMoney.locataireNom}
          tenantPhone={
            tenants.find((t) => t.id === selectedPaymentForMobileMoney.locataireId)?.telephone || '+221 77 000 00 00'
          }
          propertyNom={selectedPaymentForMobileMoney.bienNom}
          period={selectedPaymentForMobileMoney.periode}
          reference={selectedPaymentForMobileMoney.ref || `LOY-${Date.now().toString().slice(-4)}`}
          onConfirmPayment={(amount, method, transactionId) => {
            const quittanceNum = `QUITT-2026-${Math.floor(100 + Math.random() * 900)}`;
            const updatedPayment: Payment = {
              ...selectedPaymentForMobileMoney,
              statut: 'Payé',
              montantPaye: amount,
              montantRestant: 0,
              modePaiement: 'Mobile Money',
              moyenPaiementCode: method === 'WAVE' ? 'WAVE' : 'ORANGE_MONEY',
              numeroTransaction: transactionId,
              quittanceNumero: selectedPaymentForMobileMoney.quittanceNumero || quittanceNum,
              datePaiement: new Date().toISOString().split('T')[0],
              observation: `Règlement direct validé via ${method === 'WAVE' ? 'Wave Sénégal' : 'Orange Money'} (${transactionId})`,
              typeRecu: 'QUITTANCE',
            };
            onAddPayment(updatedPayment);
            setSelectedPaymentForMobileMoney(null);
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
          }}
          waveNumero={settings?.waveNumero}
          orangeMoneyCode={settings?.orangeMoneyCode}
          whatsappBusiness={settings?.whatsappBusiness}
        />
      )}
    </div>
  );
};