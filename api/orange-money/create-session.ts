import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getAgencySettings,
  savePaymentTransaction,
  checkDuplicatePayment,
} from '../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      amount, currency, orderId, successUrl, errorUrl,
      agencyId, locataireId, locataireTelephone, periode,
    } = req.body;

    if (!amount || !agencyId || !locataireId || !locataireTelephone) {
      return res.status(400).json({ error: 'Paramètres manquants.' });
    }

    const isDuplicate = await checkDuplicatePayment(agencyId, locataireId, periode, 'ORANGE_MONEY');
    if (isDuplicate) {
      return res.status(409).json({ error: 'Paiement déjà en cours.' });
    }

    const settings = await getAgencySettings(agencyId);
    if (!settings.orange_money_api_key || !settings.orange_money_merchant_id) {
      return res.status(400).json({ error: 'Orange Money non configuré.' });
    }

    // ⚠️ Exemple générique — l'API OM réelle varie selon le pays/contrat
    // Contactez Orange Business pour obtenir la doc exacte
    const omResponse = await fetch('https://api.orange.com/orange-money-webpay/dev/v1/webpayment', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.orange_money_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        merchant_key: settings.orange_money_merchant_id,
        currency: currency || 'OUD',
        order_id: orderId,
        amount: Math.round(amount),
        return_url: successUrl,
        cancel_url: errorUrl,
        notif_url: `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''}/api/orange-money/webhook`,
        lang: 'fr',
        reference: orderId,
      }),
    });

    const omData = await omResponse.json();

    if (!omResponse.ok) {
      return res.status(omResponse.status).json({
        error: omData.message || 'Erreur Orange Money.',
      });
    }

    const tx = await savePaymentTransaction({
      agency_id: agencyId,
      locataire_id: locataireId,
      periode,
      montant: amount,
      provider: 'ORANGE_MONEY',
      provider_transaction_id: omData.pay_token || omData.order_id,
      status: 'pending',
      checkout_url: omData.payment_url,
      metadata: { locataire_telephone: locataireTelephone },
    });

    return res.status(200).json({
      success: true,
      checkoutUrl: omData.payment_url,
      transactionId: tx.id,
      payToken: omData.pay_token,
    });
  } catch (err: any) {
    console.error('Erreur OM create-session:', err);
    return res.status(500).json({ error: err.message || 'Erreur serveur.' });
  }
}