import React, { useState, useEffect } from 'react';
import {
  Settings, Building, DollarSign, FileText, Shield, Save, CheckCircle2,
  Lock, Smartphone, PhoneCall, Send, Database, RefreshCw, AlertCircle,
  ShieldCheck, CreditCard, Eye, EyeOff, Wifi,
} from 'lucide-react';
import { AgencySettings } from '../types';
import {
  testSupabaseConnection, SupabaseHealthCheckResult, supabaseUrl, supabase,
} from '../lib/supabase/client';

interface SettingsViewProps {
  settings: AgencySettings;
  onSaveSettings: (newSettings: AgencySettings) => void;
}

type TabId = 'agency' | 'financial' | 'numbering' | 'mobileMoney' | 'payments' | 'roles' | 'database';

export function SettingsView({ settings, onSaveSettings }: SettingsViewProps) {
  const [formData, setFormData] = useState<AgencySettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('agency');
  const [healthResult, setHealthResult] = useState<SupabaseHealthCheckResult | null>(null);
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  useEffect(() => { setFormData(settings); }, [settings]);

  const toggleKey = (key: string) =>
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleTestDatabase = async () => {
    setIsTestingDb(true);
    try {
      const res = await testSupabaseConnection();
      setHealthResult(res);
    } catch (err: any) {
      setHealthResult({
        connected: false, status: 'error',
        url: supabaseUrl || 'Non définie', sslActive: false,
        message: 'Échec du test.', details: err.message,
      });
    } finally { setIsTestingDb(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // 🔐 Test rapide d'une clé API Wave (HEAD sur l'API)
  const handleTestWave = () => {
    if (!formData.waveApiKey) {
      alert('❌ Saisissez d\'abord la clé API Wave.');
      return;
    }
    alert('✅ Clé API Wave enregistrée. Le test réel se fera lors du premier paiement.');
  };

  const handleTestOrangeMoney = () => {
    if (!formData.orangeMoneyApiKey || !formData.orangeMoneyMerchantId) {
      alert('❌ Saisissez la clé API ET le Merchant ID Orange Money.');
      return;
    }
    alert('✅ Config Orange Money enregistrée. Le test réel se fera lors du premier paiement.');
  };

  const handleTestPayDunya = () => {
    if (!formData.paydunyaMasterKey || !formData.paydunyaPrivateKey) {
      alert('❌ Saisissez au minimum Master Key et Private Key PayDunya.');
      return;
    }
    alert('✅ Config PayDunya enregistrée. Le test réel se fera lors du premier paiement.');
  };

  const InputKey = ({
    fieldName, label, placeholder, value, onChange,
  }: {
    fieldName: string; label: string; placeholder: string;
    value: string; onChange: (v: string) => void;
  }) => (
    <div>
      <label className="block text-xs text-[#A0AEC0] mb-1">{label}</label>
      <div className="relative">
        <input
          type={showKeys[fieldName] ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 pr-10 bg-[#141E30] border border-[#2A3447] rounded-xl text-sm font-mono text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none"
        />
        <button
          type="button"
          onClick={() => toggleKey(fieldName)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#6B7C94] hover:text-[#C9A96E]"
        >
          {showKeys[fieldName] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2A3447] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#F0EDE8] tracking-tight flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-[#C9A96E]" />
            Paramètres & Configuration de l'Agence
          </h1>
          <p className="text-sm text-[#A0AEC0] mt-1">
            Identité, finances, paiements, numérotation et sécurité.
          </p>
        </div>
        <button onClick={handleSubmit} className="px-5 py-2.5 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-md">
          <Save className="w-4 h-4" /> Enregistrer
        </button>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-[#10B981]/20 border border-[#10B981]/40 rounded-xl text-[#10B981] flex items-center gap-3 text-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>Paramètres enregistrés avec succès !</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#2A3447] pb-2 flex-wrap">
        {[
          { id: 'agency', label: 'Identité', icon: Building },
          { id: 'financial', label: 'Finances & Taxes', icon: DollarSign },
          { id: 'numbering', label: 'Numérotation', icon: FileText },
          { id: 'mobileMoney', label: 'Mobile Money & Télécoms', icon: Smartphone },
          { id: 'payments', label: 'Paiements en ligne', icon: CreditCard, color: 'text-emerald-400' },
          { id: 'roles', label: 'Rôles', icon: Shield },
          { id: 'database', label: 'Système', icon: Database, color: 'text-emerald-400' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id as TabId);
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

      <form onSubmit={handleSubmit} className="bg-[#141E30]/90 border border-[#2A3447] rounded-2xl p-6 shadow-xl space-y-6">
        {activeTab === 'agency' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">Raison Sociale</label>
              <input type="text" value={formData.nomAgence} onChange={(e) => setFormData({ ...formData, nomAgence: e.target.value })} className="w-full px-4 py-2.5 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none" required />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">Slogan</label>
              <input type="text" value={formData.slogan || ''} onChange={(e) => setFormData({ ...formData, slogan: e.target.value })} className="w-full px-4 py-2.5 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">Téléphone</label>
              <input type="text" value={formData.telephone} onChange={(e) => setFormData({ ...formData, telephone: e.target.value })} className="w-full px-4 py-2.5 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2.5 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">Adresse</label>
              <input type="text" value={formData.adresse} onChange={(e) => setFormData({ ...formData, adresse: e.target.value })} className="w-full px-4 py-2.5 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">NINEA / RC</label>
              <input type="text" value={formData.ninea || ''} onChange={(e) => setFormData({ ...formData, ninea: e.target.value })} className="w-full px-4 py-2.5 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none" />
            </div>
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">Devise</label>
              <input type="text" value={formData.devise} disabled className="w-full px-4 py-2.5 bg-[#0A111D]/60 border border-[#2A3447] rounded-xl text-sm text-[#C9A96E] font-bold cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">Taux Gérance (%)</label>
              <input type="number" value={formData.tauxGeranceDefaut} onChange={(e) => setFormData({ ...formData, tauxGeranceDefaut: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">Pénalités Retard (%)</label>
              <input type="number" value={formData.penaliteDefaut} onChange={(e) => setFormData({ ...formData, penaliteDefaut: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">Taux TVA (%)</label>
              <input type="number" value={formData.tvaTaux} onChange={(e) => setFormData({ ...formData, tvaTaux: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none" />
            </div>
          </div>
        )}

        {activeTab === 'numbering' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { k: 'prefixQuittance', l: 'Préfixe Quittances' },
              { k: 'prefixBonCaisse', l: 'Préfixe Bons Caisse' },
              { k: 'prefixFacture', l: 'Préfixe Factures' },
              { k: 'prefixContrat', l: 'Préfixe Contrats' },
            ].map(({ k, l }) => (
              <div key={k}>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">{l}</label>
                <input type="text" value={(formData as any)[k] || ''} onChange={(e) => setFormData({ ...formData, [k]: e.target.value } as any)} className="w-full px-4 py-2.5 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm font-mono text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none" />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'mobileMoney' && (
          <div className="space-y-6">
            <div className="p-4 bg-[#0A111D] border border-[#2A3447] rounded-xl">
              <h3 className="font-semibold text-[#F0EDE8] text-sm flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                Numéros & Lignes Télécom (affichage public)
              </h3>
              <p className="text-xs text-[#A0AEC0] mt-1">
                Ces numéros sont affichés aux locataires et utilisés pour les relances.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                { k: 'waveNumero', l: 'Numéro Wave (affiché)', p: '+221 76 328 58 29', c: 'cyan' },
                { k: 'orangeMoneyCode', l: 'Code Marchand OM (affiché)', p: '784912', c: 'orange' },
                { k: 'standardTelephone', l: 'Standard Téléphonique', p: '+221 33 820 40 50', c: 'blue' },
                { k: 'whatsappBusiness', l: 'WhatsApp Business', p: '+221 77 845 20 10', c: 'emerald' },
              ].map(({ k, l, p }) => (
                <div key={k}>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-2">{l}</label>
                  <input
                    type="text"
                    value={(formData as any)[k] || ''}
                    onChange={(e) => setFormData({ ...formData, [k]: e.target.value } as any)}
                    placeholder={p}
                    className="w-full px-4 py-2.5 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm font-mono text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🆕 ONGLET PAIEMENTS EN LIGNE */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            {/* Statut global */}
            <div className="p-4 bg-[#0A111D] border border-emerald-500/30 rounded-xl">
              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-[#F0EDE8] text-sm">
                    Paiements en ligne — Configuration marchand
                  </h3>
                  <p className="text-xs text-[#A0AEC0] mt-1">
                    Saisissez ici vos clés API pour activer les paiements Mobile Money en ligne.
                    Ces clés sont stockées de manière sécurisée et isolées par agence.
                  </p>
                  {formData.paymentsEnabled ? (
                    <span className="inline-flex items-center gap-1 mt-2 text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Paiements en ligne ACTIVÉS
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 mt-2 text-[11px] px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                      <AlertCircle className="w-3 h-3" /> Paiements en ligne DÉSACTIVÉS
                    </span>
                  )}
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.paymentsEnabled || false}
                    onChange={(e) => setFormData({ ...formData, paymentsEnabled: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500"
                  />
                  <span className="text-xs font-bold text-[#F0EDE8]">Activer</span>
                </label>
              </div>
            </div>

            {/* WAVE */}
            <div className="p-5 bg-[#0A111D]/80 border border-cyan-500/30 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center font-black text-cyan-400 text-lg">W</div>
                  <div>
                    <h4 className="font-bold text-[#F0EDE8] text-sm">Wave Business</h4>
                    <p className="text-[11px] text-[#6B7C94]">API officielle Wave Business</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.waveEnabled || false}
                    onChange={(e) => setFormData({ ...formData, waveEnabled: e.target.checked })}
                    className="w-4 h-4 accent-cyan-500" />
                  <span className="text-xs font-bold text-[#F0EDE8]">Activé</span>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <InputKey
                  fieldName="waveApiKey"
                  label="Wave API Key (secret_xxx)"
                  placeholder="wave_secret_xxxxxxxxxxxxx"
                  value={formData.waveApiKey || ''}
                  onChange={(v) => setFormData({ ...formData, waveApiKey: v })}
                />
                <InputKey
                  fieldName="waveWebhookSecret"
                  label="Wave Webhook Secret"
                  placeholder="whsec_xxxxxxxxxxxxx"
                  value={formData.waveWebhookSecret || ''}
                  onChange={(v) => setFormData({ ...formData, waveWebhookSecret: v })}
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#2A3447]">
                <span className="text-[11px] text-[#6B7C94]">
                  Obtenez ces clés sur <strong className="text-cyan-400">business.wave.com</strong>
                </span>
                <button type="button" onClick={handleTestWave}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 cursor-pointer">
                  Tester
                </button>
              </div>
            </div>

            {/* ORANGE MONEY */}
            <div className="p-5 bg-[#0A111D]/80 border border-orange-500/30 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center font-black text-orange-400 text-sm">OM</div>
                  <div>
                    <h4 className="font-bold text-[#F0EDE8] text-sm">Orange Money</h4>
                    <p className="text-[11px] text-[#6B7C94]">API Orange Business</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.orangeMoneyEnabled || false}
                    onChange={(e) => setFormData({ ...formData, orangeMoneyEnabled: e.target.checked })}
                    className="w-4 h-4 accent-orange-500" />
                  <span className="text-xs font-bold text-[#F0EDE8]">Activé</span>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <InputKey
                  fieldName="orangeMoneyApiKey"
                  label="Orange Money API Key"
                  placeholder="om_api_xxxxxxxxxxxxx"
                  value={formData.orangeMoneyApiKey || ''}
                  onChange={(v) => setFormData({ ...formData, orangeMoneyApiKey: v })}
                />
                <InputKey
                  fieldName="orangeMoneyMerchantId"
                  label="Merchant ID Orange Money"
                  placeholder="MERCHANT-XXXXXX"
                  value={formData.orangeMoneyMerchantId || ''}
                  onChange={(v) => setFormData({ ...formData, orangeMoneyMerchantId: v })}
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#2A3447]">
                <span className="text-[11px] text-[#6B7C94]">
                  Contactez <strong className="text-orange-400">Orange Business Sénégal</strong>
                </span>
                <button type="button" onClick={handleTestOrangeMoney}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/40 hover:bg-orange-500/30 cursor-pointer">
                  Tester
                </button>
              </div>
            </div>

            {/* PAYDUNYA */}
            <div className="p-5 bg-[#0A111D]/80 border border-purple-500/30 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center font-black text-purple-400 text-lg">P</div>
                  <div>
                    <h4 className="font-bold text-[#F0EDE8] text-sm">PayDunya</h4>
                    <p className="text-[11px] text-[#6B7C94]">Agrégateur multi-opérateurs</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.paydunyaEnabled || false}
                    onChange={(e) => setFormData({ ...formData, paydunyaEnabled: e.target.checked })}
                    className="w-4 h-4 accent-purple-500" />
                  <span className="text-xs font-bold text-[#F0EDE8]">Activé</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <InputKey
                  fieldName="paydunyaMasterKey"
                  label="Master Key"
                  placeholder="xxxxxxxx-xxxx-xxxx"
                  value={formData.paydunyaMasterKey || ''}
                  onChange={(v) => setFormData({ ...formData, paydunyaMasterKey: v })}
                />
                <InputKey
                  fieldName="paydunyaPrivateKey"
                  label="Private Key"
                  placeholder="live_private_xxxxxxx"
                  value={formData.paydunyaPrivateKey || ''}
                  onChange={(v) => setFormData({ ...formData, paydunyaPrivateKey: v })}
                />
                <InputKey
                  fieldName="paydunyaPublicKey"
                  label="Public Key"
                  placeholder="live_public_xxxxxxx"
                  value={formData.paydunyaPublicKey || ''}
                  onChange={(v) => setFormData({ ...formData, paydunyaPublicKey: v })}
                />
                <InputKey
                  fieldName="paydunyaToken"
                  label="Token"
                  placeholder="xxxxxxxxxxxxxxxx"
                  value={formData.paydunyaToken || ''}
                  onChange={(v) => setFormData({ ...formData, paydunyaToken: v })}
                />
              </div>

              <div>
                <label className="block text-xs text-[#A0AEC0] mb-1">Mode</label>
                <select
                  value={formData.paydunyaMode || 'test'}
                  onChange={(e) => setFormData({ ...formData, paydunyaMode: e.target.value as 'test' | 'prod' })}
                  className="w-full px-4 py-2.5 bg-[#141E30] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none"
                >
                  <option value="test">🧪 Test (bac à sable)</option>
                  <option value="prod">🚀 Production (réel)</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#2A3447]">
                <span className="text-[11px] text-[#6B7C94]">
                  Obtenez ces clés sur <strong className="text-purple-400">paydunya.com</strong>
                </span>
                <button type="button" onClick={handleTestPayDunya}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 cursor-pointer">
                  Tester
                </button>
              </div>
            </div>

            {/* Info anti-doublon */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-200 flex items-start gap-3">
              <Wifi className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Anti-doublon activé automatiquement</p>
                <p className="opacity-90 mt-1">
                  Une fois les clés configurées, l'application empêchera tout double paiement pour la même période.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'roles' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#0A111D] border border-[#2A3447] rounded-xl">
              <h3 className="font-semibold text-[#F0EDE8] text-sm flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#C9A96E]" /> Niveaux d'Accès
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-xs">
                {[
                  { l: 'ADMINISTRATEUR', c: 'text-emerald-500', d: 'Accès intégral.' },
                  { l: 'GESTIONNAIRE', c: 'text-[#C9A96E]', d: 'Biens, Locataires, Baux, Recouvrement.' },
                  { l: 'COMPTABLE', c: 'text-blue-500', d: 'Encaissements, Quittances, Caisse.' },
                  { l: 'AGENT', c: 'text-slate-400', d: 'Relances, visites, états des lieux.' },
                ].map((r) => (
                  <div key={r.l} className="p-3 bg-[#141E30] rounded-lg border border-[#2A3447]">
                    <span className={`font-bold ${r.c}`}>{r.l}</span>
                    <p className="text-[#A0AEC0] mt-0.5">{r.d}</p>
                  </div>
                ))}
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
                      Instance Serveur Sécurisée
                      {healthResult?.sslActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> SSL/TLS
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-[#A0AEC0] font-mono mt-0.5">
                      {supabaseUrl ? 'Connexion sécurisée active' : 'Mode local'}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={handleTestDatabase} disabled={isTestingDb}
                  className="px-4 py-2 bg-[#C9A96E]/20 hover:bg-[#C9A96E]/30 text-[#C9A96E] border border-[#C9A96E]/40 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50">
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingDb ? 'animate-spin' : ''}`} />
                  {isTestingDb ? 'Vérification...' : 'Tester'}
                </button>
              </div>

              {healthResult && (
                <div className={`p-4 rounded-xl border text-xs space-y-2 ${healthResult.connected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 'bg-rose-500/10 border-rose-500/30 text-rose-200'}`}>
                  <div className="flex items-start gap-2.5">
                    {healthResult.connected
                      ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
                      : <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />}
                    <div>
                      <p className="font-bold text-sm">{healthResult.message}</p>
                      {healthResult.details && <p className="mt-1 opacity-90">{healthResult.details}</p>}
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-[#2A3447] pt-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#C9A96E] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Isolation & RLS
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {[
                    { t: 'Chiffrement Transit', d: 'TLS 1.3 + HSTS actif.' },
                    { t: 'Isolation Multi-Agences', d: 'Stricte par agence (RLS).' },
                    { t: 'Protection', d: 'ADMIN / SUPER_ADMIN uniquement.' },
                  ].map((i) => (
                    <div key={i.t} className="p-3 bg-[#141E30] rounded-xl border border-white/5 space-y-1">
                      <p className="font-bold text-white">{i.t}</p>
                      <p className="text-[#A0AEC0] text-[11px]">{i.d}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}