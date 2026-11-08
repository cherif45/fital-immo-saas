import React, { useState, useMemo } from "react";
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
  Zap,
  Droplets,
  PhoneCall,
  Send,
  MessageSquare,
  Smartphone,
} from "lucide-react";
import {
  Payment,
  Tenant,
  Property,
  Owner,
  Building as BuildingRecord,
  Unit,
  PaymentMethod,
  PaymentStatus,
  UserAccount,
  AgencySettings,
  ReceiptType,
  TenantCharge,
} from "../types";
import {
  formatCurrency,
  formatNumber,
  formatDate,
  exportToCSV,
  getLocalDateString,
} from "../lib/utils";
import {
  triggerPhoneCall,
  triggerSMS,
  triggerWhatsApp,
  getPaymentReceiptTemplate,
} from "../lib/comms/commsHelper";
import { findBlockingPayment } from "../lib/payments/duplicate";
import { createDocumentNumber } from "../lib/documentNumber";
import { getPeriodDueDate } from "../lib/payments/dueDate";
import { MobileMoneyPaymentModal } from "./MobileMoneyPaymentModal";
import { paginateTable } from "../lib/supabase/service";
import confetti from "canvas-confetti";

interface PaymentsViewProps {
  payments: Payment[];
  tenants: Tenant[];
  properties: Property[];
  buildings: BuildingRecord[];
  units: Unit[];
  owners: Owner[];
  tenantCharges?: TenantCharge[];
  currentUser?: UserAccount;
  settings?: AgencySettings;
  onAddPayment: (payment: Payment) => Promise<boolean>;
  onOpenReceipt: (payment: Payment) => void;
  isNewPaymentModalOpen: boolean;
  setIsNewPaymentModalOpen: (open: boolean) => void;
  initialTenantForPayment?: Tenant | null;
  initialPeriodForPayment?: string | null;
  onValidatePendingPayment?: (paymentId: string) => void;
  onOpenTenantCharges?: (tenant?: Tenant) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  payments,
  tenants,
  properties,
  buildings,
  units,
  owners,
  tenantCharges = [],
  currentUser,
  settings,
  onAddPayment,
  onOpenReceipt,
  isNewPaymentModalOpen,
  setIsNewPaymentModalOpen,
  initialTenantForPayment,
  initialPeriodForPayment,
  onValidatePendingPayment,
  onOpenTenantCharges,
}) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Payé" | "Impayé">(
    "all",
  );
  const [methodFilter, setMethodFilter] = useState<string>("all");

  const [selectedTenantId, setSelectedTenantId] = useState<string>(
    initialTenantForPayment?.id || "",
  );
  const [tenantSearch, setTenantSearch] = useState<string>("");
  const [selectedPaymentForMobileMoney, setSelectedPaymentForMobileMoney] =
    useState<Payment | null>(null);
  const [settlingPayment, setSettlingPayment] = useState<Payment | null>(null);

  // 🆕 Pagination côté serveur
  const [serverPage, setServerPage] = useState(0);
  const [serverData, setServerData] = useState<Payment[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [serverDataReady, setServerDataReady] = useState(false);
  const [serverLoadError, setServerLoadError] = useState("");
  const PAGE_SIZE = 50;

  const getBienLabel = (bienId: string, fallback = ""): string => {
    const unit = units.find((item) => item.id === bienId);
    if (unit) {
      const building = buildings.find((item) => item.id === unit.buildingId);
      return building ? `${building.nom} — ${unit.nom}` : unit.nom;
    }
    return properties.find((item) => item.id === bienId)?.nom || fallback || "—";
  };

  // Charger la première page au montage
  React.useEffect(() => {
    if (!currentUser?.agencyId) return;
    loadPage(0);
  }, [currentUser?.agencyId]);

  const loadPage = async (page: number) => {
    if (!currentUser?.agencyId) return;
    setIsLoadingMore(true);
    const result = await paginateTable<any>(
      "payments",
      currentUser.agencyId,
      page,
      PAGE_SIZE,
    );
    if (result.error) {
      setServerLoadError(result.error);
      setIsLoadingMore(false);
      return;
    }
    setServerLoadError("");
    // Mapper les champs de la RPC vers le type Payment
    const mapped: Payment[] = result.data.map((r: any) => ({
      ...r,
      // Noms camelCase attendus par le composant
      id: r.id,
      ref: r.ref,
      locataireNom: r.locataire_nom_calc
        ? `${r.locataire_prenom_calc || ""} ${r.locataire_nom_calc}`.trim()
        : r.locataire_nom || "—",
      bienNom:
        r.bien_nom ||
        r.bienNom ||
        r.bien_nom_calc ||
        getBienLabel(r.bien_id),
      montantPaye: Number(r.montant_paye) || 0,
      montantVersement:
        r.montant_versement == null
          ? undefined
          : Number(r.montant_versement),
      montantTotal: Number(r.montant_total) || 0,
      montantRestant: Number(r.montant_restant) || 0,
      modePaiement: r.mode_paiement || "Espèces",
      datePaiement: r.date_paiement || r.created_at,
      statut: r.statut || "Payé",
      verificationStatut:
        r.verification_statut || r.verificationStatut,
      periode: r.periode || "",
      loyerBase: Number(r.loyer_base) || 0,
      // Champs supplémentaires pour cohérence
      locataireId: r.locataire_id,
      bienId: r.bien_id,
      quittanceNumero: r.quittance_numero || r.numero_quittance,
      moyenPaiementCode: r.moyen_paiement_code,
      montantInitialDu: Number(
        r.montant_initial_du ?? r.montantInitialDu ?? 0,
      ),
      parentPaymentId: r.parent_payment_id || r.parentPaymentId,
      referencePaiementInitial:
        r.reference_paiement_initial || r.referencePaiementInitial,
      montant: Number(r.montant_paye) || 0,
    }));
    if (page === 0) {
      setServerData(mapped);
      setServerDataReady(true);
    } else {
      setServerData((prev) => [...prev, ...mapped]);
    }
    setServerTotal(result.total);
    setServerPage(page);
    setIsLoadingMore(false);
  };

  // Utiliser les données serveur si disponibles, sinon les props
  const displayPayments = useMemo(() => {
    const source = currentUser?.agencyId ? serverData : payments;
    return source.map((payment) => ({
      ...payment,
      bienNom:
        payment.bienNom && payment.bienNom !== "—"
          ? payment.bienNom
          : getBienLabel(payment.bienId),
    }));
  }, [
    currentUser?.agencyId,
    serverDataReady,
    serverData,
    payments,
    buildings,
    units,
    properties,
  ]);
  const allKnownPayments = useMemo(() => {
    const paymentsById = new Map(
      payments.map((payment) => [payment.id, payment]),
    );
    serverData.forEach((payment) => paymentsById.set(payment.id, payment));
    return Array.from(paymentsById.values());
  }, [payments, serverData]);
  const [montantPaye, setMontantPaye] = useState<number>(0);
  // Stocke le mois au format YYYY-MM (ex: "2026-09")
  const [periodeMonth, setPeriodeMonth] = useState<string>(() => {
    if (
      initialPeriodForPayment &&
      /^\d{4}-(0[1-9]|1[0-2])$/.test(initialPeriodForPayment)
    ) {
      return initialPeriodForPayment;
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  React.useEffect(() => {
    if (!initialPeriodForPayment) return;
    setSelectedTenantId(initialTenantForPayment?.id || "");
    setPeriodeMonth(initialPeriodForPayment);
  }, [initialPeriodForPayment, initialTenantForPayment]);

  // Convertit "2026-09" → "septembre 2026" (format DB standard)
  const formatPeriodeFromMonth = (m: string): string => {
    if (!m) return "";
    const [year, month] = m.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  };

  // La période utilisée partout (dérivée du mois sélectionné)
  const periode = formatPeriodeFromMonth(periodeMonth);
  const [modePaiement, setModePaiement] = useState<PaymentMethod>("Virement");
  const [penalites, setPenalites] = useState<number>(0);
  const [charges, setCharges] = useState<number>(0);
  const [tva, setTva] = useState<number>(0);
  const [tom, setTom] = useState<number>(0);
  const [datePaiement, setDatePaiement] = useState<string>(getLocalDateString());
  const [observation, setObservation] = useState<string>(
    "Règlement loyer régulier",
  );
  // ⬇️ NOUVEAU : Gestion acompte/solde
  const [referencePaiementInitial, setReferencePaiementInitial] =
    useState<string>("");
  // 🆕 Type de reçu forcé manuellement (null = auto)
  const [forcedTypeRecu, setForcedTypeRecu] = useState<ReceiptType | null>(
    null,
  );

  // 🔒 MATRICE DE PERMISSIONS
  const role = currentUser?.role || "ADMIN";
  const isLocataire = role === "LOCATAIRE";
  const isProprietaire = role === "PROPRIETAIRE";
  const canEncaisser =
    role === "ADMIN" ||
    role === "SUPER_ADMIN" ||
    role === "CAISSIER" ||
    role === "GESTIONNAIRE";
  const canUseMobileMoney =
    role === "ADMIN" ||
    role === "SUPER_ADMIN" ||
    role === "CAISSIER" ||
    role === "GESTIONNAIRE" ||
    role === "LOCATAIRE";
  const canSeeOthers = !isLocataire;
  // ============================================================
  // 🆕 DÉTECTION DES CHARGES VARIABLES (EAU, ÉLEC, NETTOYAGE)
  // ============================================================
  const itemizedCharges = useMemo(() => {
    if (!selectedTenantId || !periode) {
      return {
        eau: 0,
        electricite: 0,
        nettoyage: 0,
        total: 0,
        count: 0,
        items: [],
        allItems: [],
      };
    }
    const normPeriode = (periode || "").trim().toLowerCase();
    const allItems = (tenantCharges || []).filter(
      (c) =>
        c.locataireId === selectedTenantId &&
        (c.periode || "").trim().toLowerCase() === normPeriode &&
        c.statut !== "Annulé",
    );
    const items = allItems.filter((charge) => charge.statut !== "Payé");
    const eau = items
      .filter((c) => c.categorie === "Eau")
      .reduce((sum, c) => sum + Number(c.montant || 0), 0);
    const electricite = items
      .filter((c) => c.categorie === "Électricité")
      .reduce((sum, c) => sum + Number(c.montant || 0), 0);
    const nettoyage = items
      .filter((c) => c.categorie === "Nettoyage")
      .reduce((sum, c) => sum + Number(c.montant || 0), 0);
    const total = eau + electricite + nettoyage;
    return {
      eau,
      electricite,
      nettoyage,
      total,
      count: items.length,
      items,
      allItems,
    };
  }, [selectedTenantId, periode, tenantCharges]);

  const effectiveCharges = charges + itemizedCharges.total;
  const totalCalculated =
    (tenants.find((tenant) => tenant.id === selectedTenantId)?.loyerMensuel ||
      0) +
    effectiveCharges +
    tva +
    tom +
    penalites;

  // ============================================================
  // 🆕 DÉTECTION AUTOMATIQUE DU CONTEXTE DE PAIEMENT
  // ============================================================
  const paymentContext = useMemo(() => {
    if (!selectedTenantId || !periode) {
      return null;
    }

    // 1. Paiements existants pour ce locataire + période (hors rejetés)
    const existing = allKnownPayments.filter(
      (p) =>
        p.locataireId === selectedTenantId &&
        (p.periode || "").trim().toLowerCase() ===
          (periode || "").trim().toLowerCase() &&
        p.verificationStatut !== "rejete" &&
        (p.statut === "Payé" ||
          p.statut === "Partiel" ||
          p.statut === "En attente"),
    );

    // Les anciennes lignes de solde stockaient un cumul; les nouvelles stockent
    // le versement reçu. Garder les deux formats lisibles sans compter deux fois.
    const paymentsById = new Map(existing.map((payment) => [payment.id, payment]));
    const paidByRoot = new Map<
      string,
      { legacyCumulative: number; newInstallments: number }
    >();
    existing
      .filter(
        (payment) =>
          payment.statut !== "En attente" &&
          payment.verificationStatut !== "en_attente",
      )
      .forEach((payment) => {
        let rootPayment = payment;
        const visitedIds = new Set([payment.id]);
        while (
          rootPayment.parentPaymentId &&
          paymentsById.has(rootPayment.parentPaymentId) &&
          !visitedIds.has(rootPayment.parentPaymentId)
        ) {
          visitedIds.add(rootPayment.parentPaymentId);
          const nextParent = paymentsById.get(rootPayment.parentPaymentId);
          if (!nextParent) break;
          rootPayment = nextParent;
        }

        const group = paidByRoot.get(rootPayment.id) || {
          legacyCumulative: 0,
          newInstallments: 0,
        };
        if (Number.isFinite(payment.montantVersement)) {
          group.newInstallments += Math.max(0, payment.montantVersement || 0);
        } else {
          group.legacyCumulative = Math.max(
            group.legacyCumulative,
            Number(payment.montantPaye || 0),
          );
        }
        paidByRoot.set(rootPayment.id, group);
      });
    const alreadyPaid = Array.from(paidByRoot.values()).reduce(
      (sum, group) => sum + group.legacyCumulative + group.newInstallments,
      0,
    );

    // 3. Total dû (loyer contractuel + charges variables + taxes + pénalités)
    const contractRent =
      tenants.find((t) => t.id === selectedTenantId)?.loyerMensuel || 0;
    // RÈGLE ANTI-DOUBLE COMPTAGE : si un acompte/paiement initial existe déjà pour cette période,
    // son montantTotal initialement calculé fait foi. Les charges créées depuis
    // sont ajoutées seulement si elles ne sont pas déjà rattachées à ce paiement.
    const parent =
      existing.find((payment) => !payment.parentPaymentId) ||
      existing.slice().sort((a, b) =>
        (a.datePaiement || "").localeCompare(b.datePaiement || ""),
      )[0] ||
      null;
    const initialTotalDue =
      parent?.montantTotal
        ? Number(parent.montantInitialDu || parent.montantTotal)
        : contractRent + effectiveCharges + tva + tom + penalites;
    const additionalCharges = itemizedCharges.allItems
      .filter(
        (charge) =>
          !charge.paymentId || charge.paymentId !== parent?.id,
      )
      .reduce((sum, charge) => sum + Number(charge.montant || 0), 0);
    const totalDue =
      existing.length > 0
        ? initialTotalDue + additionalCharges
        : initialTotalDue;

    // 4. Reste à payer
    const remaining = Math.max(0, totalDue - alreadyPaid);

    return {
      hasExisting: existing.length > 0,
      existingCount: existing.length,
      totalDue,
      alreadyPaid,
      remaining,
      parentId: parent?.id || null,
      parentRef: parent?.ref || null,
      lastPaymentDate: parent?.datePaiement || null,
    };
  }, [
    selectedTenantId,
    periode,
    allKnownPayments,
    charges,
    itemizedCharges.total,
    itemizedCharges.allItems,
    tva,
    tom,
    penalites,
    tenants,
  ]);
  // 🆕 Auto-remplir le montant avec le RESTE À PAYER si un acompte existe
  React.useEffect(() => {
    if (!paymentContext || !paymentContext.hasExisting) return;
    if (paymentContext.remaining > 0) {
      setMontantPaye(paymentContext.remaining);
    }
  }, [paymentContext]);

  React.useEffect(() => {
    if (!selectedTenantId || settlingPayment || paymentContext?.hasExisting) {
      return;
    }
    setMontantPaye(totalCalculated);
  }, [selectedTenantId, settlingPayment, paymentContext, totalCalculated]);

  // Auto-remplir le formulaire quand on change de locataire
  React.useEffect(() => {
    if (selectedTenantId) {
      const t = tenants.find((item) => item.id === selectedTenantId);

      if (t) {
        const p = properties.find((prop) => prop.id === t.bienId);
        const base = t.loyerMensuel || p?.loyerBase || 0;
        setCharges(p?.charges || 0);
        setPenalites(t.joursRetard > 10 ? Math.round(base * 0.1) : 0);
        const fullAmount =
          base +
          (p?.charges || 0) +
          (t.joursRetard > 10 ? Math.round(base * 0.1) : 0);
        if (!paymentContext?.hasExisting) {
          setMontantPaye(fullAmount);
        }
        // Le paymentContext calculera le "reste à payer" via un useEffect dédié
      }
    }
  }, [selectedTenantId, paymentContext?.hasExisting]);

  React.useEffect(() => {
    if (isLocataire && isNewPaymentModalOpen) {
      setIsNewPaymentModalOpen(false);
    }
  }, [isLocataire, isNewPaymentModalOpen, setIsNewPaymentModalOpen]);

  const filteredPayments = React.useMemo(() => {
    return displayPayments.filter((p) => {
      if (statusFilter !== "all" && p.statut !== statusFilter) return false;
      if (methodFilter !== "all" && p.modePaiement !== methodFilter)
        return false;
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
  }, [displayPayments, statusFilter, methodFilter, search]);

  const totalCollected = filteredPayments
    .filter((p) => p.statut === "Payé")
    .reduce((sum, p) => sum + p.montantPaye, 0);

  const totalPaidSum = filteredPayments
    .filter((p) => p.statut === "Payé" || p.statut === "Partiel")
    .reduce((sum, p) => sum + p.montantPaye, 0);

  const virementSum = filteredPayments
    .filter(
      (p) =>
        (p.modePaiement === "Virement" || p.modePaiement === "Chèque") &&
        (p.statut === "Payé" || p.statut === "Partiel"),
    )
    .reduce((sum, p) => sum + p.montantPaye, 0);

  const mobileSum = filteredPayments
    .filter(
      (p) =>
        (p.modePaiement === "Mobile Money" ||
          p.moyenPaiementCode === "WAVE" ||
          p.moyenPaiementCode === "ORANGE_MONEY") &&
        (p.statut === "Payé" || p.statut === "Partiel"),
    )
    .reduce((sum, p) => sum + p.montantPaye, 0);

  const especesSum = filteredPayments
    .filter(
      (p) =>
        p.modePaiement === "Espèces" &&
        (p.statut === "Payé" || p.statut === "Partiel"),
    )
    .reduce((sum, p) => sum + p.montantPaye, 0);

  const virementPct =
    totalPaidSum > 0 ? Math.round((virementSum / totalPaidSum) * 100) : 0;
  const mobilePct =
    totalPaidSum > 0 ? Math.round((mobileSum / totalPaidSum) * 100) : 0;
  const especesPct =
    totalPaidSum > 0 ? Math.round((especesSum / totalPaidSum) * 100) : 0;

  // ============================================================
  // HANDLER : ENREGISTRER UN PAIEMENT
  // ============================================================
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canEncaisser) {
      alert("Vous n'avez pas les droits pour enregistrer un encaissement.");
      return;
    }

    const t = tenants.find((item) => item.id === selectedTenantId);
    if (!t) {
      alert("Veuillez sélectionner un locataire valide.");
      return;
    }

    if (!Number.isFinite(montantPaye) || montantPaye <= 0) {
      alert("Veuillez saisir un montant encaissé supérieur à zéro.");
      return;
    }

    // 🚨 CONTRÔLE ANTI-DOUBLE-PAIEMENT (uniquement pour nouveau paiement)
    if (!settlingPayment) {
      const dejaPaye = findBlockingPayment(
        allKnownPayments,
        selectedTenantId,
        periode,
      );

      const hasAdditionalCharges = itemizedCharges.allItems.some(
        (charge) =>
          (!charge.paymentId ||
            charge.paymentId !== paymentContext?.parentId) &&
          charge.statut !== "Payé" &&
          charge.statut !== "Annulé",
      );
      if (dejaPaye && !hasAdditionalCharges) {
        const isPending =
          dejaPaye.statut === "En attente" ||
          dejaPaye.verificationStatut === "en_attente";
        alert(
          `${isPending ? "⏳ PAIEMENT EN ATTENTE" : "⚠️ DOUBLE PAIEMENT DÉTECTÉ"}\n\n` +
            `${
              isPending
                ? `Un paiement pour "${periode}" attend déjà sa validation.`
                : `Le loyer de "${periode}" a déjà été réglé par ${t.prenom} ${t.nom}.`
            }\n\n` +
            `📄 Quittance : ${dejaPaye.quittanceNumero}\n` +
            `💰 Montant : ${formatNumber(dejaPaye.montantPaye)} FCFA\n` +
            `📅 Date : ${dejaPaye.datePaiement}\n` +
            `🔖 Statut : ${dejaPaye.statut}\n\n` +
            `${
              isPending
                ? "Veuillez valider ou rejeter ce paiement avant d'en créer un nouveau."
                : "Si vous devez corriger, supprimez d'abord l'ancien paiement."
            }`,
        );
        return;
      }
    }

    const p = properties.find((prop) => prop.id === t.bienId);
    const unit = units.find((item) => item.id === t.bienId);
    const o = owners.find(
      (owner) =>
        owner.id ===
        (p?.proprietaireId || unit?.proprietaireId || t.proprietaireId),
    );

    // ⬇️ Récupérer le paiement initial si lié
    const initialPayment = referencePaiementInitial
      ? payments.find((pay) => pay.ref === referencePaiementInitial)
      : null;

    const isMobileMoney =
      modePaiement === "Wave" ||
      modePaiement === "Orange Money" ||
      modePaiement === "Mobile Money";
    const moyenCode =
      modePaiement === "Wave"
        ? "WAVE"
        : modePaiement === "Orange Money"
          ? "ORANGE_MONEY"
          : modePaiement === "Mobile Money"
            ? "WAVE"
            : modePaiement === "Virement"
              ? "VIREMENT"
              : modePaiement === "Chèque"
                ? "CHEQUE"
                : "ESPECES";

    const dateEcheance = getPeriodDueDate(periodeMonth);
    let paymentToSave: Payment;

    if (settlingPayment) {
      // 🎯 BUGS 4, 22, 27 : Règlement du solde d'un acompte partiel existant
      const priorPaid =
        paymentContext?.alreadyPaid ??
        Number(settlingPayment.montantPaye || 0);
      const newCumulativePaid = priorPaid + Number(montantPaye);
      const targetTotal = Number(
        paymentContext?.totalDue ||
          settlingPayment.montantTotal ||
          priorPaid + (settlingPayment.montantRestant || 0),
      );
      const newMontantRestant = Math.max(0, targetTotal - newCumulativePaid);
      const isFull = newMontantRestant === 0;

           paymentToSave = {
        ...settlingPayment,
        id: crypto.randomUUID(), // 🆕 Nouvel ID (ne pas écraser l'acompte)
        ref: createDocumentNumber(settings?.prefixPaiement, "PAY-"), // 🆕 Nouvelle référence
        quittanceNumero: createDocumentNumber(
          settings?.prefixQuittance,
          "QUI-",
        ), // 🆕 Nouvelle quittance
        montantPaye: Number(montantPaye),
        montantVersement: Number(montantPaye),
        montantRestant: newMontantRestant,
        montantTotal: targetTotal,
        statut: isFull ? "Payé" : "Partiel",
        typeRecu: isFull ? "QUITTANCE_SOLDE" : "RECU_ACOMPTE",
        datePaiement,
        modePaiement,
        moyenPaiementCode: moyenCode,
        observation:
          observation ||
          `Solde loyer ${settlingPayment.periode} réglé (Acompte: ${settlingPayment.ref})`,
        referencePaiementInitial: settlingPayment.ref,
        montantInitialDu: targetTotal,
        parentPaymentId:
          paymentContext?.parentId ||
          settlingPayment.parentPaymentId ||
          settlingPayment.id,
        charges: effectiveCharges,
        chargesEau: itemizedCharges.eau,
        chargesElectricite: itemizedCharges.electricite,
        chargesNettoyage: itemizedCharges.nettoyage,
        loyerBase: t.loyerMensuel || 0,
        tva,
        tom,
        penalites,
      };
    } else {
      const amountDue = paymentContext?.hasExisting
        ? paymentContext.remaining
        : totalCalculated;
      const paymentTotalDue = paymentContext?.hasExisting
        ? paymentContext.totalDue
        : totalCalculated;
      const isFull = Number(montantPaye) >= amountDue;
      const autoTypeRecu =
        referencePaiementInitial && isFull
          ? "QUITTANCE_SOLDE"
          : !isFull
            ? "RECU_ACOMPTE"
            : "QUITTANCE";
      // 🆕 Utiliser forcedTypeRecu si l'utilisateur l'a changé manuellement
      const typeRecu = forcedTypeRecu || autoTypeRecu;

      paymentToSave = {
        id: crypto.randomUUID(),
        ref: createDocumentNumber(settings?.prefixPaiement, "PAY-"),
        quittanceNumero: createDocumentNumber(
          settings?.prefixQuittance,
          "QUI-",
        ),
        locataireId: t.id,
        locataireNom: `${t.prenom} ${t.nom}`,
        bienId: t.bienId,
        bienNom: getBienLabel(t.bienId, t.bienNom),
        proprietaireId:
          o?.id ||
          p?.proprietaireId ||
          unit?.proprietaireId ||
          t.proprietaireId ||
          "",
        proprietaireNom: o ? `${o.prenom} ${o.nom}` : "Propriétaire",
        periode,
        loyerBase: t.loyerMensuel || 0,
        charges: effectiveCharges,
        chargesEau: itemizedCharges.total > 0 ? itemizedCharges.eau : 0,
        chargesElectricite:
          itemizedCharges.total > 0 ? itemizedCharges.electricite : 0,
        chargesNettoyage:
          itemizedCharges.total > 0 ? itemizedCharges.nettoyage : 0,
        tva,
        tom,
        penalites,
        indemnitesOccupation: 0,
        montantTotal: paymentTotalDue,
        montantPaye: Number(montantPaye),
        montantVersement: Number(montantPaye),
        montantRestant: Math.max(0, amountDue - Number(montantPaye)),
        statut: isMobileMoney ? "En attente" : isFull ? "Payé" : "Partiel",
        modePaiement,
        moyenPaiementCode: moyenCode,
        verificationStatut: isMobileMoney ? "en_attente" : "valide",
        datePaiement,
        dateEcheance,
        recuPar: currentUser
          ? `${currentUser.prenom} ${currentUser.nom} (${currentUser.role})`
          : "Caisse FITAL-IMMO",
        observation,
        typeRecu,
        referencePaiementInitial: referencePaiementInitial || undefined,
        montantInitialDu: paymentTotalDue || initialPayment?.montantTotal || totalCalculated,
        parentPaymentId:
          settlingPayment?.id || paymentContext?.parentId || undefined,
      };
    }

    const saved = await onAddPayment(paymentToSave);
    if (!saved) return;
    await loadPage(0);
    setIsNewPaymentModalOpen(false);
    setSettlingPayment(null);

    // Reset
    setReferencePaiementInitial("");
    // Remettre le mois courant
    const now = new Date();
    setPeriodeMonth(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    );

    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#C9A96E", "#4CAF82", "#E8D5B0"],
      });
    } catch {}

    onOpenReceipt(paymentToSave);
  };

  const handleExportCSV = () => {
    const headers = [
      "N° Quittance",
      "Locataire",
      "Bien Loué",
      "Période",
      "Montant Payé (FCFA)",
      "Mode",
      "Date",
      "Statut",
    ];
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
    exportToCSV("Registre_Paiements_FITAL_IMMO", rows, headers);
  };

  const getPayablePayment = (): Payment | null => {
    if (isLocataire) {
      return (
        displayPayments.find((p) => p.statut !== "Payé") ||
        displayPayments[0] ||
        null
      );
    }
    return (
      displayPayments.find((p) => p.statut !== "Payé") ||
      displayPayments[0] ||
      null
    );
  };

  // Paiements partiels du locataire sélectionné (pour lier acompte → solde)
  const partialPaymentsForTenant = displayPayments.filter(
    (p) => p.locataireId === selectedTenantId && p.statut === "Partiel",
  );

  return (
    <div className="space-y-6">
      {currentUser?.agencyId && !serverDataReady && !serverLoadError && (
        <div role="status" className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          Chargement des encaissements depuis Supabase…
        </div>
      )}
      {serverLoadError && (
        <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-200">
          La récupération des encaissements a échoué : {serverLoadError}
        </div>
      )}
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/20">
          <div className="text-[11px] text-[#A8B4C4] font-medium uppercase tracking-wider">
            {isLocataire
              ? "Total Encaissé par moi"
              : "Total Encaissé (Filtre actif)"}
          </div>
          <div className="text-2xl font-bold text-[#E8D5B0] mt-1">
            {formatNumber(totalCollected)}{" "}
            <span className="text-xs font-normal text-[#C9A96E]">FCFA</span>
          </div>
          <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />{" "}
            {filteredPayments.filter((p) => p.statut === "Payé").length}{" "}
            quittances validées
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
              <span>
                {isLocataire
                  ? "Payer mon Loyer"
                  : "Encaissements & Moyens Mobiles"}
              </span>
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
              {isLocataire && (
                <button
                  onClick={() => {
                    const target = getPayablePayment();
                    if (target) setSelectedPaymentForMobileMoney(target);
                    else alert("Aucune quittance disponible pour le paiement.");
                  }}
                  className="py-2 px-3 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 font-bold text-xs shadow-md hover:scale-105 transition-all text-center flex items-center justify-center gap-1.5 w-full"
                  title="Payer mon loyer via Wave / OM"
                >
                  <Smartphone className="w-4 h-4 text-blue-400" /> Wave / OM
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-[#1E2E45] p-1 rounded-xl border border-[#C9A96E]/15 text-xs">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                statusFilter === "all"
                  ? "bg-[#C9A96E] text-[#0F1B2D] font-bold shadow-sm"
                  : "text-[#A8B4C4] hover:text-white"
              }`}
            >
              Tous ({serverTotal || payments.length})
            </button>
            <button
              onClick={() => setStatusFilter("Payé")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                statusFilter === "Payé"
                  ? "bg-emerald-500 text-white font-bold shadow-sm"
                  : "text-emerald-400 hover:text-white"
              }`}
            >
              Payés ({payments.filter((p) => p.statut === "Payé").length})
            </button>
            <button
              onClick={() => setStatusFilter("Impayé")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                statusFilter === "Impayé"
                  ? "bg-rose-500 text-white font-bold shadow-sm"
                  : "text-rose-400 hover:text-white"
              }`}
            >
              Impayés ({payments.filter((p) => p.statut === "Impayé").length})
            </button>
          </div>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-xs text-white focus:outline-none focus:border-[#C9A96E]"
          >
            <option value="all">Tous les Modes</option>
                  <option value="Espèces">Espèces (Caisse)</option>
                  <option value="Mobile Money">Mobile Money (Wave / OM)</option>
                  <option value="Virement">Virement bancaire</option>
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
                    <p className="text-xs font-semibold text-white">
                      Aucun paiement enregistré
                    </p>
                    <p className="text-[11px] text-[#6B7C94] mt-1">
                      {isLocataire
                        ? "Vous n'avez pas encore de quittance."
                        : "Aucun encaissement correspondant aux filtres."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const isPaid = p.statut === "Payé";
                  const isAcompte = p.typeRecu === "RECU_ACOMPTE";
                  const isSolde = p.typeRecu === "QUITTANCE_SOLDE";
                  const isPending =
                    p.statut === "En attente" ||
                    p.verificationStatut === "en_attente";
                  const isPartiel = p.statut === "Partiel";
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-[#1E2E45]/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-white text-[11px]">
                          {p.quittanceNumero}
                        </div>
                        <div className="text-[10px] text-[#6B7C94] font-mono">
                          {p.ref}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-white">
                        {p.locataireNom}
                      </td>
                      <td className="py-3 px-3 text-[#A8B4C4] max-w-[200px] truncate">
                        {p.bienNom}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div
                          className={`font-mono font-bold ${
                            isPaid
                              ? "text-[#C9A96E]"
                              : isAcompte
                                ? "text-blue-400"
                                : "text-rose-400"
                          }`}
                        >
                          {formatCurrency(p.montantPaye)}
                        </div>
                        <div className="text-[10px] text-[#A8B4C4] font-mono leading-tight">
                          {(p.charges || 0) > 0 ||
                          (p.chargesEau || 0) > 0 ||
                          (p.chargesElectricite || 0) > 0 ||
                          (p.chargesNettoyage || 0) > 0 ? (
                            <span
                              title={`Loyer: ${formatNumber(p.loyerBase)} F | Eau: ${formatNumber(p.chargesEau || 0)} F | Élec: ${formatNumber(p.chargesElectricite || 0)} F | Nett: ${formatNumber(p.chargesNettoyage || 0)} F`}
                              className="text-[#E8D5B0]"
                            >
                              Loyer {formatNumber(p.loyerBase)} + Chg{" "}
                              {formatNumber(p.charges || 0)}
                            </span>
                          ) : (
                            <span>Loyer {formatNumber(p.loyerBase)} F</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                            p.modePaiement === "Virement"
                              ? "bg-sky-500/20 text-sky-300"
                              : p.modePaiement === "Mobile Money"
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-emerald-500/20 text-emerald-300"
                          }`}
                        >
                          {p.modePaiement}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#A8B4C4]">
                        {p.datePaiement ? formatDate(p.datePaiement) : "—"}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                            isSolde
                              ? "bg-green-500/20 text-green-300 border-green-500/30"
                              : isAcompte
                                ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                                : isPaid
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                  : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                          }`}
                        >
                          {isSolde ? "SOLDE" : isAcompte ? "ACOMPTE" : p.statut}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {!isProprietaire && (
                            <button
                              onClick={() => onOpenReceipt(p)}
                              className="px-2.5 py-1 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#C9A96E] font-medium text-[11px] border border-[#C9A96E]/20 transition-all flex items-center gap-1"
                              title="Voir le document officiel"
                            >
                              <Printer className="w-3 h-3" />
                              {isSolde
                                ? "Solde"
                                : isAcompte
                                  ? "Reçu"
                                  : "Quittance"}
                            </button>
                          )}

                          {canSeeOthers &&
                            !isProprietaire &&
                            (() => {
                              const t = tenants.find(
                                (item) => item.id === p.locataireId,
                              );
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
                                    onClick={() =>
                                      triggerPhoneCall(t.telephone)
                                    }
                                    className="p-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/40 text-sky-400 border border-sky-500/30 transition-all"
                                    title="Appeler"
                                  >
                                    <PhoneCall className="w-3 h-3" />
                                  </button>
                                </>
                              );
                            })()}

                          {/* Bouton de validation pour les paiements en attente (Mobile Money) - BUG 5 */}
                          {isPending &&
                            canEncaisser &&
                            onValidatePendingPayment && (
                              <button
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Valider le paiement de ${formatNumber(p.montantPaye)} FCFA pour ${p.locataireNom} ?`,
                                    )
                                  ) {
                                    onValidatePendingPayment(p.id);
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                                title="Valider le paiement Mobile Money"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>✓ Valider</span>
                              </button>
                            )}

                          {/* Bouton Encaisser pour les impayés ou partiels - BUGS 4, 22, 27 */}
                          {!isPaid && !isPending && canEncaisser && (
                            <button
                              onClick={() => {
                                if (isPartiel) {
                                  setSettlingPayment(p);
                                  setSelectedTenantId(p.locataireId);
                                  setMontantPaye(p.montantRestant || 0);
                                  setReferencePaiementInitial(p.ref);
                                  setObservation(
                                    `Solde loyer ${p.periode} (Acompte: ${p.ref})`,
                                  );
                                } else {
                                  setSettlingPayment(null);
                                  setSelectedTenantId(p.locataireId);
                                  setMontantPaye(0);
                                  setReferencePaiementInitial("");
                                  setObservation("");
                                }
                                setIsNewPaymentModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-all cursor-pointer"
                            >
                              {isPartiel ? "Encaisser le solde" : "Encaisser"}
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

        {/* 🆕 Bouton Charger plus */}
        {serverData.length > 0 && serverData.length < serverTotal && (
          <div className="flex justify-center mt-4 mb-6">
            <button
              onClick={() => loadPage(serverPage + 1)}
              disabled={isLoadingMore}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-sm shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingMore
                ? "⏳ Chargement..."
                : `📥 Charger plus (${serverData.length} / ${serverTotal})`}
            </button>
          </div>
        )}
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
                  setReferencePaiementInitial("");
                }}
                className="text-[#A8B4C4] hover:text-white"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSubmitPayment}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                  1. Sélectionner le Locataire & Bien
                </label>
                <input
                  type="text"
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  placeholder="🔍 Rechercher locataire par nom, téléphone ou bien..."
                  className="w-full mb-2 p-2 rounded-xl bg-[#0F1B2D] border border-[#C9A96E]/30 text-white focus:outline-none focus:border-[#C9A96E] text-[11px]"
                />
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white focus:outline-none focus:border-[#C9A96E]"
                >
                  <option value="">-- Choisir un locataire --</option>
                  {tenants
                    .filter((t) => {
                      if (!tenantSearch.trim()) return true;
                      const q = tenantSearch.toLowerCase().trim();
                      return (
                        `${t.nom} ${t.prenom}`.toLowerCase().includes(q) ||
                        `${t.prenom} ${t.nom}`.toLowerCase().includes(q) ||
                        (t.telephone || "").includes(q) ||
                        (t.email || "").toLowerCase().includes(q) ||
                        (t.bienNom || "").toLowerCase().includes(q) ||
                        (t.cni || "").toLowerCase().includes(q)
                      );
                    })
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nom} {t.prenom} — {getBienLabel(t.bienId, t.bienNom)} (Loyer :{" "}
                        {formatNumber(t.loyerMensuel)} FCFA)
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Mois Concerné
                  </label>
                  <input
                    type="month"
                    value={periodeMonth}
                    onChange={(e) => setPeriodeMonth(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white focus:outline-none focus:border-[#C9A96E]"
                  />
                  <p className="text-[10px] text-[#6B7C94] mt-1">
                    Format enregistré :{" "}
                    <strong className="text-[#C9A96E]">{periode}</strong>
                  </p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#C9A96E] uppercase mb-1">
                    Montant Encaissé (FCFA)
                  </label>
                  <input
                    type="number"
                    value={montantPaye || ""}
                    onChange={(e) => setMontantPaye(Number(e.target.value))}
                    required
                    min={1}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E] text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#C9A96E]"
                  />
                </div>
              </div>

              {/* 🆕 PANNEAU SITUATION ACTUELLE */}
              {paymentContext && paymentContext.hasExisting && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                    <AlertCircle className="w-4 h-4" />
                    <span>📊 Situation actuelle pour {periode}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <div className="text-[#6B7C94] uppercase text-[9px]">
                        Total dû
                      </div>
                      <div className="font-mono font-bold text-white">
                        {formatNumber(paymentContext.totalDue)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#6B7C94] uppercase text-[9px]">
                        Déjà payé ({paymentContext.existingCount}x)
                      </div>
                      <div className="font-mono font-bold text-emerald-300">
                        {formatNumber(paymentContext.alreadyPaid)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#6B7C94] uppercase text-[9px]">
                        Reste à payer
                      </div>
                      <div className="font-mono font-bold text-rose-300">
                        {formatNumber(paymentContext.remaining)}
                      </div>
                    </div>
                  </div>
                  {paymentContext.lastPaymentDate && (
                    <div className="text-[10px] text-amber-200/70">
                      Dernier versement : {paymentContext.lastPaymentDate}
                    </div>
                  )}
                </div>
              )}
              {/* 🆕 TYPE DE REÇU */}
              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                  Type de Reçu
                </label>
                <select
                  value={forcedTypeRecu || "QUITTANCE"}
                  onChange={(e) => {
                    const newType = e.target.value as ReceiptType;
                    const selectedTenant = tenants.find(
                      (item) => item.id === selectedTenantId,
                    );
                    const autoType =
                      referencePaiementInitial &&
                      montantPaye >= (selectedTenant?.loyerMensuel || 0)
                        ? "QUITTANCE_SOLDE"
                        : montantPaye < (selectedTenant?.loyerMensuel || 0)
                          ? "RECU_ACOMPTE"
                          : "QUITTANCE";
                    if (newType !== autoType) {
                      if (
                        !window.confirm(
                          `⚠️ TYPE DE REÇU MODIFIÉ\n\nAuto : ${autoType}\nChoisi : ${newType}\n\nConfirmer ?`,
                        )
                      )
                        return;
                    }
                    setForcedTypeRecu(newType);
                  }}
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white focus:outline-none focus:border-[#C9A96E]"
                >
                  <option value="QUITTANCE">Quittance</option>
                  <option value="RECU_ACOMPTE">Reçu d'acompte</option>
                  <option value="QUITTANCE_SOLDE">Quittance de solde</option>
                </select>
              </div>

              {/* 🆕 DÉCOMPOSITION DU MONTANT DÛ (LOYER + EAU + ÉLEC + NETTOYAGE) */}
              <div className="p-3.5 rounded-2xl bg-[#0F1B2D]/80 border border-[#C9A96E]/25 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#E8D5B0] uppercase">
                    <DollarSign className="w-3.5 h-3.5 text-[#C9A96E]" />
                    <span>Décomposition du Loyer & Charges ({periode || "Période"})</span>
                  </div>
                  {onOpenTenantCharges && (
                    <button
                      type="button"
                      onClick={() => {
                        const t = tenants.find((item) => item.id === selectedTenantId);
                        setIsNewPaymentModalOpen(false);
                        onOpenTenantCharges(t || undefined);
                      }}
                      className="text-[10px] text-[#C9A96E] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Zap className="w-3 h-3" />
                      <span>Gérer les charges</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  {/* Loyer de base (fixe contractuel) */}
                  <div className="p-2 rounded-xl bg-[#162133] border border-[#2A3F5C]">
                    <div className="text-[10px] text-[#A8B4C4]">Loyer contractuel</div>
                    <div className="font-mono font-bold text-white text-xs">
                      {formatNumber(
                        tenants.find((item) => item.id === selectedTenantId)
                          ?.loyerMensuel || 0,
                      )}{" "}
                      F
                    </div>
                  </div>

                  {/* Eau */}
                  <div className="p-2 rounded-xl bg-[#162133] border border-sky-500/20">
                    <div className="text-[10px] text-sky-400 flex items-center gap-1">
                      <Droplets className="w-3 h-3" /> Eau
                    </div>
                    <div className="font-mono font-bold text-white text-xs">
                      {formatNumber(
                        itemizedCharges.total > 0 ? itemizedCharges.eau : 0,
                      )}{" "}
                      F
                    </div>
                  </div>

                  {/* Électricité */}
                  <div className="p-2 rounded-xl bg-[#162133] border border-amber-500/20">
                    <div className="text-[10px] text-amber-400 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Électricité
                    </div>
                    <div className="font-mono font-bold text-white text-xs">
                      {formatNumber(
                        itemizedCharges.total > 0
                          ? itemizedCharges.electricite
                          : 0,
                      )}{" "}
                      F
                    </div>
                  </div>

                  {/* Nettoyage */}
                  <div className="p-2 rounded-xl bg-[#162133] border border-emerald-500/20">
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Nettoyage
                    </div>
                    <div className="font-mono font-bold text-white text-xs">
                      {formatNumber(
                        itemizedCharges.total > 0
                          ? itemizedCharges.nettoyage
                          : 0,
                      )}{" "}
                      F
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#C9A96E]/15">
                  <div>
                    <label className="block text-[10px] text-[#6B7C94] uppercase">
                      Total Charges
                    </label>
                    <input
                      type="number"
                      value={effectiveCharges}
                      onChange={(e) =>
                        setCharges(
                          Math.max(
                            0,
                            Number(e.target.value) - itemizedCharges.total,
                          ),
                        )
                      }
                      className="w-full p-1.5 rounded-lg bg-[#162133] border border-[#C9A96E]/20 text-white text-xs font-mono disabled:opacity-75"
                    />
                    {itemizedCharges.total > 0 && (
                      <span className="text-[9px] text-[#C9A96E]">
                        Dont {formatNumber(itemizedCharges.total)} F de charges variables
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#6B7C94] uppercase">
                      Pénalités
                    </label>
                    <input
                      type="number"
                      value={penalites || 0}
                      onChange={(e) => setPenalites(Number(e.target.value))}
                      className="w-full p-1.5 rounded-lg bg-[#162133] border border-rose-500/30 text-rose-300 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#6B7C94] uppercase">
                      Taxes (TVA/TOM)
                    </label>
                    <input
                      type="number"
                      value={tva + tom || 0}
                      onChange={(e) => setTva(Number(e.target.value))}
                      className="w-full p-1.5 rounded-lg bg-[#162133] border border-[#C9A96E]/20 text-white text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 px-1 text-xs">
                  <span className="text-[#A8B4C4] font-medium">Total dû calculé :</span>
                  <span className="text-sm font-black font-mono text-[#E8D5B0]">
                    {formatNumber(paymentContext?.totalDue ?? totalCalculated)} FCFA
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Mode de Règlement
                  </label>
                  <select
                    value={modePaiement}
                    onChange={(e) =>
                      setModePaiement(e.target.value as PaymentMethod)
                    }
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white focus:outline-none focus:border-[#C9A96E]"
                  >
                    <option value="Espèces">
                      Espèces (Dépôt direct en caisse)
                    </option>
                  <option value="Mobile Money">
                      Mobile Money (Wave / Orange Money)
                    </option>
                  <option value="Virement">Virement bancaire</option>
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
                    onChange={(e) =>
                      setReferencePaiementInitial(e.target.value)
                    }
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-blue-500/30 text-white text-xs"
                  >
                    <option value="">— Aucun (paiement indépendant) —</option>
                    {partialPaymentsForTenant.map((p) => (
                      <option key={p.id} value={p.ref}>
                        {p.ref} — {formatNumber(p.montantPaye)} /{" "}
                        {formatNumber(p.montantTotal)} FCFA ({p.periode})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-blue-200/70">
                    Si ce paiement complète un acompte, sélectionnez-le. La
                    quittance générée sera automatiquement une{" "}
                    <strong>QUITTANCE DE SOLDE</strong>.
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
                    setReferencePaiementInitial("");
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
          amount={
            selectedPaymentForMobileMoney.montantRestant ||
            selectedPaymentForMobileMoney.montantTotal ||
            selectedPaymentForMobileMoney.loyerBase ||
            150000
          }
          tenantName={selectedPaymentForMobileMoney.locataireNom}
          tenantPhone={
            tenants.find(
              (t) => t.id === selectedPaymentForMobileMoney.locataireId,
            )?.telephone || "+221 77 000 00 00"
          }
          propertyNom={selectedPaymentForMobileMoney.bienNom}
          period={selectedPaymentForMobileMoney.periode}
          reference={
            selectedPaymentForMobileMoney.ref ||
            createDocumentNumber(settings?.prefixPaiement, "PAY-")
          }
          successMessage="Paiement enregistré et quittance actualisée."
          settings={settings}
          currentUser={currentUser}
          tenantId={selectedPaymentForMobileMoney.locataireId}
          payments={allKnownPayments}
          onConfirmPayment={async (amount, method, transactionId) => {
            const amountPaid =
              Number(selectedPaymentForMobileMoney.montantPaye || 0) + amount;
            const amountDue = Number(
              selectedPaymentForMobileMoney.montantTotal || amountPaid,
            );
            const updatedPayment: Payment = {
              ...selectedPaymentForMobileMoney,
              statut: amountPaid >= amountDue ? "Payé" : "Partiel",
              verificationStatut: "valide",
              montantPaye: amountPaid,
              montantRestant: Math.max(0, amountDue - amountPaid),
              modePaiement: "Mobile Money",
              moyenPaiementCode:
                method === "WAVE"
                  ? "WAVE"
                  : method === "ORANGE_MONEY"
                    ? "ORANGE_MONEY"
                    : "AUTRE",
              numeroTransaction: transactionId,
              referenceTransaction: transactionId,
              quittanceNumero:
                selectedPaymentForMobileMoney.quittanceNumero ||
                createDocumentNumber(settings?.prefixQuittance, "QUI-"),
              datePaiement: getLocalDateString(),
              observation: `Règlement direct validé via ${method === "WAVE" ? "Wave Sénégal" : "Orange Money"} (${transactionId})`,
              typeRecu: "QUITTANCE",
            };
            const saved = await onAddPayment(updatedPayment);
            if (!saved) return false;
            await loadPage(0);
            setSelectedPaymentForMobileMoney(null);
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
            return true;
          }}
          waveNumero={settings?.waveNumero}
          orangeMoneyCode={settings?.orangeMoneyCode}
          whatsappBusiness={settings?.whatsappBusiness}
        />
      )}
    </div>
  );
};
