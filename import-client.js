/**
 * Import Fital Immo — Client Data
 * Usage :
 *   node import-client.js test    → 5 proprio / 5 immeubles / 10 locataires / 50 produits
 *   node import-client.js full    → tout
 *
 * Prérequis : npm i @supabase/supabase-js xlsx dotenv
 */

import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import 'dotenv/config';
import fs from 'fs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MODE = process.argv[2] || 'test';
const LIMITS = MODE === 'test'
  ? { proprietaires: 5, immeubles: 5, locataires: 10, produits: 50 }
  : { proprietaires: Infinity, immeubles: Infinity, locataires: Infinity, produits: Infinity };

// ---------- Helpers ----------
const readSheet = (file) => {
  const wb = XLSX.readFile(file);
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });
};

const clean = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' || s === '0' || s === '/////' ? null : s;
};

const cleanPhone = (v) => {
  const s = clean(v);
  if (!s) return null;
  // garde le premier numéro
  const first = s.split(/[\/\-]/)[0].replace(/\s/g, '');
  return first.slice(0, 20);
};

const parseDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d)) return null;
  // rejette dates aberrantes
  if (d.getFullYear() < 2000 || d.getFullYear() > 2030) return null;
  return d.toISOString();
};

const periodFromRef = (ref) => {
  if (!ref || ref === 0) return null;
  const base = new Date(Date.UTC(2011, 0, 1)); // Ref 66 = 2011-01
  const d = new Date(base);
  d.setUTCMonth(d.getUTCMonth() + (Number(ref) - 66));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

const statutLocataire = (v) => {
  const s = (v || '').toLowerCase();
  if (s.includes('actuel')) return 'ACTIF';
  if (s.includes('ex')) return 'SORTI';
  return 'ACTIF';
};

// ---------- Chargement fichiers ----------
console.log(`\n📂 MODE: ${MODE.toUpperCase()}\n`);

const src = {
  proprietaires: readSheet('Propriétaires_Table.xlsx'),
  immeubles:    readSheet('Immeubles_Table.xlsx'),
  locataires:   readSheet('Locataires_Table.xlsx'),
  produits:     readSheet('Produit_Table.xlsx'),
};
console.log(`📊 Chargés : ${src.proprietaires.length} proprios | ${src.immeubles.length} immeubles | ${src.locataires.length} locataires | ${src.produits.length} produits\n`);

// ---------- 1. PROPRIÉTAIRES ----------
async function importProprietaires() {
  console.log('🏠 Import propriétaires...');
  const seen = new Set();
  const rows = [];

  for (const r of src.proprietaires) {
    const ref = Number(r.Ref_Propriétaire);
    if (!ref || seen.has(ref)) continue;
    const nom = clean(r.Nom_Propriétaire);
    if (!nom) continue; // ignore lignes vides
    seen.add(ref);

    rows.push({
      ref_externe: ref,
      nom: nom.slice(0, 100),
      prenom: clean(r.Prénom_Propriétaire)?.slice(0, 100) || null,
      adresse: clean(r.Adresse)?.slice(0, 255) || null,
      telephone: cleanPhone(r.Téléphone),
      email: clean(r.Email),
      statut: clean(r.Statut_Propriétaire)?.includes('arrêtée') ? 'INACTIF' : 'ACTIF',
      taux_commission: Number(r['Taux Commission Gérance']) || 10,
    });
    if (rows.length >= LIMITS.proprietaires) break;
  }

  // Propriétaire INCONNU pour orphelins
  rows.push({
    ref_externe: 0, nom: 'INCONNU', prenom: null, adresse: null,
    telephone: null, email: null, statut: 'ACTIF', taux_commission: 10
  });

  const { data, error } = await supabase
    .from('proprietaires')
    .upsert(rows, { onConflict: 'ref_externe' })
    .select('id, ref_externe');
  if (error) throw error;

  const map = new Map(data.map(d => [d.ref_externe, d.id]));
  console.log(`  ✅ ${data.length} propriétaires importés\n`);
  return map;
}

// ---------- 2. IMMEUBLES ----------
async function importImmeubles(propMap) {
  console.log('🏢 Import immeubles...');
  const seen = new Set();
  const rows = [];

  for (const r of src.immeubles) {
    const ref = Number(r.Ref_Immeuble);
    if (!ref || seen.has(ref)) continue;
    const nom = clean(r.Nom_Immeuble);
    const adresse = clean(r.Adresse);
    if (!nom && !adresse) continue; // ignore vides
    seen.add(ref);

    const refProp = Number(r.Ref_Propriétaire);
    const propId = propMap.get(refProp) || propMap.get(0);

    rows.push({
      ref_externe: ref,
      proprietaire_id: propId,
      type: clean(r.Type_Immeuble)?.slice(0, 50) || 'AUTRE',
      numero: clean(r['N°_Immeuble'])?.slice(0, 50) || null,
      nom: (nom || `Immeuble ${ref}`).slice(0, 150),
      adresse: adresse?.slice(0, 255) || 'Non renseignée',
      taux_commission: Number(r['Taux Com_Gérance']) || 10,
      actif: true,
    });
    if (rows.length >= LIMITS.immeubles) break;
  }

  const { data, error } = await supabase
    .from('immeubles')
    .upsert(rows, { onConflict: 'ref_externe' })
    .select('id, ref_externe');
  if (error) throw error;

  const map = new Map(data.map(d => [d.ref_externe, d.id]));
  console.log(`  ✅ ${data.length} immeubles importés\n`);
  return map;
}

// ---------- 3. LOCATAIRES ----------
async function importLocataires() {
  console.log('👤 Import locataires...');
  const byRef = new Map();

  for (const r of src.locataires) {
    const ref = Number(r.Ref_Locataire);
    if (!ref) continue;
    const nom = clean(r.Nom_Locataire);
    const prenom = clean(r.Prénom_Locataire);
    if (!nom && !prenom) continue; // ignore vides
    // ignore faux locataires (ETAGE, RDC, MAGASIN)
    const nomUp = (nom || '').toUpperCase();
    if (/^(ETAGE|RDC|\d+(ER|EME|ÈME)?\s*ETAGE|SUITE)/.test(nomUp)) continue;

    const statut = statutLocataire(r.Statut_Locataire);
    const existing = byRef.get(ref);
    // garde la version ACTIF si conflit
    if (existing && existing.statut === 'ACTIF' && statut === 'SORTI') continue;

    byRef.set(ref, {
      ref_externe: ref,
      nom: (nom || prenom || `Locataire ${ref}`).slice(0, 100),
      prenom: (nom ? prenom : null)?.slice(0, 100) || null,
      telephone: cleanPhone(r.Téléphone),
      email: clean(r.Email),
      statut,
      date_entree: parseDate(r.Date_Entrée),
      date_sortie: parseDate(r.Date_Sortie),
      observations: clean(r.Observation)?.slice(0, 500) || null,
    });
  }

  const rows = Array.from(byRef.values()).slice(0, LIMITS.locataires);

  const { data, error } = await supabase
    .from('locataires')
    .upsert(rows, { onConflict: 'ref_externe' })
    .select('id, ref_externe');
  if (error) throw error;

  const map = new Map(data.map(d => [d.ref_externe, d.id]));
  console.log(`  ✅ ${data.length} locataires importés (dédupliqués)\n`);
  return map;
}

// ---------- 4. PRODUITS / PAIEMENTS ----------
async function importProduits(immoMap) {
  console.log('💰 Import produits/paiements...');
  const rows = [];

  for (const r of src.produits) {
    const refImmo = Number(r.Réf_Immeuble);
    const montant = Number(r.Montant_produit);
    const libelle = clean(r.Produit);
    // ignore vides et montants nuls
    if (!refImmo || !montant || montant === 0) continue;
    if (!libelle) continue;

    const immoId = immoMap.get(refImmo);
    if (!immoId) continue; // orphelin → skip (pas de FK)

    rows.push({
      ref_externe: Number(r.Ref_Produit),
      immeuble_id: immoId,
      libelle: libelle.slice(0, 255),
      montant,
      periode: periodFromRef(Number(r.Ref_période)),
      date_operation: parseDate(r['Date Opération_produit']),
      observation: clean(r.Observation)?.slice(0, 500) || null,
    });
    if (rows.length >= LIMITS.produits) break;
  }

  const { data, error } = await supabase
    .from('produits')
    .upsert(rows, { onConflict: 'ref_externe' })
    .select('id');
  if (error) throw error;

  console.log(`  ✅ ${data.length} produits importés\n`);
}

// ---------- MAIN ----------
async function main() {
  try {
    const propMap = await importProprietaires();
    const immoMap = await importImmeubles(propMap);
    await importLocataires();
    await importProduits(immoMap);

    console.log('═══════════════════════════════════════');
    console.log('✅ IMPORT TERMINÉ');
    console.log(`   Mode : ${MODE}`);
    console.log('═══════════════════════════════════════\n');
  } catch (e) {
    console.error('\n❌ ERREUR IMPORT :', e.message);
    if (e.details) console.error('Détails :', e.details);
    process.exit(1);
  }
}

main();