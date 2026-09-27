import { createClient } from '@supabase/supabase-js';

// ⚠️ Ces variables doivent être dans .env.local ET dans Vercel Environment Variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('⚠️ Supabase admin non configuré (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)');
}

/**
 * Client Supabase avec privilèges admin (bypass RLS).
 * ⚠️ À n'utiliser QUE côté serveur (API Routes).
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Récupère les settings d'une agence avec ses clés API
 */
export async function getAgencySettings(agencyId: string) {
  const { data, error } = await supabaseAdmin
    .from('agency_settings')
    .select('*')
    .eq('agency_id', agencyId)
    .maybeSingle();

  if (error) throw new Error(`Erreur récupération settings: ${error.message}`);
  if (!data) throw new Error('Agence introuvable.');
  return data;
}

/**
 * Enregistre une transaction de paiement (anti-doublon)
 */
export async function savePaymentTransaction(tx: {
  agency_id: string;
  locataire_id?: string;
  periode: string;
  montant: number;
  provider: string;
  provider_transaction_id?: string;
  status: string;
  checkout_url?: string;
  paydunya_token?: string;
  metadata?: any;
}) {
  const { data, error } = await supabaseAdmin
    .from('payment_transactions')
    .insert([tx])
    .select()
    .single();

  if (error) throw new Error(`Erreur sauvegarde transaction: ${error.message}`);
  return data;
}

/**
 * Vérifie si une transaction existe déjà (anti-doublon)
 */
export async function checkDuplicatePayment(
  agencyId: string,
  locataireId: string,
  periode: string,
  provider: string
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('payment_transactions')
    .select('id, status')
    .eq('agency_id', agencyId)
    .eq('locataire_id', locataireId)
    .eq('periode', periode)
    .eq('provider', provider)
    .in('status', ['pending', 'success'])
    .maybeSingle();

  return !!data;
}

/**
 * Met à jour le statut d'une transaction
 */
export async function updatePaymentTransaction(
  transactionId: string,
  updates: { status?: string; provider_transaction_id?: string; error_message?: string }
) {
  const { error } = await supabaseAdmin
    .from('payment_transactions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', transactionId);

  if (error) throw new Error(`Erreur mise à jour transaction: ${error.message}`);
}

/**
 * Crée un paiement (quittance) après confirmation du webhook
 */
export async function createPaymentFromWebhook(
  agencyId: string,
  locataireId: string,
  montant: number,
  periode: string,
  provider: string,
  transactionId: string
) {
  // Récupérer les infos du locataire
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('nom, prenom, bien_id, bien_nom, proprietaire_id, loyer_mensuel')
    .eq('id', locataireId)
    .maybeSingle();

  if (!tenant) throw new Error('Locataire introuvable.');

  const quittanceNumero = `QUI-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  const ref = `PAY-${provider}-${Date.now().toString().slice(-8)}`;

  const { error } = await supabaseAdmin.from('payments').insert([{
    agency_id: agencyId,
    ref,
    quittance_numero: quittanceNumero,
    locataire_id: locataireId,
    locataire_nom: `${tenant.prenom} ${tenant.nom}`,
    bien_id: tenant.bien_id,
    bien_nom: tenant.bien_nom,
    proprietaire_id: tenant.proprietaire_id,
    periode,
    loyer_base: montant,
    montant_total: montant,
    montant_paye: montant,
    montant_restant: 0,
    statut: 'Payé',
    mode_paiement: 'Mobile Money',
    moyen_paiement_code: provider === 'WAVE' ? 'WAVE' : provider === 'ORANGE_MONEY' ? 'ORANGE_MONEY' : 'AUTRE',
    verification_statut: 'valide',
    reference_transaction: transactionId,
    date_paiement: new Date().toISOString().split('T')[0],
    recu_par: `Automatique ${provider}`,
    observation: `Paiement en ligne confirmé (tx: ${transactionId})`,
  }]);

  if (error) throw new Error(`Erreur création paiement: ${error.message}`);
  return { quittanceNumero, ref };
}