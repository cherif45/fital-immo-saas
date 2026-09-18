import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase/client';

interface ResetPasswordViewProps {
  onSuccess: () => void;
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isValidSession, setIsValidSession] = useState<boolean>(false);

  useEffect(() => {
    // Vérifier si on a une session active (après clic sur le lien du mail)
    const checkSession = async () => {
      if (!supabase) return;

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setIsValidSession(true);
      } else {
        setErrorMsg("Lien invalide ou expiré. Demandez un nouveau lien.");
      }
    };

    // Écoute aussi les changements d'état auth (le token arrive parfois après)
    const { data: authListener } = supabase?.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setIsValidSession(true);
      }
    }) || { data: null };

    checkSession();

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!password || password.length < 6) {
      setErrorMsg('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Les deux mots de passe ne correspondent pas.');
      return;
    }

    if (!supabase) {
      setErrorMsg('Supabase n\'est pas configuré.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      setSuccessMsg('Mot de passe modifié avec succès ! Redirection...');
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la mise à jour.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A111D] flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-[#162133]/90 border border-[#C9A96E]/30 rounded-3xl shadow-2xl p-8 backdrop-blur-xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1E2E45] to-[#0A111D] border border-[#C9A96E]/40 shadow-xl mb-4">
            <Lock className="w-8 h-8 text-[#C9A96E]" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            FITAL<span className="text-[#C9A96E] font-medium">-IMMO</span>
          </h1>
          <p className="text-xs text-[#A8B4C4] mt-1">Réinitialisation du mot de passe</p>
        </div>

        {!isValidSession && !errorMsg && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            Vérification du lien en cours...
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {isValidSession && !successMsg && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#0A111D] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#C9A96E]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#0A111D] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#C9A96E]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-lg hover:scale-[1.01] transition-all disabled:opacity-50"
            >
              {loading ? 'Mise à jour...' : 'Valider le nouveau mot de passe'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};