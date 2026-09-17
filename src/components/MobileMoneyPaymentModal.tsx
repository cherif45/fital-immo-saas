import React, { useState } from 'react';
import { 
  Smartphone, 
  ExternalLink, 
  QrCode, 
  Copy, 
  Check, 
  Share2, 
  PhoneCall, 
  ShieldCheck, 
  Receipt,
  ArrowRight,
  Sparkles,
  Building2,
  Coins
} from 'lucide-react';
import { formatCurrencyFCFA } from '../lib/calculations/financial';
import { 
  generateWavePaymentUrl, 
  generateWaveDeepLink, 
  generateOrangeMoneyUssd, 
  generateOrangeMoneyDialerUrl, 
  generatePaymentQRCodeUrl,
  defaultMobileMoneyConfig 
} from '../lib/payments/mobileMoney';
import { triggerWhatsApp, triggerSMS } from '../lib/comms/commsHelper';
import { PaymentMethodCode } from '../types';

interface MobileMoneyPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  tenantName: string;
  tenantPhone?: string;
  propertyNom: string;
  period?: string;
  reference?: string;
  onConfirmPayment?: (amount: number, method: PaymentMethodCode, transactionRef: string) => void;
}

export const MobileMoneyPaymentModal: React.FC<MobileMoneyPaymentModalProps> = ({
  isOpen,
  onClose,
  amount,
  tenantName,
  tenantPhone = '+221 77 000 00 00',
  propertyNom,
  period = 'Mois en cours',
  reference = `LOY-${Date.now().toString().slice(-6)}`,
  onConfirmPayment,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'WAVE' | 'ORANGE_MONEY' | 'FREE_MONEY'>('WAVE');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [transactionIdInput, setTransactionIdInput] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const wavePayUrl = generateWavePaymentUrl(amount, defaultMobileMoneyConfig.wavePhone, reference);
  const waveDeepLink = generateWaveDeepLink(amount, defaultMobileMoneyConfig.wavePhone, reference);
  const omUssdCode = generateOrangeMoneyUssd(defaultMobileMoneyConfig.orangeMoneyMerchantCode, amount);
  const omDialerUrl = generateOrangeMoneyDialerUrl(defaultMobileMoneyConfig.orangeMoneyMerchantCode, amount);
  
  const qrCodeUrl = selectedMethod === 'WAVE' 
    ? generatePaymentQRCodeUrl(wavePayUrl) 
    : generatePaymentQRCodeUrl(`OM:SEN:${defaultMobileMoneyConfig.orangeMoneyMerchantCode}:${amount}:${reference}`);

  const handleLaunchWave = () => {
    // Open the official Wave payment URL in a new window/tab
    window.open(wavePayUrl, '_blank');
  };

  const handleDialOrangeMoney = () => {
    window.location.href = omDialerUrl;
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(wavePayUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareOnWhatsApp = () => {
    const text = `💳 *FITAL-IMMO — Demande de Paiement de Loyer*\n\n` +
      `Bonjour *${tenantName}*,\n` +
      `Voici votre lien de paiement direct pour votre loyer de *${propertyNom}* (${period}) d'un montant de *${amount.toLocaleString('fr-FR')} FCFA* :\n\n` +
      `🌊 *Payer avec Wave en 1 clic :*\n${wavePayUrl}\n\n` +
      `🟠 *Orange Money Sénégal :*\nTapez *#144#* puis saisissez le Code Marchand *${defaultMobileMoneyConfig.orangeMoneyMerchantCode}* (Montant: ${amount.toLocaleString('fr-FR')} FCFA).\n\n` +
      `Réf transaction : *${reference}*`;
    triggerWhatsApp(tenantPhone, text);
  };

  const handleShareSMS = () => {
    const text = `FITAL-IMMO: Règlement loyer ${propertyNom} (${amount.toLocaleString('fr-FR')} FCFA). Payer via Wave: ${wavePayUrl} ou OM Code ${defaultMobileMoneyConfig.orangeMoneyMerchantCode}. Ref: ${reference}`;
    triggerSMS(tenantPhone, text);
  };

  const handleSubmitValidation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionIdInput) return;
    if (onConfirmPayment) {
      onConfirmPayment(amount, selectedMethod, transactionIdInput);
    }
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#111C2E] border border-[#C9A96E]/30 rounded-3xl w-full max-w-xl max-h-[95vh] overflow-y-auto shadow-2xl space-y-5 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#162133]/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C9A96E]/20 text-[#E8D5B0] font-bold">
                  Passerelle Directe Mobile Money
                </span>
                <span className="text-xs text-slate-400 font-mono">Réf: {reference}</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-0.5">Règlement Wave & Orange Money</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            ✕
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6 pt-0">
          {/* Summary Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1A253A] to-[#0D1624] border border-[#C9A96E]/30 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400">Total à payer pour {tenantName}</span>
              <div className="text-2xl font-black text-[#E8D5B0] tracking-tight">
                {formatCurrencyFCFA(amount)}
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">{propertyNom} • {period}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={handleShareOnWhatsApp}
                className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="Partager le lien par WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" /> WhatsApp
              </button>
              <button
                onClick={handleShareSMS}
                className="px-3 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 border border-sky-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="Partager par SMS"
              >
                <Share2 className="w-3.5 h-3.5" /> SMS
              </button>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              1. Choisir l'opérateur de paiement :
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedMethod('WAVE')}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3.5 transition-all cursor-pointer ${
                  selectedMethod === 'WAVE'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg ring-1 ring-blue-500'
                    : 'bg-[#0A111D] border-white/10 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center font-black text-sm flex-shrink-0">
                  🌊
                </div>
                <div>
                  <div className="font-bold text-sm text-white">Wave Sénégal</div>
                  <div className="text-[11px] text-blue-300">0% de frais • Instantané</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('ORANGE_MONEY')}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3.5 transition-all cursor-pointer ${
                  selectedMethod === 'ORANGE_MONEY'
                    ? 'bg-orange-600/20 border-orange-500 text-white shadow-lg ring-1 ring-orange-500'
                    : 'bg-[#0A111D] border-white/10 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-sm flex-shrink-0">
                  🟠
                </div>
                <div>
                  <div className="font-bold text-sm text-white">Orange Money</div>
                  <div className="text-[11px] text-orange-300">Code Marchand / #144#</div>
                </div>
              </button>
            </div>
          </div>

          {/* Method Content */}
          {selectedMethod === 'WAVE' ? (
            <div className="bg-[#0A111D] border border-blue-500/30 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="bg-white p-2.5 rounded-2xl shadow-xl flex-shrink-0 text-center">
                  <img
                    src={qrCodeUrl}
                    alt="Wave QR Code"
                    className="w-36 h-36 mx-auto rounded-xl object-contain"
                  />
                  <span className="text-[10px] text-slate-700 font-bold block mt-1">Scanner avec l'App Wave</span>
                </div>

                <div className="space-y-3 w-full text-left">
                  <div>
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                      Redirection Immédiate Wave
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Cliquez sur le bouton ci-dessous pour ouvrir directement l'application Wave ou finaliser en ligne sans ressaisir le montant.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleLaunchWave}
                      className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex-1"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Ouvrir l'App Wave & Payer</span>
                    </button>

                    <button
                      onClick={handleCopyLink}
                      className="px-3 py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                      title="Copier le lien direct Wave"
                    >
                      {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedLink ? 'Copié !' : 'Copier Lien'}</span>
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <span>Destinataire officiel :</span>
                    <strong className="text-white font-mono">{defaultMobileMoneyConfig.wavePhone}</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#0A111D] border border-orange-500/30 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="bg-white p-2.5 rounded-2xl shadow-xl flex-shrink-0 text-center">
                  <img
                    src={qrCodeUrl}
                    alt="Orange Money QR Code"
                    className="w-36 h-36 mx-auto rounded-xl object-contain"
                  />
                  <span className="text-[10px] text-slate-700 font-bold block mt-1">Code Marchand OM</span>
                </div>

                <div className="space-y-3 w-full text-left">
                  <div>
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                      Paiement USSD Orange Money Sénégal
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Lancez le code USSD direct depuis votre téléphone ou composez le code marchand ci-dessous.
                    </p>
                  </div>

                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Code Marchand FITAL-IMMO</span>
                      <div className="text-lg font-mono font-black text-orange-400">{defaultMobileMoneyConfig.orangeMoneyMerchantCode}</div>
                    </div>
                    <button
                      onClick={() => handleCopyCode(defaultMobileMoneyConfig.orangeMoneyMerchantCode || '894210')}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs flex items-center gap-1"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    onClick={handleDialOrangeMoney}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Lancer le Composeur Téléphonique ({omUssdCode})</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form: Saisie de confirmation après paiement */}
          <form onSubmit={handleSubmitValidation} className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#E8D5B0]">
              <Receipt className="w-4 h-4 text-[#C9A96E]" />
              <span>2. Confirmation comptable & Génération de la Quittance</span>
            </div>
            <p className="text-xs text-slate-400">
              Saisissez l'ID ou le code SMS de transaction reçu par {selectedMethod === 'WAVE' ? 'Wave' : 'Orange Money'} (ex: TX-892401) pour valider immédiatement :
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                required
                placeholder="Ex: TX-WAVE-892134 ou OM-778219"
                value={transactionIdInput}
                onChange={(e) => setTransactionIdInput(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-[#0A111D] border border-white/15 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-[#C9A96E]"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md flex-shrink-0"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Valider le Règlement</span>
              </button>
            </div>

            {isSuccess && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-bold flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Paiement validé avec succès ! Quittance générée.</span>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
