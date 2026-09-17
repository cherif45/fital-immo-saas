/**
 * Bootstrap FITAL-IMMO sur Supabase :
 * - Crée l'agence FITAL-IMMO
 * - Crée les 6 comptes démo dans Auth + profiles
 * - Exécutable : node scripts/bootstrap-supabase.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnvFile(filename) {
  const path = resolve(root, filename);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env.production');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('❌ VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY requis dans .env.local');
  process.exit(1);
}

const DEMO_USERS = [
  { email: 'admin@fital-immo.sn', password: 'Admin2026!', nom: 'DIOP', prenom: 'Mamadou', telephone: '+221 77 123 45 67', role: 'ADMIN', permissions: ['*'] },
  { email: 'gestionnaire@fital-immo.sn', password: 'Gestion2026!', nom: 'FALL', prenom: 'Fatou', telephone: '+221 77 234 56 78', role: 'GESTIONNAIRE', permissions: ['biens.manage', 'locataires.manage', 'proprietaires.manage', 'contrats.manage', 'etats_lieux.manage', 'relances.manage', 'travaux.manage'] },
  { email: 'caisse@fital-immo.sn', password: 'Caisse2026!', nom: 'SOW', prenom: 'Ibrahima', telephone: '+221 77 345 67 89', role: 'CAISSIER', permissions: ['paiements.create', 'caisse.manage', 'caisse.cloture', 'quittances.generate', 'reversements.view'] },
  { email: 'proprietaire@fital-immo.sn', password: 'Proprio2026!', nom: 'NDIAYE', prenom: 'El Hadji', telephone: '+221 77 456 78 90', role: 'PROPRIETAIRE', permissions: ['proprio.read_own_data'] },
  { email: 'locataire@fital-immo.sn', password: 'Locataire2026!', nom: 'BA', prenom: 'Aissatou', telephone: '+221 77 567 89 01', role: 'LOCATAIRE', permissions: ['locataire.read_own_data', 'locataire.download_quittance'] },
  { email: 'agent@fital-immo.sn', password: 'Agent2026!', nom: 'GUEYE', prenom: 'Omar', telephone: '+221 77 678 90 12', role: 'AGENT', permissions: ['etats_lieux.manage', 'travaux.manage'] },
];

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY || ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const userClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

async function ensureAuthUser(email, password, metadata = {}) {
  if (SERVICE_KEY) {
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) {
      if (error.message?.includes('already been registered') || error.message?.includes('already exists')) {
        const { data: list } = await adminClient.auth.admin.listUsers();
        const found = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (found) return { userId: found.id, created: false };
      } else {
        throw new Error(`Auth admin createUser(${email}): ${error.message}`);
      }
    } else if (data?.user) {
      return { userId: data.user.id, created: true };
    }
  }

  const ephemeral = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: signUpData, error: signUpError } = await ephemeral.auth.signUp({
    email,
    password,
    options: { data: metadata },
  });

  if (signUpData?.user?.id) {
    return { userId: signUpData.user.id, created: true };
  }

  if (signUpError?.message?.includes('already registered') || signUpError?.message?.includes('already exists')) {
    const { data: signInData, error: signInError } = await ephemeral.auth.signInWithPassword({ email, password });
    if (signInError) throw new Error(`Compte existant mais connexion impossible (${email}): ${signInError.message}`);
    return { userId: signInData.user.id, created: false };
  }

  throw new Error(`signUp(${email}): ${signUpError?.message || 'Utilisateur non créé — activez « Confirm email » OFF dans Supabase Auth'}`);
}

async function ensureAgency() {
  const { data: existing, error } = await adminClient.from('agencies').select('*').eq('slug', 'fital-immo').maybeSingle();
  if (error && error.code !== 'PGRST116') throw new Error(`Lecture agencies: ${error.message}`);
  if (existing) return existing;

  const { data: created, error: insertError } = await adminClient.from('agencies').insert([{
    name: 'FITAL-IMMO',
    slug: 'fital-immo',
    email: 'contact@fital-immo.sn',
    phone: '+221 33 820 00 00',
    address: 'Avenue Cheikh Anta Diop, Dakar',
    city: 'Dakar',
    country: 'Sénégal',
    ninea: '008920194 2V8',
    status: 'active',
  }]).select().single();

  if (insertError) {
    const { data: retry } = await adminClient.from('agencies').select('*').limit(1).maybeSingle();
    if (retry) return retry;
    throw new Error(`Création agence: ${insertError.message}`);
  }
  return created;
}

async function ensureProfile(userId, agencyId, user) {
  const { data: existing } = await adminClient.from('profiles').select('id').eq('id', userId).maybeSingle();
  if (existing) {
    console.log(`  ✓ Profil existant : ${user.email}`);
    return;
  }

  const { error } = await adminClient.from('profiles').insert([{
    id: userId,
    agency_id: agencyId,
    email: user.email,
    nom: user.nom,
    prenom: user.prenom,
    telephone: user.telephone,
    role: user.role,
    statut: 'actif',
    permissions: user.permissions,
  }]);

  if (error) {
    throw new Error(`Profil ${user.email}: ${error.message}\n→ Exécutez supabase/migrations/20260916_profiles_insert_and_bootstrap.sql dans Supabase SQL Editor`);
  }
  console.log(`  ✓ Profil créé : ${user.email} (${user.role})`);
}

async function runSqlMigrationViaRpc() {
  // Tente d'appliquer les policies via service role (insert direct impossible sans SQL)
  return false;
}

async function bootstrapWithAdminSession() {
  const admin = DEMO_USERS[0];
  const { data: signIn, error } = await userClient.auth.signInWithPassword({
    email: admin.email,
    password: admin.password,
  });
  if (error) throw new Error(`Connexion admin: ${error.message}`);

  let agency = await ensureAgency();
  if (!agency) {
    const { data: created, error: agencyErr } = await userClient.from('agencies').insert([{
      name: 'FITAL-IMMO', slug: 'fital-immo', email: 'contact@fital-immo.sn', phone: '+221 33 820 00 00',
      address: 'Avenue Cheikh Anta Diop, Dakar', city: 'Dakar', country: 'Sénégal', status: 'active',
    }]).select().single();
    if (agencyErr) throw new Error(`Agence (session admin): ${agencyErr.message}`);
    agency = created;
  }

  const uid = signIn.user.id;
  const { data: prof } = await userClient.from('profiles').select('id').eq('id', uid).maybeSingle();
  if (!prof) {
    const { error: profErr } = await userClient.from('profiles').insert([{
      id: uid, agency_id: agency.id, email: admin.email, nom: admin.nom, prenom: admin.prenom,
      telephone: admin.telephone, role: admin.role, statut: 'actif', permissions: admin.permissions,
    }]);
    if (profErr) throw new Error(`Profil admin: ${profErr.message}`);
    console.log(`  ✓ Profil admin créé`);
  }

  for (const u of DEMO_USERS.slice(1)) {
    const { userId } = await ensureAuthUser(u.email, u.password, { nom: u.nom, prenom: u.prenom, role: u.role });
    await ensureProfile(userId, agency.id, u);
  }

  return agency;
}

async function main() {
  console.log('\n🚀 Bootstrap FITAL-IMMO → Supabase');
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log(`   Mode: ${SERVICE_KEY ? 'Service Role (complet)' : 'Anon Key (limité)'}\n`);

  const { data: health } = await adminClient.from('agencies').select('id').limit(1);
  if (health === null) {
    console.error('❌ Table agencies inaccessible. Exécutez d\'abord supabase/schema.sql dans Supabase SQL Editor.');
    process.exit(1);
  }

  let agency;

  if (SERVICE_KEY) {
    agency = await ensureAgency();
    console.log(`✓ Agence : ${agency.name} (${agency.id})\n`);

    for (const u of DEMO_USERS) {
      console.log(`→ ${u.email}`);
      const { userId } = await ensureAuthUser(u.email, u.password, { nom: u.nom, prenom: u.prenom, role: u.role });
      await ensureProfile(userId, agency.id, u);
    }
  } else {
    console.log('⚠ Pas de SUPABASE_SERVICE_ROLE_KEY — bootstrap via session admin...\n');
    agency = await bootstrapWithAdminSession();
  }

  const { count } = await adminClient.from('profiles').select('*', { count: 'exact', head: true });
  console.log(`\n✅ Terminé — ${count ?? '?'} profils dans Supabase`);
  console.log('\nComptes disponibles partout (y compris sur Vercel) :');
  for (const u of DEMO_USERS) {
    console.log(`   ${u.email} / ${u.password} (${u.role})`);
  }
  console.log('');
}

main().catch((err) => {
  console.error('\n❌', err.message || err);
  process.exit(1);
});
