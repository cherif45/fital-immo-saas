import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getAgencySettings,
  savePaymentTransaction,
  checkDuplicatePayment,
  PaymentAlreadyExistsError,
  requireAgencyUser,
} from '../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      amount, description, agencyId, locataireId, locataireNom,
      locataireEmail, locataireTelephone, periode, customData,
    } = req.body || {};

    if (!agencyId || !locataireId || !periode || amount === undefined || amount === null || amount === '') {
      return res.status(400).json({ error: 'Paramètres manquants.' });
    }

    await requireAgencyUser(req, agencyId, locataireId);

    const normalizedAmount = Number(amount);
    if (!Number.isSafeInteger(normalizedAmount) || normalizedAmount <= 0) {
      return res.status(400).json({
        error: 'Le montant doit être un entier positif en FCFA.',
      });
    }

    const isDuplicate = await checkDuplicatePayment(agencyId, locataireId, periode);
    if (isDuplicate) {
      return res.status(409).json({
        error: 'Un paiement est déjà en cours ou enregistré pour cette période.',
      });
    }

    const settings = await getAgencySettings(agencyId);
    if (
      !settings.paydunya_master_key ||
      !settings.paydunya_private_key ||
      !settings.paydunya_token
    ) {
      return res.status(400).json({
        error: 'Les trois clés PayDunya doivent être configurées.',
      });
    }

    const safeCustomData =
      customData && typeof customData === 'object' && !Array.isArray(customData)
        ? customData
        : {};

    const invoiceResponse = await fetch(
      'https://app.paydunya.com/api/v1/checkout-invoice/create',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'PAYDUNYA-MASTER-KEY': settings.paydunya_master_key,
          'PAYDUNYA-PRIVATE-KEY': settings.paydunya_private_key,
          'PAYDUNYA-TOKEN': settings.paydunya_token,
        },
        body: JSON.stringify({
          invoice: {
            total_amount: normalizedAmount,
            description: String(description || 'Paiement de loyer'),
            customer: {
              name: locataireNom || '',
              email: locataireEmail || '',
              phone: locataireTelephone || '',
            },
          },
          store: {
            name: settings.nom_agence || 'Agence immobilière',
          },
          custom_data: {
            ...safeCustomData,
            agency_id: agencyId,
            locataire_id: locataireId,
            periode,
          },
        }),
      },
    );

    const invoiceData = await invoiceResponse.json();

    if (!invoiceResponse.ok || invoiceData.response_code !== '00') {
      console.error('Erreur création facture PayDunya:', invoiceData);
      return res.status(502).json({
        error: invoiceData.response_text || 'Erreur PayDunya lors de la création de la facture.',
      });
    }

    if (!invoiceData.token || !invoiceData.response_text) {
      return res.status(502).json({
        error: 'Réponse PayDunya incomplète.',
      });
    }

    const tx = await savePaymentTransaction({
      agency_id: agencyId,
      locataire_id: locataireId,
      periode,
      montant: normalizedAmount,
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
    return res.status(
      err.statusCode || (err instanceof PaymentAlreadyExistsError ? 409 : 500)
    ).json({
      error: err.message || 'Erreur serveur.',
    });
  }
}
