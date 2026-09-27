/**
 * Vérifie si la config OM est complète
 */
export function isOrangeMoneyConfigured(
  apiKey?: string,
  merchantId?: string
): boolean {
  return !!(apiKey && merchantId);
}

/**
 * Nettoie le numéro de téléphone pour l'API OM
 */
export function formatOrangeMoneyPhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

/**
 * Génère la syntaxe USSD pour Orange Money
 */
export function getOrangeMoneyUssd(code: string, amount: number): string {
  return `#144*4*6*${code}*${Math.round(amount)}#`;
}

/**
 * Détecte si un paiement OM est en doublon
 */
export function isDuplicateOrangeMoneyPayment(
  transactions: any[],
  locataireId: string,
  periode: string
): boolean {
  return transactions.some(
    (t) =>
      t.locataire_id === locataireId &&
      t.periode === periode &&
      t.provider === 'ORANGE_MONEY' &&
      (t.status === 'pending' || t.status === 'success')
  );
}