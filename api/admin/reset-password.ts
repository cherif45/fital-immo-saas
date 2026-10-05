// ============================================================
// API - Reinitialisation de mot de passe par le Super Admin
// Route : POST /api/admin/reset-password
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId manquant' });
    }

    // 1. Recuperer l'utilisateur pour avoir son email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, nom, prenom')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
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
      message: 'Email de reinitialisation envoye',
    });
  } catch (err: any) {
    console.error('Erreur reset-password:', err);
    return res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
}
