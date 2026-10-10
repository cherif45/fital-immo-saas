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
  fetchPublicAgencyLoginBranding,
  loadLocalCollection,
} from '../lib/supabase/service';

const getAgencyLoginRoute = (): { isAgencyRoute: boolean; slug: string | null } => {
  if (typeof window === 'undefined') return { isAgencyRoute: false, slug: null };
  const match = window.location.pathname.match(/^\/login\/(.*?)\/?$/i);
  if (!match) return { isAgencyRoute: false, slug: null };
  const slug = match[1].toLowerCase();
  return {
    isAgencyRoute: true,
    slug: /^[a-z0-9-]+$/.test(slug) ? slug : null,
  };
};

const safeThemeColor = (value: string | undefined, fallback: string): string =>
  value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

const getContrastColor = (hexColor: string): string => {
  const channels = hexColor
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => parseInt(channel, 16) / 255);
  if (!channels || channels.length !== 3) return '#0F1B2D';
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue > 0.45
    ? '#0F1B2D'
    : '#FFFFFF';
};

interface LoginViewProps {
  onLoginSuccess: (user: UserAccount) => void;
  availableUsers?: UserAccount[];
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, availableUsers }) => {
  const [agencyRoute] = useState(getAgencyLoginRoute);
  const [agencyBranding, setAgencyBranding] = useState<Awaited<ReturnType<typeof fetchPublicAgencyLoginBranding>>>(null);
  const [agencyBrandingLoading, setAgencyBrandingLoading] = useState(agencyRoute.isAgencyRoute);
  const [agencyBrandingError, setAgencyBrandingError] = useState<string | null>(null);
  const [agencyLogoError, setAgencyLogoError] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [healthResult, setHealthResult] = useState<SupabaseHealthCheckResult | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    runConnectionDiagnostic();
  }, []);

  useEffect(() => {
    if (!agencyRoute.isAgencyRoute) return;
    if (!agencyRoute.slug) {
      setAgencyBrandingError('Le lien de connexion de cette agence est invalide.');
      setAgencyBrandingLoading(false);
      return;
    }

    let cancelled = false;
    setAgencyBrandingLoading(true);
    fetchPublicAgencyLoginBranding(agencyRoute.slug)
      .then((branding) => {
        if (cancelled) return;
        if (!branding) {
          setAgencyBrandingError('Cette agence est introuvable ou inactive.');
          return;
        }
        setAgencyBranding(branding);
        setAgencyLogoError(false);
        setAgencyBrandingError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setAgencyBrandingError(
          error instanceof Error
            ? error.message
            : "Impossible de charger la page de connexion de l'agence.",
        );
      })
      .finally(() => {
        if (!cancelled) setAgencyBrandingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [agencyRoute]);

  const brandColor = safeThemeColor(agencyBranding?.primaryColor, '#C9A96E');
  const backgroundColor = safeThemeColor(
    agencyBranding?.backgroundColor,
    '#0A111D',
  );
  const cardColor = safeThemeColor(agencyBranding?.cardColor, '#162133');
  const surfaceColor = safeThemeColor(
    agencyBranding?.surfaceColor,
    '#0A111D',
  );
  const textColor = safeThemeColor(agencyBranding?.textColor, '#F0EDE8');
  const mutedColor = safeThemeColor(agencyBranding?.mutedColor, '#A8B4C4');
  const contrastColor = getContrastColor(brandColor);

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

  const rejectAuthenticatedLogin = async (message: string) => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Impossible de fermer la session du compte bloqué :', error);
        setErrorMsg(`${message} La fermeture de session a échoué : ${error.message}`);
        setLoading(false);
        return;
      }
    }
    setErrorMsg(message);
    setLoading(false);
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

    if (agencyRoute.isAgencyRoute && (!agencyRoute.slug || !agencyBranding)) {
      setErrorMsg(agencyBrandingError || "La page de connexion de l'agence n'est pas disponible.");
      return;
    }

    setLoading(true);

    try {
      // 1. Authentification cloud
      if (isSupabaseConfigured && supabase && healthResult?.connected) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (authError) {
          setErrorMsg(
            authError.message === 'Invalid login credentials'
              ? 'Email ou mot de passe incorrect.'
              : authError.message
          );
          setLoading(false);
          return;
        }

        if (authData.user) {
          // 🆕 Attendre que la session soit bien établie
          await new Promise((resolve) => setTimeout(resolve, 500));

          // 1. Charger le profil SANS la jointure
          let { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .maybeSingle();

          // 🆕 Si le profil n'est pas trouvé, réessayer une fois
          if (!profile) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const retry = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authData.user.id)
              .maybeSingle();
            profile = retry.data;
          }

          if (!profile) {
            await rejectAuthenticatedLogin('Compte valide mais profil absent. Contactez l\'administrateur.');
            return;
          }

          if (
            agencyRoute.isAgencyRoute &&
            profile.agency_id !== agencyBranding?.id
          ) {
            await rejectAuthenticatedLogin(
              'Ce compte ne correspond pas à cette agence. Utilisez le lien de connexion de votre agence.',
            );
            return;
          }

          if (profile.statut === 'suspendu' || profile.statut === 'desactive') {
            await rejectAuthenticatedLogin('Ce compte est suspendu ou désactivé. Contactez votre administrateur.');
            return;
          }

          // 2. Charger l'agence séparément
          const { data: agencyData, error: agencyError } = await supabase
            .from('agencies')
            .select('name, slug, status')
            .eq('id', profile.agency_id)
            .maybeSingle();

          if (agencyError) {
            await rejectAuthenticatedLogin(`Impossible de vérifier le statut de l'agence : ${agencyError.message}`);
            return;
          }
          if (!agencyData) {
            await rejectAuthenticatedLogin('Agence introuvable. Contactez votre administrateur.');
            return;
          }
          if (!['active', 'trial'].includes(agencyData.status)) {
            await rejectAuthenticatedLogin('Cette agence est suspendue ou inactive. Contactez votre administrateur.');
            return;
          }

          // 3. Construire l'utilisateur
          const userAccount: UserAccount = {
            id: authData.user.id,
            agencyId: profile.agency_id,
            email: authData.user.email || cleanEmail,
            nom: profile.nom || 'Utilisateur',
            prenom: profile.prenom || '',
            telephone: profile.telephone || '+221 77 000 00 00',
            role: (profile.role as UserRole) || 'ADMIN',
            statut: profile.statut || 'actif',
            proprietaireId: profile.proprietaire_id,
            locataireId: profile.locataire_id,
            permissions: profile.permissions || ['*'],
            organisation: agencyData?.name || 'FITAL-IMMO Agence',
            createdAt: authData.user.created_at || new Date().toISOString(),
            derniereConnexion: 'À l\'instant',
          };

          onLoginSuccess(userAccount);
          return;
        }
      }

      if (agencyRoute.isAgencyRoute) {
        setErrorMsg('La connexion à une agence nécessite une connexion au service en ligne.');
        setLoading(false);
        return;
      }

      // 2. Mode local (fallback)
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
    <div
      className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans antialiased"
      style={{ backgroundColor, color: textColor }}
    >
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-[120px]"
          style={{ backgroundColor: brandColor, opacity: 0.1 }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-[120px]"
          style={{ backgroundColor: surfaceColor, opacity: 0.6 }}
        />
      </div>

      <div
        className="relative w-full max-w-md border rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl"
        style={{
          backgroundColor: cardColor,
          borderColor: `${brandColor}4D`,
          color: textColor,
        }}
      >
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl border shadow-xl mb-4 p-2.5"
            style={{ borderColor: `${brandColor}66`, backgroundColor: surfaceColor }}
          >
            {agencyRoute.isAgencyRoute ? (
              agencyBranding?.logoUrl && !agencyLogoError ? (
                <img
                  src={agencyBranding.logoUrl}
                  alt={agencyBranding.name}
                  className="w-full h-full object-contain"
                  onError={() => setAgencyLogoError(true)}
                />
              ) : (
                <span
                  aria-label={agencyLogoError ? 'Logo inaccessible' : 'Aucun logo défini'}
                  title={agencyLogoError ? 'Le logo est inaccessible' : 'Aucun logo défini'}
                  className="text-2xl font-black"
                  style={{ color: brandColor }}
                >
                  {agencyBranding?.name.trim().charAt(0).toUpperCase() || '?'}
                </span>
              )
            ) : (
              <img src="/favicon.svg" alt="FITAL-IMMO" className="w-full h-full object-contain" />
            )}
          </div>
          {agencyRoute.isAgencyRoute &&
            agencyBranding &&
            (agencyLogoError || !agencyBranding.logoUrl) && (
            <p className="mt-1 text-[10px]" style={{ color: agencyLogoError ? '#FDA4AF' : mutedColor }}>
              {agencyLogoError
                ? "Logo inaccessible : vérifiez l'URL publique et le bucket agency-logos."
                : "Aucun logo n'est encore enregistré pour cette agence."}
            </p>
          )}
          <h1 className="text-2xl font-black tracking-tight" style={{ color: textColor }}>
            {agencyRoute.isAgencyRoute
              ? agencyBranding?.name || 'Connexion agence'
              : 'FITAL-IMMO'}
          </h1>
          <p className="text-xs mt-1 font-medium" style={{ color: mutedColor }}>
            {agencyBranding?.slogan || 'Plateforme Professionnelle de Gestion Locative & Loyers'}
          </p>
        </div>

        {agencyRoute.isAgencyRoute && (
          <div
            role={agencyBrandingError ? 'alert' : 'status'}
            className={`mb-4 rounded-xl border p-3 text-xs ${
              agencyBrandingError
                ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                : 'border-white/10 text-slate-300'
            }`}
            style={
              agencyBrandingError
                ? undefined
                : {
                    backgroundColor: surfaceColor,
                    borderColor: `${brandColor}33`,
                    color: mutedColor,
                  }
            }
          >
            {agencyBrandingLoading
              ? "Chargement de l'espace de connexion..."
              : agencyBrandingError || `Connexion sécurisée à ${agencyBranding?.name}.`}
          </div>
        )}

        <div
          className="mb-5 rounded-2xl border p-3 text-[11px] space-y-2"
          style={{ backgroundColor: surfaceColor, borderColor: `${brandColor}33` }}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium flex items-center gap-1.5" style={{ color: textColor }}>
              <Globe className="w-3.5 h-3.5" style={{ color: brandColor }} />
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
            <span className="truncate max-w-[240px]" style={{ color: mutedColor }}>
              {isSupabaseConfigured ? 'Accès sécurisé multi-utilisateurs' : 'Accès local sécurisé'}
            </span>
            <button
              type="button"
              onClick={runConnectionDiagnostic}
              disabled={isCheckingHealth}
              className="font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
              style={{ color: brandColor }}
            >
              <RefreshCw className={`w-3 h-3 ${isCheckingHealth ? 'animate-spin' : ''}`} />
              <span>{isCheckingHealth ? 'Test...' : 'Vérifier'}</span>
            </button>
          </div>
        </div>

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

        <div
          className="mb-5 pb-3 border-b text-center"
          style={{ borderColor: `${brandColor}33` }}
        >
          <h2 className="text-base font-bold flex items-center justify-center gap-2" style={{ color: textColor }}>
            <ShieldCheck className="w-4 h-4" style={{ color: brandColor }} />
            Connexion à votre Espace
          </h2>
          <p className="text-[11px] mt-0.5" style={{ color: mutedColor }}>
            Accédez à vos données selon vos identifiants
          </p>
        </div>

        {isForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: textColor }}>
                Adresse email associée à votre compte
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: mutedColor }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre-email@domaine.sn"
                  className="w-full pl-10 pr-3.5 py-2.5 border rounded-xl text-xs focus:outline-none"
                  style={{ backgroundColor: surfaceColor, borderColor: `${brandColor}55`, color: textColor }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-bold text-xs shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
              style={{ backgroundColor: brandColor, color: contrastColor, boxShadow: `0 10px 24px ${brandColor}33` }}
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
                className="text-xs hover:underline cursor-pointer"
                style={{ color: brandColor }}
              >
                Retour à la connexion
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: textColor }}>
                Adresse Email Professionnelle ou Personnelle
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: mutedColor }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@fital-immo.sn"
                  className="w-full pl-10 pr-3.5 py-2.5 border rounded-xl text-xs focus:outline-none"
                  style={{ backgroundColor: surfaceColor, borderColor: `${brandColor}55`, color: textColor }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold" style={{ color: textColor }}>
                  Mot de passe
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-[11px] hover:underline cursor-pointer"
                  style={{ color: brandColor }}
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: mutedColor }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 border rounded-xl text-xs focus:outline-none"
                  style={{ backgroundColor: surfaceColor, borderColor: `${brandColor}55`, color: textColor }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
                  style={{ color: mutedColor }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || agencyBrandingLoading || (agencyRoute.isAgencyRoute && !agencyBranding)}
              className={`w-full py-2.5 mt-2 rounded-xl text-[#0F1B2D] font-bold text-xs shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 ${
                agencyBranding ? '' : 'bg-gradient-to-r from-[#C9A96E] to-[#A07840] shadow-[#C9A96E]/20 hover:shadow-[#C9A96E]/40'
              }`}
              style={agencyBranding ? { backgroundColor: brandColor, boxShadow: `0 10px 24px ${brandColor}33` } : undefined}
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