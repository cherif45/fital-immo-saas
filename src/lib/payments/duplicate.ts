import type { Payment } from "../../types";

const normalizePeriod = (period: string) =>
  (period || "").trim().toLowerCase().replace(/\s+/g, " ");

export function findBlockingPayment(
  payments: readonly Payment[],
  tenantId: string,
  period: string,
): Payment | undefined {
  const normalizedPeriod = normalizePeriod(period);

  return payments.find((payment) => {
    // 🆕 Comparer sur periodeNormalisee si disponible, sinon fallback sur periode
    const paymentPeriod = payment.periodeNormalisee
      ? normalizePeriod(payment.periodeNormalisee)
      : normalizePeriod(payment.periode);

    if (
      payment.locataireId !== tenantId ||
      paymentPeriod !== normalizedPeriod ||
      (payment.verificationStatut === "rejete" || payment.verificationStatut === "annule")
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
