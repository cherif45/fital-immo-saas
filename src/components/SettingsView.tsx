import React, { useState, useEffect } from 'react';
import {
  Settings, Building, DollarSign, FileText, Shield, Save, CheckCircle2,
  Lock, Smartphone, PhoneCall, Send, Database, RefreshCw, AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { AgencySettings } from '../types';
import {
  testSupabaseConnection, SupabaseHealthCheckResult, supabaseUrl,
} from '../lib/supabase/client';

interface SettingsViewProps {
  settings: AgencySettings;
  onSaveSettings: (newSettings: AgencySettings) => void;
}

export function SettingsView({ settings, onSaveSettings }: SettingsViewProps) {
  const [formData, setFormData] = useState<AgencySettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'agency' | 'financial' | 'numbering' | 'mobileMoney' | 'roles' | 'database'>('agency');
  const [healthResult, setHealthResult] = useState<SupabaseHealthCheckResult | null>(null);
  const [isTestingDb, setIsTestingDb] = useState(false);

  // Sync formData quand les settings changent (chargement initial)
  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleTestDatabase = async () => {
    setIsTestingDb(true);
    try {
      const res = await testSupabaseConnection();
      setHealthResult(res);
    } catch (err: any) {
      setHealthResult({
        connected: false, status: 'error',
        url: supabaseUrl || 'Non définie', sslActive: false,
        message: 'Échec du test de connexion.', details: err.message,
      });
    } finally { setIsTestingDb(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2A3447] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#F0EDE8] tracking-tight flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-[#C9A96E]" />
            Paramètres & Configuration de l'Agence
          </h1>
          <p className="text-sm text-[#A0AEC0] mt-1">
            Personnalisation des coordonnées de l'agence, devises (FCFA), taux de gérance et préfixes de numérotation.
          </p>
        </div>
        <button onClick={handleSubmit} className="px-5 py-2.5 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-md">
          <Save className="w-4 h-4" /> Enregistrer les modifications
        </button>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-[#10B981]/20 border border-[#10B981]/40 rounded-xl text-[#10B981] flex items-center gap-3 text-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>Vos paramètres ont été mis à jour et persistés avec succès !</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#2A3447] pb-2 flex-wrap">
        {[
          { id: 'agency', label: 'Identité Agence', icon: Building },
          { id: 'financial', label: 'Règles Financières & Taxes', icon: DollarSign },
          { id: 'numbering', label: 'Numérotation des Actes', icon: FileText },
          { id: 'mobileMoney', label: 'Mobile Money & Télécoms', icon: Smartphone, color: 'text-cyan-400' },
          { id: 'roles', label: 'Rôles & Permissions RLS', icon: Shield },
          { id: 'database', label: 'Base Supabase & Sécurité', icon: Database, color: 'text-emerald-400' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              if (tab.id === 'database' && !healthResult) handleTestDatabase();
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#C9A96E]/20 text-[#C9A96E] border border-[#C9A96E]/40'
                : 'bg-[#141E30] text-[#A0AEC0] hover:text-[#F0EDE8]'
            }`}
          >
            <tab.icon className={`w-4 h-4 ${tab.color || ''}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="bg-[#141E30]/90 border border-[#2A3447] rounded-2xl p-6 shadow-xl space-y-6">
        {activeTab === 'agency' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">Raison Sociale de l'Agence</label>
              <input type="text" value={formData.nomAgence} onChange={(e) => setFormData({ ...formData, nomAgence: e.target.value })} className="w-full px-4 py-2.5 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none" required />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">Slogan / Titre Professionnel</label>
              <input type="text" value={formData.slogan} onChange={(e) => setFormData({ ...formData, slogan: e.target.value })} className="w-full px-4 py-2.5 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">Téléphone de Contact</label>
              <input type="text" value={formData.telephone} onChange={(e) => setFormData({ ...formData, telephone: e.target.value })} className="w-full px-4 py-2.5 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">Email Officiel</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2.5 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">Adresse Siège Social</label>
              <input type="text" value={formData.adresse} onChange={(e) => setFormData({ ...formData, adresse: e.target.value })} className="w-full px-4 py-2.5 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">Numéro NINEA / RC</label>
              <input type="text" value={formData.ninea} onChange={(e) => setFormData({ ...formData, ninea: e.target.value })} className="w-full px-4 py-2.5 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none" />
            </div>
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">Devise Principale</label>
              <input type="text" value={formData.devise} disabled className="w-full px-4 py-2.5 bg-[#0A111D]/60 border border-[#2A3447] rounded-xl text-sm text-[#C9A96E] font-bold cursor-not-allowed" />
              <span className="text-xs text-[#A0AEC0] mt-1 block">Devise par défaut : FCFA.</span>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">Taux de Gérance par Défaut (%)</label>
              <input type="number" value={formData.tauxGeranceDefaut} onChange={(e) => setFormData({ ...formData, tauxGeranceDefaut: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none" min="1" max="30" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">Taux Pénalités de Retard (%)</label>
              <input type="number" value={formData.penaliteDefaut} onChange={(e) => setFormData({ ...formData, penaliteDefaut: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none" min="0" max="25" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">Taux TVA sur Commission (%)</label>
              <input type="number" value={formData.tvaTaux} onChange={(e) => setFormData({ ...formData, tvaTaux: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none" />
            </div>
          </div>
        )}

        {activeTab === 'numbering' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">Préfixe Quittances de Loyer</label>
              <input type="text" value={formData.prefixQuittance} onChange={(e) => setFormData({ ...formData, prefixQuittance: e.target.value })} className="w-full px-4 py-2.5 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm font-mono text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none" />
              <span className="text-xs text-[#A0AEC0] mt-1 block">Exemple: QUI-2026-0001</span>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">Préfixe Bons de Caisse (BCA)</label>
              <input type="text" value={formData.prefixBonCaisse} onChange={(e) => setFormData({ ...formData, prefixBonCaisse: e.target.value })} className="w-full px-4 py-2.5 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm font-mono text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none" />
              <span className="text-xs text-[#A0AEC0] mt-1 block">Exemple: BCA-2026-0001</span>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">Préfixe Factures (Adhésions / Travaux)</label>
              <input type="text" value={formData.prefixFacture} onChange={(e) => setFormData({ ...formData, prefixFacture: e.target.value })} className="w-full px-4 py-2.5 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm font-mono text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">Préfixe Contrats de Baux</label>
              <input type="text" value={formData.prefixContrat} onChange={(e) => setFormData({ ...formData, prefixContrat: e.target.value })} className="w-full px-4 py-2.5 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm font-mono text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none" />
            </div>
          </div>
        )}

        {activeTab === 'mobileMoney' && (
          <div className="space-y-6">
            <div className="p-4 bg-[#0A111D] border border-[#2A3447] rounded-xl">
              <h3 className="font-semibold text-[#F0EDE8] text-sm flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                Passerelles de Paiement Mobile Money & Lignes Directes
              </h3>
              <p className="text-xs text-[#A0AEC0] mt-1">
                Configurez les comptes marchands Wave, Orange Money et les numéros de standard pour les appels et relances WhatsApp.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Wave */}
              <div className="p-4 bg-[#0A111D]/80 border border-cyan-500/30 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center font-black text-xs">W</div>
                  <span>Wave Sénégal & UEMOA</span>
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Numéro Marchand / Téléphone Wave de l'Agence</label>
                  <input
                    type="text"
                    value={formData.waveNumero || ''}
                    onChange={(e) => setFormData({ ...formData, waveNumero: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#141E30] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] font-mono focus:border-cyan-500 focus:outline-none"
                    placeholder="+221 77 000 00 00"
                  />
                  <span className="text-[11px] text-[#6B7C94] mt-1 block">Utilisé pour générer les liens de paiement directs Wave.</span>
                </div>
              </div>

              {/* Orange Money */}
              <div className="p-4 bg-[#0A111D]/80 border border-orange-500/30 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-orange-400 font-bold text-sm">
                  <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center font-black text-xs">OM</div>
                  <span>Orange Money</span>
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Code Marchand Orange Money (CI/SN/ML)</label>
                  <input
                    type="text"
                    value={formData.orangeMoneyCode || ''}
                    onChange={(e) => setFormData({ ...formData, orangeMoneyCode: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#141E30] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] font-mono focus:border-orange-500 focus:outline-none"
                    placeholder="784912"
                  />
                  <span className="text-[11px] text-[#6B7C94] mt-1 block">Génère automatiquement la syntaxe USSD.</span>
                </div>
              </div>

              {/* Téléphone Standard */}
              <div className="p-4 bg-[#0A111D]/80 border border-blue-500/30 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                  <PhoneCall className="w-4 h-4" />
                  <span>Standard Téléphonique Agence</span>
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Ligne Fixe / Mobile Standard</label>
                  <input
                    type="text"
                    value={formData.standardTelephone || ''}
                    onChange={(e) => setFormData({ ...formData, standardTelephone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#141E30] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] font-mono focus:border-blue-500 focus:outline-none"
                    placeholder="+221 33 820 40 50"
                  />
                  <span className="text-[11px] text-[#6B7C94] mt-1 block">Numéro d'appel pour le support.</span>
                </div>
              </div>

              {/* WhatsApp Business */}
              <div className="p-4 bg-[#0A111D]/80 border border-emerald-500/30 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Send className="w-4 h-4" />
                  <span>Numéro WhatsApp Business Officiel</span>
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Ligne WhatsApp Officielle</label>
                  <input
                    type="text"
                    value={formData.whatsappBusiness || ''}
                    onChange={(e) => setFormData({ ...formData, whatsappBusiness: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#141E30] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] font-mono focus:border-emerald-500 focus:outline-none"
                    placeholder="+221 77 845 20 10"
                  />
                  <span className="text-[11px] text-[#6B7C94] mt-1 block">Utilisé pour l'envoi des quittances et relances.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'roles' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#0A111D] border border-[#2A3447] rounded-xl">
              <h3 className="font-semibold text-[#F0EDE8] text-sm flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#C9A96E]" />
                Modèle de Sécurité PostgreSQL & Row Level Security (RLS)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-xs">
                <div className="p-3 bg-[#141E30] rounded-lg border border-[#2A3447]">
                  <span className="font-bold text-[#10B981]">ADMINISTRATEUR</span>
                  <p className="text-[#A0AEC0] mt-0.5">Accès intégral.</p>
                </div>
                <div className="p-3 bg-[#141E30] rounded-lg border border-[#2A3447]">
                  <span className="font-bold text-[#C9A96E]">GESTIONNAIRE</span>
                  <p className="text-[#A0AEC0] mt-0.5">Biens, Locataires, Baux, États des lieux, Recouvrement.</p>
                </div>
                <div className="p-3 bg-[#141E30] rounded-lg border border-[#2A3447]">
                  <span className="font-bold text-[#3B82F6]">COMPTABLE</span>
                  <p className="text-[#A0AEC0] mt-0.5">Encaissements, Quittances, Bons de caisse.</p>
                </div>
                <div className="p-3 bg-[#141E30] rounded-lg border border-[#2A3447]">
                  <span className="font-bold text-[#94A3B8]">AGENT</span>
                  <p className="text-[#A0AEC0] mt-0.5">Relances, visites, états des lieux, travaux.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'database' && (
          <div className="space-y-5">
            <div className="p-5 bg-[#0A111D] border border-[#2A3447] rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#F0EDE8] text-sm flex items-center gap-2">
                      Instance PostgreSQL Supabase
                      {healthResult?.sslActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> SSL / TLS Chiffré
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-[#A0AEC0] font-mono mt-0.5">
                      {supabaseUrl || 'https://wgnwzfkjagkhtnourukz.supabase.co'}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={handleTestDatabase} disabled={isTestingDb} className="px-4 py-2 bg-[#C9A96E]/20 hover:bg-[#C9A96E]/30 text-[#C9A96E] border border-[#C9A96E]/40 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50">
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingDb ? 'animate-spin' : ''}`} />
                  <span>{isTestingDb ? 'Vérification...' : 'Lancer le test automatique'}</span>
                </button>
              </div>

              {healthResult && (
                <div className={`p-4 rounded-xl border text-xs space-y-2 animate-in fade-in ${healthResult.connected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 'bg-rose-500/10 border-rose-500/30 text-rose-200'}`}>
                  <div className="flex items-start gap-2.5">
                    {healthResult.connected ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
                    )}
                    <div>
                      <p className="font-bold text-sm">{healthResult.message}</p>
                      {healthResult.details && <p className="mt-1 opacity-90">{healthResult.details}</p>}
                      {healthResult.latencyMs !== undefined && (
                        <p className="mt-1 text-[11px] opacity-75 font-mono">Temps de réponse : {healthResult.latencyMs} ms</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-[#2A3447] pt-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#C9A96E] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Isolation des données & RLS
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-[#141E30] rounded-xl border border-white/5 space-y-1">
                    <p className="font-bold text-white">Chiffrement en Transit</p>
                    <p className="text-[#A0AEC0] text-[11px]">TLS 1.3 + HSTS activé.</p>
                  </div>
                  <div className="p-3 bg-[#141E30] rounded-xl border border-white/5 space-y-1">
                    <p className="font-bold text-white">Isolation Multi-Agences</p>
                    <p className="text-[#A0AEC0] text-[11px]">Chaque table protégée par <code>agency_id</code>.</p>
                  </div>
                  <div className="p-3 bg-[#141E30] rounded-xl border border-white/5 space-y-1">
                    <p className="font-bold text-white">Protection des Agences</p>
                    <p className="text-[#A0AEC0] text-[11px]">Seuls ADMIN et SUPER_ADMIN peuvent créer.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}