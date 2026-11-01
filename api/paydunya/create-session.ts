import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getAgencySettings,
  savePaymentTransaction,
  checkDuplicatePayment,
  PaymentAlreadyExistsError,
  requireAgencyUser,
} from '../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      amount, description, agencyId, locataireId, locataireNom,
      locataireEmail, locataireTelephone, periode, customData,
    } = req.body;

    if (!amount || !agencyId || !locataireId || !periode) {
      return res.status(400).json({ error: 'Paramètres manquants.' });
    }

    await requireAgencyUser(req, agencyId, locataireId);
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Montant invalide.' });
    }

    const isDuplicate = await checkDuplicatePayment(agencyId, locataireId, periode);
    if (isDuplicate) {
      return res.status(409).json({ error: 'Paiement déjà en cours.' });
    }

    const settings = await getAgencySettings(agencyId);
    if (!settings.paydunya_master_key || !settings.paydunya_private_key) {
      return res.status(400).json({ error: 'PayDunya non configuré.' });
    }

    // 1. Créer la facture PayDunya
    const invoiceResponse = await fetch('https://app.paydunya.com/api/v1/checkout-invoice/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PAYDUNYA-MASTER-KEY': settings.paydunya_master_key,
        'PAYDUNYA-PRIVATE-KEY': settings.paydunya_private_key,
        'PAYDUNYA-TOKEN': settings.paydunya_token,
      },
      body: JSON.stringify({
        invoice: {
          total_amount: amount,
          description,
          customer: {
            name: locataireNom,
            email: locataireEmail || '',
            phone: locataireTelephone,
          },
        },
        store: {
          name: settings.nom_agence,
        },
        custom_data: {
          agency_id: agencyId,
          locataire_id: locataireId,
          periode,
          ...customData,
        },
      }),
    });

    const invoiceData = await invoiceResponse.json();

    if (invoiceData.response_code !== '00') {
      return res.status(400).json({
        error: invoiceData.response_text || 'Erreur PayDunya.',
      });
    }

    const tx = await savePaymentTransaction({
      agency_id: agencyId,
      locataire_id: locataireId,
      periode,
      montant: amount,
      provider: 'PAYDUNYA',
      provider_transaction_id: invoiceData.token,
      status: 'pending',
      checkout_url: invoiceData.response_text,
      paydunya_token: invoiceData.token,
    });

    return res.status(200).json({
      success: true,
      checkoutUrl: invoiceData.response_text,
      token: invoiceData.token,
      transactionId: tx.id,
    });
  } catch (err: any) {
    console.error('Erreur PayDunya create-session:', err);
    return res.status(err.statusCode || (err instanceof PaymentAlreadyExistsError ? 409 : 500)).json({
      error: err.message || 'Erreur serveur.',
    });
  }
}