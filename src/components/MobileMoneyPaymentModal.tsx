import React, { useState, useMemo } from 'react';
import { formatNumber } from '../lib/utils';
import {
  Smartphone, ExternalLink, QrCode, Copy, Check, Share2, PhoneCall,
  ShieldCheck, Receipt, AlertTriangle, Wifi, Info, X,
} from 'lucide-react';
import { formatCurrencyFCFA } from '../lib/calculations/financial';
import {
  generateWavePaymentUrl, generateWaveDeepLink, generateOrangeMoneyUssd,
  generateOrangeMoneyDialerUrl, generatePaymentQRCodeUrl,
} from '../lib/payments/mobileMoney';
import { triggerWhatsApp, triggerSMS } from '../lib/comms/commsHelper';
import { PaymentMethodCode, AgencySettings, UserAccount, Payment } from '../types';
import {
  PaymentProvider,
  getActiveProviders,
  createCheckout,
} from '../lib/payments';

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
  waveNumero?: string;
  orangeMoneyCode?: string;
  whatsappBusiness?: string;
  // 🆕 Nouveaux props pour l'API réelle
  settings?: AgencySettings;
  currentUser?: UserAccount | null;
  tenantId?: string;
  payments?: Payment[];
}

type PaymentMode = 'api' | 'manual';

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
  waveNumero,
  orangeMoneyCode,
  whatsappBusiness,
  settings,
  currentUser,
  tenantId,
  payments = [],
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentProvider | 'FREE_MONEY'>('WAVE');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [transactionIdInput, setTransactionIdInput] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // 🛡️ DÉTECTION ANTI-DOUBLON (Payé OU en attente)
  const duplicatePayment = useMemo(() => {
    if (!tenantId || !payments || payments.length === 0) return null;
    return payments.find(
      (p) =>
        p.locataireId === tenantId &&
        p.periode === period &&
        (p.statut === 'Payé' || p.verificationStatut === 'en_attente')
    );
  }, [tenantId, period, payments]);

  const hasDuplicate = !!duplicatePayment;
  const isDuplicatePaid = duplicatePayment?.statut === 'Payé';

  // 🎯 DÉTECTION DES PROVIDERS ACTIFS
  const activeProviders: PaymentProvider[] = useMemo(() => {
    if (!settings) return [];
    return getActiveProviders(settings);
  }, [settings]);

  // Mode : API si au moins un provider est actif, sinon manuel
  const paymentMode: PaymentMode = activeProviders.length > 0 ? 'api' : 'manual';

  if (!isOpen) return null;

  // Config manuelle (fallback)
  const config = {
    wavePhone: waveNumero || '⚠️ NON CONFIGURÉ',
    orangeMoneyMerchantCode: orangeMoneyCode || '⚠️ NON CONFIGURÉ',
    whatsappBusiness: whatsappBusiness || tenantPhone,
  };

  // Génération des liens manuels (toujours dispo en fallback)
  const wavePayUrl = generateWavePaymentUrl(amount, config.wavePhone, reference);
  const waveDeepLink = generateWaveDeepLink(amount, config.wavePhone, reference);
  const omUssdCode = generateOrangeMoneyUssd(config.orangeMoneyMerchantCode, amount);
  const omDialerUrl = generateOrangeMoneyDialerUrl(config.orangeMoneyMerchantCode, amount);

  const qrCodeUrl = selectedMethod === 'WAVE'
    ? generatePaymentQRCodeUrl(wavePayUrl)
    : generatePaymentQRCodeUrl(`OM:SEN:${config.orangeMoneyMerchantCode}:${amount}:${reference}`);

  // 📤 ACTION : Paiement via API (redirige vers Wave/OM/PayDunya)
  const handleApiPayment = async () => {
    if (!settings || !currentUser) {
      setErrorMsg('Configuration manquante. Contactez votre administrateur.');
      return;
    }

    if (duplicatePayment) {
      setErrorMsg('⚠️ Un paiement est déjà en cours ou validé pour cette période.');
      return;
    }

    setErrorMsg(null);
    setIsProcessing(true);

    try {
      const provider: PaymentProvider = selectedMethod === 'WAVE' ? 'WAVE'
        : selectedMethod === 'ORANGE_MONEY' ? 'ORANGE_MONEY'
        : 'PAYDUNYA';

      const response = await createCheckout(
        provider,
        {
          agencyId: currentUser.agencyId,
          locataireId: tenantId || '',
          locataireNom: tenantName,
          locataireTelephone: tenantPhone,
          periode: period,
          montant: amount,
          description: `Loyer ${period} - ${propertyNom}`,
          successUrl: `${window.location.origin}/?payment=success&ref=${reference}`,
          errorUrl: `${window.location.origin}/?payment=error&ref=${reference}`,
          metadata: { reference, tenantId, period },
        },
        settings
      );

      if (!response.success || !response.checkoutUrl) {
        setErrorMsg(response.error || 'Erreur lors de la création de la session de paiement.');
        setIsProcessing(false);
        return;
      }

      // 🔗 Redirection vers la page officielle du provider
      window.location.href = response.checkoutUrl;
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur inattendue.');
      setIsProcessing(false);
    }
  };

  // 📤 ACTION : Paiement manuel (lien statique)
  const handleLaunchWave = () => {
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
      `🌊 *Payer avec Wave :*\n${wavePayUrl}\n\n` +
      `🟠 *Orange Money :*\nTapez *#144#* puis Code Marchand *${config.orangeMoneyMerchantCode}* (Montant: ${amount.toLocaleString('fr-FR')} FCFA).\n\n` +
      `Réf transaction : *${reference}*`;
    triggerWhatsApp(tenantPhone, text);
  };

  const handleShareSMS = () => {
    const text = `FITAL-IMMO: Règlement loyer ${propertyNom} (${amount.toLocaleString('fr-FR')} FCFA). Wave: ${wavePayUrl} ou OM Code ${config.orangeMoneyMerchantCode}. Ref: ${reference}`;
    triggerSMS(tenantPhone, text);
  };

  const handleSubmitValidation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionIdInput) return;
    if (onConfirmPayment) {
      const methodCode: PaymentMethodCode = selectedMethod === 'WAVE' ? 'WAVE'
        : selectedMethod === 'ORANGE_MONEY' ? 'ORANGE_MONEY'
        : 'AUTRE';
      onConfirmPayment(amount, methodCode, transactionIdInput);
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
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C9A96E]/20 text-[#E8D5B0] font-bold">
                  {paymentMode === 'api' ? '🔒 Paiement sécurisé' : 'Passerelle Mobile Money'}
                </span>
                <span className="text-xs text-slate-400 font-mono">Réf: {reference}</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-0.5">Règlement Loyer</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6 pt-0">
          {/* 🛡️ ALERTE ANTI-DOUBLON */}
          {duplicatePayment && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/40 rounded-2xl text-xs space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-200">⚠️ Paiement déjà enregistré</p>
                  <p className="text-amber-100/80 mt-1">
                    Un paiement de <strong>{formatCurrencyFCFA(duplicatePayment.montantPaye)}</strong> existe déjà pour
                    <strong> {duplicatePayment.periode}</strong> ({duplicatePayment.statut}).
                  </p>
                  <p className="text-amber-200/70 mt-1 text-[11px]">
                    Pour éviter un double encaissement, cette période est verrouillée.
                    Contactez le caissier si besoin.
                  </p>
                </div>
              </div>
            </div>
          )}

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
                className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" /> WhatsApp
              </button>
              <button
                onClick={handleShareSMS}
                className="px-3 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 border border-sky-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" /> SMS
              </button>
            </div>
          </div>

          {/* Mode API : bandeau d'info */}
          {paymentMode === 'api' && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2.5">
              <Wifi className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Paiement sécurisé automatique activé</p>
                <p className="opacity-90 mt-0.5 text-[11px]">
                  Vous allez être redirigé vers la page officielle du fournisseur.
                  La confirmation sera automatique après le paiement.
                </p>
              </div>
            </div>
          )}

          {/* Mode manuel : bandeau d'info */}
          {paymentMode === 'manual' && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Mode manuel</p>
                <p className="opacity-90 mt-0.5 text-[11px]">
                  Votre agence n'a pas configuré de clés API. Vous pouvez régler via les liens directs ci-dessous.
                  Demandez à votre administrateur d'activer les paiements en ligne pour l'automatisation.
                </p>
              </div>
            </div>
          )}

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              1. Choisir l'opérateur :
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedMethod('WAVE')}
                disabled={paymentMode === 'api' && !activeProviders.includes('WAVE')}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3.5 transition-all cursor-pointer ${
                  selectedMethod === 'WAVE'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg ring-1 ring-blue-500'
                    : 'bg-[#0A111D] border-white/10 text-slate-400 hover:border-white/20'
                } ${paymentMode === 'api' && !activeProviders.includes('WAVE') ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center font-black text-sm flex-shrink-0">
                  🌊
                </div>
                <div>
                  <div className="font-bold text-sm text-white">Wave</div>
                  <div className="text-[11px] text-blue-300">
                    {paymentMode === 'api' ? 'Paiement sécurisé' : '0% de frais'}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('ORANGE_MONEY')}
                disabled={paymentMode === 'api' && !activeProviders.includes('ORANGE_MONEY')}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3.5 transition-all cursor-pointer ${
                  selectedMethod === 'ORANGE_MONEY'
                    ? 'bg-orange-600/20 border-orange-500 text-white shadow-lg ring-1 ring-orange-500'
                    : 'bg-[#0A111D] border-white/10 text-slate-400 hover:border-white/20'
                } ${paymentMode === 'api' && !activeProviders.includes('ORANGE_MONEY') ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-sm flex-shrink-0">
                  🟠
                </div>
                <div>
                  <div className="font-bold text-sm text-white">Orange Money</div>
                  <div className="text-[11px] text-orange-300">
                    {paymentMode === 'api' ? 'Paiement sécurisé' : 'Code Marchand'}
                  </div>
                </div>
              </button>
            </div>

            {activeProviders.includes('PAYDUNYA') && (
              <button
                type="button"
                onClick={() => setSelectedMethod('PAYDUNYA' as any)}
                className={`mt-3 w-full p-3.5 rounded-2xl border text-left flex items-center gap-3.5 transition-all cursor-pointer ${
                  (selectedMethod as string) === 'PAYDUNYA'
                    ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg ring-1 ring-purple-500'
                    : 'bg-[#0A111D] border-white/10 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500 text-white flex items-center justify-center font-black text-sm flex-shrink-0">
                  P
                </div>
                <div>
                  <div className="font-bold text-sm text-white">PayDunya (multi-opérateurs)</div>
                  <div className="text-[11px] text-purple-300">Wave, OM, Free, CB</div>
                </div>
              </button>
            )}
          </div>

          {/* Action principale */}
          {paymentMode === 'api' ? (
            <button
              onClick={handleApiPayment}
              disabled={isProcessing || !!duplicatePayment}
              className="w-full py-4 bg-gradient-to-r from-[#C9A96E] to-[#A07840] hover:from-[#D8BA80] hover:to-[#B58C50] text-[#0F1B2D] font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#0F1B2D]/30 border-t-[#0F1B2D] rounded-full animate-spin" />
                  <span>Création de la session...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Payer {formatCurrencyFCFA(amount)} en sécurisé</span>
                </>
              )}
            </button>
          ) : (
            <>
              {/* MODE MANUEL : Wave */}
              {selectedMethod === 'WAVE' && (
                <div className="bg-[#0A111D] border border-blue-500/30 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <div className="bg-white p-2.5 rounded-2xl shadow-xl flex-shrink-0 text-center">
                      <img src={qrCodeUrl} alt="Wave QR" className="w-36 h-36 mx-auto rounded-xl object-contain" />
                      <span className="text-[10px] text-slate-700 font-bold block mt-1">Scanner avec Wave</span>
                    </div>
                    <div className="space-y-3 w-full text-left">
                      <h4 className="font-bold text-white text-sm">Redirection Wave</h4>
                      <p className="text-xs text-slate-400">
                        Cliquez ci-dessous pour ouvrir l'application Wave.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button onClick={handleLaunchWave} className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 flex-1 cursor-pointer">
                          <ExternalLink className="w-4 h-4" /> Ouvrir Wave
                        </button>
                        <button onClick={handleCopyLink} className="px-3 py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                          {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          <span>{copiedLink ? 'Copié !' : 'Copier'}</span>
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Destinataire : <strong className="text-white font-mono">{config.wavePhone}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MODE MANUEL : OM */}
              {selectedMethod === 'ORANGE_MONEY' && (
                <div className="bg-[#0A111D] border border-orange-500/30 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <div className="bg-white p-2.5 rounded-2xl shadow-xl flex-shrink-0 text-center">
                      <img src={qrCodeUrl} alt="OM QR" className="w-36 h-36 mx-auto rounded-xl object-contain" />
                      <span className="text-[10px] text-slate-700 font-bold block mt-1">Code Marchand</span>
                    </div>
                    <div className="space-y-3 w-full text-left">
                      <h4 className="font-bold text-white text-sm">Orange Money USSD</h4>
                      <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Code Marchand</span>
                          <div className="text-lg font-mono font-black text-orange-400">{config.orangeMoneyMerchantCode}</div>
                        </div>
                        <button onClick={() => handleCopyCode(config.orangeMoneyMerchantCode)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer">
                          {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <button onClick={handleDialOrangeMoney} className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer">
                        <PhoneCall className="w-4 h-4" /> Composer {omUssdCode}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

                    {/* Formulaire de confirmation manuelle (mode manuel uniquement) */}
          {paymentMode === 'manual' && (
            <form
              onSubmit={handleSubmitValidation}
              className={`p-4 rounded-2xl space-y-3 border ${
                hasDuplicate
                  ? 'bg-rose-500/10 border-rose-500/40'
                  : 'bg-white/[0.03] border-white/10'
              }`}
            >
              <div className={`flex items-center gap-2 text-xs font-bold ${hasDuplicate ? 'text-rose-300' : 'text-[#E8D5B0]'}`}>
                <Receipt className={`w-4 h-4 ${hasDuplicate ? 'text-rose-400' : 'text-[#C9A96E]'}`} />
                <span>
                  {hasDuplicate
                    ? '⛔ Confirmation bloquée — Doublon détecté'
                    : '2. Confirmation manuelle & Quittance'}
                </span>
              </div>

              {hasDuplicate ? (
                <div className="text-xs text-rose-200 space-y-1">
                  <p>
                    Un paiement de <strong>{formatNumber(duplicatePayment!.montantPaye)} FCFA</strong> existe déjà pour cette période.
                  </p>
                  <p className="text-rose-300/80">
                    Quittance : <strong>{duplicatePayment!.quittanceNumero}</strong> • Statut : {duplicatePayment!.statut}
                  </p>
                  <p className="text-rose-300/70 text-[11px] italic">
                    Pour éviter un double encaissement, la confirmation manuelle est désactivée.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-400">
                    Saisissez l'ID de transaction reçu par {selectedMethod === 'WAVE' ? 'Wave' : 'Orange Money'} :
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Ex: TX-WAVE-892134"
                      value={transactionIdInput}
                      onChange={(e) => setTransactionIdInput(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-[#0A111D] border border-white/15 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-[#C9A96E]"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md flex-shrink-0"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Valider</span>
                    </button>
                  </div>
                </>
              )}

              {isSuccess && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-bold flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Paiement validé. Quittance générée.</span>
                </div>
              )}
            </form>
          )}

          {/* Erreur */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};