// ============================================================
// VUE — Paramètres de l'agence (édition + upload documents)
// ============================================================
import React, { useState } from 'react';
import { Upload, Save, Building2, User, FileText, Palette } from 'lucide-react';
import { useAgencySettings } from '../hooks/useAgencySettings';
import { AgencyAssetType } from '../lib/supabase/storage';
import { compressImage } from '../lib/supabase/storage';
import { supabase } from '../lib/supabase/client';

interface AgencySettingsViewProps {
  agencyId: string;
}

type Tab = 'infos' | 'gerant' | 'documents' | 'preferences';

export const AgencySettingsView: React.FC<AgencySettingsViewProps> = ({ agencyId }) => {
  const [activeTab, setActiveTab] = useState<Tab>('infos');
  const { settings, loading, error, updateSettings, uploadAsset } = useAgencySettings(agencyId);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [agencySlug, setAgencySlug] = useState<string | null>(null);
  const [agencyLinkError, setAgencyLinkError] = useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const loadAgencySlug = async () => {
      if (!supabase) {
        setAgencyLinkError('Supabase non configuré.');
        return;
      }
      const { data, error: slugError } = await supabase
        .from('agencies')
        .select('slug')
        .eq('id', agencyId)
        .maybeSingle();
      if (cancelled) return;
      if (slugError) {
        setAgencyLinkError(`Impossible de charger le lien de l’agence : ${slugError.message}`);
        return;
      }
      if (!data?.slug) {
        setAgencyLinkError('Slug de l’agence introuvable.');
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

  // Form state local
  const [form, setForm] = useState<any>(settings || {});

  React.useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const handleChange = (field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await updateSettings(form);
    setSaving(false);
    setMessage(result.success ? '✅ Sauvegardé' : `❌ ${result.error}`);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleUpload = async (type: AgencyAssetType, file: File) => {
    const compressed = await compressImage(file);
    const result = await uploadAsset(type, compressed);
    if (result.url) {
      setMessage('✅ Document uploadé');
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage(`❌ ${result.error}`);
    }
  };

  if (loading) return <div className="p-8 text-white">Chargement...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Paramètres de l'Agence</h1>
          <p className="text-sm text-[#A8B4C4]">
            Configuration des informations, documents et préférences
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold shadow-lg hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-[#1E2E45] text-white text-sm">
          {message}
        </div>
      )}
      {error && (
        <p role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          Impossible de charger les paramètres de l’agence : {error}
        </p>
      )}
      <section className="rounded-2xl border border-[#C9A96E]/20 bg-[#162133] p-4">
        <h2 className="text-sm font-bold text-white">Lien de connexion personnalisé</h2>
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
                  setMessage('✅ Lien de connexion copié');
                  setTimeout(() => setMessage(null), 3000);
                } catch {
                  setMessage('❌ Impossible de copier le lien. Sélectionnez-le manuellement.');
                }
              }}
              className="rounded-lg border border-[#C9A96E]/40 px-3 py-2 text-xs font-semibold text-white"
            >
              Copier le lien
            </button>
          </div>
        ) : (
          <p role={agencyLinkError ? 'alert' : 'status'} className="mt-2 text-xs text-[#A8B4C4]">
            {agencyLinkError || 'Chargement du lien de connexion…'}
          </p>
        )}
        <p className="mt-2 text-xs text-[#A8B4C4]">
          Utilisez ce lien pour voir le nom, le logo et les couleurs de votre agence. L’adresse générale affiche FITAL-IMMO.
        </p>
      </section>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#C9A96E]/20">
        {[
          { id: 'infos', label: 'Informations', icon: Building2 },
          { id: 'gerant', label: 'Gérant', icon: User },
          { id: 'documents', label: 'Documents', icon: FileText },
          { id: 'preferences', label: 'Préférences', icon: Palette },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`px-4 py-2 font-semibold text-sm rounded-t-lg flex items-center gap-2 transition-all ${
                activeTab === tab.id
                  ? 'bg-[#1E2E45] text-[#C9A96E] border-b-2 border-[#C9A96E]'
                  : 'text-[#A8B4C4] hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="p-6 rounded-2xl bg-[#162133] border border-[#C9A96E]/20">
        {activeTab === 'infos' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Field
                label="Nom affiché sur la page de connexion"
                value={form.nomAgence}
                onChange={(v) => handleChange('nomAgence', v)}
              />
              <p className="mt-1 text-xs text-[#A8B4C4]">
                Enregistré avec le bouton « Sauvegarder », ce nom apparaît sur le lien de connexion de l’agence.
              </p>
            </div>
            <Field label="Slogan" value={form.slogan} onChange={(v) => handleChange('slogan', v)} />
            <Field label="Téléphone" value={form.telephone} onChange={(v) => handleChange('telephone', v)} />
            <Field label="Email" value={form.email} onChange={(v) => handleChange('email', v)} />
            <Field label="Adresse" value={form.adresse} onChange={(v) => handleChange('adresse', v)} />
            <Field label="Ville" value={form.ville} onChange={(v) => handleChange('ville', v)} />
            <Field label="RC" value={form.rcNumero} onChange={(v) => handleChange('rcNumero', v)} />
            <Field label="NINEA" value={form.nineaNumero} onChange={(v) => handleChange('nineaNumero', v)} />
            <Field label="Boîte postale" value={form.boitePostale} onChange={(v) => handleChange('boitePostale', v)} />
            <Field label="Site web" value={form.siteWeb} onChange={(v) => handleChange('siteWeb', v)} />
          </div>
        )}

        {activeTab === 'gerant' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nom du gérant" value={form.gerantNom} onChange={(v) => handleChange('gerantNom', v)} />
            <Field label="Titre" value={form.gerantTitre} onChange={(v) => handleChange('gerantTitre', v)} />
            <Field label="Slogan 1" value={form.slogan1} onChange={(v) => handleChange('slogan1', v)} />
            <Field label="Slogan 2" value={form.slogan2} onChange={(v) => handleChange('slogan2', v)} />
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

        {activeTab === 'documents' && (
          <div>
            <p className="mb-4 text-xs text-[#A8B4C4]">
              Le logo de l’agence est aussi utilisé sur sa page de connexion. Son remplacement est enregistré après l’envoi du fichier.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <UploadZone type="logo" label="Logo de la page de connexion" onUpload={handleUpload} currentUrl={form.logoUrl} />
              <UploadZone type="cachet" label="Cachet / Sceau" onUpload={handleUpload} currentUrl={form.cachetUrl} />
              <UploadZone type="entete" label="En-tête personnalisé" onUpload={handleUpload} currentUrl={form.enteteUrl} />
              <UploadZone type="pied_page" label="Pied de page personnalisé" onUpload={handleUpload} currentUrl={form.piedPageUrl} />
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 rounded-2xl border border-[#C9A96E]/20 bg-[#0A111D]/40 p-4">
              <h3 className="text-sm font-bold text-white">Personnalisation de la page de connexion</h3>
              <p className="mb-4 mt-1 text-xs text-[#A8B4C4]">
                Ces couleurs s’appliquent au fond, à la carte, aux champs, aux textes et aux boutons de votre lien d’agence.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ColorField
                  label="Couleur principale"
                  value={form.primaryColor}
                  fallback="#C9A96E"
                  onChange={(value) => handleChange('primaryColor', value)}
                />
                <ColorField
                  label="Fond de la page"
                  value={form.loginBackgroundColor}
                  fallback="#0A111D"
                  onChange={(value) => handleChange('loginBackgroundColor', value)}
                />
                <ColorField
                  label="Carte de connexion"
                  value={form.loginCardColor}
                  fallback="#162133"
                  onChange={(value) => handleChange('loginCardColor', value)}
                />
                <ColorField
                  label="Fond des champs et panneaux"
                  value={form.loginSurfaceColor}
                  fallback="#0A111D"
                  onChange={(value) => handleChange('loginSurfaceColor', value)}
                />
                <ColorField
                  label="Texte principal"
                  value={form.loginTextColor}
                  fallback="#F0EDE8"
                  onChange={(value) => handleChange('loginTextColor', value)}
                />
                <ColorField
                  label="Texte secondaire"
                  value={form.loginMutedColor}
                  fallback="#A8B4C4"
                  onChange={(value) => handleChange('loginMutedColor', value)}
                />
              </div>
            </div>
            <Field label="Taux de gérance (%)" type="number" value={form.tauxGeranceDefaut} onChange={(v) => handleChange('tauxGeranceDefaut', Number(v))} />
            <Field label="Pénalité défaut (%)" type="number" value={form.penaliteDefaut} onChange={(v) => handleChange('penaliteDefaut', Number(v))} />
            <Field label="TVA (%)" type="number" value={form.tvaTaux} onChange={(v) => handleChange('tvaTaux', Number(v))} />
            <Field label="Préfixe facture" value={form.prefixFacture} onChange={(v) => handleChange('prefixFacture', v)} />
            <Field label="Préfixe quittance" value={form.prefixQuittance} onChange={(v) => handleChange('prefixQuittance', v)} />
            <Field label="Préfixe paiement" value={form.prefixPaiement} onChange={(v) => handleChange('prefixPaiement', v)} />
            <Field label="Numéro Wave" value={form.waveNumero} onChange={(v) => handleChange('waveNumero', v)} />
            <Field label="Code Orange Money" value={form.orangeMoneyCode} onChange={(v) => handleChange('orangeMoneyCode', v)} />
            <Field label="WhatsApp Business" value={form.whatsappBusiness} onChange={(v) => handleChange('whatsappBusiness', v)} />
            <Field label="Téléphone standard" value={form.standardTelephone} onChange={(v) => handleChange('standardTelephone', v)} />
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// SOUS-COMPOSANTS
// ============================================================
const Field: React.FC<{
  label: string;
  value?: string | number;
  onChange: (v: string) => void;
  type?: string;
}> = ({ label, value, onChange, type = 'text' }) => (
  <div>
    <label className="block text-xs font-bold text-[#A8B4C4] mb-1 uppercase">
      {label}
    </label>
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white text-sm"
    />
  </div>
);

const ColorField: React.FC<{
  label: string;
  value?: string;
  fallback: string;
  onChange: (value: string) => void;
}> = ({ label, value, fallback, onChange }) => {
  const color = value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-300">{label}</label>
      <div className="flex items-center gap-2 rounded-xl border border-[#C9A96E]/20 bg-[#1E2E45] p-2">
        <input
          type="color"
          aria-label={label}
          value={color}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-10 cursor-pointer rounded bg-transparent"
        />
        <span className="font-mono text-xs text-slate-200">{color.toUpperCase()}</span>
      </div>
    </div>
  );
};

const UploadZone: React.FC<{
  type: AgencyAssetType;
  label?: string;
  onUpload: (type: AgencyAssetType, file: File) => void;
  currentUrl?: string;
}> = ({ type, label, onUpload, currentUrl }) => (
  <div>
    {label && (
      <label className="block text-xs font-bold text-[#A8B4C4] mb-2 uppercase">
        {label}
      </label>
    )}
    <div className="p-4 rounded-xl bg-[#1E2E45]/40 border-2 border-dashed border-[#C9A96E]/30 hover:border-[#C9A96E] transition-all">
      {currentUrl ? (
        <div className="space-y-2">
          <img src={currentUrl} alt={label} className="max-h-32 mx-auto object-contain" />
          <label className="block text-center cursor-pointer text-xs text-[#C9A96E] font-semibold hover:underline">
            Changer
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(type, file);
              }}
            />
          </label>
        </div>
      ) : (
        <label className="block text-center cursor-pointer py-6">
          <Upload className="w-8 h-8 mx-auto text-[#C9A96E] mb-2" />
          <span className="text-xs text-[#A8B4C4]">Cliquer pour uploader</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(type, file);
            }}
          />
        </label>
      )}
    </div>
  </div>
);