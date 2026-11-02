import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../_lib/supabaseAdmin.js";
import { encryptPaymentSecret } from "../_lib/paymentSecretsCrypto.js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";

const anonKey =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

const SECRET_FIELDS = {
  waveApiKey: "wave_api_key",
  waveWebhookSecret: "wave_webhook_secret",
  orangeMoneyApiKey: "orange_money_api_key",
  orangeMoneyMerchantId: "orange_money_merchant_id",
  paydunyaMasterKey: "paydunya_master_key",
  paydunyaPrivateKey: "paydunya_private_key",
  paydunyaPublicKey: "paydunya_public_key",
  paydunyaToken: "paydunya_token",
} as const;

const ALLOWED_ROLES = ["SUPER_ADMIN_SAAS", "SUPER_ADMIN", "ADMIN"];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("Vary", "Authorization");

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
    return res.status(204).end();
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  try {
    const rawAuthorization = req.headers.authorization;
    const authorization = Array.isArray(rawAuthorization)
      ? rawAuthorization[0] || ""
      : rawAuthorization || "";

    const token = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";

    if (!token || !supabaseUrl || !anonKey) {
      return res.status(401).json({ error: "Authentification requise." });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data: authData, error: authError } =
      await authClient.auth.getUser(token);

    if (authError || !authData.user) {
      return res.status(401).json({ error: "Session invalide ou expirée." });
    }

    const { data: caller, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, agency_id, role, statut")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (
      profileError ||
      !caller ||
      caller.statut !== "actif" ||
      !ALLOWED_ROLES.includes(caller.role)
    ) {
      return res.status(403).json({ error: "Permission refusée." });
    }

    const body =
      req.method === "POST" &&
      req.body &&
      typeof req.body === "object" &&
      !Array.isArray(req.body)
        ? (req.body as Record<string, unknown>)
        : {};

    const queryAgencyId = req.query.agencyId;
    const agencyId =
      typeof queryAgencyId === "string"
        ? queryAgencyId
        : typeof body.agencyId === "string"
          ? body.agencyId
          : "";

    if (!agencyId) {
      return res.status(400).json({
        error: "Identifiant de l’agence manquant.",
      });
    }

    if (caller.role !== "SUPER_ADMIN_SAAS" && caller.agency_id !== agencyId) {
      return res.status(403).json({
        error: "Accès interdit à cette agence.",
      });
    }

    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("agency_payment_secrets")
        .select(
          "wave_api_key, wave_webhook_secret, orange_money_api_key, orange_money_merchant_id, paydunya_master_key, paydunya_private_key, paydunya_public_key, paydunya_token",
        )
        .eq("agency_id", agencyId)
        .maybeSingle();

      if (error) {
        return res.status(500).json({
          error: "Impossible de lire la configuration des paiements.",
        });
      }

      return res.status(200).json({
        success: true,
        configured: {
          waveApiKey: !!data?.wave_api_key,
          waveWebhookSecret: !!data?.wave_webhook_secret,
          orangeMoneyApiKey: !!data?.orange_money_api_key,
          orangeMoneyMerchantId: !!data?.orange_money_merchant_id,
          paydunyaMasterKey: !!data?.paydunya_master_key,
          paydunyaPrivateKey: !!data?.paydunya_private_key,
          paydunyaPublicKey: !!data?.paydunya_public_key,
          paydunyaToken: !!data?.paydunya_token,
        },
      });
    }

    const patch: Record<string, string> = {};

    for (const [frontendName, databaseName] of Object.entries(SECRET_FIELDS)) {
      const value = body[frontendName];

      // Un champ vide signifie : conserver l'ancienne valeur.
      if (value === undefined || value === null || value === "") {
        continue;
      }

      if (typeof value !== "string" || value.length > 10000) {
        return res.status(400).json({
          error: `Valeur invalide pour ${frontendName}.`,
        });
      }

      const trimmedValue = value.trim();
      if (!trimmedValue) continue;

      patch[databaseName] = encryptPaymentSecret(trimmedValue);
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({
        error: "Aucune nouvelle clé valide à enregistrer.",
      });
    }

    // Lire d'abord la ligne afin de préserver les autres clés.
    const { data: existing, error: readError } = await supabaseAdmin
      .from("agency_payment_secrets")
      .select("agency_id")
      .eq("agency_id", agencyId)
      .maybeSingle();

    if (readError) {
      return res.status(500).json({
        error: "Impossible de vérifier la configuration existante.",
      });
    }

    const saveResult = existing
      ? await supabaseAdmin
          .from("agency_payment_secrets")
          .update({
            ...patch,
            updated_at: new Date().toISOString(),
          })
          .eq("agency_id", agencyId)
      : await supabaseAdmin.from("agency_payment_secrets").insert({
          agency_id: agencyId,
          ...patch,
          updated_at: new Date().toISOString(),
        });

    if (saveResult.error) {
      return res.status(500).json({
        error: "Impossible de sauvegarder les clés de paiement.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Configuration enregistrée.",
    });
  } catch (error) {
    console.error(
      "Erreur API payment-settings:",
      error instanceof Error ? error.message : "Erreur inconnue",
    );

    return res.status(500).json({
      error: "Erreur interne du serveur.",
    });
  }
}
