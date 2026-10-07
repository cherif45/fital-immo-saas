export interface PayDunyaInvoice {
  token: string;
  checkoutUrl: string;
  status: string;
}

/**
 * Vérifie si la config PayDunya est complète
 */
export function isPayDunyaConfigured(
  masterKey?: string,
  privateKey?: string,
  token?: string
): boolean {
  return !!(masterKey && privateKey && token);
}

/**
 * Détecte si un paiement PayDunya est en doublon
 */
export function isDuplicatePayDunyaPayment(
  transactions: any[],
  locataireId: string,
  periode: string
): boolean {
  return transactions.some(
    (t) =>
      t.locataire_id === locataireId &&
      t.periode === periode &&
      t.provider === 'PAYDUNYA' &&
      (t.status === 'pending' || t.status === 'success')
  );
}

/**
 * Statuts PayDunya
 */
export const PAYDUNYA_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
} as const;

/**
 * Map statut PayDunya → statut interne
 */
export function mapPayDunyaStatus(status: string): 'pending' | 'success' | 'failed' | 'cancelled' {
  const s = status.toLowerCase();
  if (s.includes('complete') || s.includes('success') || s.includes('paid')) return 'success';
  if (s.includes('cancel')) return 'cancelled';
  if (s.includes('fail') || s.includes('error')) return 'failed';
  return 'pending';
}