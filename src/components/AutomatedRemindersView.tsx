import React, { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  Sparkles,
  Send,
  MessageSquare,
  Mail,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Copy,
  ExternalLink,
  RefreshCw,
  Printer,
  ChevronDown,
  Calendar,
  DollarSign,
  ShieldAlert,
  PhoneCall,
  Smartphone,
} from "lucide-react";
import {
  Tenant,
  Property,
  TenantReminder,
  ReminderLevel,
  ReminderChannel,
} from "../types";
import {
  formatCurrency,
  formatNumber,
  formatDate,
  copyToClipboard,
} from "../lib/utils";
import {
  triggerPhoneCall,
  triggerSMS,
  triggerWhatsApp,
} from "../lib/comms/commsHelper";
import { generateWavePaymentLink } from "../lib/payments/mobileMoney";
import { normalizePaymentPeriod } from "../lib/payments/period";
import { PaymentReminderLetterModal } from "./PaymentReminderLetterModal";

interface AutomatedRemindersViewProps {
  tenants: Tenant[];
  properties: Property[];
  payments?: any[];
  reminders: TenantReminder[];
  onAddReminder: (reminder: TenantReminder) => void;
  onOpenReceipt?: (tenant: Tenant) => void;
}

export const AutomatedRemindersView: React.FC<AutomatedRemindersViewProps> = ({
  tenants,
  properties,
  payments = [],
  reminders,
  onAddReminder,
}) => {
  const now = new Date();
  const moisActuel = normalizePaymentPeriod(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  );
  const overdueTenants = useMemo(() => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const fallbackDueDate = new Date(now.getFullYear(), now.getMonth(), 5);
    return tenants.flatMap((tenant) => {
      if (tenant.dateSortie || tenant.statut === "Parti") return [];
      const entryDate = tenant.dateEntree
        ? new Date(`${tenant.dateEntree.slice(0, 10)}T00:00:00`)
        : null;
      if (entryDate && entryDate > today) return [];

      const currentMonthPayments = payments.filter(
        (payment) =>
          payment.locataireId === tenant.id &&
          normalizePaymentPeriod(payment.periodeNormalisee || payment.periode) ===
            moisActuel,
      );
      const validatedPayments = currentMonthPayments.filter(
        (payment) =>
          (payment.statut === "Payé" || payment.statut === "Partiel") &&
          payment.verificationStatut !== "rejete" &&
          payment.verificationStatut !== "en_attente",
      );
      const totalPaid = validatedPayments.reduce(
        (sum, payment) => sum + (Number(payment.montantPaye) || 0),
        0,
      );
      const totalDue = Math.max(
        Number(tenant.loyerMensuel) || 0,
        ...currentMonthPayments.map((payment) => Number(payment.montantTotal) || 0),
      );
      const rentBalance = Math.max(0, totalDue - totalPaid);
      const arrears = Math.max(0, Number(tenant.arrieresCumules) || 0);
      const paymentDueDates = currentMonthPayments
        .map((payment) => payment.dateEcheance)
        .filter((date): date is string => !!date)
        .map((date) => new Date(`${date.slice(0, 10)}T00:00:00`))
        .filter((date) => Number.isFinite(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());
      const dueDate = paymentDueDates[0] || fallbackDueDate;
      const daysPastDue = Math.max(
        0,
        Math.floor((today.getTime() - dueDate.getTime()) / 86400000),
      );
      const enteredAfterDueDate =
        !!entryDate &&
        entryDate.getFullYear() === now.getFullYear() &&
        entryDate.getMonth() === now.getMonth() &&
        entryDate > dueDate;
      const isCurrentRentOverdue =
        rentBalance > 0 && daysPastDue > 0 && !enteredAfterDueDate;
      if (!arrears && !isCurrentRentOverdue) return [];

      const daysLate = arrears
        ? Math.max(1, Number(tenant.joursRetard) || daysPastDue)
        : daysPastDue;
      const amountDue = arrears + (isCurrentRentOverdue ? rentBalance : 0);
      return [
        {
          ...tenant,
          joursRetard: daysLate,
          arrieresCumules: amountDue,
          dateEcheanceRelance: dueDate.toLocaleDateString("fr-FR"),
        },
      ];
    });
  }, [tenants, payments, moisActuel, now.getFullYear(), now.getMonth(), now.getDate()]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>(
    overdueTenants[0]?.id || tenants[0]?.id || "",
  );
  useEffect(() => {
    if (overdueTenants.length > 0 && !overdueTenants.some((tenant) => tenant.id === selectedTenantId)) {
      setSelectedTenantId(overdueTenants[0].id);
    }
  }, [overdueTenants, selectedTenantId]);
  const [selectedChannel, setSelectedChannel] =
    useState<ReminderChannel>("WhatsApp");
  const [selectedLevel, setSelectedLevel] = useState<ReminderLevel>(
    "Niveau 1: Courtois (J+3)",
  );
  const [customMessage, setCustomMessage] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [bulkProgress, setBulkProgress] = useState<string | null>(null);
  const [isLetterModalOpen, setIsLetterModalOpen] = useState<boolean>(false);

  const activeTenant =
    overdueTenants.find((t) => t.id === selectedTenantId) ||
    overdueTenants[0] ||
    tenants.find((tenant) => tenant.id === selectedTenantId);
  const activeTenantIsOverdue = overdueTenants.some(
    (tenant) => tenant.id === activeTenant?.id,
  );
  const activeProperty = properties.find((p) => p.id === activeTenant?.bienId);

  // Auto determine appropriate severity level based on days of delay
  const getSuggestedLevel = (days: number): ReminderLevel => {
    if (days <= 5) return "Niveau 1: Courtois (J+3)";
    if (days <= 12) return "Niveau 2: Modéré (J+10)";
    if (days <= 20) return "Niveau 3: Ferme & Pénalités (J+15)";
    return "Niveau 4: Mise en demeure juridique (J+25)";
  };

  // Generate Message using backend Gemini API route
  const handleGenerateMessage = async (
    tenant?: Tenant,
    level?: ReminderLevel,
    channel?: ReminderChannel,
  ) => {
    const t = tenant || activeTenant;
    if (!t) return;

    const p = properties.find((prop) => prop.id === t.bienId);
    const targetLevel = level || selectedLevel;
    const targetChannel = channel || selectedChannel;

    setIsGenerating(true);
    try {
      const res = await fetch("/api/gemini/relance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locataireNom: `${t.prenom} ${t.nom}`,
          bienNom: p?.nom || t.bienNom,
          montantDu: t.arrieresCumules || t.loyerMensuel,
          joursRetard: t.joursRetard || 7,
          niveau: targetLevel,
          canal: targetChannel,
          dateEcheance:
            overdueTenants.find((tenant) => tenant.id === t.id)
              ?.dateEcheanceRelance || "5 du mois courant",
          penalites: t.joursRetard > 10 ? Math.round(t.loyerMensuel * 0.1) : 0,
        }),
      });
      const data = await res.json();
      if (data && data.message) {
        setCustomMessage(data.message);
      } else {
        // Fallback : utiliser le message selon le NIVEAU
        setCustomMessage(buildFallbackMessage(t, p, targetLevel));
      }
    } catch (err) {
      console.warn("Fallback local (Gemini indisponible):", err);
      setCustomMessage(buildFallbackMessage(t, p, targetLevel));
    } finally {
      setIsGenerating(false);
    }
  };

  // 🆕 FONCTION DE FALLBACK PAR NIVEAU
  const buildFallbackMessage = (
    t: Tenant,
    p: Property | undefined,
    level: ReminderLevel,
  ): string => {
    const nom = `${t.prenom} ${t.nom}`;
    const bien = p?.nom || t.bienNom || "FITAL-IMMO";
    const montant = (t.arrieresCumules || t.loyerMensuel).toLocaleString(
      "fr-FR",
    );
    const jours = t.joursRetard || 7;
    const penalites =
      jours > 10
        ? Math.round(
            (t.arrieresCumules || t.loyerMensuel) * 0.1,
          ).toLocaleString("fr-FR")
        : "0";

    switch (level) {
      case "Niveau 1: Courtois (J+3)":
        return `Bonjour *${nom}* 👋\n\nNous espérons que vous allez bien.\n\nUn petit rappel amical : le loyer de *${bien}* d'un montant de *${montant} FCFA* n'a pas encore été enregistré ce mois-ci.\n\nPeut-être un simple oubli ? Vous pouvez régler par Wave, Orange Money ou au guichet.\n\nMerci pour votre confiance.\n*Service Gestion Locative FITAL-IMMO*`;

      case "Niveau 2: Modéré (J+10)":
        return `Bonjour *${nom}*,\n\nNous revenons vers vous concernant le loyer de *${bien}*.\n\n⚠️ À ce jour, un montant de *${montant} FCFA* reste dû (${jours} jours de retard).\n\nMerci de bien vouloir régulariser votre situation dans les plus brefs délais pour éviter l'application de pénalités.\n\nVous pouvez payer par Wave, Orange Money ou directement au guichet.\n\n*Service Recouvrement FITAL-IMMO*`;

      case "Niveau 3: Ferme & Pénalités (J+15)":
        return `Bonjour *${nom}*,\n\n🚨 RAPPEL IMPORTANT\n\nLe loyer de *${bien}* n'a toujours pas été réglé. Montant dû : *${montant} FCFA* + pénalités de retard : *${penalites} FCFA* (${jours} jours).\n\nConformément aux conditions du bail, des pénalités de retard de 10% sont applicables.\n\nMerci de régler sous 48h pour éviter toute procédure supplémentaire.\n\nContacts : 33 825 59 67 / 77 551 16 70\n*Service Recouvrement FITAL-IMMO*`;

      case "Niveau 4: Mise en demeure juridique (J+25)":
        return `Bonjour *${nom}*,\n\n⚠️ MISE EN DEMEURE\n\nMalgré nos précédents rappels, le loyer de *${bien}* reste impayé. Montant total dû : *${montant} FCFA* + pénalités : *${penalites} FCFA* (${jours} jours de retard).\n\nCette situation nous oblige à engager une procédure de recouvrement juridique conformément à l'article 5 du contrat de bail.\n\nNous vous demandons de régulariser votre situation dans un délai de *8 jours* à compter de la réception de ce message, faute de quoi nous serons contraints de saisir les autorités compétentes.\n\nUne lettre de mise en demeure officielle vous sera également adressée par courrier.\n\n*Service Juridique FITAL-IMMO*`;
    }
  };

  // Initial message load when active tenant changes
  React.useEffect(() => {
    if (activeTenant) {
      const suggested = getSuggestedLevel(activeTenant.joursRetard);
      setSelectedLevel(suggested);
      handleGenerateMessage(activeTenant, suggested, selectedChannel);
    }
  }, [selectedTenantId, selectedChannel, overdueTenants]);

  const handleCopy = async () => {
    const ok = await copyToClipboard(customMessage);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Open direct WhatsApp URL
  const handleSendWhatsApp = () => {
    if (
      !activeTenant ||
      !overdueTenants.some((tenant) => tenant.id === activeTenant.id)
    )
      return;
    const phoneClean = activeTenant.telephone.replace(/[^0-9]/g, "");
    const encoded = encodeURIComponent(customMessage);
    window.open(`https://wa.me/${phoneClean}?text=${encoded}`, "_blank");

    // Register reminder to history
    onAddReminder({
      id: `rem-${Date.now()}`,
      locataireId: activeTenant.id,
      locataireNom: `${activeTenant.prenom} ${activeTenant.nom}`,
      telephone: activeTenant.telephone,
      email: activeTenant.email,
      bienNom: activeTenant.bienNom,
      montantDu: activeTenant.arrieresCumules || activeTenant.loyerMensuel,
      penalites:
        activeTenant.joursRetard > 10
          ? Math.round(activeTenant.loyerMensuel * 0.1)
          : 0,
      joursRetard: activeTenant.joursRetard,
      niveau: selectedLevel,
      canal: "WhatsApp",
      message: customMessage,
      statut: "Envoyé",
      dateCreation: new Date().toISOString().split("T")[0],
      dateEnvoi: new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  };

  // Bulk automated relances preparation
  const handleBulkReminders = async () => {
    setBulkProgress(
      "Génération des relances personnalisées pour tous les locataires en retard...",
    );
    for (const t of overdueTenants) {
      const level = getSuggestedLevel(t.joursRetard);
      onAddReminder({
        id: `rem-bulk-${Date.now()}-${t.id}`,
        locataireId: t.id,
        locataireNom: `${t.prenom} ${t.nom}`,
        telephone: t.telephone,
        email: t.email,
        bienNom: t.bienNom,
        montantDu: t.arrieresCumules || t.loyerMensuel,
        penalites: t.joursRetard > 10 ? Math.round(t.loyerMensuel * 0.1) : 0,
        joursRetard: t.joursRetard,
        niveau: level,
        canal: "WhatsApp",
        message: `Rappel de loyer pour ${t.bienNom} : montant de ${(t.arrieresCumules || t.loyerMensuel).toLocaleString("fr-FR")} FCFA (${t.joursRetard}j de retard, échéance ${t.dateEcheanceRelance}). Merci de régulariser. - Service Recouvrement FITAL-IMMO`,
        statut: "Envoyé",
        dateCreation: new Date().toISOString().split("T")[0],
        dateEnvoi: new Date().toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    }
    setTimeout(() => {
      setBulkProgress(null);
      alert(
        `✅ Relances groupées préparées et enregistrées avec succès pour ${overdueTenants.length} locataires.`,
      );
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Banner Intro */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#1E2E45] via-[#162133] to-[#1E2E45] border border-[#C9A96E]/30 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C9A96E] via-[#E8A84A] to-[#A07840] flex items-center justify-center text-[#0F1B2D] shadow-lg shadow-[#C9A96E]/20 flex-shrink-0">
            <BellRing className="w-6 h-6" />
          </div>
          <div>
            <div className="text-base font-bold text-white flex items-center gap-2">
              <span>Automatisation des Relances Intelligentes</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                Multi-Canaux IA
              </span>
            </div>
            <p className="text-xs text-[#A8B4C4] mt-0.5">
              Génération automatique de relances calibrées (WhatsApp, SMS, Email
              & Mise en demeure juridique)
            </p>
          </div>
        </div>

        <button
          onClick={handleBulkReminders}
          disabled={overdueTenants.length === 0 || !!bulkProgress}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>
            {bulkProgress
              ? "Traitement en cours..."
              : `Relancer tous les impayés (${overdueTenants.length})`}
          </span>
        </button>
      </div>

      {/* Main Studio: Left Selector & Right Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Tenant Selection & Severity Config */}
        <div className="lg:col-span-5 space-y-4">
          {/* Overdue Tenants List */}
          <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl">
            <div className="text-xs font-bold text-white mb-3 flex items-center justify-between">
              <span>Sélectionner le dossier locataire</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold">
                {overdueTenants.length} en retard
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {overdueTenants.length === 0 && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-4 text-center text-[11px] text-emerald-200">
                  Aucun loyer en retard à relancer pour le moment.
                </div>
              )}
              {overdueTenants.map((t) => {
                const isSelected = t.id === selectedTenantId;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTenantId(t.id)}
                    className={`w-full p-3 rounded-xl text-left transition-all border flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-gradient-to-r from-[#C9A96E]/20 to-[#C9A96E]/5 border-[#C9A96E] text-white shadow-md"
                        : "bg-[#1E2E45]/40 border-[#C9A96E]/10 hover:border-[#C9A96E]/30 text-[#A8B4C4]"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {t.prenom} {t.nom}
                      </div>
                      <div className="text-[11px] text-[#A8B4C4] truncate">
                        {t.bienNom}
                      </div>
                      <div className="text-[10px] text-rose-400 font-semibold mt-0.5">
                        {formatCurrency(t.arrieresCumules || t.loyerMensuel)} ·{" "}
                        {t.joursRetard}j de retard
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                        t.joursRetard > 20
                          ? "bg-rose-500/20 text-rose-300"
                          : t.joursRetard > 10
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-sky-500/20 text-sky-300"
                      }`}
                    >
                      J+{t.joursRetard}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Level & Channel Controls */}
          <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl space-y-4">
            <div>
              <label className="text-xs font-bold text-[#E8D5B0] block mb-2">
                1. Niveau de Sévérité & Étape
              </label>
              <div className="space-y-1.5">
                {[
                  {
                    level: "Niveau 1: Courtois (J+3)" as ReminderLevel,
                    desc: "Rappel amical de bienveillance",
                    color: "text-sky-300",
                  },
                  {
                    level: "Niveau 2: Modéré (J+10)" as ReminderLevel,
                    desc: "Rappel formel avant pénalités",
                    color: "text-amber-300",
                  },
                  {
                    level:
                      "Niveau 3: Ferme & Pénalités (J+15)" as ReminderLevel,
                    desc: "Application pénalité 10% + délai 48h",
                    color: "text-orange-400",
                  },
                  {
                    level:
                      "Niveau 4: Mise en demeure juridique (J+25)" as ReminderLevel,
                    desc: "Sommation légale avant huissier",
                    color: "text-rose-400",
                  },
                ].map((item) => (
                  <button
                    key={item.level}
                    onClick={() => {
                      setSelectedLevel(item.level);
                      handleGenerateMessage(
                        activeTenant,
                        item.level,
                        selectedChannel,
                      );
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                      selectedLevel === item.level
                        ? "bg-[#1E2E45] border-[#C9A96E] font-semibold text-white"
                        : "bg-[#1E2E45]/40 border-transparent text-[#A8B4C4] hover:bg-[#1E2E45]/80"
                    }`}
                  >
                    <div>
                      <div className={item.color}>{item.level}</div>
                      <div className="text-[10px] text-[#6B7C94]">
                        {item.desc}
                      </div>
                    </div>
                    {selectedLevel === item.level && (
                      <CheckCircle2 className="w-4 h-4 text-[#C9A96E]" />
                    )}
                  </button>
                ))}

                {/* ⬇️ NOUVEAU : Bouton Mise en Demeure (UNIQUEMENT Niveau 4) */}
                {selectedLevel ===
                  "Niveau 4: Mise en demeure juridique (J+25)" && (
                  <button
                    onClick={() => setIsLetterModalOpen(true)}
                    className="w-full mt-2 p-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>📄 Imprimer la Lettre de Mise en Demeure</span>
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#E8D5B0] block mb-2">
                2. Canal de Diffusion Ciblé
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: "WhatsApp" as ReminderChannel,
                    label: "WhatsApp",
                    icon: MessageSquare,
                    color: "text-emerald-400",
                  },
                  {
                    id: "SMS" as ReminderChannel,
                    label: "SMS Court",
                    icon: Send,
                    color: "text-sky-400",
                  },
                  {
                    id: "Email" as ReminderChannel,
                    label: "Email Formel",
                    icon: Mail,
                    color: "text-amber-400",
                  },
                ].map((ch) => {
                  const Icon = ch.icon;
                  const isSel = selectedChannel === ch.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => {
                        setSelectedChannel(ch.id);
                        handleGenerateMessage(
                          activeTenant,
                          selectedLevel,
                          ch.id,
                        );
                      }}
                      className={`p-2.5 rounded-xl border text-center text-xs flex flex-col items-center gap-1.5 transition-all ${
                        isSel
                          ? "bg-[#1E2E45] border-[#C9A96E] text-white font-bold shadow-sm"
                          : "bg-[#1E2E45]/40 border-transparent text-[#A8B4C4] hover:bg-[#1E2E45]/80"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${ch.color}`} />
                      <span>{ch.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: AI Live Preview & Actions */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/25 shadow-2xl flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#C9A96E]/15">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#C9A96E]/15 text-[#C9A96E] flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    Aperçu du Message — {selectedChannel} (
                    {selectedLevel.split(":")[0]})
                  </div>
                  <div className="text-[10px] text-[#A8B4C4]">
                    Destinataire : {activeTenant?.prenom} {activeTenant?.nom} (
                    {activeTenant?.telephone})
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleGenerateMessage()}
                disabled={isGenerating}
                className="px-2.5 py-1 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#C9A96E] text-xs font-medium border border-[#C9A96E]/20 transition-all flex items-center gap-1.5"
                title="Régénérer avec l'IA Gemini"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isGenerating ? "animate-spin" : ""}`}
                />
                <span>Régénérer</span>
              </button>
            </div>

            {/* Editable Content */}
            <div className="my-4 flex-1">
              <div className="relative">
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={10}
                  className="w-full p-4 rounded-xl bg-[#0F1B2D]/80 border border-[#C9A96E]/20 text-xs text-white placeholder:text-[#6B7C94] focus:outline-none focus:border-[#C9A96E] focus:ring-1 focus:ring-[#C9A96E] font-sans leading-relaxed transition-all shadow-inner"
                  placeholder="Génération du message en cours..."
                />
                {isGenerating && (
                  <div className="absolute inset-0 bg-[#0F1B2D]/80 backdrop-blur-sm rounded-xl flex items-center justify-center gap-2 text-xs text-[#C9A96E] font-medium">
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>L'IA rédige la relance personnalisée...</span>
                  </div>
                )}
              </div>
              <div className="text-[10px] text-[#6B7C94] mt-1.5 flex items-center justify-between">
                <span>{customMessage.length} caractères</span>
                <span>
                  Variables auto-remplies : Nom, Bien, Montant, Pénalités, Délai
                </span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-3 border-t border-[#C9A96E]/15 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] text-xs text-[#E8D5B0] font-medium border border-[#C9A96E]/20 transition-all flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? "Copié !" : "Copier"}</span>
                </button>

                {activeTenant && (
                  <>
                    <button
                      type="button"
                      onClick={() => triggerPhoneCall(activeTenant.telephone)}
                      className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                      title="Passer un appel téléphonique direct"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
                      <span>Appeler ({activeTenant.telephone})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const amount =
                          activeTenant.arrieresCumules ||
                          activeTenant.loyerMensuel;
                        const waveUrl = generateWavePaymentLink(
                          amount,
                          `LOY-${activeTenant.nom}`,
                        );
                        setCustomMessage(
                          (prev) =>
                            `${prev}\n\n👉 Réglez instantanément via Wave : ${waveUrl}`,
                        );
                      }}
                      className="px-3 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                      title="Ajouter le lien de paiement direct Wave au message"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                      <span>+ Lien Wave</span>
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedChannel === "WhatsApp" && (
                  <button
                    onClick={handleSendWhatsApp}
                    disabled={!activeTenantIsOverdue}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-900/40 flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Ouvrir WhatsApp & Envoyer</span>
                  </button>
                )}

                {selectedChannel === "SMS" && (
                  <a
                    href={`sms:${activeTenant?.telephone}?body=${encodeURIComponent(customMessage)}`}
                    onClick={(event) => {
                      if (!activeTenantIsOverdue) event.preventDefault();
                    }}
                    aria-disabled={!activeTenantIsOverdue}
                    className={`px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 text-white font-bold text-xs shadow-lg shadow-sky-900/40 flex items-center gap-2 transition-all ${!activeTenantIsOverdue ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <Send className="w-4 h-4" />
                    <span>Envoyer par SMS</span>
                  </a>
                )}

                {selectedChannel === "Email" && (
                  <a
                    href={`mailto:${activeTenant?.email}?subject=${encodeURIComponent(
                      `Rappel de loyer - ${activeTenant?.bienNom}`,
                    )}&body=${encodeURIComponent(customMessage)}`}
                    onClick={(event) => {
                      if (!activeTenantIsOverdue) event.preventDefault();
                    }}
                    aria-disabled={!activeTenantIsOverdue}
                    className={`px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-lg shadow-[#C9A96E]/30 flex items-center gap-2 transition-all hover:scale-105 ${!activeTenantIsOverdue ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <Mail className="w-4 h-4" />
                    <span>Ouvrir dans Messagerie</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Reminders Log */}
      <div className="p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C9A96E]" />
              <span>Historique des Relances & Traçabilité</span>
            </div>
            <div className="text-xs text-[#6B7C94] mt-0.5">
              Journal des notifications envoyées avec dates, canaux et accusés
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#1E2E45] text-[#E8D5B0] border border-[#C9A96E]/20">
            {reminders.length} relances enregistrées
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#1E2E45]/80 text-[#A8B4C4] font-semibold uppercase tracking-wider text-[10px] border-b border-[#C9A96E]/15">
                <th className="py-2.5 px-3">Date & Heure</th>
                <th className="py-2.5 px-3">Locataire</th>
                <th className="py-2.5 px-3">Bien Loué</th>
                <th className="py-2.5 px-3">Niveau</th>
                <th className="py-2.5 px-3">Canal</th>
                <th className="py-2.5 px-3 text-right">Montant Dû</th>
                <th className="py-2.5 px-3 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9A96E]/10">
              {reminders.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-[#1E2E45]/40 transition-colors"
                >
                  <td className="py-2.5 px-3 font-mono text-[#A8B4C4]">
                    {r.dateCreation} {r.dateEnvoi ? `(${r.dateEnvoi})` : ""}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-white">
                    {r.locataireNom}
                  </td>
                  <td className="py-2.5 px-3 text-[#A8B4C4] truncate max-w-[180px]">
                    {r.bienNom}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#1E2E45] text-[#E8D5B0] border border-[#C9A96E]/20 font-medium">
                      {r.niveau.split(":")[0]}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-white">
                    {r.canal}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-400">
                    {formatCurrency(r.montantDu)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                      {r.statut}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* ⬇️ NOUVEAU : Modale Lettre de Mise en Demeure */}
      {isLetterModalOpen && activeTenant && (
        <PaymentReminderLetterModal
          tenant={activeTenant}
          property={activeProperty}
          settings={undefined}
          montantDu={activeTenant.arrieresCumules || activeTenant.loyerMensuel}
          penalites={
            activeTenant.joursRetard > 10
              ? Math.round(activeTenant.loyerMensuel * 0.1)
              : 0
          }
          joursRetard={activeTenant.joursRetard || 25}
          periode={new Date().toLocaleDateString("fr-FR", {
            month: "long",
            year: "numeric",
          })}
          onClose={() => setIsLetterModalOpen(false)}
        />
      )}
    </div>
  );
};
