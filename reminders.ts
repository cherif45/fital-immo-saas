// Vercel Cron Job — Envoi automatique des rappels de loyer
// Déclenché tous les jours à 9h (voir vercel.json)
// Vérifie si on est entre le 25 et le 28 du mois → envoie les rappels

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const CRON_SECRET = process.env.CRON_SECRET || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Sécurité : Vercel envoie un header Authorization avec le CRON_SECRET
  const authHeader = req.headers.authorization || '';
  const expectedAuth = `Bearer ${CRON_SECRET}`;
  
  if (CRON_SECRET && authHeader !== expectedAuth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const today = new Date();
    const day = today.getDate();

    // Fenêtre d'envoi : 25-28 du mois
    const MIN_DAY = 25;
    const MAX_DAY = 28;

    if (day < MIN_DAY || day > MAX_DAY) {
      return res.status(200).json({
        skipped: true,
        reason: `Hors fenêtre d'envoi (jour actuel: ${day}, fenêtre: ${MIN_DAY}-${MAX_DAY})`,
        timestamp: today.toISOString(),
      });
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(500).json({ error: 'Supabase non configuré' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // 1. Récupérer les agences actives
    const { data: agencies, error: agenciesError } = await supabase
      .from('agencies')
      .select('id, name');

    if (agenciesError || !agencies) {
      throw new Error(`Erreur lecture agences: ${agenciesError?.message}`);
    }

    const moisActuel = today.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    const results: any[] = [];

    for (const agency of agencies) {
      // 2. Récupérer les locataires actifs
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, nom, prenom, telephone, bien_id, loyer_mensuel, agency_id')
        .eq('agency_id', agency.id)
        .is('date_sortie', null);

      if (!tenants || tenants.length === 0) continue;

      // 3. Récupérer les paiements du mois
      const { data: payments } = await supabase
        .from('payments')
        .select('locataire_id, periode, montant_paye, montant_total, statut')
        .eq('agency_id', agency.id)
        .ilike('periode', moisActuel);

      const paiementsParLocataire = new Map<string, any>();
      (payments || []).forEach((p: any) => {
        paiementsParLocataire.set(p.locataire_id, p);
      });

      // 4. Identifier les impayés
      const impayes = tenants.filter((t: any) => {
        const paiement = paiementsParLocataire.get(t.id);
        if (!paiement) return true;
        if (paiement.statut === 'Payé') return false;
        return (paiement.montant_paye || 0) < (paiement.montant_total || 0);
      });

      if (impayes.length === 0) {
        results.push({ agency: agency.name, skipped: 'aucun impayé' });
        continue;
      }

      // 5. Enregistrer les rappels dans la DB (activité + notification)
      const reminderRecords = impayes.map((t: any) => ({
        agency_id: agency.id,
        locataire_id: t.id,
        locataire_nom: `${t.prenom} ${t.nom}`,
        telephone: t.telephone,
        montant_du: t.loyer_mensuel || 0,
        jours_retard: 0,
        date_envoi: today.toISOString().split('T')[0],
        canal: 'WhatsApp',
        niveau: 'Niveau 1',
        message: `Rappel automatique : votre loyer de ${moisActuel} est à régler avant la fin du mois. Merci. - FITAL-IMMO`,
        statut: 'En attente d\'envoi',
      }));

      const { error: insertError } = await supabase
        .from('tenant_reminders')
        .insert(reminderRecords);

      if (insertError) {
        console.warn('Erreur insert rappels:', insertError);
      }

      results.push({
        agency: agency.name,
        impayes: impayes.length,
        rappels_crees: reminderRecords.length,
      });
    }

    return res.status(200).json({
      success: true,
      date: today.toISOString(),
      mois: moisActuel,
      results,
    });
  } catch (err: any) {
    console.error('Erreur cron reminders:', err);
    return res.status(500).json({
      error: err?.message || 'Erreur inconnue',
    });
  }
}