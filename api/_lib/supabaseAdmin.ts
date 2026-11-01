import { createClient } from '@supabase/supabase-js';
import type { VercelRequest } from '@vercel/node';
import { createDocumentNumber } from '../../src/lib/documentNumber.js';
import { getPeriodDueDate } from '../../src/lib/payments/dueDate.js';

// ⚠️ Ces variables doivent être dans .env.local ET dans Vercel Environment Variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

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

export class PaymentAlreadyExistsError extends Error {
  constructor() {
    super('Un paiement est déjà en cours ou confirmé pour cette période.');
    this.name = 'PaymentAlreadyExistsError';
  }
}

/**
 * Récupère les settings d'une agence avec ses clés API
 */
export async function getAgencySettings(agencyId: string) {
  const [{ data, error }, { data: secrets, error: secretsError }] = await Promise.all([
    supabaseAdmin.from('agency_settings').select('*').eq('agency_id', agencyId).maybeSingle(),
    supabaseAdmin.from('agency_payment_secrets').select('*').eq('agency_id', agencyId).maybeSingle(),
  ]);

  if (error) throw new Error(`Erreur récupération settings: ${error.message}`);
  if (secretsError) throw new Error(`Erreur récupération secrets de paiement: ${secretsError.message}`);
  if (!data) throw new Error('Agence introuvable.');
  return {
    ...data,
    wave_api_key: secrets?.wave_api_key || '',
    wave_webhook_secret: secrets?.wave_webhook_secret || '',
    orange_money_api_key: secrets?.orange_money_api_key || '',
    orange_money_merchant_id: secrets?.orange_money_merchant_id || '',
    paydunya_master_key: secrets?.paydunya_master_key || '',
    paydunya_private_key: secrets?.paydunya_private_key || '',
    paydunya_public_key: secrets?.paydunya_public_key || '',
    paydunya_token: secrets?.paydunya_token || '',
  };
}

export async function requireAgencyUser(
  req: VercelRequest,
  agencyId: string,
  locataireId?: string,
) {
  const rawAuthorization = req.headers.authorization;
  const authorization = Array.isArray(rawAuthorization) ? (rawAuthorization[0] || '') : (rawAuthorization || '');
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token || !supabaseUrl || !supabaseAnonKey) {
    const error = new Error('Authentification requise.');
    (error as any).statusCode = 401;
    throw error;
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) {
    const error = new Error('Session invalide ou expirée.');
    (error as any).statusCode = 401;
    throw error;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, agency_id, role, statut, locataire_id')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.statut !== 'actif') {
    const error = new Error('Compte inactif ou profil introuvable.');
    (error as any).statusCode = 403;
    throw error;
  }

  if (profile.role !== 'SUPER_ADMIN_SAAS' && profile.agency_id !== agencyId) {
    const error = new Error('Accès interdit à cette agence.');
    (error as any).statusCode = 403;
    throw error;
  }

  const allowedRoles = ['SUPER_ADMIN_SAAS', 'SUPER_ADMIN', 'ADMIN', 'CAISSIER', 'LOCATAIRE'];
  if (!allowedRoles.includes(profile.role)) {
    const error = new Error('Rôle non autorisé à initier un paiement.');
    (error as any).statusCode = 403;
    throw error;
  }

  if (profile.role === 'LOCATAIRE' && (!locataireId || profile.locataire_id !== locataireId)) {
    const error = new Error('Un locataire ne peut initier que son propre paiement.');
    (error as any).statusCode = 403;
    throw error;
  }

  return profile;
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

  if (error?.code === '23505') throw new PaymentAlreadyExistsError();
  if (error) throw new Error(`Erreur sauvegarde transaction: ${error.message}`);
  return data;
}

/**
 * Vérifie si une transaction existe déjà (anti-doublon)
 */
