import React, { useState } from 'react';
import { PaymentMethodConfig, PaymentMethodCode } from '../types';
import { 
  CreditCard, 
  Smartphone, 
  Building2, 
  Coins, 
  PlusCircle, 
  Check, 
  Edit3, 
  ToggleLeft, 
  ToggleRight, 
  Sliders, 
  ShieldCheck, 
  Save, 
  AlertCircle 
} from 'lucide-react';

interface PaymentMethodsConfigViewProps {
  paymentMethods: PaymentMethodConfig[];
  onUpdatePaymentMethod: (method: PaymentMethodConfig) => void;
  onAddPaymentMethod: (method: PaymentMethodConfig) => void;
}

export function PaymentMethodsConfigView({
  paymentMethods,
  onUpdatePaymentMethod,
  onAddPaymentMethod,
}: PaymentMethodsConfigViewProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodConfig | null>(null);
  const [isNewMethodModalOpen, setIsNewMethodModalOpen] = useState(false);

  const [newMethodForm, setNewMethodForm] = useState<Partial<PaymentMethodConfig>>({
    code: 'AUTRE',
    libelle: '',
    description: '',
    fraisPourcentage: 0,
    actif: true,
    delaiValidationHeures: 0,
    instructions: '',
  });

  const getMethodIcon = (code: PaymentMethodCode) => {
    switch (code) {
      case 'ESPECES':
        return <Coins className="w-5 h-5 text-emerald-400" />;
      case 'WAVE':
        return <Smartphone className="w-5 h-5 text-blue-400" />;
      case 'ORANGE_MONEY':
        return <Smartphone className="w-5 h-5 text-orange-400" />;
      case 'FREE_MONEY':
        return <Smartphone className="w-5 h-5 text-teal-400" />;
      case 'VIREMENT':
        return <Building2 className="w-5 h-5 text-purple-400" />;
      case 'CHEQUE':
        return <CreditCard className="w-5 h-5 text-indigo-400" />;
      default:
        return <CreditCard className="w-5 h-5 text-[#C9A96E]" />;
    }
  };

  const handleToggleActive = (method: PaymentMethodConfig) => {
    onUpdatePaymentMethod({ ...method, actif: !method.actif });
  };

  const handleSetDefault = (method: PaymentMethodConfig) => {
    // Unset other defaults
    paymentMethods.forEach((m) => {
      if (m.id === method.id) {
        onUpdatePaymentMethod({ ...m, estParDefaut: true });
      } else if (m.estParDefaut) {
        onUpdatePaymentMethod({ ...m, estParDefaut: false });
      }
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethod) return;
    onUpdatePaymentMethod(selectedMethod);
    setSelectedMethod(null);
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMethodForm.libelle) return;

    const newM: PaymentMethodConfig = {
      id: `paymethod-${Date.now()}`,
      code: (newMethodForm.code as PaymentMethodCode) || 'AUTRE',
      libelle: newMethodForm.libelle,
      description: newMethodForm.description || '',
      actif: newMethodForm.actif ?? true,
      estParDefaut: false,
      fraisPourcentage: Number(newMethodForm.fraisPourcentage) || 0,
      delaiValidationHeures: Number(newMethodForm.delaiValidationHeures) || 0,
      numeroCompteOuTelephone: newMethodForm.numeroCompteOuTelephone,
      banqueNom: newMethodForm.banqueNom,
      instructions: newMethodForm.instructions,
    };

    onAddPaymentMethod(newM);
    setIsNewMethodModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#111C2E] p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#C9A96E]/20 text-[#E8D5B0] border border-[#C9A96E]/30">
              Paramètres Financiers
            </span>
            <span className="text-xs text-slate-400">• Configuration Base de Données</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Moyens de Paiement & Canaux de Règlement</h1>
          <p className="text-xs text-slate-400">
            Gestion dynamique des canaux de collecte (Wave, OM, Virements, Espèces), taux de frais et comptes destinataires.
          </p>
        </div>

        <button
          onClick={() => setIsNewMethodModalOpen(true)}
          className="px-4 py-2.5 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Ajouter un Canal de Paiement</span>
        </button>
      </div>

      {/* Methods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {paymentMethods.map((method) => (
          <div
            key={method.id}
            className={`bg-[#111C2E] rounded-2xl p-5 border transition-all flex flex-col justify-between ${
              method.actif ? 'border-white/5 hover:border-[#C9A96E]/40' : 'border-white/5 opacity-60 bg-[#0A111D]'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    {getMethodIcon(method.code)}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{method.libelle || method.nom}</h3>
                    <span className="text-[10px] text-slate-400 font-mono">{method.code}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {(method.estParDefaut || method.parDefaut) && (
                    <span className="text-[10px] bg-[#C9A96E]/20 text-[#E8D5B0] px-2 py-0.5 rounded-full font-bold border border-[#C9A96E]/30">
                      Par défaut
                    </span>
                  )}
                  <button
                    onClick={() => handleToggleActive(method)}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                    title={method.actif ? 'Désactiver' : 'Activer'}
                  >
                    {method.actif ? (
                      <ToggleRight className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-600" />
                    )}
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-400">{method.description}</p>

              <div className="p-3 bg-[#0A111D] border border-white/5 rounded-xl space-y-1.5 text-xs">
                {(method.numeroCompteOuTelephone || method.config?.numeroRecepteur || method.config?.nomCompte) && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Compte / Tél :</span>
                    <strong className="text-white font-mono">{method.numeroCompteOuTelephone || method.config?.numeroRecepteur || method.config?.nomCompte}</strong>
                  </div>
                )}
                {(method.banqueNom || method.config?.banque) && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Établissement :</span>
                    <strong className="text-white">{method.banqueNom || method.config?.banque}</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Frais applicables :</span>
                  <span className="text-[#E8D5B0] font-bold">{method.fraisPourcentage ?? method.config?.fraisPourcentage ?? 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Délai vérification :</span>
                  <span className="text-slate-300">
                    {(method.delaiValidationHeures ?? method.config?.delaiValidationHeures ?? 0) === 0
                      ? 'Instantané'
                      : `${method.delaiValidationHeures ?? method.config?.delaiValidationHeures} heures`}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between">
              {!(method.estParDefaut || method.parDefaut) ? (
                <button
                  onClick={() => handleSetDefault(method)}
                  className="text-xs text-slate-400 hover:text-white hover:underline cursor-pointer"
                >
                  Définir par défaut
                </button>
              ) : (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Actif par défaut
                </span>
              )}

              <button
                onClick={() => setSelectedMethod(method)}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-semibold border border-white/10 flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#C9A96E]" />
                <span>Modifier</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {selectedMethod && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111C2E] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="font-bold text-white text-lg">Modifier le Canal : {selectedMethod.libelle}</h3>
              <button onClick={() => setSelectedMethod(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Nom / Libellé *</label>
                <input
                  type="text"
                  required
                  value={selectedMethod.libelle}
                  onChange={(e) => setSelectedMethod({ ...selectedMethod, libelle: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#0A111D] border border-white/10 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Numéro Marchand / Tél / RIB</label>
                  <input
                    type="text"
                    value={selectedMethod.numeroCompteOuTelephone || ''}
                    onChange={(e) => setSelectedMethod({ ...selectedMethod, numeroCompteOuTelephone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#0A111D] border border-white/10 rounded-xl text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Banque / Opérateur</label>
                  <input
                    type="text"
                    value={selectedMethod.banqueNom || ''}
                    onChange={(e) => setSelectedMethod({ ...selectedMethod, banqueNom: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#0A111D] border border-white/10 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Frais (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedMethod.fraisPourcentage}
                    onChange={(e) => setSelectedMethod({ ...selectedMethod, fraisPourcentage: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-[#0A111D] border border-white/10 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Délai vérification (heures)</label>
                  <input
                    type="number"
                    value={selectedMethod.delaiValidationHeures}
                    onChange={(e) => setSelectedMethod({ ...selectedMethod, delaiValidationHeures: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-[#0A111D] border border-white/10 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Instructions affichées aux locataires</label>
                <textarea
                  rows={3}
                  value={selectedMethod.instructions || ''}
                  onChange={(e) => setSelectedMethod({ ...selectedMethod, instructions: e.target.value })}
                  placeholder="Ex: Envoyer le paiement au numéro marchand puis transmettre le code..."
                  className="w-full px-3.5 py-2 bg-[#0A111D] border border-white/10 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedMethod(null)}
                  className="px-4 py-2 bg-white/5 text-white rounded-xl text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] font-bold rounded-xl text-xs shadow-md cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Method Modal */}
      {isNewMethodModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111C2E] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="font-bold text-white text-lg">Ajouter un Moyen de Paiement</h3>
              <button onClick={() => setIsNewMethodModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateNew} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Nom / Libellé *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Wari / Ria / Carte Bancaire"
                  value={newMethodForm.libelle || ''}
                  onChange={(e) => setNewMethodForm({ ...newMethodForm, libelle: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#0A111D] border border-white/10 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Numéro Marchand / Tél</label>
                  <input
                    type="text"
                    value={newMethodForm.numeroCompteOuTelephone || ''}
                    onChange={(e) => setNewMethodForm({ ...newMethodForm, numeroCompteOuTelephone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#0A111D] border border-white/10 rounded-xl text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Frais (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newMethodForm.fraisPourcentage || 0}
                    onChange={(e) => setNewMethodForm({ ...newMethodForm, fraisPourcentage: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-[#0A111D] border border-white/10 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewMethodModalOpen(false)}
                  className="px-4 py-2 bg-white/5 text-white rounded-xl text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] font-bold rounded-xl text-xs shadow-md cursor-pointer"
                >
                  Créer le Canal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
