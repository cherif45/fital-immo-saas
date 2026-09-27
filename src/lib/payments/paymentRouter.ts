import { AgencySettings } from '../../types';

export type PaymentProvider = 'WAVE' | 'ORANGE_MONEY' | 'PAYDUNYA';

export interface CheckoutRequest {
  agencyId: string;
  locataireId: string;
  locataireNom: string;
  locataireTelephone: string;
  locataireEmail?: string;
  periode: string;
  montant: number;
  description: string;
  successUrl: string;
  errorUrl: string;
  metadata?: Record<string, any>;
}

export interface CheckoutResponse {
  success: boolean;
  provider: PaymentProvider;
  checkoutUrl?: string;
  transactionId?: string;
  error?: string;
}

/**
 * Détecte les providers actifs pour une agence
 */
export function getActiveProviders(settings: AgencySettings): PaymentProvider[] {
  const active: PaymentProvider[] = [];
  if (!settings.paymentsEnabled) return active;
  if (settings.waveEnabled && settings.waveApiKey) active.push('WAVE');
  if (settings.orangeMoneyEnabled && settings.orangeMoneyApiKey) active.push('ORANGE_MONEY');
  if (settings.paydunyaEnabled && settings.paydunyaMasterKey) active.push('PAYDUNYA');
  return active;
}

/**
 * Routeur : crée une session de paiement via le provider demandé
 */
export async function createCheckout(
  provider: PaymentProvider,
  request: CheckoutRequest,
  settings: AgencySettings
): Promise<CheckoutResponse> {
  switch (provider) {
    case 'WAVE':
      return createWaveCheckout(request, settings);
    case 'ORANGE_MONEY':
      return createOrangeMoneyCheckout(request, settings);
    case 'PAYDUNYA':
      return createPayDunyaCheckout(request, settings);
    default:
      return { success: false, provider, error: 'Provider inconnu.' };
  }
}

// ============================================================
// Appels aux API Routes Vercel (les clés restent côté serveur)
// ============================================================

async function createWaveCheckout(
  request: CheckoutRequest,
  settings: AgencySettings
): Promise<CheckoutResponse> {
  try {
    const res = await fetch('/api/wave/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: request.montant,
        currency: 'XOF',
        clientReference: request.metadata?.reference || `PAY-${Date.now()}`,
        successUrl: request.successUrl,
        errorUrl: request.errorUrl,
        agencyId: request.agencyId,
        locataireId: request.locataireId,
        locataireNom: request.locataireNom,
        locataireTelephone: request.locataireTelephone,
        periode: request.periode,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, provider: 'WAVE', error: data.error || 'Erreur Wave.' };
    }
    return {
      success: true,
      provider: 'WAVE',
      checkoutUrl: data.checkoutUrl,
      transactionId: data.transactionId,
    };
  } catch (err: any) {
    return { success: false, provider: 'WAVE', error: err.message };
  }
}

async function createOrangeMoneyCheckout(
  request: CheckoutRequest,
  settings: AgencySettings
): Promise<CheckoutResponse> {
  try {
    const res = await fetch('/api/orange-money/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: request.montant,
        currency: 'XOF',
        orderId: request.metadata?.reference || `PAY-${Date.now()}`,
        successUrl: request.successUrl,
        errorUrl: request.errorUrl,
        agencyId: request.agencyId,
        locataireId: request.locataireId,
        locataireTelephone: request.locataireTelephone,
        periode: request.periode,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, provider: 'ORANGE_MONEY', error: data.error || 'Erreur OM.' };
    }
    return {
      success: true,
      provider: 'ORANGE_MONEY',
      checkoutUrl: data.checkoutUrl,
      transactionId: data.transactionId,
    };
  } catch (err: any) {
    return { success: false, provider: 'ORANGE_MONEY', error: err.message };
  }
}

async function createPayDunyaCheckout(
  request: CheckoutRequest,
  settings: AgencySettings
): Promise<CheckoutResponse> {
  try {
    const res = await fetch('/api/paydunya/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: request.montant,
        description: request.description,
        agencyId: request.agencyId,
        locataireId: request.locataireId,
        locataireNom: request.locataireNom,
        locataireEmail: request.locataireEmail,
        locataireTelephone: request.locataireTelephone,
        periode: request.periode,
        customData: request.metadata || {},
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, provider: 'PAYDUNYA', error: data.error || 'Erreur PayDunya.' };
    }
    return {
      success: true,
      provider: 'PAYDUNYA',
      checkoutUrl: data.checkoutUrl,
      transactionId: data.token,
    };
  } catch (err: any) {
    return { success: false, provider: 'PAYDUNYA', error: err.message };
  }
}