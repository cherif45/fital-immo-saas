import { PaymentProvider } from './paymentRouter';

export interface WaveSession {
  waveLaunchUrl: string;
  transactionId: string;
  clientReference: string;
}

export interface WaveTransaction {
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  transactionId: string;
  amount: number;
  paymentStatus: string;
}

/**
 * Vérifie si la config Wave est complète
 */
export function isWaveConfigured(apiKey?: string, webhookSecret?: string): boolean {
  return !!(apiKey && webhookSecret);
}

/**
 * Formate le montant pour Wave (entier en XOF)
 */
export function formatWaveAmount(amount: number): number {
  return Math.round(amount);
}

/**
 * Détecte si un paiement Wave est en doublon
 * (même locataire + même période + statut pending/success)
 */
export function isDuplicateWavePayment(
  transactions: any[],
  locataireId: string,
  periode: string
): boolean {
  return transactions.some(
    (t) =>
      t.locataire_id === locataireId &&
      t.periode === periode &&
      t.provider === 'WAVE' &&
      (t.status === 'pending' || t.status === 'success')
  );
}

/**
 * Label affiché dans l'interface
 */
export const WAVE_LABEL: Record<PaymentProvider, string> = {
  WAVE: 'Wave Mobile Money',
  ORANGE_MONEY: 'Orange Money',
  PAYDUNYA: 'PayDunya',
};