import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  RefreshCw,
  Globe,
} from 'lucide-react';
import {
  supabase,
  isSupabaseConfigured,
  supabaseUrl,
  testSupabaseConnection,
  SupabaseHealthCheckResult,
} from '../lib/supabase/client';
import { UserAccount, UserRole } from '../types';
import { initialUsers } from '../data/mockData';
import {
  loadLocalCollection,
  bootstrapAdminProfile,
  getOrCreateDefaultAgency,
} from '../lib/supabase/service';

interface LoginViewProps {
  onLoginSuccess: (user: UserAccount) => void;
  availableUsers?: UserAccount[];
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, availableUsers }) => {
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Diagnostic système (interne uniquement, non affiché à l'utilisateur)
  const [healthResult, setHealthResult] = useState<SupabaseHealthCheckResult | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    runConnectionDiagnostic();
  }, []);

  const runConnectionDiagnostic = async () => {
    setIsCheckingHealth(true);
    try {
      const result = await testSupabaseConnection();
      setHealthResult(result);
    } catch (e: any) {
      setHealthResult({
        connected: false,
        status: 'error',
        url: supabaseUrl || 'Non définie',
        sslActive: false,
        message: 'Erreur lors du test de connexion.',
        details: e.message,
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const getUsersPool = (): UserAccount[] => {
    if (availableUsers && availableUsers.length > 0) return availableUsers;
    const stored = loadLocalCollection<UserAccount[]>('users', initialUsers);
    return stored && stored.length > 0 ? stored : initialUsers;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMsg('Veuillez renseigner votre adresse email et votre mot de passe.');
      return;
    }

    setLoading(true);

    try {
      // 1. Authentification cloud (comptes partagés)
      if (isSupabaseConfigured && supabase && healthResult?.connected) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (authError) {
          setErrorMsg(
            authError.message === 'Invalid login credentials'
              ? 'Email ou mot de passe incorrect. Si vous venez de créer le compte, confirmez votre email ou contactez l\'administrateur.'
              : authError.message
          );
          setLoading(false);
          return;
        }

        if (authData.user) {
          let profileData: any = null;
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*, agencies(name, slug, status)')
            .eq('id', authData.user.id)
            .maybeSingle();

          profileData = existingProfile;

          if (!profileData) {
            await getOrCreateDefaultAgency();
            const bootstrapped = await bootstrapAdminProfile(authData.user.id, cleanEmail, {
              nom: authData.user.user_metadata?.nom || 'ADMINISTRATEUR',
              prenom: authData.user.user_metadata?.prenom || 'FITAL',
            });
            if (bootstrapped) {
              onLoginSuccess({ ...bootstrapped, derniereConnexion: 'À l\'instant' });
              return;
            }
            setErrorMsg('Compte valide mais profil absent. Contactez l\'administrateur.');
            setLoading(false);
            return;
          }

          if (profileData.statut === 'suspendu' || profileData.statut === 'desactive') {
            setErrorMsg('Ce compte est suspendu ou désactivé. Contactez votre administrateur.');
            setLoading(false);
            return;
          }

          const userAccount: UserAccount = {
            id: authData.user.id,
            agencyId: profileData.agency_id,
            email: authData.user.email || cleanEmail,
            nom: profileData.nom || 'Utilisateur',
            prenom: profileData.prenom || '',
            telephone: profileData.telephone || '+221 77 000 00 00',
            role: (profileData.role as UserRole) || 'ADMIN',
            statut: profileData.statut || 'actif',
            proprietaireId: profileData.proprietaire_id,
            locataireId: profileData.locataire_id,
            permissions: profileData.permissions || ['*'],
            organisation: profileData.agencies?.name || 'FITAL-IMMO Agence',
            createdAt: authData.user.created_at || new Date().toISOString(),
            derniereConnexion: 'À l\'instant',
          };

          onLoginSuccess(userAccount);
          return;
        }
      }

      // 2. Mode local
      const pool = getUsersPool();
      const matchedUser = pool.find((u) => u.email.trim().toLowerCase() === cleanEmail);

      if (matchedUser) {
        if (matchedUser.password && matchedUser.password !== password) {
          setErrorMsg('Mot de passe incorrect pour ce compte.');
          setLoading(false);
          return;
        }

        if (matchedUser.statut === 'suspendu' || matchedUser.statut === 'desactive') {
          setErrorMsg('Ce compte est actuellement inactif ou suspendu. Contactez votre administrateur.');
          setLoading(false);
          return;
        }

        onLoginSuccess({ ...matchedUser, derniereConnexion: 'À l\'instant' });
        return;
      }

      setErrorMsg('Identifiants non reconnus. Vérifiez votre email et mot de passe.');
    } catch (err: any) {
      console.error('Erreur authentification:', err);
      setErrorMsg(err.message || 'Impossible de se connecter pour le moment.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Veuillez saisir votre adresse email.');
      return;
    }

    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (error) throw error;
        setSuccessMsg('Un lien de réinitialisation sécurisé a été transmis par email.');
      } else {
        setSuccessMsg('Contactez l\'administrateur pour réinitialiser votre accès.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Impossible d\'envoyer le lien de réinitialisation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A111D] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans antialiased text-[#F0EDE8]">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#C9A96E]/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#162133]/60 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md bg-[#162133]/90 border border-[#C9A96E]/30 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1E2E45] to-[#0A111D] border border-[#C9A96E]/40 shadow-xl mb-4 p-2.5">
            <img src="/favicon.svg" alt="FITAL-IMMO" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            FITAL<span className="text-[#C9A96E] font-medium">-IMMO</span>
          </h1>
          <p className="text-xs text-[#A8B4C4] mt-1 font-medium">
            Plateforme Professionnelle de Gestion Locative & Loyers
          </p>
        </div>

        {/* Statut Système (discret, sans mention technique) */}
        <div className="mb-5 rounded-2xl bg-[#0A111D]/90 border border-white/10 p-3 text-[11px] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#C9A96E]" />
              Statut du service :
            </span>

            {healthResult?.connected ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                En ligne
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                Opérationnel
              </span>
            )}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px]">
            <span className="text-slate-400 truncate max-w-[240px]">
              {isSupabaseConfigured ? 'Accès sécurisé multi-utilisateurs' : 'Accès local sécurisé'}
            </span>
            <button
              type="button"
              onClick={runConnectionDiagnostic}
              disabled={isCheckingHealth}
              className="text-[#C9A96E] hover:text-white font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isCheckingHealth ? 'animate-spin' : ''}`} />
              <span>{isCheckingHealth ? 'Test...' : 'Vérifier'}</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Header Title */}
        <div className="mb-5 pb-3 border-b border-white/10 text-center">
          <h2 className="text-base font-bold text-white flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#C9A96E]" />
            Connexion à votre Espace
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Accédez à vos données selon vos identifiants
          </p>
        </div>

        {/* Forgot password mode */}
        {isForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Adresse email associée à votre compte
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre-email@domaine.sn"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#0A111D] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C9A96E]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-lg shadow-[#C9A96E]/20 hover:shadow-[#C9A96E]/40 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? 'Envoi en cours...' : 'Envoyer les instructions'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setErrorMsg(null);
                }}
                className="text-xs text-[#C9A96E] hover:underline cursor-pointer"
              >
                Retour à la connexion
              </button>
            </div>
          </form>
        ) : (
          /* STANDARD LOGIN FORM */
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Adresse Email Professionnelle ou Personnelle
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@fital-immo.sn"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#0A111D] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C9A96E]"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Mot de passe
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-[11px] text-[#C9A96E] hover:underline cursor-pointer"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#0A111D] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C9A96E]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-lg shadow-[#C9A96E]/20 hover:shadow-[#C9A96E]/40 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Vérification des accès...</span>
                </>
              ) : (
                <>
                  <span>Se Connecter</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};