export async function checkDuplicatePayment(
  agencyId: string,
  locataireId: string,
  periode: string
): Promise<boolean> {
  const normalizedPeriod = periode.trim().toLowerCase();
  const { data: transactions, error: transactionError } = await supabaseAdmin
    .from('payment_transactions')
    .select('id, periode')
    .eq('agency_id', agencyId)
    .eq('locataire_id', locataireId)
    .eq('periode', periode)
    .in('status', ['pending', 'success'])
  if (transactionError) throw new Error(`Erreur vérification paiement en ligne: ${transactionError.message}`);
  if (transactions?.some((transaction) => transaction.periode.trim().toLowerCase() === normalizedPeriod)) {
    return true;
  }

  const { data: payments, error: paymentError } = await supabaseAdmin
    .from('payments')
    .select('periode, statut, verification_statut, deleted_at')
    .eq('agency_id', agencyId)
    .eq('locataire_id', locataireId)
    .eq('periode', periode)
    .is('deleted_at', null);
  if (paymentError) throw new Error(`Erreur vérification des paiements existants: ${paymentError.message}`);

  return !!payments?.some((payment) =>
    payment.periode.trim().toLowerCase() === normalizedPeriod &&
    payment.verification_statut !== 'rejete' &&
    (
      payment.verification_statut === 'en_attente' ||
      payment.statut === 'Payé' ||
      payment.statut === 'En attente'
    )
  );
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
  const { data: existingPayment, error: existingPaymentError } = await supabaseAdmin
    .from('payments')
    .select('ref, quittance_numero')
    .eq('agency_id', agencyId)
    .eq('reference_transaction', transactionId)
    .maybeSingle();

  if (existingPaymentError) {
    throw new Error(`Erreur vérification du paiement reçu: ${existingPaymentError.message}`);
  }
  if (existingPayment) {
    return { quittanceNumero: existingPayment.quittance_numero, ref: existingPayment.ref };
  }

  // Récupérer les infos du locataire
  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .select('nom, prenom, bien_id, proprietaire_id, loyer_mensuel')
    .eq('id', locataireId)
    .eq('agency_id', agencyId)
    .maybeSingle();

  if (tenantError) throw new Error(`Erreur récupération locataire: ${tenantError.message}`);
  if (!tenant) throw new Error('Locataire introuvable.');
  if (!tenant.bien_id) throw new Error('Le locataire n’est associé à aucun bien.');

  const { data: property, error: propertyError } = await supabaseAdmin
    .from('properties')
    .select('id, nom, proprietaire_id')
    .eq('id', tenant.bien_id)
    .eq('agency_id', agencyId)
    .maybeSingle();

  if (propertyError) throw new Error(`Erreur récupération bien: ${propertyError.message}`);
  if (!property) throw new Error('Bien du locataire introuvable.');

  const { data: contract, error: contractError } = await supabaseAdmin
    .from('contracts')
    .select('jour_echeance')
    .eq('agency_id', agencyId)
    .eq('locataire_id', locataireId)
    .eq('bien_id', property.id)
    .eq('statut', 'En cours')
    .order('date_debut', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (contractError) throw new Error(`Erreur récupération du bail: ${contractError.message}`);

  const agencySettings = await getAgencySettings(agencyId);
  const quittanceNumero = createDocumentNumber(agencySettings.prefix_quittance, 'QUI-');
  const ref = createDocumentNumber(agencySettings.prefix_paiement, `PAY-${provider}-`);
  const today = new Date().toISOString().split('T')[0];
  const dateEcheance = getPeriodDueDate(periode, Number(contract?.jour_echeance ?? 5));

  const { error } = await supabaseAdmin.from('payments').insert([{
    agency_id: agencyId,
    ref,
    quittance_numero: quittanceNumero,
    locataire_id: locataireId,
    locataire_nom: `${tenant.prenom} ${tenant.nom}`,
    bien_id: property.id,
    bien_nom: property.nom,
    proprietaire_id: property.proprietaire_id,
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
    date_paiement: today,
    date_echeance: dateEcheance,
    recu_par: `Automatique ${provider}`,
    observation: `Paiement en ligne confirmé (tx: ${transactionId})`,
  }]);

  if (error) throw new Error(`Erreur création paiement: ${error.message}`);
  return { quittanceNumero, ref };
}