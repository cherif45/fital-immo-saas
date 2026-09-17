// Communications Helper: Calls, SMS, WhatsApp & Message Templates

import { cleanPhoneNumber, generateWavePaymentUrl, defaultMobileMoneyConfig } from '../payments/mobileMoney';

export interface CommsContact {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  role?: 'LOCATAIRE' | 'PROPRIETAIRE' | 'AGENT' | 'TECHNICIEN' | 'CAISSIER' | 'GESTIONNAIRE' | string;
  propertyNom?: string;
  montantDu?: number;
  periode?: string;
}

/**
 * Trigger immediate phone call via native dialer
 */
export function triggerPhoneCall(phone: string): void {
  const clean = cleanPhoneNumber(phone);
  window.location.href = `tel:+${clean}`;
}

/**
 * Trigger native SMS with pre-filled body
 */
export function triggerSMS(phone: string, message: string): void {
  const clean = cleanPhoneNumber(phone);
  const encoded = encodeURIComponent(message);
  // Using both ?body= and &body= compatibility
  window.location.href = `sms:+${clean}?body=${encoded}`;
}

/**
 * Trigger WhatsApp chat in a new tab with pre-filled message
 */
export function triggerWhatsApp(phone: string, message: string): void {
  const clean = cleanPhoneNumber(phone);
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${clean}?text=${encoded}`, '_blank');
}

/**
 * Pre-formatted Templates
 */
export function getRentReminderTemplate(
  tenantName: string,
  propertyNom: string,
  amount: number,
  period: string,
  daysLate = 0
): string {
  const waveUrl = generateWavePaymentUrl(amount, defaultMobileMoneyConfig.wavePhone, `LOYER-${tenantName.slice(0, 4)}`);
  const omCode = defaultMobileMoneyConfig.orangeMoneyMerchantCode || '894210';
  
  if (daysLate > 10) {
    return `⚠️ *MISE EN DEMEURE - RAPPEL ÉCHÉANCE LOYER* ⚠️\n\n` +
      `Bonjour M./Mme *${tenantName}*,\n\n` +
      `Sauf erreur de notre part, votre loyer de *${propertyNom}* pour la période de *${period}* présente un retard de *${daysLate} jours* pour un montant de *${amount.toLocaleString('fr-FR')} FCFA*.\n\n` +
      `💳 *Règlement immédiat en 1-clic :*\n` +
      `• *Wave direct :* ${waveUrl}\n` +
      `• *Orange Money :* Code Marchand *${omCode}* (#144#)\n\n` +
      `Merci de régulariser sous 48h ou de contacter la gérance.\n\n` +
      `_Direction FITAL-IMMO Dakar — Tél: ${defaultMobileMoneyConfig.wavePhone}_`;
  }

  return `🏛️ *FITAL-IMMO — Avis d'échéance de Loyer*\n\n` +
    `Bonjour M./Mme *${tenantName}*,\n\n` +
    `Votre avis de loyer pour *${propertyNom}* (${period}) est disponible d'un montant de *${amount.toLocaleString('fr-FR')} FCFA*.\n\n` +
    `📲 *Paiement rapide et sécurisé :*\n` +
    `• *Lien Wave :* ${waveUrl}\n` +
    `• *Orange Money :* Tapez #144# puis Code Marchand *${omCode}*\n\n` +
    `Votre quittance certifiée sera générée automatiquement dès réception.\n\n` +
    `Excellente journée,\n_L'équipe FITAL-IMMO_`;
}

export function generateLateRentMessage(
  prenom: string,
  nom: string,
  bienNom: string,
  montant: number,
  joursRetard = 5
): string {
  return getRentReminderTemplate(`${prenom} ${nom}`, bienNom, montant, 'Mois en cours', joursRetard);
}

export function getPaymentReceiptTemplate(
  tenantNameOrObj: string | { tenantName: string; propertyNom?: string; amount: number; receiptRef?: string; quittanceNumber?: string; period: string },
  propertyNomArg?: string,
  amountArg?: number,
  receiptRefArg?: string,
  periodArg?: string
): string {
  let tenantName = '';
  let propertyNom = '';
  let amount = 0;
  let receiptRef = '';
  let period = '';

  if (typeof tenantNameOrObj === 'object') {
    tenantName = tenantNameOrObj.tenantName;
    propertyNom = tenantNameOrObj.propertyNom || 'Logement';
    amount = tenantNameOrObj.amount;
    receiptRef = tenantNameOrObj.quittanceNumber || tenantNameOrObj.receiptRef || 'QUI-2026';
    period = tenantNameOrObj.period;
  } else {
    tenantName = tenantNameOrObj;
    propertyNom = propertyNomArg || 'Logement';
    amount = amountArg || 0;
    receiptRef = receiptRefArg || 'QUI-2026';
    period = periodArg || 'Mois en cours';
  }

  return `✅ *FITAL-IMMO — Confirmation de Paiement*\n\n` +
    `Bonjour *${tenantName}*,\n\n` +
    `Nous vous confirmons la bonne réception de votre règlement de *${amount.toLocaleString('fr-FR')} FCFA* au titre du loyer de *${propertyNom}* (${period}).\n\n` +
    `📜 *Quittance N° :* ${receiptRef}\n` +
    `🔐 *Statut :* Validé & Certifié\n\n` +
    `Vous pouvez télécharger votre quittance officielle depuis votre espace locataire.\n\n` +
    `Merci pour votre confiance,\n_Service Comptabilité FITAL-IMMO_`;
}

export function getOwnerDisbursementTemplate(
  ownerName: string,
  period: string,
  netAmount: number,
  voucherRef: string
): string {
  return `🏛️ *FITAL-IMMO — Compte-rendu de Gérance & Reversement*\n\n` +
    `Cher(e) Propriétaire *${ownerName}*,\n\n` +
    `Les loyers de la période *${period}* ont été recouvrés. Le virement net de *${netAmount.toLocaleString('fr-FR')} FCFA* (déduction faite des commissions et charges) a été ordonné.\n\n` +
    `📋 *Bordereau N° :* ${voucherRef}\n\n` +
    `Le détail complet reste consultable sur votre espace propriétaire.\n\n` +
    `Cordialement,\n_FITAL-IMMO Gestion Immobilière_`;
}

export function getMaintenanceNoticeTemplate(
  recipientName: string,
  propertyNom: string,
  ticketTitle: string,
  dateScheduled?: string
): string {
  return `🔧 *FITAL-IMMO — Intervention Technique & Maintenance*\n\n` +
    `Bonjour *${recipientName}*,\n\n` +
    `Concernant l'intervention sur le bien *${propertyNom}* (*${ticketTitle}*) :\n` +
    `${dateScheduled ? `📅 Une visite est planifiée le *${dateScheduled}*.\n` : ''}` +
    `Un technicien accrédité va prendre contact avec vous sous peu.\n\n` +
    `_Service Technique FITAL-IMMO_`;
}
