// ============================================================
// HOOK — Gestion des secrets de paiement (Wave, OM, PayDunya)
// ============================================================
// ⚠️ SÉCURITÉ : Ce hook ne doit être appelé QUE par des écrans
// accessibles aux rôles ADMIN / SUPER_ADMIN_SAAS.
// La RLS Supabase bloque tout autre rôle côté DB.
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase/client";
import { UserAccount, UserRole } from "../types";

// ---------- TYPES ----------

export interface PaymentSecrets {
  waveApiKey: string;
  waveWebhookSecret: string;
  orangeMoneyApiKey: string;
  orangeMoneyMerchantId: string;
  paydunyaMasterKey: string;
  paydunyaPrivateKey: string;
  paydunyaPublicKey: string;
  paydunyaToken: string;
}

export type PaymentSecretsPatch = Partial<PaymentSecrets>;

const EMPTY_SECRETS: PaymentSecrets = {
  waveApiKey: "",
  waveWebhookSecret: "",
  orangeMoneyApiKey: "",
  orangeMoneyMerchantId: "",
  paydunyaMasterKey: "",
  paydunyaPrivateKey: "",
  paydunyaPublicKey: "",
  paydunyaToken: "",
};

// Rôles autorisés à voir/modifier les secrets
const ALLOWED_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN_SAAS", "SUPER_ADMIN"];

// ---------- MAPPING DB <-> API ----------

interface DbPaymentSecrets {
  wave_api_key: string | null;
  wave_webhook_secret: string | null;
  orange_money_api_key: string | null;
  orange_money_merchant_id: string | null;
  paydunya_master_key: string | null;
  paydunya_private_key: string | null;
  paydunya_public_key: string | null;
  paydunya_token: string | null;
}

function fromDb(row: DbPaymentSecrets | null): PaymentSecrets {
  if (!row) return EMPTY_SECRETS;
  return {
    waveApiKey: row.wave_api_key ?? "",
    waveWebhookSecret: row.wave_webhook_secret ?? "",
    orangeMoneyApiKey: row.orange_money_api_key ?? "",
    orangeMoneyMerchantId: row.orange_money_merchant_id ?? "",
    paydunyaMasterKey: row.paydunya_master_key ?? "",
    paydunyaPrivateKey: row.paydunya_private_key ?? "",
    paydunyaPublicKey: row.paydunya_public_key ?? "",
    paydunyaToken: row.paydunya_token ?? "",
  };
}

function toDb(patch: PaymentSecretsPatch): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  if (patch.waveApiKey !== undefined)
    out.wave_api_key = patch.waveApiKey || null;
  if (patch.waveWebhookSecret !== undefined)
    out.wave_webhook_secret = patch.waveWebhookSecret || null;
  if (patch.orangeMoneyApiKey !== undefined)
    out.orange_money_api_key = patch.orangeMoneyApiKey || null;
  if (patch.orangeMoneyMerchantId !== undefined)
    out.orange_money_merchant_id = patch.orangeMoneyMerchantId || null;
  if (patch.paydunyaMasterKey !== undefined)
    out.paydunya_master_key = patch.paydunyaMasterKey || null;
  if (patch.paydunyaPrivateKey !== undefined)
    out.paydunya_private_key = patch.paydunyaPrivateKey || null;
  if (patch.paydunyaPublicKey !== undefined)
    out.paydunya_public_key = patch.paydunyaPublicKey || null;
  if (patch.paydunyaToken !== undefined)
    out.paydunya_token = patch.paydunyaToken || null;
  return out;
}

// ---------- HOOK ----------

interface UsePaymentSecretsOptions {
  agencyId: string | undefined;
  currentUser: UserAccount | null;
}

interface UsePaymentSecretsResult {
  secrets: PaymentSecrets;
  loading: boolean;
  saving: boolean;
  error: string | null;
  canManage: boolean;
  update: (patch: PaymentSecretsPatch) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function usePaymentSecrets({
  agencyId,
  currentUser,
}: UsePaymentSecretsOptions): UsePaymentSecretsResult {
  const [secrets, setSecrets] = useState<PaymentSecrets>(EMPTY_SECRETS);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = !!currentUser && ALLOWED_ROLES.includes(currentUser.role);

  // ---------- LOAD ----------
  const load = useCallback(
    async (force = false) => {
      if (!agencyId || !supabase || !canManage) {
        setSecrets(EMPTY_SECRETS);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from("agency_payment_secrets")
          .select(
            "wave_api_key, wave_webhook_secret, orange_money_api_key, orange_money_merchant_id, paydunya_master_key, paydunya_private_key, paydunya_public_key, paydunya_token",
          )
          .eq("agency_id", agencyId)
          .maybeSingle();

        if (fetchError) {
          setError(fetchError.message);
          setSecrets(EMPTY_SECRETS);
          setLoading(false);
          return;
        }

        setSecrets(fromDb(data as DbPaymentSecrets | null));
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Erreur de chargement des secrets",
        );
        setSecrets(EMPTY_SECRETS);
      } finally {
        setLoading(false);
      }
    },
    [agencyId, canManage],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // ---------- UPDATE ----------
  const update = useCallback(
    async (patch: PaymentSecretsPatch): Promise<boolean> => {
      if (!canManage) {
        setError("Vous n'avez pas la permission de modifier ces paramètres.");
        return false;
      }
      if (!agencyId || !supabase) {
        setError("Agence introuvable.");
        return false;
      }

      setSaving(true);
      setError(null);

      try {
        const dbPatch = toDb(patch);
        const { error: upsertError } = await supabase
          .from("agency_payment_secrets")
          .upsert(
            { agency_id: agencyId, ...dbPatch },
            { onConflict: "agency_id" },
          );

        if (upsertError) {
          setError(upsertError.message);
          setSaving(false);
          return false;
        }

        // Mettre à jour l'état local
        setSecrets((prev) => ({ ...prev, ...patch }));
        setSaving(false);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur de sauvegarde");
        setSaving(false);
        return false;
      }
    },
    [agencyId, canManage],
  );

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  return { secrets, loading, saving, error, canManage, update, refresh };
}
