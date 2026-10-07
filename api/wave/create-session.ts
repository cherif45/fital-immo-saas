import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getAgencySettings,
  savePaymentTransaction,
  checkDuplicatePayment,
  PaymentAlreadyExistsError,
} from '../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      amount, currency, clientReference, successUrl, errorUrl,
      agencyId, locataireId, locataireNom, locataireTelephone, periode,
    } = req.body;

    // 1. Vérifications
    if (!amount || !agencyId || !locataireId) {
      return res.status(400).json({ error: 'Paramètres manquants.' });
    }

    // 2. Anti-doublon
    const isDuplicate = await checkDuplicatePayment(agencyId, locataireId, periode);
    if (isDuplicate) {
      return res.status(409).json({
        error: 'Un paiement est déjà en cours pour cette période.',
      });
    }

    // 3. Récupérer les settings de l'agence
    const settings = await getAgencySettings(agencyId);
    if (!settings.wave_api_key) {
      return res.status(400).json({ error: 'Wave n\'est pas configuré pour cette agence.' });
    }

    // 4. Appeler l'API Wave
    const waveResponse = await fetch('https://api.wave.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.wave_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: String(Math.round(amount)),
        currency: currency || 'XOF',
        client_reference: clientReference,
        success_url: successUrl,
        error_url: errorUrl,
        wave_launch_url: 'https://pay.wave.com/m/M_PAYMENT',
      }),
    });

    const waveData = await waveResponse.json();

    if (!waveResponse.ok) {
      return res.status(waveResponse.status).json({
        error: waveData.message || 'Erreur Wave lors de la création de la session.',
      });
    }

    // 5. Sauvegarder la transaction (anti-doublon)
    const tx = await savePaymentTransaction({
      agency_id: agencyId,
      locataire_id: locataireId,
      periode,
      montant: amount,
      provider: 'WAVE',
      provider_transaction_id: waveData.id,
      status: 'pending',
      checkout_url: waveData.wave_launch_url,
      metadata: {
        client_reference: clientReference,
        locataire_nom: locataireNom,
        locataire_telephone: locataireTelephone,
      },
    });

    // 6. Retourner l'URL de checkout
    return res.status(200).json({
      success: true,
      checkoutUrl: waveData.wave_launch_url,
      transactionId: tx.id,
      waveId: waveData.id,
    });
  } catch (err: any) {
    console.error('Erreur Wave create-session:', err);
    return res.status(err instanceof PaymentAlreadyExistsError ? 409 : 500).json({
      error: err.message || 'Erreur serveur.',
    });
  }
}