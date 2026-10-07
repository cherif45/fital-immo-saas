import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
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
    const customData = data.custom_data || {};

    const { data: tx } = await supabaseAdmin
      .from('payment_transactions')
      .select('*')
      .eq('paydunya_token', token)
      .maybeSingle();

    if (!tx) return res.status(404).json({ error: 'Transaction inconnue.' });

    const isSuccess = status === 'completed';
    await updatePaymentTransaction(tx.id, {
      status: isSuccess ? 'success' : 'failed',
    });

    if (isSuccess) {
      await createPaymentFromWebhook(
        tx.agency_id,
        customData.locataire_id || tx.locataire_id,
        parseFloat(data.invoice?.total_amount || tx.montant),
        customData.periode || tx.periode,
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