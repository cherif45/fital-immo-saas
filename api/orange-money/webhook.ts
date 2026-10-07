import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  updatePaymentTransaction,
  createPaymentFromWebhook,
  supabaseAdmin,
} from '../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { status, notif_token, txnid, order_id, amount } = req.body;

    if (!notif_token && !order_id) {
      return res.status(400).json({ error: 'Token manquant.' });
    }

    const { data: tx } = await supabaseAdmin
      .from('payment_transactions')
      .select('*')
      .or(`provider_transaction_id.eq.${order_id},provider_transaction_id.eq.${notif_token}`)
      .maybeSingle();

    if (!tx) return res.status(404).json({ error: 'Transaction inconnue.' });

    const isSuccess = status === 'SUCCESS' || status === 'success';
    await updatePaymentTransaction(tx.id, {
      status: isSuccess ? 'success' : 'failed',
      provider_transaction_id: txnid || tx.provider_transaction_id,
    });

    if (isSuccess) {
      await createPaymentFromWebhook(
        tx.agency_id, tx.locataire_id, parseFloat(amount || tx.montant),
        tx.periode, 'ORANGE_MONEY', txnid || tx.provider_transaction_id
      );
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('Erreur OM webhook:', err);
    return res.status(500).json({ error: err.message });
  }
}