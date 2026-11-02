import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import {
  getAgencySettings,
  updatePaymentTransaction,
  createPaymentFromWebhook,
  supabaseAdmin,
} from '../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    const data = typeof body === 'string'
      ? JSON.parse(body).data
      : body?.data;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Données de notification manquantes.' });
    }

    const token = data.token;
    const status = String(data.status || '').toLowerCase();
    const receivedHash = String(data.hash || '').trim().toLowerCase();

    if (!token || !receivedHash) {
      return res.status(400).json({ error: 'Notification incomplète.' });
    }

    const { data: tx, error: lookupError } = await supabaseAdmin
      .from('payment_transactions')
      .select('*')
      .eq('paydunya_token', token)
      .eq('provider', 'PAYDUNYA')
      .maybeSingle();

    if (lookupError) {
      console.error('Erreur recherche transaction PayDunya:', lookupError);
      return res.status(500).json({ error: 'Erreur de vérification de transaction.' });
    }

    if (!tx) {
      return res.status(404).json({ error: 'Transaction inconnue.' });
    }

    const settings = await getAgencySettings(tx.agency_id);
    if (!settings.paydunya_master_key) {
      return res.status(503).json({ error: 'Secret PayDunya non configuré.' });
    }

    const expectedHash = crypto
      .createHash('sha512')
      .update(settings.paydunya_master_key)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedHash, 'utf8');
    const receivedBuffer = Buffer.from(receivedHash, 'utf8');

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return res.status(401).json({ error: 'Signature PayDunya invalide.' });
    }

    if (status === 'completed') {
      const notifiedAmount = Number(data.invoice?.total_amount);

      if (
        data.invoice?.total_amount === undefined ||
        data.invoice?.total_amount === null ||
        !Number.isSafeInteger(notifiedAmount) ||
        notifiedAmount !== Number(tx.montant)
      ) {
        return res.status(400).json({
          error: 'Montant de notification absent ou différent de la transaction.',
        });
      }

      // Créer d'abord le paiement. En cas d'échec, le webhook pourra être retenté.
      await createPaymentFromWebhook(
        tx.agency_id,
        tx.locataire_id,
        Number(tx.montant),
        tx.periode,
        'PAYDUNYA',
        token
      );

      if (tx.status !== 'success') {
        await updatePaymentTransaction(tx.id, { status: 'success' });
      }

      return res.status(200).json({ received: true, processed: true });
    }

    // Ne jamais rétrograder une transaction déjà confirmée.
    if (
      ['cancelled', 'canceled', 'failed'].includes(status) &&
      tx.status !== 'success'
    ) {
      await updatePaymentTransaction(tx.id, { status: 'failed' });
    }

    return res.status(200).json({ received: true, processed: false });
  } catch (err: any) {
    console.error('Erreur PayDunya webhook:', err);
    return res.status(500).json({ error: 'Erreur lors du traitement de la notification.' });
  }
}
