import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Récupération sécurisée des variables d'environnement (Vite client + Vercel build / SSR)
const getEnvVar = (key: string): string => {
  const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  if (metaEnv && typeof metaEnv[key] === 'string') {
    return metaEnv[key]!.trim();
  }
  if (typeof process !== 'undefined' && process.env && typeof process.env[key] === 'string') {
    return process.env[key]!.trim();
  }
  return '';
};

const rawUrl = getEnvVar('VITE_SUPABASE_URL');
const rawAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Sécurité SSL / TLS : forcer HTTPS si non spécifié
const sanitizeUrl = (url: string): string => {
  if (!url) return '';
  let cleaned = url.replace(/\/+$/, '');
  if (cleaned.startsWith('http://') && !cleaned.includes('localhost')) {
    cleaned = cleaned.replace('http://', 'https://');
  }
  return cleaned;
};

export const supabaseUrl = sanitizeUrl(rawUrl);
export const supabaseAnonKey = rawAnonKey;

// Validation stricte de la configuration
export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('votre-projet') &&
  !supabaseUrl.includes('xyzcompany') &&
  supabaseAnonKey !== 'votre_cle_anon_publique_supabase' &&
  supabaseAnonKey !== 'eyJhbGciOi...' &&
  supabaseAnonKey.length > 15
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          'x-client-info': 'fital-immo-web/1.0.0',
        },
      },
    })
  : null;

/**
 * Résultat du diagnostic automatique de connexion Supabase
 */
export interface SupabaseHealthCheckResult {
  connected: boolean;
  status: 'connected' | 'error' | 'unconfigured';
  message: string;
  url: string;
  sslActive: boolean;
  latencyMs?: number;
  details?: string;
  missingTables?: boolean;
}

/**
 * Test automatique de la connexion à la base Supabase.
 * Vérifie :
 *  1. La présence et validité des variables d'environnement (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
 *  2. L'activation du protocole sécurisé SSL/TLS (HTTPS)
 *  3. L'accessibilité du service Auth
 *  4. La présence des tables relationnelles (ex: agencies)
 */
export async function testSupabaseConnection(): Promise<SupabaseHealthCheckResult> {
  const sslActive = supabaseUrl.startsWith('https://');

  if (!isSupabaseConfigured || !supabase) {
    return {
      connected: false,
      status: 'unconfigured',
      url: supabaseUrl || 'Non définie',
      sslActive,
      message: 'Base non configurée. Les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont manquantes ou incomplètes dans .env.local ou sur Vercel.',
      details: 'Renseignez les variables d’environnement dans les paramètres de votre projet Vercel (Settings > Environment Variables) ou dans votre fichier .env.local.',
    };
  }

  const startTime = performance.now();

  try {
    // 1. Tester l'endpoint Auth (léger, ne dépend pas encore des tables SQL)
    const { error: authPingError } = await supabase.auth.getSession();
    if (authPingError) {
      throw new Error(`Erreur API Auth Supabase : ${authPingError.message}`);
    }

    // 2. Tester l'accès à la table principale 'agencies'
    const { data: testData, error: dbError } = await supabase
      .from('agencies')
      .select('id, name')
      .limit(1);

    const latencyMs = Math.round(performance.now() - startTime);

    if (dbError) {
      // Cas où le projet Supabase répond mais le script SQL n'a pas été exécuté
      if (dbError.code === '42P01' || dbError.message?.toLowerCase().includes('does not exist') || dbError.message?.includes('relation "public.agencies"')) {
        return {
          connected: false,
          status: 'error',
          url: supabaseUrl,
          sslActive,
          latencyMs,
          missingTables: true,
          message: 'Serveur Supabase connecté, mais les tables relationnelles sont absentes.',
          details: 'Veuillez exécuter le script "supabase/schema.sql" dans l’éditeur SQL de Supabase (SQL Editor > New Query > Coller > Run) pour créer les tables et règles RLS.',
        };
      }

      // Erreur de permission ou autre
      return {
        connected: false,
        status: 'error',
        url: supabaseUrl,
        sslActive,
        latencyMs,
        message: `Erreur d'accès à la base de données : ${dbError.message}`,
        details: dbError.hint || dbError.details || `Code erreur: ${dbError.code}`,
      };
    }

    return {
      connected: true,
      status: 'connected',
      url: supabaseUrl,
      sslActive,
      latencyMs,
      message: `Connexion Supabase établie avec succès (Latence : ${latencyMs} ms).`,
      details: `SSL/TLS vérifié • Table "agencies" accessible • Auth initialisé (${testData?.length ?? 0} agence trouvée).`,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      connected: false,
      status: 'error',
      url: supabaseUrl,
      sslActive,
      latencyMs,
      message: 'Échec de connexion au serveur Supabase.',
      details: err.message || 'Vérifiez votre connexion réseau et la validité de la clé anon.',
    };
  }
}

/**
 * Storage Helper UI uniquement (thème, navigation, etc.)
 * RÈGLE ABSOLUE : Aucune donnée métier sensible ne doit être stockée dans localStorage.
 */
const UI_STORAGE_PREFIX = 'fital_immo_ui_';

export function getUiPreference<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(UI_STORAGE_PREFIX + key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn(`Erreur lecture préférence UI ${key}:`, e);
  }
  return defaultValue;
}

export function saveUiPreference<T>(key: string, value: T): void {
  try {
    localStorage.setItem(UI_STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error(`Erreur sauvegarde préférence UI ${key}:`, e);
  }
}
