// ============================================================
// API - Reinitialisation de mot de passe par le Super Admin
// Route : POST /api/admin/reset-password
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const rawAuthorization = req.headers.authorization;
    const authorization = Array.isArray(rawAuthorization) ? (rawAuthorization[0] || '') : (rawAuthorization || '');
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    if (!token || !supabaseUrl || !anonKey) return res.status(401).json({ error: 'Authentification requise.' });
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) return res.status(401).json({ error: 'Session invalide.' });
    const { data: caller } = await supabaseAdmin.from('profiles').select('id, agency_id, role, statut').eq('id', authData.user.id).maybeSingle();
    if (!caller || caller.statut !== 'actif' || !['SUPER_ADMIN_SAAS', 'SUPER_ADMIN', 'ADMIN'].includes(caller.role)) {
      return res.status(403).json({ error: 'Permission refusée.' });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId manquant' });
    }

    // 1. Recuperer l'utilisateur pour avoir son email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, nom, prenom, agency_id')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    if (caller.role !== 'SUPER_ADMIN_SAAS' && profile.agency_id !== caller.agency_id) {
      return res.status(403).json({ error: 'Utilisateur hors de votre agence.' });
    }

    if (!profile.email) {
      return res.status(400).json({ error: 'Email utilisateur manquant' });
    }

    // 2. Envoyer un email de reinitialisation via Supabase Auth
    const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: profile.email,
      options: {
        redirectTo: 'https://fital-immo-gestion-locative-loyers-wine.vercel.app/reset-password',
      },
    });

    if (resetError) {
      console.error('reset-password error:', resetError);
      return res.status(500).json({ error: resetError.message });
    }

    return res.status(200).json({
      success: true,
      email: profile.email,
      message: 'Demande de réinitialisation traitée.',
    });
  } catch (err: any) {
    console.error('Erreur reset-password:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
}
