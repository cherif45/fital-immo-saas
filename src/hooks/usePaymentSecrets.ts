import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase/client";

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

export type PaymentSecretsConfigured = Record<keyof PaymentSecrets, boolean>;

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

const EMPTY_CONFIGURED: PaymentSecretsConfigured = {
  waveApiKey: false,
  waveWebhookSecret: false,
  orangeMoneyApiKey: false,
  orangeMoneyMerchantId: false,
  paydunyaMasterKey: false,
  paydunyaPrivateKey: false,
  paydunyaPublicKey: false,
  paydunyaToken: false,
};

interface UsePaymentSecretsOptions {
  agencyId: string | undefined;
}

interface UsePaymentSecretsResult {
  secrets: PaymentSecrets;
  configured: PaymentSecretsConfigured;
  loading: boolean;
  saving: boolean;
  error: string | null;
  canManage: boolean;
  update: (patch: PaymentSecretsPatch) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function usePaymentSecrets({
  agencyId,
}: UsePaymentSecretsOptions): UsePaymentSecretsResult {
  const [secrets, setSecrets] = useState<PaymentSecrets>(EMPTY_SECRETS);
  const [configured, setConfigured] =
    useState<PaymentSecretsConfigured>(EMPTY_CONFIGURED);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);

  const request = useCallback(
    async (method: "GET" | "POST", patch?: PaymentSecretsPatch) => {
      if (!supabase || !agencyId) {
        throw new Error("Agence ou connexion Supabase introuvable.");
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Session expirée. Reconnectez-vous.");
      }

      const response = await fetch(
        `/api/admin/payment-settings?agencyId=${encodeURIComponent(agencyId)}`,
        {
          method,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          ...(method === "POST"
            ? {
                body: JSON.stringify({
                  agencyId,
                  ...(patch ?? {}),
                }),
              }
            : {}),
        },
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : "Erreur de communication avec le serveur.",
        );
      }

      return result;
    },
    [agencyId],
  );

  const refresh = useCallback(async () => {
    if (!agencyId) {
      setSecrets(EMPTY_SECRETS);
      setConfigured(EMPTY_CONFIGURED);
      setCanManage(false);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await request("GET");

      setConfigured({
        ...EMPTY_CONFIGURED,
        ...(result.configured ?? {}),
      });

      // Les clés secrètes ne sont jamais renvoyées au navigateur.
      setSecrets(EMPTY_SECRETS);

      // Le GET a été accepté par l'API qui vérifie les autorisations.
      setCanManage(true);
    } catch (e) {
      setConfigured(EMPTY_CONFIGURED);
      setSecrets(EMPTY_SECRETS);
      setCanManage(false);

      setError(
        e instanceof Error
          ? e.message
          : "Erreur de chargement des paramètres de paiement.",
      );
    } finally {
      setLoading(false);
    }
  }, [agencyId, request]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const update = useCallback(
    async (patch: PaymentSecretsPatch): Promise<boolean> => {
      if (!canManage) {
        setError("Vous n'avez pas la permission de modifier ces paramètres.");
        return false;
      }

      if (!agencyId) {
        setError("Agence introuvable.");
        return false;
      }

      setSaving(true);
      setError(null);

      try {
        await request("POST", patch);

        await refresh();

        return true;
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Erreur de sauvegarde des clés.",
        );

        return false;
      } finally {
        setSaving(false);
      }
    },
    [agencyId, canManage, request, refresh],
  );

  return {
    secrets,
    configured,
    loading,
    saving,
    error,
    canManage,
    update,
    refresh,
  };
}
