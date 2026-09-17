import React, { useState } from 'react';
import {
  BellRing,
  Sparkles,
  Send,
  MessageSquare,
  Mail,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Copy,
  ExternalLink,
  RefreshCw,
  Printer,
  ChevronDown,
  Calendar,
  DollarSign,
  ShieldAlert,
  PhoneCall,
  Smartphone,
} from 'lucide-react';
import {
  Tenant,
  Property,
  TenantReminder,
  ReminderLevel,
  ReminderChannel,
} from '../types';
import { formatCurrency, formatNumber, formatDate, copyToClipboard } from '../lib/utils';
import { triggerPhoneCall, triggerSMS, triggerWhatsApp } from '../lib/comms/commsHelper';
import { generateWavePaymentLink } from '../lib/payments/mobileMoney';

interface AutomatedRemindersViewProps {
  tenants: Tenant[];
  properties: Property[];
  reminders: TenantReminder[];
  onAddReminder: (reminder: TenantReminder) => void;
  onOpenReceipt?: (tenant: Tenant) => void;
}

export const AutomatedRemindersView: React.FC<AutomatedRemindersViewProps> = ({
  tenants,
  properties,
  reminders,
  onAddReminder,
}) => {
  const overdueTenants = tenants.filter((t) => t.statut === 'Impayé' || t.statut === 'Retard');
  const [selectedTenantId, setSelectedTenantId] = useState<string>(
    overdueTenants[0]?.id || tenants[0]?.id || ''
  );
  const [selectedChannel, setSelectedChannel] = useState<ReminderChannel>('WhatsApp');
  const [selectedLevel, setSelectedLevel] = useState<ReminderLevel>('Niveau 1: Courtois (J+3)');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [bulkProgress, setBulkProgress] = useState<string | null>(null);

  const activeTenant = tenants.find((t) => t.id === selectedTenantId) || overdueTenants[0];
  const activeProperty = properties.find((p) => p.id === activeTenant?.bienId);

  // Auto determine appropriate severity level based on days of delay
  const getSuggestedLevel = (days: number): ReminderLevel => {
    if (days <= 5) return 'Niveau 1: Courtois (J+3)';
    if (days <= 12) return 'Niveau 2: Modéré (J+10)';
    if (days <= 20) return 'Niveau 3: Ferme & Pénalités (J+15)';
    return 'Niveau 4: Mise en demeure juridique (J+25)';
  };

  // Generate Message using backend Gemini API route
  const handleGenerateMessage = async (
    tenant?: Tenant,
    level?: ReminderLevel,
    channel?: ReminderChannel
  ) => {
    const t = tenant || activeTenant;
    if (!t) return;

    const p = properties.find((prop) => prop.id === t.bienId);
    const targetLevel = level || selectedLevel;
    const targetChannel = channel || selectedChannel;

    setIsGenerating(true);
    try {
      const res = await fetch('/api/gemini/relance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locataireNom: `${t.prenom} ${t.nom}`,
          bienNom: p?.nom || t.bienNom,
          montantDu: t.arrieresCumules || t.loyerMensuel,
          joursRetard: t.joursRetard || 7,
          niveau: targetLevel,
          canal: targetChannel,
          dateEcheance: '5 du mois courant',
          penalites: t.joursRetard > 10 ? Math.round(t.loyerMensuel * 0.1) : 0,
        }),
      });
      const data = await res.json();
      if (data && data.message) {
        setCustomMessage(data.message);
      } else {
        setCustomMessage(
          `Bonjour *${t.prenom} ${t.nom}*,\n\nSauf erreur de notre part, nous n'avons pas encore enregistré le règlement de votre loyer de *${(t.arrieresCumules || t.loyerMensuel).toLocaleString('fr-FR')} FCFA* pour le logement *${p?.nom || t.bienNom || 'FITAL-IMMO'}*.\n\nMerci de bien vouloir procéder à la régularisation dès que possible via Wave, Orange Money ou virement bancaire.\n\n*Service Gestion Locative FITAL-IMMO*`
        );
      }
    } catch (err) {
      console.warn('Notice generating AI reminder, using local template:', err);
      setCustomMessage(
        `Bonjour *${t.prenom} ${t.nom}*,\n\nSauf erreur de notre part, nous constatons un retard sur le loyer de *${(t.arrieresCumules || t.loyerMensuel).toLocaleString('fr-FR')} FCFA* pour le logement *${p?.nom || t.bienNom || 'FITAL-IMMO'}*.\n\nMerci de régulariser votre situation dès que possible via Wave, Orange Money ou virement bancaire.\n\n*Service Gestion Locative FITAL-IMMO*`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Initial message load when active tenant changes
  React.useEffect(() => {
    if (activeTenant) {
      const suggested = getSuggestedLevel(activeTenant.joursRetard);
      setSelectedLevel(suggested);
      handleGenerateMessage(activeTenant, suggested, selectedChannel);
    }
  }, [selectedTenantId, selectedChannel]);

  const handleCopy = async () => {
    const ok = await copyToClipboard(customMessage);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Open direct WhatsApp URL
  const handleSendWhatsApp = () => {
    if (!activeTenant) return;
    const phoneClean = activeTenant.telephone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(customMessage);
    window.open(`https://wa.me/${phoneClean}?text=${encoded}`, '_blank');

    // Register reminder to history
    onAddReminder({
      id: `rem-${Date.now()}`,
      locataireId: activeTenant.id,
      locataireNom: `${activeTenant.prenom} ${activeTenant.nom}`,
      telephone: activeTenant.telephone,
      email: activeTenant.email,
      bienNom: activeTenant.bienNom,
      montantDu: activeTenant.arrieresCumules || activeTenant.loyerMensuel,
      penalites: activeTenant.joursRetard > 10 ? Math.round(activeTenant.loyerMensuel * 0.1) : 0,
      joursRetard: activeTenant.joursRetard,
      niveau: selectedLevel,
      canal: 'WhatsApp',
      message: customMessage,
      statut: 'Envoyé',
      dateCreation: new Date().toISOString().split('T')[0],
      dateEnvoi: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    });
  };

  // Bulk automated relances preparation
  const handleBulkReminders = async () => {
    setBulkProgress('Génération des relances personnalisées pour tous les locataires en retard...');
    for (const t of overdueTenants) {
      const level = getSuggestedLevel(t.joursRetard);
      onAddReminder({
        id: `rem-bulk-${Date.now()}-${t.id}`,
        locataireId: t.id,
        locataireNom: `${t.prenom} ${t.nom}`,
        telephone: t.telephone,
        email: t.email,
        bienNom: t.bienNom,
        montantDu: t.arrieresCumules || t.loyerMensuel,
        penalites: t.joursRetard > 10 ? Math.round(t.loyerMensuel * 0.1) : 0,
        joursRetard: t.joursRetard,
        niveau: level,
        canal: 'WhatsApp',
        message: `Rappel de loyer pour ${t.bienNom} : montant de ${(t.arrieresCumules || t.loyerMensuel).toLocaleString('fr-FR')} FCFA (${t.joursRetard}j de retard). Merci de régulariser. - Service Recouvrement FITAL-IMMO`,
        statut: 'Envoyé',
        dateCreation: new Date().toISOString().split('T')[0],
        dateEnvoi: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      });
    }
    setTimeout(() => {
      setBulkProgress(null);
      alert(`✅ Relances groupées préparées et enregistrées avec succès pour ${overdueTenants.length} locataires.`);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Banner Intro */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#1E2E45] via-[#162133] to-[#1E2E45] border border-[#C9A96E]/30 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C9A96E] via-[#E8A84A] to-[#A07840] flex items-center justify-center text-[#0F1B2D] shadow-lg shadow-[#C9A96E]/20 flex-shrink-0">
            <BellRing className="w-6 h-6" />
          </div>
          <div>
            <div className="text-base font-bold text-white flex items-center gap-2">
              <span>Automatisation des Relances Intelligentes</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                Multi-Canaux IA
              </span>
            </div>
            <p className="text-xs text-[#A8B4C4] mt-0.5">
              Génération automatique de relances calibrées (WhatsApp, SMS, Email & Mise en demeure juridique)
            </p>
          </div>
        </div>

        <button
          onClick={handleBulkReminders}
          disabled={overdueTenants.length === 0 || !!bulkProgress}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>{bulkProgress ? 'Traitement en cours...' : `Relancer tous les impayés (${overdueTenants.length})`}</span>
        </button>
      </div>

      {/* Main Studio: Left Selector & Right Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Tenant Selection & Severity Config */}
        <div className="lg:col-span-5 space-y-4">
          {/* Overdue Tenants List */}
          <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl">
            <div className="text-xs font-bold text-white mb-3 flex items-center justify-between">
              <span>Sélectionner le dossier locataire</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold">
                {overdueTenants.length} en retard
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {overdueTenants.map((t) => {
                const isSelected = t.id === selectedTenantId;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTenantId(t.id)}
                    className={`w-full p-3 rounded-xl text-left transition-all border flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#C9A96E]/20 to-[#C9A96E]/5 border-[#C9A96E] text-white shadow-md'
                        : 'bg-[#1E2E45]/40 border-[#C9A96E]/10 hover:border-[#C9A96E]/30 text-[#A8B4C4]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {t.prenom} {t.nom}
                      </div>
                      <div className="text-[11px] text-[#A8B4C4] truncate">{t.bienNom}</div>
                      <div className="text-[10px] text-rose-400 font-semibold mt-0.5">
                        {formatCurrency(t.arrieresCumules || t.loyerMensuel)} · {t.joursRetard}j de retard
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                        t.joursRetard > 20
                          ? 'bg-rose-500/20 text-rose-300'
                          : t.joursRetard > 10
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-sky-500/20 text-sky-300'
                      }`}
                    >
                      J+{t.joursRetard}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Level & Channel Controls */}
          <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl space-y-4">
            <div>
              <label className="text-xs font-bold text-[#E8D5B0] block mb-2">
                1. Niveau de Sévérité & Étape
              </label>
              <div className="space-y-1.5">
                {[
                  { level: 'Niveau 1: Courtois (J+3)' as ReminderLevel, desc: 'Rappel amical de bienveillance', color: 'text-sky-300' },
                  { level: 'Niveau 2: Modéré (J+10)' as ReminderLevel, desc: 'Rappel formel avant pénalités', color: 'text-amber-300' },
                  { level: 'Niveau 3: Ferme & Pénalités (J+15)' as ReminderLevel, desc: 'Application pénalité 10% + délai 48h', color: 'text-orange-400' },
                  { level: 'Niveau 4: Mise en demeure juridique (J+25)' as ReminderLevel, desc: 'Sommation légale avant huissier', color: 'text-rose-400' },
                ].map((item) => (
                  <button
                    key={item.level}
                    onClick={() => {
                      setSelectedLevel(item.level);
                      handleGenerateMessage(activeTenant, item.level, selectedChannel);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                      selectedLevel === item.level
                        ? 'bg-[#1E2E45] border-[#C9A96E] font-semibold text-white'
                        : 'bg-[#1E2E45]/40 border-transparent text-[#A8B4C4] hover:bg-[#1E2E45]/80'
                    }`}
                  >
                    <div>
                      <div className={item.color}>{item.level}</div>
                      <div className="text-[10px] text-[#6B7C94]">{item.desc}</div>
                    </div>
                    {selectedLevel === item.level && <CheckCircle2 className="w-4 h-4 text-[#C9A96E]" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#E8D5B0] block mb-2">
                2. Canal de Diffusion Ciblé
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'WhatsApp' as ReminderChannel, label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-400' },
                  { id: 'SMS' as ReminderChannel, label: 'SMS Court', icon: Send, color: 'text-sky-400' },
                  { id: 'Email' as ReminderChannel, label: 'Email Formel', icon: Mail, color: 'text-amber-400' },
                ].map((ch) => {
                  const Icon = ch.icon;
                  const isSel = selectedChannel === ch.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => {
                        setSelectedChannel(ch.id);
                        handleGenerateMessage(activeTenant, selectedLevel, ch.id);
                      }}
                      className={`p-2.5 rounded-xl border text-center text-xs flex flex-col items-center gap-1.5 transition-all ${
                        isSel
                          ? 'bg-[#1E2E45] border-[#C9A96E] text-white font-bold shadow-sm'
                          : 'bg-[#1E2E45]/40 border-transparent text-[#A8B4C4] hover:bg-[#1E2E45]/80'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${ch.color}`} />
                      <span>{ch.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: AI Live Preview & Actions */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/25 shadow-2xl flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#C9A96E]/15">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#C9A96E]/15 text-[#C9A96E] flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    Aperçu du Message — {selectedChannel} ({selectedLevel.split(':')[0]})
                  </div>
                  <div className="text-[10px] text-[#A8B4C4]">
                    Destinataire : {activeTenant?.prenom} {activeTenant?.nom} ({activeTenant?.telephone})
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleGenerateMessage()}
                disabled={isGenerating}
                className="px-2.5 py-1 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#C9A96E] text-xs font-medium border border-[#C9A96E]/20 transition-all flex items-center gap-1.5"
                title="Régénérer avec l'IA Gemini"
              >
                <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>Régénérer</span>
              </button>
            </div>

            {/* Editable Content */}
            <div className="my-4 flex-1">
              <div className="relative">
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={10}
                  className="w-full p-4 rounded-xl bg-[#0F1B2D]/80 border border-[#C9A96E]/20 text-xs text-white placeholder:text-[#6B7C94] focus:outline-none focus:border-[#C9A96E] focus:ring-1 focus:ring-[#C9A96E] font-sans leading-relaxed transition-all shadow-inner"
                  placeholder="Génération du message en cours..."
                />
                {isGenerating && (
                  <div className="absolute inset-0 bg-[#0F1B2D]/80 backdrop-blur-sm rounded-xl flex items-center justify-center gap-2 text-xs text-[#C9A96E] font-medium">
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>L'IA rédige la relance personnalisée...</span>
                  </div>
                )}
              </div>
              <div className="text-[10px] text-[#6B7C94] mt-1.5 flex items-center justify-between">
                <span>{customMessage.length} caractères</span>
                <span>Variables auto-remplies : Nom, Bien, Montant, Pénalités, Délai</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-3 border-t border-[#C9A96E]/15 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] text-xs text-[#E8D5B0] font-medium border border-[#C9A96E]/20 transition-all flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copié !' : 'Copier'}</span>
                </button>

                {activeTenant && (
                  <>
                    <button
                      type="button"
                      onClick={() => triggerPhoneCall(activeTenant.telephone)}
                      className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                      title="Passer un appel téléphonique direct"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
                      <span>Appeler ({activeTenant.telephone})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const amount = activeTenant.arrieresCumules || activeTenant.loyerMensuel;
                        const waveUrl = generateWavePaymentLink(amount, `LOY-${activeTenant.nom}`);
                        setCustomMessage((prev) => `${prev}\n\n👉 Réglez instantanément via Wave : ${waveUrl}`);
                      }}
                      className="px-3 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                      title="Ajouter le lien de paiement direct Wave au message"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                      <span>+ Lien Wave</span>
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedChannel === 'WhatsApp' && (
                  <button
                    onClick={handleSendWhatsApp}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-900/40 flex items-center gap-2 transition-all hover:scale-105"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Ouvrir WhatsApp & Envoyer</span>
                  </button>
                )}

                {selectedChannel === 'SMS' && (
                  <a
                    href={`sms:${activeTenant?.telephone}?body=${encodeURIComponent(customMessage)}`}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 text-white font-bold text-xs shadow-lg shadow-sky-900/40 flex items-center gap-2 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>Envoyer par SMS</span>
                  </a>
                )}

                {selectedChannel === 'Email' && (
                  <a
                    href={`mailto:${activeTenant?.email}?subject=${encodeURIComponent(
                      `Rappel de loyer - ${activeTenant?.bienNom}`
                    )}&body=${encodeURIComponent(customMessage)}`}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-lg shadow-[#C9A96E]/30 flex items-center gap-2 transition-all hover:scale-105"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Ouvrir dans Messagerie</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Reminders Log */}
      <div className="p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C9A96E]" />
              <span>Historique des Relances & Traçabilité</span>
            </div>
            <div className="text-xs text-[#6B7C94] mt-0.5">
              Journal des notifications envoyées avec dates, canaux et accusés
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#1E2E45] text-[#E8D5B0] border border-[#C9A96E]/20">
            {reminders.length} relances enregistrées
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#1E2E45]/80 text-[#A8B4C4] font-semibold uppercase tracking-wider text-[10px] border-b border-[#C9A96E]/15">
                <th className="py-2.5 px-3">Date & Heure</th>
                <th className="py-2.5 px-3">Locataire</th>
                <th className="py-2.5 px-3">Bien Loué</th>
                <th className="py-2.5 px-3">Niveau</th>
                <th className="py-2.5 px-3">Canal</th>
                <th className="py-2.5 px-3 text-right">Montant Dû</th>
                <th className="py-2.5 px-3 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9A96E]/10">
              {reminders.map((r) => (
                <tr key={r.id} className="hover:bg-[#1E2E45]/40 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-[#A8B4C4]">
                    {r.dateCreation} {r.dateEnvoi ? `(${r.dateEnvoi})` : ''}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-white">{r.locataireNom}</td>
                  <td className="py-2.5 px-3 text-[#A8B4C4] truncate max-w-[180px]">{r.bienNom}</td>
                  <td className="py-2.5 px-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#1E2E45] text-[#E8D5B0] border border-[#C9A96E]/20 font-medium">
                      {r.niveau.split(':')[0]}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-white">{r.canal}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-400">
                    {formatCurrency(r.montantDu)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                      {r.statut}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
