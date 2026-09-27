import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import {
  getAgencySettings,
  updatePaymentTransaction,
  createPaymentFromWebhook,
  } from '../_lib/supabaseAdmin.js';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const signature = req.headers['wave-signature'] as string;
    const body = JSON.stringify(req.body);

    // 1. Vérifier la signature (à récupérer depuis les settings de l'agence)
    // ⚠️ Pour identifier l'agence, on utilise le client_reference passé à Wave
    const clientReference = req.body?.data?.client_reference || '';
    const agencyId = req.body?.data?.metadata?.agency_id;

    if (!agencyId) {
      return res.status(400).json({ error: 'agency_id manquant.' });
    }

    const settings = await getAgencySettings(agencyId);
    if (settings.wave_webhook_secret && signature) {
      const computed = crypto
        .createHmac('sha256', settings.wave_webhook_secret)
        .update(body)
        .digest('hex');
      if (computed !== signature) {
        console.warn('Signature Wave invalide');
        return res.status(401).json({ error: 'Signature invalide.' });
      }
    }

    // 2. Extraire les infos
    const event = req.body;
    const waveTxId = event.data?.id;
    const status = event.type || event.data?.payment_status;
    const locataireId = event.data?.metadata?.locataire_id;
    const periode = event.data?.metadata?.periode;
    const montant = parseFloat(event.data?.amount || '0');

    if (!waveTxId) {
      return res.status(400).json({ error: 'Transaction ID manquant.' });
    }

    // 3. Mettre à jour la transaction
    const { data: existingTx } = await supabaseAdmin
      .from('payment_transactions')
      .select('id')
      .eq('provider_transaction_id', waveTxId)
      .maybeSingle();

    if (!existingTx) {
      return res.status(404).json({ error: 'Transaction inconnue.' });
    }

    const isSuccess = status === 'checkout.session.completed' || status === 'success';
    const isFailed = status === 'checkout.session.failed' || status === 'failed';

    await updatePaymentTransaction(existingTx.id, {
      status: isSuccess ? 'success' : isFailed ? 'failed' : 'pending',
    });

    // 4. Si succès → créer la quittance
    if (isSuccess && locataireId && periode) {
      try {
        await createPaymentFromWebhook(
          agencyId, locataireId, montant, periode, 'WAVE', waveTxId
        );
      } catch (err: any) {
        console.error('Erreur création quittance:', err.message);
      }
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('Erreur Wave webhook:', err);
    return res.status(500).json({ error: err.message });
  }
}