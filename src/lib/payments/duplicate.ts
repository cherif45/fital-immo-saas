import type { Payment } from '../../types';

const normalizePeriod = (period: string) => period.trim().toLowerCase();

export function findBlockingPayment(
  payments: readonly Payment[],
  tenantId: string,
  period: string,
): Payment | undefined {
  const normalizedPeriod = normalizePeriod(period);

  return payments.find((payment) => {
    if (
      payment.locataireId !== tenantId ||
      normalizePeriod(payment.periode) !== normalizedPeriod ||
      payment.verificationStatut === 'rejete'
    ) {
      return false;
    }

    return (
      payment.verificationStatut === 'en_attente' ||
      payment.statut === 'En attente' ||
      payment.statut === 'Payé'
    );
  });
}
