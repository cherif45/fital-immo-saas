import React, { useState } from 'react';
import {
  Tenant,
  Property,
  LeaseContract,
  Payment,
  Inspection,
  MaintenanceTicket,
  UserAccount,
  PaymentMethodCode,
  AgencySettings,
} from '../types';
import { formatCurrencyFCFA } from '../lib/calculations/financial';
import { 
  Home, 
  Receipt, 
  FileText, 
  Download, 
  CreditCard, 
  Smartphone, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  ShieldCheck, 
  Calendar,
  Send,
  Building2,
  Lock,
  ArrowUpRight,
  PhoneCall,
  MessageSquare,
  ExternalLink,
  Phone
} from 'lucide-react';
import { MobileMoneyPaymentModal } from './MobileMoneyPaymentModal';
import { triggerPhoneCall, triggerSMS, triggerWhatsApp } from '../lib/comms/commsHelper';
import { defaultMobileMoneyConfig } from '../lib/payments/mobileMoney';
import { createDocumentNumber } from '../lib/documentNumber';
import { getNextDueDate } from '../lib/payments/dueDate';
import { LeaseContractModal } from './LeaseContractModal';
import { InspectionPrintModal } from './InspectionPrintModal';

interface TenantDashboardViewProps {
  currentUser: UserAccount;
  tenant: Tenant;
  property?: Property;
  contract?: LeaseContract;
  payments: Payment[];
  inspections: Inspection[];
  maintenance: MaintenanceTicket[];
  onOpenReceipt: (payment: Payment) => void;
  onInitiateOnlinePayment: (amount: number, methodCode: PaymentMethodCode, ref: string) => Promise<boolean>;
  paymentPeriod: string;
  onSubmitIncident?: (title: string, description: string) => void;
  settings?: AgencySettings;
}

