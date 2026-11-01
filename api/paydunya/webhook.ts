import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import {
  getAgencySettings,
  updatePaymentTransaction,
  createPaymentFromWebhook,
  supabaseAdmin,
} from '../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: 'Data manquante.' });

    const token = data.token;
    const status = data.status;
    if (!token || !data.hash) return res.status(400).json({ error: 'Notification incomplète.' });

    const { data: tx } = await supabaseAdmin
      .from('payment_transactions')
      .select('*')
      .eq('paydunya_token', token)
      .eq('provider', 'PAYDUNYA')
      .maybeSingle();

    if (!tx) return res.status(404).json({ error: 'Transaction inconnue.' });
    const settings = await getAgencySettings(tx.agency_id);
    if (!settings.paydunya_master_key) return res.status(503).json({ error: 'Secret PayDunya non configuré.' });
    const expectedHash = crypto.createHash('sha512').update(settings.paydunya_master_key).digest('hex');
    const receivedHash = String(data.hash).trim().toLowerCase();
    const expectedBuffer = Buffer.from(expectedHash, 'utf8');
    const receivedBuffer = Buffer.from(receivedHash, 'utf8');
    if (expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
      return res.status(401).json({ error: 'Signature PayDunya invalide.' });
    }

    const notifiedAmount = Number(data.invoice?.total_amount ?? tx.montant);
    if (!Number.isFinite(notifiedAmount) || Math.round(notifiedAmount) !== Math.round(Number(tx.montant))) {
      return res.status(400).json({ error: 'Montant PayDunya différent de la transaction.' });
    }
    const isSuccess = status === 'completed';
    await updatePaymentTransaction(tx.id, {
      status: isSuccess ? 'success' : 'failed',
    });

    if (isSuccess) {
      await createPaymentFromWebhook(
        tx.agency_id,
        tx.locataire_id,
        Number(tx.montant),
        tx.periode,
        'PAYDUNYA',
        token
      );
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('Erreur PayDunya webhook:', err);
    return res.status(500).json({ error: err.message });
  }
}