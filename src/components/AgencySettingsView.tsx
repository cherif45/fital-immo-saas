import React, { useState } from "react";
import {
  Upload,
  Save,
  Building2,
  User,
  FileText,
  Palette,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";

import { useAgencySettings } from "../hooks/useAgencySettings";
import {
  usePaymentSecrets,
  PaymentSecretsPatch,
  PaymentSecretsConfigured,
} from "../hooks/usePaymentSecrets";

import { AgencyAssetType, compressImage } from "../lib/supabase/storage";

import { supabase } from "../lib/supabase/client";

interface AgencySettingsViewProps {
  agencyId: string;
}

type Tab = "infos" | "gerant" | "documents" | "preferences" | "paiements";

export const AgencySettingsView: React.FC<AgencySettingsViewProps> = ({
  agencyId,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("infos");

  const { settings, loading, error, updateSettings, uploadAsset } =
    useAgencySettings(agencyId);

  const {
    configured,
    loading: paymentLoading,
    saving: paymentSaving,
    error: paymentError,
    canManage: canManagePayments,
    update: updatePaymentSecrets,
    refresh: refreshPaymentSecrets,
  } = usePaymentSecrets({ agencyId });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [agencySlug, setAgencySlug] = useState<string | null>(null);
  const [agencyLinkError, setAgencyLinkError] = useState<string | null>(null);

  const [paymentDraft, setPaymentDraft] = useState<PaymentSecretsPatch>({});

  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>(
    {},
  );

  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const loadAgencySlug = async () => {
      if (!supabase) {
        setAgencyLinkError("Supabase non configuré.");
        return;
      }

      const { data, error: slugError } = await supabase
        .from("agencies")
        .select("slug")
        .eq("id", agencyId)
        .maybeSingle();

      if (cancelled) return;

      if (slugError) {
        setAgencyLinkError(
          `Impossible de charger le lien de l’agence : ${slugError.message}`,
        );
        return;
      }

      if (!data?.slug) {
        setAgencyLinkError("Slug de l’agence introuvable.");
        return;
      }

      setAgencySlug(data.slug);
      setAgencyLinkError(null);
    };

    void loadAgencySlug();

    return () => {
      cancelled = true;
    };
  }, [agencyId]);

  // Formulaire des paramètres généraux
  const [form, setForm] = useState<any>(settings || {});

  React.useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const handleChange = (field: string, value: any) => {
    setForm((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const showMessage = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 3000);
  };

  const showPaymentMessage = (text: string) => {
    setPaymentMessage(text);
    window.setTimeout(() => setPaymentMessage(null), 4000);
  };

  const handleSave = async () => {
    setSaving(true);

    const result = await updateSettings(form);

    setSaving(false);

    showMessage(
      result.success ? "✅ Paramètres sauvegardés." : `❌ ${result.error}`,
    );
  };

  const handleUpload = async (type: AgencyAssetType, file: File) => {
    try {
      const compressed = await compressImage(file);
      const result = await uploadAsset(type, compressed);

      if (result.url) {
        showMessage("✅ Document uploadé.");
      } else {
        showMessage(`❌ ${result.error}`);
      }
    } catch (e) {
      showMessage(
        e instanceof Error
          ? `❌ ${e.message}`
          : "❌ Erreur pendant l'envoi du document.",
      );
    }
  };

  const handlePaymentDraftChange = (
    field: keyof PaymentSecretsPatch,
    value: string,
  ) => {
    setPaymentDraft((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSavePaymentSecrets = async () => {
    const patch: PaymentSecretsPatch = {};

    // Ne transmettre que les champs réellement renseignés.
    // Un champ vide conserve donc la clé déjà enregistrée.
    for (const [key, value] of Object.entries(paymentDraft)) {
      if (typeof value === "string" && value.trim() !== "") {
        (patch as Record<string, string>)[key] = value.trim();
      }
    }

    if (Object.keys(patch).length === 0) {
      showPaymentMessage(
        "Aucune nouvelle clé saisie. Les paramètres existants sont conservés.",
      );
      return;
    }

    const success = await updatePaymentSecrets(patch);

    if (success) {
      setPaymentDraft({});
      setVisibleSecrets({});
      showPaymentMessage("✅ Identifiants API enregistrés avec succès.");
    } else {
      showPaymentMessage(
        "❌ Échec de l'enregistrement. Consulte le message d'erreur.",
      );
    }
  };

  const handleRefreshPayments = async () => {
    await refreshPaymentSecrets();
    setPaymentDraft({});
    showPaymentMessage("État des identifiants actualisé.");
  };

  if (loading) {
    return <div className="p-8 text-white">Chargement...</div>;
  }

  const tabs = [
    { id: "infos", label: "Informations", icon: Building2 },
    { id: "gerant", label: "Gérant", icon: User },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "preferences", label: "Préférences", icon: Palette },
    { id: "paiements", label: "Paiements API", icon: KeyRound },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Paramètres de l'Agence
          </h1>
          <p className="text-sm text-[#A8B4C4]">
            Configuration des informations, documents et préférences
          </p>
        </div>

        {activeTab !== "paiements" && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold shadow-lg hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        )}
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-[#1E2E45] text-white text-sm">
          {message}
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm"
        >
          Impossible de charger les paramètres de l’agence : {error}
        </p>
      )}

      {/* Lien de connexion */}
      <section className="rounded-2xl border border-[#C9A96E]/20 bg-[#162133] p-4">
        <h2 className="text-sm font-bold text-white">
          Lien de connexion personnalisé
        </h2>

        {agencySlug ? (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <code className="break-all rounded-lg bg-[#0A111D] px-3 py-2 text-xs text-[#C9A96E]">
              {`${window.location.origin}/login/${encodeURIComponent(agencySlug)}`}
            </code>

            <a
              href={`/login/${encodeURIComponent(agencySlug)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-[#C9A96E] px-3 py-2 text-xs font-bold text-[#0F1B2D]"
            >
              Ouvrir ma page
            </a>

            <button
              type="button"
              onClick={async () => {
                const link = `${window.location.origin}/login/${encodeURIComponent(agencySlug)}`;

                try {
                  await navigator.clipboard.writeText(link);
                  showMessage("✅ Lien de connexion copié.");
                } catch {
                  showMessage(
                    "❌ Impossible de copier le lien. Sélectionnez-le manuellement.",
                  );
                }
              }}
              className="rounded-lg border border-[#C9A96E]/40 px-3 py-2 text-xs font-semibold text-white"
            >
              Copier le lien
            </button>
          </div>
        ) : (
          <p
            role={agencyLinkError ? "alert" : "status"}
            className="mt-2 text-xs text-[#A8B4C4]"
          >
            {agencyLinkError || "Chargement du lien de connexion…"}
          </p>
        )}

        <p className="mt-2 text-xs text-[#A8B4C4]">
          Utilisez ce lien pour voir le nom, le logo et les couleurs de votre
          agence. L’adresse générale affiche FITAL-IMMO.
        </p>
      </section>

      {/* Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-[#C9A96E]/20">
        {tabs.map((tab) => {
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`px-4 py-2 font-semibold text-sm rounded-t-lg flex items-center gap-2 transition-all ${
                activeTab === tab.id
                  ? "bg-[#1E2E45] text-[#C9A96E] border-b-2 border-[#C9A96E]"
                  : "text-[#A8B4C4] hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Contenu des onglets */}
      <div className="p-6 rounded-2xl bg-[#162133] border border-[#C9A96E]/20">
        {activeTab === "infos" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Field
                label="Nom affiché sur la page de connexion"
                value={form.nomAgence}
                onChange={(v) => handleChange("nomAgence", v)}
              />
              <p className="mt-1 text-xs text-[#A8B4C4]">
                Enregistré avec le bouton « Sauvegarder », ce nom apparaît sur
                le lien de connexion de l’agence.
              </p>
            </div>

            <Field
              label="Slogan"
              value={form.slogan}
              onChange={(v) => handleChange("slogan", v)}
            />

            <Field
              label="Téléphone"
              value={form.telephone}
              onChange={(v) => handleChange("telephone", v)}
            />

            <Field
              label="Email"
              value={form.email}
              onChange={(v) => handleChange("email", v)}
            />

            <Field
              label="Adresse"
              value={form.adresse}
              onChange={(v) => handleChange("adresse", v)}
            />

            <Field
              label="Ville"
              value={form.ville}
              onChange={(v) => handleChange("ville", v)}
            />

            <Field
              label="RC"
              value={form.rcNumero}
              onChange={(v) => handleChange("rcNumero", v)}
            />

            <Field
              label="NINEA"
              value={form.nineaNumero}
              onChange={(v) => handleChange("nineaNumero", v)}
            />

            <Field
              label="Boîte postale"
              value={form.boitePostale}
              onChange={(v) => handleChange("boitePostale", v)}
            />

            <Field
              label="Site web"
              value={form.siteWeb}
              onChange={(v) => handleChange("siteWeb", v)}
            />
          </div>
        )}

        {activeTab === "gerant" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Nom du gérant"
              value={form.gerantNom}
              onChange={(v) => handleChange("gerantNom", v)}
            />

            <Field
              label="Titre"
              value={form.gerantTitre}
              onChange={(v) => handleChange("gerantTitre", v)}
            />

            <Field
              label="Slogan 1"
              value={form.slogan1}
              onChange={(v) => handleChange("slogan1", v)}
            />

            <Field
              label="Slogan 2"
              value={form.slogan2}
              onChange={(v) => handleChange("slogan2", v)}
            />

            <div className="col-span-2">
              <label className="block text-xs font-bold text-[#A8B4C4] mb-2 uppercase">
                Signature du gérant
              </label>

              <UploadZone
                type="signature"
                onUpload={handleUpload}
                currentUrl={form.gerantSignatureUrl}
              />
            </div>
          </div>
        )}

        {activeTab === "documents" && (
          <div>
            <p className="mb-4 text-xs text-[#A8B4C4]">
              Le logo de l’agence est aussi utilisé sur sa page de connexion.
              Son remplacement est enregistré après l’envoi du fichier.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <UploadZone
                type="logo"
                label="Logo de la page de connexion"
                onUpload={handleUpload}
                currentUrl={form.logoUrl}
              />

              <UploadZone
                type="cachet"
                label="Cachet / Sceau"
                onUpload={handleUpload}
                currentUrl={form.cachetUrl}
              />

              <UploadZone
                type="entete"
                label="En-tête personnalisé"
                onUpload={handleUpload}
                currentUrl={form.enteteUrl}
              />

              <UploadZone
                type="pied_page"
                label="Pied de page personnalisé"
                onUpload={handleUpload}
                currentUrl={form.piedPageUrl}
              />
            </div>
          </div>
        )}

        {activeTab === "preferences" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 rounded-2xl border border-[#C9A96E]/20 bg-[#0A111D]/40 p-4">
              <h3 className="text-sm font-bold text-white">
                Personnalisation de la page de connexion
              </h3>

              <p className="mb-4 mt-1 text-xs text-[#A8B4C4]">
                Ces couleurs s’appliquent au fond, à la carte, aux champs, aux
                textes et aux boutons de votre lien d’agence.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ColorField
                  label="Couleur principale"
                  value={form.primaryColor}
                  fallback="#C9A96E"
                  onChange={(value) => handleChange("primaryColor", value)}
                />

                <ColorField
                  label="Fond de la page"
                  value={form.loginBackgroundColor}
                  fallback="#0A111D"
                  onChange={(value) =>
                    handleChange("loginBackgroundColor", value)
                  }
                />

                <ColorField
                  label="Carte de connexion"
                  value={form.loginCardColor}
                  fallback="#162133"
                  onChange={(value) => handleChange("loginCardColor", value)}
                />

                <ColorField
                  label="Fond des champs et panneaux"
                  value={form.loginSurfaceColor}
                  fallback="#0A111D"
                  onChange={(value) => handleChange("loginSurfaceColor", value)}
                />

                <ColorField
                  label="Texte principal"
                  value={form.loginTextColor}
                  fallback="#F0EDE8"
                  onChange={(value) => handleChange("loginTextColor", value)}
                />

                <ColorField
                  label="Texte secondaire"
                  value={form.loginMutedColor}
                  fallback="#A8B4C4"
                  onChange={(value) => handleChange("loginMutedColor", value)}
                />
              </div>
            </div>

            <Field
              label="Taux de gérance (%)"
              type="number"
              value={form.tauxGeranceDefaut}
              onChange={(v) => handleChange("tauxGeranceDefaut", Number(v))}
            />

            <Field
              label="Pénalité défaut (%)"
              type="number"
              value={form.penaliteDefaut}
              onChange={(v) => handleChange("penaliteDefaut", Number(v))}
            />

            <Field
              label="TVA (%)"
              type="number"
              value={form.tvaTaux}
              onChange={(v) => handleChange("tvaTaux", Number(v))}
            />

            <Field
              label="Préfixe facture"
              value={form.prefixFacture}
              onChange={(v) => handleChange("prefixFacture", v)}
            />

            <Field
              label="Préfixe quittance"
              value={form.prefixQuittance}
              onChange={(v) => handleChange("prefixQuittance", v)}
            />

            <Field
              label="Préfixe paiement"
              value={form.prefixPaiement}
              onChange={(v) => handleChange("prefixPaiement", v)}
            />

            <Field
              label="Numéro Wave"
              value={form.waveNumero}
              onChange={(v) => handleChange("waveNumero", v)}
            />

            <Field
              label="Code Orange Money"
              value={form.orangeMoneyCode}
              onChange={(v) => handleChange("orangeMoneyCode", v)}
            />

            <Field
              label="WhatsApp Business"
              value={form.whatsappBusiness}
              onChange={(v) => handleChange("whatsappBusiness", v)}
            />

            <Field
              label="Téléphone standard"
              value={form.standardTelephone}
              onChange={(v) => handleChange("standardTelephone", v)}
            />
          </div>
        )}

        {/* ONGLET PAIEMENTS API */}
        {activeTab === "paiements" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Identifiants API de paiement
                </h2>

                <p className="mt-1 text-xs text-[#A8B4C4]">
                  Configurez les connexions techniques de votre agence.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRefreshPayments}
                disabled={paymentLoading}
                className="flex items-center gap-2 rounded-lg border border-[#C9A96E]/30 px-3 py-2 text-xs text-white hover:bg-[#1E2E45] disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${paymentLoading ? "animate-spin" : ""}`}
                />
                Actualiser
              </button>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />

                <div>
                  <p className="text-sm font-semibold text-white">
                    Protection des identifiants
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-[#A8B4C4]">
                    Les identifiants sont transmis à l'API serveur et chiffrés
                    avant leur stockage. Les clés existantes ne sont jamais
                    affichées dans cette interface.
                  </p>
                </div>
              </div>
            </div>

            {paymentMessage && (
              <div
                role="status"
                className="rounded-xl bg-[#1E2E45] p-3 text-sm text-white"
              >
                {paymentMessage}
              </div>
            )}

            {paymentError && (
              <div
                role="alert"
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300"
              >
                {paymentError}
              </div>
            )}

            {paymentLoading ? (
              <div className="py-8 text-center text-sm text-[#A8B4C4]">
                Vérification des autorisations et chargement des paramètres...
              </div>
            ) : !canManagePayments ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-5">
                <p className="text-sm font-semibold text-rose-300">
                  Accès non autorisé
                </p>

                <p className="mt-2 text-xs text-[#A8B4C4]">
                  L'API n'a pas autorisé l'accès aux paramètres techniques de
                  paiement. Vérifiez votre rôle et vos droits sur cette agence.
                </p>
              </div>
            ) : (
              <>
                <PaymentProviderSection
                  title="Wave"
                  description="Identifiants techniques de connexion à l'API Wave."
                  fields={[
                    {
                      key: "waveApiKey",
                      label: "Clé API Wave",
                    },
                    {
                      key: "waveWebhookSecret",
                      label: "Secret Webhook Wave",
                    },
                  ]}
                  configured={configured}
                  values={paymentDraft}
                  visible={visibleSecrets}
                  onChange={handlePaymentDraftChange}
                  onToggleVisibility={(key) =>
                    setVisibleSecrets((previous) => ({
                      ...previous,
                      [key]: !previous[key],
                    }))
                  }
                />

                <PaymentProviderSection
                  title="Orange Money"
                  description="Identifiants techniques du compte marchand Orange Money."
                  fields={[
                    {
                      key: "orangeMoneyApiKey",
                      label: "Clé API Orange Money",
                    },
                    {
                      key: "orangeMoneyMerchantId",
                      label: "Identifiant marchand Orange Money",
                    },
                  ]}
                  configured={configured}
                  values={paymentDraft}
                  visible={visibleSecrets}
                  onChange={handlePaymentDraftChange}
                  onToggleVisibility={(key) =>
                    setVisibleSecrets((previous) => ({
                      ...previous,
                      [key]: !previous[key],
                    }))
                  }
                />

                <PaymentProviderSection
                  title="PayDunya"
                  description="Clés et jeton du compte marchand PayDunya."
                  fields={[
                    {
                      key: "paydunyaMasterKey",
                      label: "Master Key",
                    },
                    {
                      key: "paydunyaPrivateKey",
                      label: "Private Key",
                    },
                    {
                      key: "paydunyaPublicKey",
                      label: "Public Key",
                    },
                    {
                      key: "paydunyaToken",
                      label: "Token",
                    },
                  ]}
                  configured={configured}
                  values={paymentDraft}
                  visible={visibleSecrets}
                  onChange={handlePaymentDraftChange}
                  onToggleVisibility={(key) =>
                    setVisibleSecrets((previous) => ({
                      ...previous,
                      [key]: !previous[key],
                    }))
                  }
                />

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#C9A96E]/20 pt-5">
                  <p className="max-w-lg text-xs text-[#A8B4C4]">
                    Laissez un champ vide pour conserver la clé déjà
                    enregistrée. Seules les nouvelles valeurs renseignées seront
                    envoyées.
                  </p>

                  <button
                    type="button"
                    onClick={handleSavePaymentSecrets}
                    disabled={paymentSaving}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] px-6 py-3 font-bold text-[#0F1B2D] shadow-lg transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {paymentSaving
                      ? "Enregistrement..."
                      : "Enregistrer les identifiants"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// CHAMP SECRET
// ============================================================

type SecretFieldKey =
  | "waveApiKey"
  | "waveWebhookSecret"
  | "orangeMoneyApiKey"
  | "orangeMoneyMerchantId"
  | "paydunyaMasterKey"
  | "paydunyaPrivateKey"
  | "paydunyaPublicKey"
  | "paydunyaToken";

const SecretField: React.FC<{
  fieldKey: SecretFieldKey;
  label: string;
  isConfigured: boolean;
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
}> = ({
  fieldKey,
  label,
  isConfigured,
  value,
  visible,
  onChange,
  onToggleVisibility,
}) => (
  <div>
    <div className="mb-2 flex items-center justify-between gap-2">
      <label
        htmlFor={fieldKey}
        className="text-xs font-bold uppercase text-[#A8B4C4]"
      >
        {label}
      </label>

      <span
        className={`rounded-full px-2 py-1 text-[10px] font-bold ${
          isConfigured
            ? "bg-emerald-500/10 text-emerald-400"
            : "bg-slate-500/10 text-slate-400"
        }`}
      >
        {isConfigured ? "Configuré" : "Non configuré"}
      </span>
    </div>

    <div className="flex items-center gap-2">
      <input
        id={fieldKey}
        type={visible ? "text" : "password"}
        autoComplete="new-password"
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={
          isConfigured
            ? "Déjà configuré — laisser vide pour conserver"
            : "Saisir une nouvelle clé"
        }
        className="min-w-0 flex-1 rounded-xl border border-[#C9A96E]/20 bg-[#1E2E45] p-3 text-sm text-white placeholder:text-slate-500 focus:border-[#C9A96E] focus:outline-none"
      />

      <button
        type="button"
        onClick={onToggleVisibility}
        aria-label={visible ? "Masquer la clé" : "Afficher la clé"}
        className="rounded-xl border border-[#C9A96E]/20 p-3 text-[#C9A96E] hover:bg-[#1E2E45]"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  </div>
);

// ============================================================
// SECTION FOURNISSEUR DE PAIEMENT
// ============================================================

const PaymentProviderSection: React.FC<{
  title: string;
  description: string;
  fields: {
    key: SecretFieldKey;
    label: string;
  }[];
  configured: PaymentSecretsConfigured;
  values: Partial<Record<SecretFieldKey, string>>;
  visible: Record<string, boolean>;
  onChange: (key: SecretFieldKey, value: string) => void;
  onToggleVisibility: (key: SecretFieldKey) => void;
}> = ({
  title,
  description,
  fields,
  configured,
  values,
  visible,
  onChange,
  onToggleVisibility,
}) => (
  <section className="rounded-2xl border border-[#C9A96E]/20 bg-[#0A111D]/40 p-5">
    <div className="mb-5">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-[#C9A96E]" />
        <h3 className="text-base font-bold text-white">{title}</h3>
      </div>

      <p className="mt-1 text-xs text-[#A8B4C4]">{description}</p>
    </div>

    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {fields.map((field) => (
        <SecretField
          key={field.key}
          fieldKey={field.key}
          label={field.label}
          isConfigured={configured[field.key]}
          value={values[field.key] ?? ""}
          visible={!!visible[field.key]}
          onChange={(value) => onChange(field.key, value)}
          onToggleVisibility={() => onToggleVisibility(field.key)}
        />
      ))}
    </div>
  </section>
);

// ============================================================
// CHAMPS CLASSIQUES
// ============================================================

const Field: React.FC<{
  label: string;
  value?: string | number;
  onChange: (v: string) => void;
  type?: string;
}> = ({ label, value, onChange, type = "text" }) => (
  <div>
    <label className="mb-1 block text-xs font-bold uppercase text-[#A8B4C4]">
      {label}
    </label>

    <input
      type={type}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-[#C9A96E]/20 bg-[#1E2E45] p-2.5 text-sm text-white"
    />
  </div>
);

// ============================================================
// CHAMPS COULEUR
// ============================================================

const ColorField: React.FC<{
  label: string;
  value?: string;
  fallback: string;
  onChange: (value: string) => void;
}> = ({ label, value, fallback, onChange }) => {
  const color = value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-300">
        {label}
      </label>

      <div className="flex items-center gap-2 rounded-xl border border-[#C9A96E]/20 bg-[#1E2E45] p-2">
        <input
          type="color"
          aria-label={label}
          value={color}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-10 cursor-pointer rounded bg-transparent"
        />

        <span className="font-mono text-xs text-slate-200">
          {color.toUpperCase()}
        </span>
      </div>
    </div>
  );
};

// ============================================================
// ZONE D'UPLOAD
// ============================================================

const UploadZone: React.FC<{
  type: AgencyAssetType;
  label?: string;
  onUpload: (type: AgencyAssetType, file: File) => void;
  currentUrl?: string;
}> = ({ type, label, onUpload, currentUrl }) => (
  <div>
    {label && (
      <label className="mb-2 block text-xs font-bold uppercase text-[#A8B4C4]">
        {label}
      </label>
    )}

    <div className="rounded-xl border-2 border-dashed border-[#C9A96E]/30 bg-[#1E2E45]/40 p-4 transition-all hover:border-[#C9A96E]">
      {currentUrl ? (
        <div className="space-y-2">
          <img
            src={currentUrl}
            alt={label || "Document de l'agence"}
            className="mx-auto max-h-32 object-contain"
          />

          <label className="block cursor-pointer text-center text-xs font-semibold text-[#C9A96E] hover:underline">
            Changer
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onUpload(type, file);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      ) : (
        <label className="block cursor-pointer py-6 text-center">
          <Upload className="mx-auto mb-2 h-8 w-8 text-[#C9A96E]" />

          <span className="text-xs text-[#A8B4C4]">Cliquer pour uploader</span>

          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUpload(type, file);
              event.currentTarget.value = "";
            }}
          />
        </label>
      )}
    </div>
  </div>
);
