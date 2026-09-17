import React, { useState } from 'react';
import { UserAccount } from '../types';
import { 
  User, 
  Lock, 
  Key, 
  ShieldCheck, 
  Building2, 
  Mail, 
  Phone, 
  CheckCircle2, 
  History,
  LogOut,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { changeUserPassword } from '../lib/supabase/service';

interface UserProfileModalProps {
  currentUser: UserAccount;
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onUpdatePassword?: (newPass: string) => void;
}

export function UserProfileModal({
  currentUser,
  isOpen,
  onClose,
  onSignOut,
}: UserProfileModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

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
        setSuccessMsg('Votre mot de passe a été modifié avec succès sur Supabase Auth.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        setErrorMsg(res.error || 'Une erreur est survenue lors de la mise à jour du mot de passe.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Impossible de mettre à jour le mot de passe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111C2E] border border-[#C9A96E]/30 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1E2E45] to-[#0A111D] border border-[#C9A96E]/40 flex items-center justify-center text-[#C9A96E] font-bold text-base shadow-lg">
              {currentUser.prenom.charAt(0)}{currentUser.nom.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-white text-base">{currentUser.prenom} {currentUser.nom}</h3>
              <p className="text-xs text-slate-400">
                Rôle : <strong className="text-[#C9A96E]">{currentUser.role}</strong> • {currentUser.organisation}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2">✕</button>
        </div>

        {/* User Details */}
        <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#0A111D] border border-white/5 rounded-2xl text-xs">
          <div>
            <span className="text-slate-400 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-[#C9A96E]" /> Email :</span>
            <span className="text-white font-medium block mt-0.5">{currentUser.email}</span>
          </div>
          <div>
            <span className="text-slate-400 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-[#C9A96E]" /> Téléphone :</span>
            <span className="text-white font-medium block mt-0.5">{currentUser.telephone}</span>
          </div>
          <div>
            <span className="text-slate-400 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-[#C9A96E]" /> Statut du compte :</span>
            <span className="text-emerald-400 font-bold block mt-0.5 uppercase">{currentUser.statut}</span>
          </div>
          <div>
            <span className="text-slate-400 flex items-center gap-1.5"><History className="w-3.5 h-3.5 text-[#C9A96E]" /> Dernière connexion :</span>
            <span className="text-slate-300 block mt-0.5">{currentUser.derniereConnexion || 'En cours'}</span>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="space-y-3 pt-2">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#C9A96E]" />
            Changer mon Mot de Passe (Supabase Auth)
          </h4>

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Mot de passe actuel (optionnel)</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 bg-[#0A111D] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#C9A96E]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Nouveau mot de passe *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 caractères"
                  className="w-full px-3.5 py-2 bg-[#0A111D] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#C9A96E]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Confirmer mot de passe *</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Répéter le mot de passe"
                  className="w-full px-3.5 py-2 bg-[#0A111D] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#C9A96E]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md hover:shadow-[#C9A96E]/20 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mise à jour en cours...</span>
                </>
              ) : (
                <span>Mettre à jour le mot de passe</span>
              )}
            </button>
          </form>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <button
            onClick={() => {
              onClose();
              onSignOut();
            }}
            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Se déconnecter</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
