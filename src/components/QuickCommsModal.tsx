import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  MessageSquare,
  Send,
  User,
  Building,
  Phone,
  Copy,
  Check,
  ExternalLink,
  Users,
  Search,
  CheckCircle2,
  Clock,
  Smartphone,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { Tenant, Owner, Property } from '../types';
import { 
  triggerPhoneCall, 
  triggerSMS, 
  triggerWhatsApp, 
  getRentReminderTemplate, 
  getPaymentReceiptTemplate, 
  getOwnerDisbursementTemplate,
  getMaintenanceNoticeTemplate,
  CommsContact 
} from '../lib/comms/commsHelper';
import { formatCurrencyFCFA } from '../lib/calculations/financial';
import { defaultMobileMoneyConfig } from '../lib/payments/mobileMoney';

export interface QuickCommsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenants?: Tenant[];
  owners?: Owner[];
  properties?: Property[];
  initialContact?: CommsContact | null;
  // Props de compatibilité directe pour les fiches locataires / recouvrement
  recipientName?: string;
  recipientPhone?: string;
  recipientRole?: string;
  propertyNom?: string;
  dueAmount?: number;
  daysLate?: number;
}

export const QuickCommsModal: React.FC<QuickCommsModalProps> = ({
  isOpen,
  onClose,
  tenants = [],
  owners = [],
  properties = [],
  initialContact = null,
  recipientName,
  recipientPhone,
  recipientRole = 'Locataire',
  propertyNom = 'Bien immobilier',
  dueAmount = 0,
  daysLate = 0,
}) => {
  const [activeTab, setActiveTab] = useState<'call' | 'whatsapp' | 'sms'>('whatsapp');
  const [selectedTargetType, setSelectedTargetType] = useState<'TENANT' | 'OWNER' | 'DIRECT'>(
    recipientName ? 'DIRECT' : 'TENANT'
  );
  const [selectedEntityId, setSelectedEntityId] = useState<string>(initialContact?.id || tenants[0]?.id || '');
  const [customPhone, setCustomPhone] = useState<string>(recipientPhone || initialContact?.phone || '+221 77 000 00 00');
  const [customName, setCustomName] = useState<string>(recipientName || initialContact?.name || 'Contact');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('rappel_loyer');
  const [messageBody, setMessageBody] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [searchContact, setSearchContact] = useState<string>('');

  // Selected Tenant / Owner entity if picking from dropdown
  const selectedTenant = tenants.find((t) => t.id === selectedEntityId);
  const selectedOwner = owners.find((o) => o.id === selectedEntityId);

  // Active Contact Resolution
  const activeName = recipientName || (
    selectedTargetType === 'TENANT' 
      ? (selectedTenant ? `${selectedTenant.prenom} ${selectedTenant.nom}` : customName)
      : selectedTargetType === 'OWNER'
      ? (selectedOwner ? `${selectedOwner.prenom} ${selectedOwner.nom}` : customName)
      : customName
  );

  const activePhone = recipientPhone || (
    selectedTargetType === 'TENANT' 
      ? (selectedTenant?.telephone || customPhone)
      : selectedTargetType === 'OWNER'
      ? (selectedOwner?.telephone || customPhone)
      : customPhone
  );

  const activeProperty = propertyNom || (selectedTenant ? selectedTenant.bienNom : 'Bien immobilier');
  const activeAmount = dueAmount || (selectedTenant ? (selectedTenant.arrieresCumules || selectedTenant.loyerMensuel) : 150000);
  const activeDaysLate = daysLate || (selectedTenant ? selectedTenant.joursRetard : 0);

  // Auto populate message on template or entity change
  useEffect(() => {
    if (selectedTemplate === 'rappel_loyer') {
      setMessageBody(getRentReminderTemplate(activeName, activeProperty, activeAmount, 'Mois en cours', activeDaysLate));
    } else if (selectedTemplate === 'quittance') {
      setMessageBody(getPaymentReceiptTemplate(activeName, activeProperty, activeAmount, `QUI-2026-${Math.floor(100+Math.random()*900)}`, 'Mois en cours'));
    } else if (selectedTemplate === 'reversement_bailleur') {
      setMessageBody(getOwnerDisbursementTemplate(activeName, 'Mois en cours', activeAmount, `BCA-2026-${Math.floor(100+Math.random()*900)}`));
    } else if (selectedTemplate === 'intervention_technique') {
      setMessageBody(getMaintenanceNoticeTemplate(activeName, activeProperty, 'Visite technique & contrôle équipement', 'Demain'));
    } else if (selectedTemplate === 'libre') {
      if (!messageBody) {
        setMessageBody(`Bonjour ${activeName},\n\nNous vous contactons de la part de l'agence FITAL-IMMO Dakar concernant la gestion de votre dossier.\n\nCordialement,\n_Service Gestion Locative FITAL-IMMO_`);
      }
    }
  }, [selectedTemplate, selectedEntityId, selectedTargetType, activeName, activePhone, activeAmount, activeDaysLate]);

  if (!isOpen) return null;

  const handleCall = () => {
    if (!activePhone) {
      alert('Veuillez renseigner un numéro de téléphone valide.');
      return;
    }
    triggerPhoneCall(activePhone);
  };

  const handleSendSMS = () => {
    if (!activePhone || !messageBody) {
      alert('Numéro et message requis.');
      return;
    }
    triggerSMS(activePhone, messageBody);
  };

  const handleSendWhatsApp = () => {
    if (!activePhone || !messageBody) {
      alert('Numéro et message requis.');
      return;
    }
    triggerWhatsApp(activePhone, messageBody);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#111C2E] border border-[#C9A96E]/30 rounded-3xl w-full max-w-2xl max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#162133]/95 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#C9A96E] to-[#A07840] text-[#0A111D] flex items-center justify-center font-bold shadow-lg">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  Centre de Communication Direct
                </span>
                <span className="text-xs text-slate-400 font-mono">Appels • SMS • WhatsApp</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-0.5">Contacter : {activeName}</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            ✕
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Target Profile Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1A253A] to-[#162133] border border-[#C9A96E]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Destinataire ({recipientRole})
              </div>
              <div className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
                <span>{activeName}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-lg bg-white/10 text-[#E8D5B0]">
                  {activePhone}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                <span>Biens : <strong className="text-white">{activeProperty}</strong></span>
                {activeAmount > 0 && (
                  <span>Montant : <strong className="text-emerald-400">{formatCurrencyFCFA(activeAmount)}</strong></span>
                )}
              </div>
            </div>

            {/* Quick action buttons in profile card */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCall}
                className="px-3 py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                title="Lancer l'appel téléphonique"
              >
                <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
                <span>Appeler</span>
              </button>
              <button
                onClick={handleSendWhatsApp}
                className="px-3 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                title="Ouvrir WhatsApp"
              >
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Action Tabs : WhatsApp / SMS / Appel */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                activeTab === 'whatsapp'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <Send className="w-4 h-4 text-emerald-400" />
              <span>WhatsApp Direct</span>
            </button>
            <button
              onClick={() => setActiveTab('sms')}
              className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                activeTab === 'sms'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-purple-400" />
              <span>SMS Officiel</span>
            </button>
            <button
              onClick={() => setActiveTab('call')}
              className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                activeTab === 'call'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <PhoneCall className="w-4 h-4 text-blue-400" />
              <span>Appel Téléphonique</span>
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'call' ? (
            <div className="p-6 rounded-2xl bg-[#0D1624] border border-blue-500/30 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto shadow-inner border border-blue-500/40">
                <PhoneCall className="w-8 h-8 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Appel direct via Réseau Mobile ou VoIP</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Déclenche instantanément l'appel vers <strong className="text-white font-mono">{activePhone}</strong> via l'application de téléphonie par défaut.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/5 font-mono text-sm text-[#E8D5B0] max-w-xs mx-auto border border-white/10">
                {activePhone}
              </div>

              <button
                onClick={handleCall}
                className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 mx-auto transition-all"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Lancer l'Appel Immédiat</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Template Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Modèle de message pré-formaté
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('rappel_loyer')}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      selectedTemplate === 'rappel_loyer'
                        ? 'bg-[#C9A96E]/20 border-[#C9A96E] text-[#E8D5B0] font-bold'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    Rappel Loyer & Liens
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('quittance')}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      selectedTemplate === 'quittance'
                        ? 'bg-[#C9A96E]/20 border-[#C9A96E] text-[#E8D5B0] font-bold'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    Reçu & Quittance
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('reversement_bailleur')}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      selectedTemplate === 'reversement_bailleur'
                        ? 'bg-[#C9A96E]/20 border-[#C9A96E] text-[#E8D5B0] font-bold'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    Avis Reversement
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('libre')}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      selectedTemplate === 'libre'
                        ? 'bg-[#C9A96E]/20 border-[#C9A96E] text-[#E8D5B0] font-bold'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    Message Libre
                  </button>
                </div>
              </div>

              {/* Message Editor */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span>Contenu du message ({activeTab === 'whatsapp' ? 'WhatsApp avec liens Wave' : 'SMS GSM'})</span>
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="flex items-center gap-1 text-[#C9A96E] hover:underline"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>

                <textarea
                  rows={6}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-[#0D1624] border border-white/10 text-xs text-white font-sans focus:outline-none focus:border-[#C9A96E] leading-relaxed resize-none"
                  placeholder="Écrivez votre message..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                {activeTab === 'whatsapp' ? (
                  <button
                    onClick={handleSendWhatsApp}
                    className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                  >
                    <Send className="w-4 h-4" />
                    <span>Envoyer sur WhatsApp ({activePhone})</span>
                  </button>
                ) : (
                  <button
                    onClick={handleSendSMS}
                    className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Envoyer le SMS ({activePhone})</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
