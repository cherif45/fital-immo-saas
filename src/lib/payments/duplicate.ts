import type { Payment } from "../../types";

const normalizePeriod = (period: string) =>
  (period || "").trim().toLowerCase().replace(/\s+/g, " ");

const samePeriod = (payment: Payment, period: string) => {
  // 🆕 Comparer sur periodeNormalisee si disponible, sinon fallback sur periode
  const paymentPeriod = payment.periodeNormalisee
    ? normalizePeriod(payment.periodeNormalisee)
    : normalizePeriod(payment.periode);

  return paymentPeriod === normalizePeriod(period);
};

/** Paiement rejeté ou annulé : ne doit jamais bloquer ni être compté. */
export function isRejectedPayment(payment: Payment): boolean {
  return (
    payment.verificationStatut === "rejete" ||
    payment.verificationStatut === "annule"
  );
}

/**
 * Paiement EN ATTENTE de validation (ex. Mobile Money).
 * ⚠️ Un paiement en attente n'est JAMAIS un acompte encaissé :
 *    il ne doit pas être compté comme somme reçue.
 */
export function isPendingPayment(payment: Payment): boolean {
  return (
    payment.statut === "En attente" ||
    payment.verificationStatut === "en_attente"
  );
}

/** Paiement effectivement encaissé (réglé ou partiel), hors attente/rejet/annulation. */
export function isCollectedPayment(payment: Payment): boolean {
  if (isRejectedPayment(payment) || isPendingPayment(payment)) return false;
  return payment.statut === "Payé" || payment.statut === "Partiel";
}

/**
 * Tous les paiements connus (local + serveur) pour un locataire / une période,
 * hors paiements rejetés ou annulés.
 */
export function getPeriodPayments(
  payments: readonly Payment[],
  tenantId: string,
  period: string,
): Payment[] {
  if (!tenantId || !period) return [];
  return payments.filter(
    (payment) =>
      payment.locataireId === tenantId &&
      samePeriod(payment, period) &&
      !isRejectedPayment(payment),
  );
}

function collectRoot(payment: Payment, byId: Map<string, Payment>): Payment {
  let root = payment;
  const visited = new Set([payment.id]);

  while (
    root.parentPaymentId &&
    byId.has(root.parentPaymentId) &&
    !visited.has(root.parentPaymentId)
  ) {
    visited.add(root.parentPaymentId);
    const parent = byId.get(root.parentPaymentId);
    if (!parent) break;
    root = parent;
  }

  return root;
}

/**
 * Total RÉELLEMENT encaissé pour une période.
 * - les paiements en attente ne sont jamais comptés ;
 * - les versements d'une même chaîne (acompte → solde) sont cumulés une seule fois ;
 * - les anciennes lignes "cumulatives" (sans montantVersement) sont comptées
 *   une seule fois par chaîne via leur montantPaye maximal.
 */
export function getPeriodCollectedTotal(
  payments: readonly Payment[],
  tenantId: string,
  period: string,
): number {
  const rows = getPeriodPayments(payments, tenantId, period).filter((payment) =>
    isCollectedPayment(payment),
  );
  if (rows.length === 0) return 0;

  const byId = new Map(rows.map((payment) => [payment.id, payment]));
  const groups = new Map<string, { installments: number; legacy: number }>();

  rows.forEach((payment) => {
    const root = collectRoot(payment, byId);
    const group = groups.get(root.id) || { installments: 0, legacy: 0 };

    if (Number.isFinite(payment.montantVersement)) {
      group.installments += Math.max(0, Number(payment.montantVersement || 0));
    } else {
      group.legacy = Math.max(group.legacy, Number(payment.montantPaye || 0));
    }

    groups.set(root.id, group);
  });

  return Array.from(groups.values()).reduce(
    (sum, group) => sum + group.installments + group.legacy,
    0,
  );
}

/**
 * Montant total dû pour une période, tel qu'enregistré sur le paiement racine
 * de la chaîne (acompte → solde). `minimumDue` permet d'imposer un plancher
 * calculé côté contrat (loyer + charges + taxes) si les lignes enregistrées
 * sont incomplètes.
 */
export function getPeriodDueTotal(
  payments: readonly Payment[],
  tenantId: string,
  period: string,
  minimumDue = 0,
): number {
  const rows = getPeriodPayments(payments, tenantId, period);
  if (rows.length === 0) return Math.max(0, minimumDue);

  const byId = new Map(rows.map((payment) => [payment.id, payment]));
  const roots = rows.filter(
    (payment) =>
      !payment.parentPaymentId || !byId.has(payment.parentPaymentId),
  );

  const recordedDue = roots.reduce((max, payment) => {
    const due = Number(payment.montantInitialDu || payment.montantTotal || 0);
    return Number.isFinite(due) ? Math.max(max, due) : max;
  }, 0);

  return Math.max(recordedDue, Math.max(0, minimumDue));
}

export interface PeriodBalance {
  /** Sommes réellement encaissées (hors paiements en attente). */
  collected: number;
  /** Montant total dû pour la période. */
  due: number;
  /** Reste réellement à encaisser (jamais négatif). */
  remaining: number;
  /** Paiements en attente de validation pour la période. */
  pending: Payment[];
  /** Paiements encaissés pour la période (acomptes et/ou règlements). */
  collectedPayments: Payment[];
}

/**
 * Calcul du solde d'une période à partir des paiements effectivement enregistrés.
 * C'est cette fonction qui distingue "paiement partiel + solde" d'un
 * véritable double encaissement.
 */
export function getPeriodBalance(
  payments: readonly Payment[],
  tenantId: string,
  period: string,
  minimumDue = 0,
): PeriodBalance {
  const rows = getPeriodPayments(payments, tenantId, period);
  const collected = getPeriodCollectedTotal(payments, tenantId, period);
  const due = getPeriodDueTotal(payments, tenantId, period, minimumDue);

  return {
    collected,
    due,
    remaining: Math.max(0, due - collected),
    pending: rows.filter((payment) => isPendingPayment(payment)),
    collectedPayments: rows.filter((payment) => isCollectedPayment(payment)),
  };
}

/**
 * Paiement qui BLOQUE l'encaissement d'un nouveau règlement pour la période :
 * un paiement en attente, ou un paiement déjà encaissé.
 * (contrôle anti-doublon d'origine — conservé)
 */
export function findBlockingPayment(
  payments: readonly Payment[],
  tenantId: string,
  period: string,
): Payment | undefined {
  const normalizedPeriod = normalizePeriod(period);

  return payments.find((payment) => {
    const paymentPeriod = payment.periodeNormalisee
      ? normalizePeriod(payment.periodeNormalisee)
      : normalizePeriod(payment.periode);

    if (
      payment.locataireId !== tenantId ||
      paymentPeriod !== normalizedPeriod ||
      (payment.verificationStatut === "rejete" ||
        payment.verificationStatut === "annule")
    ) {
      return false;
    }

    return (
      payment.verificationStatut === "en_attente" ||
      payment.statut === "En attente" ||
      payment.statut === "Payé"
    );
  });
}
