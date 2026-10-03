import React, { useState, useEffect } from 'react';
import { UserAccount } from '../types';
import { 
  User, 
  Lock, 
  Key, 
  ShieldCheck, 
  Mail, 
  Phone, 
  CheckCircle2, 
  LogOut,
  AlertCircle,
  Loader2,
  Upload,
  PenTool,
  Trash2
} from 'lucide-react';
import { changeUserPassword } from '../lib/supabase/service';
import { 
  updateUserSignature, 
  getUserSignatureInfo 
} from '../lib/supabase/signatureService';
import { uploadAgencyAsset, compressImage } from '../lib/supabase/storage';

interface UserProfileModalProps {
  currentUser: UserAccount;
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onUpdatePassword?: (newPass: string) => void;
}

type Tab = 'infos' | 'signature' | 'security';

export function UserProfileModal({
  currentUser,
  isOpen,
  onClose,
  onSignOut,
}: UserProfileModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('infos');
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Signature state
  const [signatureUrl, setSignatureUrl] = useState<string>('');
  const [fonction, setFonction] = useState<string>('');
  const [initiales, setInitiales] = useState<string>('');
  const [uploadingSig, setUploadingSig] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Charger les infos utilisateur au montage
  useEffect(() => {
    if (!isOpen || !currentUser?.id) return;
    
    getUserSignatureInfo(currentUser.id).then((info) => {
      if (info) {
        setSignatureUrl(info.signatureUrl || '');
        setFonction(info.fonction || '');
      }
    });
    
    // Initiales par défaut (P.N.)
    const init = `${currentUser.prenom?.[0] || ''}${currentUser.nom?.[0] || ''}`.toUpperCase();
    setInitiales(init);
  }, [isOpen, currentUser?.id]);

  if (!isOpen) return null;

  const resetMessages = () => {
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (newPassword.length < 6) {
      setErrorMsg('Le nouveau mot de passe doit comporter au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const res = await changeUserPassword(newPassword);
      if (res.success) {
        setSuccessMsg('Mot de passe modifié avec succès.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMsg(res.error || 'Erreur lors du changement de mot de passe.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Erreur inconnue.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.id) return;

    resetMessages();
    setUploadingSig(true);

    try {
      // Compresser l'image
      const compressed = await compressImage(file, 800, 0.85);
      
      // Upload vers Supabase Storage (dossier de l'utilisateur)
      // On utilise le bucket agency-assets avec un sous-dossier users/
      const result = await uploadUserSignatureFile(currentUser.id, compressed);
      
      if (result.error || !result.url) {
        setErrorMsg(result.error || 'Erreur upload signature.');
        setUploadingSig(false);
        return;
      }

      setSignatureUrl(result.url);
      setSuccessMsg('Signature uploadée. Cliquez sur "Enregistrer" pour valider.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur upload.');
    } finally {
      setUploadingSig(false);
    }
  };

  const handleSaveSignature = async () => {
    if (!currentUser?.id) return;
    resetMessages();
    setLoading(true);

    try {
      const res = await updateUserSignature(currentUser.id, signatureUrl, fonction);
      if (res.success) {
        setSuccessMsg('Signature et fonction enregistrées avec succès.');
      } else {
        setErrorMsg(res.error || 'Erreur sauvegarde.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Erreur inconnue.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSignature = () => {
    setSignatureUrl('');
    setSuccessMsg('Signature supprimée. Cliquez sur "Enregistrer" pour valider.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        
        {/* Header */}
        <div className="p-5 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <User className="w-5 h-5 text-[#C9A96E]" />
            <span>Mon Profil</span>
          </div>
          <button 
            onClick={onClose} 
            className="text-[#A8B4C4] hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#C9A96E]/20">
          {[
            { id: 'infos', label: 'Informations', icon: User },
            { id: 'signature', label: 'Ma Signature', icon: PenTool },
            { id: 'security', label: 'Sécurité', icon: Lock },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as Tab); resetMessages(); }}
                className={`flex-1 py-3 px-4 font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
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

        {/* Messages */}
        {successMsg && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {errorMsg}
          </div>
        )}

        {/* Content */}
        <div className="p-5">
          
          {/* TAB: Infos */}
          {activeTab === 'infos' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#1E2E45]/40 border border-[#C9A96E]/10">
                <div className="text-xs text-[#A8B4C4] uppercase mb-1">Nom complet</div>
                <div className="text-white font-bold">
                  {currentUser.prenom} {currentUser.nom}
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-[#1E2E45]/40 border border-[#C9A96E]/10">
                <div className="text-xs text-[#A8B4C4] uppercase mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email
                </div>
                <div className="text-white text-sm">
                  {currentUser.email || '—'}
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-[#1E2E45]/40 border border-[#C9A96E]/10">
                <div className="text-xs text-[#A8B4C4] uppercase mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Téléphone
                </div>
                <div className="text-white text-sm">
                  {currentUser.telephone || '—'}
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-[#1E2E45]/40 border border-[#C9A96E]/10">
                <div className="text-xs text-[#A8B4C4] uppercase mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Rôle
                </div>
                <div className="text-white text-sm font-bold">
                  {currentUser.role}
                </div>
              </div>

              <button
                onClick={onSignOut}
                className="w-full mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm font-bold hover:bg-rose-500/25 transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Se déconnecter
              </button>
            </div>
          )}

          {/* TAB: Signature */}
          {activeTab === 'signature' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-2">
                  Fonction
                </label>
                <select
                  value={fonction}
                  onChange={(e) => setFonction(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white text-sm"
                >
                  <option value="">-- Sélectionner --</option>
                  <option value="Caissier">Caissier</option>
                  <option value="Gestionnaire">Gestionnaire</option>
                  <option value="Agent de terrain">Agent de terrain</option>
                  <option value="Comptable">Comptable</option>
                  <option value="Responsable">Responsable</option>
                  <option value="Directeur">Directeur</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-2">
                  Initiales
                </label>
                <input
                  type="text"
                  value={initiales}
                  onChange={(e) => setInitiales(e.target.value.toUpperCase().slice(0, 5))}
                  maxLength={5}
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white text-sm font-mono"
                  placeholder="ex: PD"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-2">
                  Signature (image PNG ou JPG)
                </label>
                
                {signatureUrl ? (
                  <div className="p-4 rounded-xl bg-white border-2 border-[#C9A96E]/30 text-center">
                    <img 
                      src={signatureUrl} 
                      alt="Signature" 
                      className="max-h-24 mx-auto object-contain mb-3" 
                    />
                    <div className="flex gap-2 justify-center">
                      <label className="px-3 py-1.5 rounded-lg bg-[#1E2E45] text-white text-xs font-semibold cursor-pointer hover:bg-[#2A3F5C]">
                        Changer
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleSignatureUpload}
                        />
                      </label>
                      <button
                        onClick={handleRemoveSignature}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-semibold hover:bg-rose-500/30 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Retirer
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="block p-6 rounded-xl bg-[#1E2E45]/40 border-2 border-dashed border-[#C9A96E]/30 hover:border-[#C9A96E] cursor-pointer text-center transition-all">
                    {uploadingSig ? (
                      <>
                        <Loader2 className="w-8 h-8 mx-auto text-[#C9A96E] mb-2 animate-spin" />
                        <div className="text-xs text-[#A8B4C4]">Upload en cours...</div>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto text-[#C9A96E] mb-2" />
                        <div className="text-xs text-[#A8B4C4]">
                          Cliquer pour uploader votre signature
                        </div>
                        <div className="text-[10px] text-[#6B7C94] mt-1">
                          Format PNG/JPG · max 5 Mo
                        </div>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleSignatureUpload}
                    />
                  </label>
                )}
              </div>

              <button
                onClick={handleSaveSignature}
                disabled={loading}
                className="w-full p-3 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] text-sm font-bold hover:scale-105 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB: Sécurité */}
          {activeTab === 'security' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-2">
                  Mot de passe actuel
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-2">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-2">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full p-3 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] text-sm font-bold hover:scale-105 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Modification...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    Changer le mot de passe
                  </>
                )}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

// ============================================================
// HELPER — Upload signature utilisateur
// ============================================================
async function uploadUserSignatureFile(
  userId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  // On réutilise le bucket agency-assets avec un sous-dossier users/
  return uploadAgencyAsset('users/' + userId, 'signature', file);
}