export function TenantDashboardView({
  currentUser,
  tenant,
  property,
  contract,
  payments,
  inspections,
  maintenance,
  onOpenReceipt,
  onInitiateOnlinePayment,
  paymentPeriod,
  onSubmitIncident,
  settings,
}: TenantDashboardViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    'overview' | 'home' | 'payments' | 'receipts' | 'incident'
  >('overview');

  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [selectedInspectionForPrint, setSelectedInspectionForPrint] = useState<Inspection | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isSuccessNotification, setIsSuccessNotification] = useState(false);
  const [incidentSuccessMessage, setIncidentSuccessMessage] = useState<string>('');

  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentDesc, setIncidentDesc] = useState('');

  // STRICT FILTERING: Only items for THIS tenant
  const myPayments = payments.filter((p) => p.locataireId === tenant.id);
  const myInspections = inspections.filter(
    (inspection) =>
      inspection.locataireId === tenant.id ||
      (!inspection.locataireId && inspection.bienId === tenant.bienId),
  );
  const myMaintenance = maintenance.filter((m) => m.bienId === tenant.bienId);

  const lastPayment = myPayments.length > 0 ? myPayments[0] : null;
  const isUpToDate = tenant.statut === 'À jour';
  const totalDue = tenant.loyerMensuel + (tenant.arrieresCumules || 0);
  const depositAmount =
    contract?.cautionLoyer ?? contract?.cautionMontant ?? contract?.montantCaution;
  const agencyPhone = settings?.standardTelephone || settings?.telephone;
  const agencyWhatsapp = settings?.whatsappBusiness || agencyPhone;

  const nextDueDate = new Date(`${getNextDueDate(contract?.jourEcheance ?? 5)}T00:00:00`);
  const nextDueDateLabel = nextDueDate.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const handleIncidentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentTitle || !incidentDesc) return;
    onSubmitIncident(incidentTitle, incidentDesc);
    setIncidentTitle('');
    setIncidentDesc('');
    setIncidentSuccessMessage('Votre signalement a été transmis à l’équipe technique de FITAL-IMMO.');
    setTimeout(() => setIncidentSuccessMessage(''), 5000);
  };

  const handleConfirmMobilePayment = async (
    amount: number,
    method: PaymentMethodCode,
    ref: string,
  ): Promise<boolean> => {
    const saved = await onInitiateOnlinePayment(amount, method, ref);
    if (saved) {
      setIsSuccessNotification(true);
      setTimeout(() => setIsSuccessNotification(false), 6000);
    }
    return saved;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Status */}
      <div className="bg-gradient-to-r from-[#111C2E] via-[#1A233A] to-[#111C2E] p-6 rounded-2xl border border-purple-500/20 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {currentUser.avatar ? (
            <img
              src={currentUser.avatar}
              alt={`${tenant.prenom} ${tenant.nom}`}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-500/40 shadow-md"
            />
          ) : (
            <div
              aria-hidden="true"
              className="w-16 h-16 rounded-2xl border-2 border-purple-500/40 shadow-md bg-purple-500/10 text-purple-300 flex items-center justify-center text-xl font-bold"
            >
              {`${tenant.prenom?.[0] || ''}${tenant.nom?.[0] || ''}`.toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                Espace Locataire Dédié
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {contract ? `Bail Réf : ${contract.ref}` : 'Aucun bail enregistré'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">
              Bonjour, {tenant.prenom} {tenant.nom}
            </h1>
            <p className="text-xs text-slate-300 flex items-center gap-2 mt-1">
              <span>Logement : <strong className="text-white">{tenant.bienNom}</strong></span>
              <span>•</span>
              <span>Loyer : <strong className="text-[#E8D5B0]">{formatCurrencyFCFA(tenant.loyerMensuel)}</strong> / mois</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsContractModalOpen(true)}
            disabled={!contract}
            className="px-3.5 py-2.5 bg-[#1E2E45] hover:bg-[#2A3F5C] border border-[#C9A96E]/30 text-[#E8D5B0] font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-[#C9A96E]" />
            <span>{contract ? 'Mon Bail (PDF)' : 'Bail non enregistré'}</span>
          </button>
          <button
            onClick={() => setIsPayModalOpen(true)}
            className="px-5 py-2.5 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] font-bold rounded-xl text-xs sm:text-sm transition-all shadow-lg flex items-center gap-2 cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>Payer mon Loyer (Wave / OM)</span>
          </button>
        </div>
      </div>

      {isSuccessNotification && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Votre demande de paiement a été soumise avec succès et est en cours de validation par la caisse.</span>
          </div>
          <button onClick={() => setIsSuccessNotification(false)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex flex-wrap border-b border-white/10 gap-2 sm:gap-6">
        {[
          { id: 'overview', label: 'Mon Tableau de Bord', icon: Home },
          { id: 'home', label: 'Mon Logement & Bail', icon: Building2 },
          { id: 'payments', label: 'Historique des Paiements', icon: Receipt },
          { id: 'receipts', label: 'Mes Quittances Téléchargeables', icon: Download },
          { id: 'incident', label: 'Signaler une Panne / Travaux', icon: Wrench },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`pb-3 px-1 text-sm font-semibold transition-all relative flex items-center gap-2 cursor-pointer ${
                isActive ? 'text-[#C9A96E]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C9A96E] rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* VIEW: Overview */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Tenant KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Statut Loyer */}
            <div className="bg-[#111C2E] p-5 rounded-2xl border border-white/5 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Statut du Loyer</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isUpToDate ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {isUpToDate ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                </div>
              </div>
              <div className="mt-3">
                <div className={`text-2xl font-bold ${isUpToDate ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {tenant.statut}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {isUpToDate ? 'Aucun retard constaté' : `${tenant.joursRetard} jours de retard`}
                </div>
              </div>
            </div>

            {/* Prochaine Échéance */}
            <div className="bg-[#111C2E] p-5 rounded-2xl border border-white/5 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Prochaine Échéance</span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-white">{nextDueDateLabel}</div>
                <div className="text-xs text-slate-400 mt-1">
                  Loyer exigible le {contract?.jourEcheance ?? 5} de chaque mois
                </div>
              </div>
            </div>

            {/* Reste à Payer / Arriérés */}
            <div className="bg-[#111C2E] p-5 rounded-2xl border border-white/5 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reste à Payer</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className={`text-2xl font-bold ${tenant.arrieresCumules > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                  {formatCurrencyFCFA(tenant.arrieresCumules || 0)}
                </div>
                <div className="text-xs text-slate-400 mt-1">Solde exigible immédiat</div>
              </div>
            </div>

            {/* Dernier Paiement */}
            <div className="bg-[#111C2E] p-5 rounded-2xl border border-white/5 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dernier Règlement</span>
                <div className="w-8 h-8 rounded-lg bg-[#C9A96E]/10 text-[#C9A96E] flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-lg font-bold text-white">
                  {lastPayment ? formatCurrencyFCFA(lastPayment.montantPaye) : '0 FCFA'}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {lastPayment ? `${lastPayment.periode} (${lastPayment.modePaiement})` : 'Aucun paiement'}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Pay Box */}
          <div className="p-6 bg-[#111C2E] rounded-2xl border border-[#C9A96E]/30 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Réglez votre loyer en toute simplicité</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Instantané</span>
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Paiement direct sans déplacement par Wave, Orange Money, Virement ou Espèces à l'agence.
              </p>
            </div>

            <button
              onClick={() => setIsPayModalOpen(true)}
              className="px-6 py-3 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] font-bold rounded-xl text-sm transition-all shadow-lg flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Smartphone className="w-4 h-4" />
              <span>Initier un Paiement Sécurisé</span>
            </button>
          </div>

          {/* Recent Quittances */}
          <div className="bg-[#111C2E] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Download className="w-4 h-4 text-[#C9A96E]" />
                Vos Dernières Quittances Officielles
              </h3>
              <button onClick={() => setActiveSubTab('receipts')} className="text-xs text-[#C9A96E] hover:underline">
                Voir toutes les quittances →
              </button>
            </div>

            <div className="divide-y divide-white/5">
              {myPayments.filter(p => p.statut === 'Payé').map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white text-sm">Quittance Loyer {p.periode}</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">N° {p.quittanceNumero} • Payé le {p.datePaiement}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-emerald-400 text-sm">{formatCurrencyFCFA(p.montantPaye)}</span>
                    <button
                      onClick={() => onOpenReceipt(p)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Télécharger</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: Logement & Bail */}
      {activeSubTab === 'home' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#111C2E] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#C9A96E]" />
              Détails de votre Logement
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Désignation :</span>
                <span className="text-white font-bold">{tenant.bienNom}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Adresse :</span>
                <span className="text-white">{property?.adresse || 'Adresse non renseignée'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Loyer mensuel charges comprises :</span>
                <span className="text-[#E8D5B0] font-bold text-sm">{formatCurrencyFCFA(tenant.loyerMensuel)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Dépôt de garantie :</span>
                <span className="text-white font-bold">
                  {depositAmount === undefined ? 'Non renseigné' : formatCurrencyFCFA(depositAmount)}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Date d’entrée dans les lieux :</span>
                <span className="text-white">{tenant.dateEntree || 'Non renseignée'}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#111C2E] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              Contrat de Bail & État des Lieux
            </h3>
            {contract ? <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-white">Contrat de bail — {contract.typeContrat}</div>
              <p className="text-slate-400">Référence enregistrée : {contract.ref}</p>
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => setIsContractModalOpen(true)}
                  className="px-3 py-1.5 bg-[#C9A96E]/20 hover:bg-[#C9A96E]/30 text-[#E8D5B0] rounded-lg text-xs font-semibold border border-[#C9A96E]/30 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-[#C9A96E]" /> Télécharger / Imprimer mon bail (PDF)
                </button>
              </div>
            </div> : (
              <p className="p-4 text-xs text-slate-400 border border-white/10 rounded-xl">
                Aucun contrat de bail n’est enregistré pour ce logement.
              </p>
            )}

            {myInspections.length > 0 ? <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-white">État des lieux — {myInspections[0].type}</div>
              <p className="text-slate-400">
                {myInspections[0].type} enregistré le {myInspections[0].date}.
              </p>
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => setSelectedInspectionForPrint(myInspections[0])}
                  className="px-3 py-1.5 bg-[#C9A96E]/20 hover:bg-[#C9A96E]/30 text-[#E8D5B0] rounded-lg text-xs font-semibold border border-[#C9A96E]/30 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-[#C9A96E]" /> Télécharger / Imprimer l’état des lieux (PDF)
                </button>
              </div>
            </div> : (
              <p className="p-4 text-xs text-slate-400 border border-white/10 rounded-xl">
                Aucun état des lieux n’est enregistré pour ce logement.
              </p>
            )}

            {/* Direct Agency Assistance (Call, WhatsApp, SMS) */}
            <div className="p-4 bg-[#C9A96E]/10 border border-[#C9A96E]/30 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-[#E8D5B0] flex items-center gap-2">
                <PhoneCall className="w-3.5 h-3.5 text-[#C9A96E]" />
                <span>Assistance Directe Agence FITAL-IMMO</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                Besoin d'aide, d'une quittance urgente ou d'une information sur votre bail ?
              </p>
              <div className="pt-2 flex items-center gap-2 flex-wrap">
                {agencyPhone && (
                <button
                  onClick={() => triggerPhoneCall(agencyPhone)}
                  className="px-3 py-1.5 bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 rounded-lg text-xs font-semibold border border-sky-500/40 flex items-center gap-1.5 transition-all"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Appeler l'Agence</span>
                </button>
                )}
                {agencyWhatsapp && (
                <button
                  onClick={() => triggerWhatsApp(agencyWhatsapp, `Bonjour FITAL-IMMO, je suis ${tenant.prenom} ${tenant.nom}, locataire de ${tenant.bienNom || 'votre bien'}. Je vous contacte au sujet de mon bail.`)}
                  className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 rounded-lg text-xs font-semibold border border-emerald-500/40 flex items-center gap-1.5 transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp Agence</span>
                </button>
                )}
                {agencyPhone && (
                <button
                  onClick={() => triggerSMS(agencyPhone, `FITAL-IMMO: Message de ${tenant.prenom} ${tenant.nom} (Locataire ${tenant.bienNom}).`)}
                  className="px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 rounded-lg text-xs font-semibold border border-purple-500/40 flex items-center gap-1.5 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>SMS Agence</span>
                </button>
                )}
                {!agencyPhone && !agencyWhatsapp && (
                  <span className="text-slate-400">Coordonnées de l’agence non configurées.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: Payments */}
      {activeSubTab === 'payments' && (
        <div className="bg-[#111C2E] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-white">Historique Complet de vos Règlements</h2>
          <div className="divide-y divide-white/5">
            {myPayments.map((p) => (
              <div key={p.id} className="py-3.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white text-sm">Loyer {p.periode}</div>
                  <div className="text-slate-400 text-xs mt-0.5">
                    Quittance : <strong className="font-mono text-[#C9A96E]">{p.quittanceNumero}</strong> • Payé par {p.modePaiement}
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <div className="font-bold text-white text-sm">{formatCurrencyFCFA(p.montantPaye)}</div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.statut === 'Payé' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {p.statut}
                    </span>
                  </div>
                  <button
                    onClick={() => onOpenReceipt(p)}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Quittance
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: Receipts */}
      {activeSubTab === 'receipts' && (
        <div className="bg-[#111C2E] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-white">Téléchargement de vos Quittances de Loyer</h2>
          <p className="text-xs text-slate-400">
            Toutes vos quittances certifiées conformes avec QR Code et décharge FITAL-IMMO.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myPayments.filter(p => p.statut === 'Payé').map((p) => (
              <div key={p.id} className="p-4 bg-[#0A111D] border border-white/5 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#C9A96E]">{p.quittanceNumero}</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Acquittée</span>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Loyer {p.periode}</h4>
                  <p className="text-xs text-slate-400">{tenant.bienNom}</p>
                </div>
                <div className="text-base font-bold text-white">{formatCurrencyFCFA(p.montantPaye)}</div>
                <button
                  onClick={() => onOpenReceipt(p)}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-semibold border border-white/10 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#C9A96E]" />
                  <span>Imprimer / Télécharger</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: Incident & Maintenance */}
      {activeSubTab === 'incident' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#111C2E] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400" />
              Signaler un Incident ou une Réparation
            </h3>
            <p className="text-xs text-slate-400">
              Une fuite d'eau, panne électrique ou réparation nécessaire ? Transmettez votre demande directement à l'équipe technique.
            </p>

            {incidentSuccessMessage && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{incidentSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleIncidentSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Titre de la panne / Objet *</label>
                <input
                  type="text"
                  required
                  value={incidentTitle}
                  onChange={(e) => setIncidentTitle(e.target.value)}
                  placeholder="Ex: Fuite sous évier cuisine"
                  className="w-full px-3.5 py-2 bg-[#0A111D] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#C9A96E]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Description détaillée *</label>
                <textarea
                  required
                  rows={4}
                  value={incidentDesc}
                  onChange={(e) => setIncidentDesc(e.target.value)}
                  placeholder="Décrivez précisément la panne..."
                  className="w-full px-3.5 py-2 bg-[#0A111D] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#C9A96E]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Envoyer le Signalement</span>
              </button>
            </form>
          </div>

          <div className="bg-[#111C2E] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
            <h3 className="font-bold text-white text-base">Suivi de vos Demandes de Maintenance</h3>
            <div className="space-y-3">
              {myMaintenance.map((m) => (
                <div key={m.id} className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{m.titre}</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold">
                      {m.statut}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">{m.description}</p>
                  <div className="text-[10px] text-slate-500 flex justify-between pt-1">
                    <span>Date signalement : {m.dateSignalement}</span>
                    <span>Priorité : {m.priorite}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Online Mobile Money Payment Modal */}
      <MobileMoneyPaymentModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        amount={totalDue}
        tenantName={`${tenant.prenom} ${tenant.nom}`}
        tenantPhone={tenant.telephone}
        propertyNom={tenant.bienNom}
        period={paymentPeriod}
        reference={createDocumentNumber(settings?.prefixPaiement, 'PAY-')}
        onConfirmPayment={async (amount, method, ref) => {
          const saved = await handleConfirmMobilePayment(amount, method, ref);
          if (saved) setIsPayModalOpen(false);
          return saved;
        }}
      />

      {/* Modal: Contrat de Bail Officiel Imprimable */}
      {isContractModalOpen && contract && (
        <LeaseContractModal
          contract={contract}
          settings={settings}
          onClose={() => setIsContractModalOpen(false)}
        />
      )}

      {/* Modal: État des Lieux Imprimable */}
      {selectedInspectionForPrint && (
        <InspectionPrintModal
          agencySettings={settings}
          inspection={selectedInspectionForPrint}
          onClose={() => setSelectedInspectionForPrint(null)}
        />
      )}
    </div>
  );
}
