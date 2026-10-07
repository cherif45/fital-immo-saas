import React, { useState } from 'react';
import {
  UserAccount,
  UserRole,
  UserAccountStatus,
  Owner,
  Tenant,
  Property,
  Building,
} from '../types';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Lock,
  Key,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Building2,
  Home,
  Phone,
  Mail,
  Eye,
  Edit3,
  RotateCcw,
  Sliders,
  History,
  Check,
  X
} from 'lucide-react';

interface AdminUsersViewProps {
  users: UserAccount[];
  owners: Owner[];
  tenants: Tenant[];
  properties?: Property[];
  buildings?: Building[];
  onAddUser: (user: UserAccount) => Promise<{ success: boolean; error?: string }>;
  onUpdateUser: (user: UserAccount) => void;
  onSwitchActiveUser: (user: UserAccount) => void;
  currentUser: UserAccount;
  isSupabaseOnline?: boolean;
}

const ROLE_CONFIG: Record<UserRole, {
  label: string; bg: string; text: string; border: string; desc: string
}> = {
  SUPER_ADMIN_SAAS: {
    label: 'SaaS Owner',
    bg: 'bg-amber-500/20',
    text: 'text-amber-300',
    border: 'border-amber-500/30',
    desc: 'Propriétaire du SaaS - Accès total multi-agences.',
  },
  SUPER_ADMIN: {
    label: 'Super Administrateur',
    bg: 'bg-purple-500/20',
    text: 'text-purple-300',
    border: 'border-purple-500/30',
    desc: 'Accès universel et contrôle absolu de lâ€™infrastructure et du système.',
  },
  ADMIN: {
    label: 'Administrateur',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
    desc: 'Accès complet au système, gestion des utilisateurs, finances et configurations.',
  },
  CAISSIER: {
    label: 'Caissier / Comptable',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    desc: 'Gestion des encaissements, journal de caisse, clôtures et quittances.',
  },
  GESTIONNAIRE: {
    label: 'Gestionnaire Immobilier',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    desc: 'Gestion du parc immobilier, contrats, baux, états des lieux et relances.',
  },
  PROPRIETAIRE: {
    label: 'Bailleur / Propriétaire',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    desc: 'Espace dédié : consultation de ses biens, loyers, travaux et reversements.',
  },
  LOCATAIRE: {
    label: 'Locataire',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/20',
    desc: 'Espace locataire : consultation du bail, quittances et paiements en ligne.',
  },
  AGENT: {
    label: 'Agent de Terrain',
    bg: 'bg-teal-500/10',
    text: 'text-teal-400',
    border: 'border-teal-500/20',
    desc: 'Accès restreint aux constats terrain, états des lieux et signalements.',
  },
};

const ALL_PERMISSIONS = [
  { id: 'biens.manage', label: 'Gestion des Biens & Lots', category: 'Immobilier' },
  { id: 'locataires.manage', label: 'Gestion des Locataires', category: 'Immobilier' },
  { id: 'proprietaires.manage', label: 'Gestion des Bailleurs', category: 'Immobilier' },
  { id: 'contrats.manage', label: 'Rédaction & Signature Baux', category: 'Juridique' },
  { id: 'etats_lieux.manage', label: 'Ã‰tats des Lieux dâ€™Entrée/Sortie', category: 'Juridique' },
  { id: 'paiements.create', label: 'Enregistrement Encaissements', category: 'Finances' },
  { id: 'caisse.manage', label: 'Gestion Journal de Caisse', category: 'Finances' },
  { id: 'caisse.cloture', label: 'Clôture Journalière de Caisse', category: 'Finances' },
  { id: 'quittances.generate', label: 'Ã‰mission Quittances de Loyer', category: 'Finances' },
  { id: 'reversements.view', label: 'Décomptes & Bons de Caisse', category: 'Finances' },
  { id: 'relances.manage', label: 'Envoi Relances & Mises en Demeure', category: 'Recouvrement' },
  { id: 'travaux.manage', label: 'Gestion Pannes & Ordres de Travaux', category: 'Maintenance' },
  { id: 'users.manage', label: 'Administration des Comptes', category: 'Système' },
  { id: 'settings.manage', label: 'Paramètres Généraux Agence', category: 'Système' },
];

export function AdminUsersView({
  users,
  owners,
  tenants,
  properties = [],
  buildings = [],
  onAddUser,
  onUpdateUser,
  onSwitchActiveUser,
  currentUser,
  isSupabaseOnline = false,
}: AdminUsersViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserAccount | null>(null);
  const [activeTabSub, setActiveTabSub] = useState<'users' | 'roles' | 'security_log'>('users');

  const [formData, setFormData] = useState<{
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    role: UserRole;
    tempPassword: string;
    proprietaireId: string;
    locataireId: string;
    organisation: string;
    permissions: string[];
  }>({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    role: 'GESTIONNAIRE',
    tempPassword: 'Pass' + Math.floor(100000 + Math.random() * 900000) + '!',
    proprietaireId: '',
    locataireId: '',
    organisation: '',
    permissions: [],
  });

  // ============================================================
  // ðŸ”§ Helper : calcul dynamique des biens gérés
  // ============================================================
  const getOwnerTotalBiens = (ownerId: string): number => {
    const nbProperties = properties.filter((p) => p.proprietaireId === ownerId).length;
    const nbBuildings = buildings.filter((b) => b.proprietaireId === ownerId).length;
    return nbProperties + nbBuildings;
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.prenom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.telephone.includes(searchQuery);
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchStatus = statusFilter === 'ALL' || u.statut === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const handleRoleChangeInForm = (newRole: UserRole) => {
    let defaultPerms: string[] = [];
    if (newRole === 'ADMIN') defaultPerms = ['*'];
    else if (newRole === 'CAISSIER') defaultPerms = ['paiements.create', 'caisse.manage', 'caisse.cloture', 'quittances.generate', 'reversements.view'];
    else if (newRole === 'GESTIONNAIRE') defaultPerms = ['biens.manage', 'locataires.manage', 'proprietaires.manage', 'contrats.manage', 'etats_lieux.manage', 'relances.manage', 'travaux.manage'];
    else if (newRole === 'PROPRIETAIRE') defaultPerms = ['proprio.read_own_data'];
    else if (newRole === 'LOCATAIRE') defaultPerms = ['locataire.read_own_data', 'locataire.download_quittance'];
    else if (newRole === 'AGENT') defaultPerms = ['etats_lieux.manage', 'travaux.manage'];

    setFormData({
      ...formData,
      role: newRole,
      proprietaireId: newRole === 'PROPRIETAIRE' && owners.length > 0 ? owners[0].id : '',
      locataireId: newRole === 'LOCATAIRE' && tenants.length > 0 ? tenants[0].id : '',
      permissions: defaultPerms,
    });
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom || !formData.email) return;

    setIsCreating(true);
    setCreateError(null);
    setCreateSuccess(null);

    let org = formData.organisation;
    if (!org) {
      if (formData.role === 'PROPRIETAIRE') {
        const owner = owners.find((o) => o.id === formData.proprietaireId);
        org = owner ? `Bailleur : ${owner.prenom} ${owner.nom}` : 'Bailleur Privé';
      } else if (formData.role === 'LOCATAIRE') {
        const tenant = tenants.find((t) => t.id === formData.locataireId);
        org = tenant ? `Locataire : ${tenant.prenom} ${tenant.nom}` : 'Locataire';
      } else {
        org = `FITAL-IMMO ${ROLE_CONFIG[formData.role].label}`;
      }
    }

    const newUser: UserAccount = {
      id: crypto.randomUUID(),
      agencyId: currentUser.agencyId,
      nom: formData.nom.toUpperCase(),
      prenom: formData.prenom,
      email: formData.email.trim().toLowerCase(),
      telephone: formData.telephone,
      role: formData.role,
      statut: 'actif',
      password: formData.tempPassword,
      proprietaireId: formData.role === 'PROPRIETAIRE' ? formData.proprietaireId : undefined,
      locataireId: formData.role === 'LOCATAIRE' ? formData.locataireId : undefined,
      organisation: org,
      permissions: formData.permissions,
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      createdAt: new Date().toISOString().split('T')[0],
      derniereConnexion: 'Jamais connecté',
    };

    const result = await onAddUser(newUser);

    setIsCreating(false);

    if (!result.success) {
      setCreateError(result.error || 'Impossible de créer le compte.');
      return;
    }

    setCreateSuccess(
      isSupabaseOnline
        ? `Compte ${newUser.email} créé en ligne. Mot de passe : ${formData.tempPassword}`
        : `Compte local créé (navigateur uniquement). Mot de passe : ${formData.tempPassword}`
    );

    setTimeout(() => {
      setIsNewUserModalOpen(false);
      setCreateSuccess(null);
      setFormData({
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        role: 'GESTIONNAIRE',
        tempPassword: 'Pass' + Math.floor(100000 + Math.random() * 900000) + '!',
        proprietaireId: '',
        locataireId: '',
        organisation: '',
        permissions: [],
      });
    }, 1500);
  };

  const toggleUserStatus = async (user: UserAccount) => {
    const nextStatus: UserAccountStatus =
      user.statut === 'actif' ? 'suspendu' : user.statut === 'suspendu' ? 'desactive' : 'actif';

    // 1. Optimistic UI (change immédiatement à l'écran)
    onUpdateUser({ ...user, statut: nextStatus });

    // 2. Persister en DB via RPC sécurisée
    try {
      const { supabase } = await import('../lib/supabase/client');
      if (!supabase) {
        console.error('Supabase non configuré');
        onUpdateUser(user); // Rollback
        return;
      }

      const { data, error } = await supabase.rpc('update_user_statut', {
        p_user_id: user.id,
        p_new_statut: nextStatus,
      });

      if (error) {
        console.error('Erreur RPC:', error);
        onUpdateUser(user); // Rollback
        alert('Impossible de sauvegarder le statut : ' + error.message);
        return;
      }

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        console.error('Erreur RPC:', result.error);
        onUpdateUser(user); // Rollback
        alert('Impossible de sauvegarder : ' + (result.error || 'Erreur inconnue'));
        return;
      }

      console.log('âœ… Statut sauvegardé en DB :', nextStatus);
    } catch (e: any) {
      console.error('Exception:', e);
      onUpdateUser(user); // Rollback
      alert('Erreur : ' + e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111C2E] p-6 rounded-2xl border border-white/5 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#C9A96E]/10 border border-[#C9A96E]/30 flex items-center justify-center text-[#C9A96E]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Gestion Multi-Comptes & Espaces Utilisateurs
              <span className="text-xs bg-[#C9A96E]/20 text-[#E8D5B0] px-2.5 py-0.5 rounded-full font-semibold border border-[#C9A96E]/30">
                {users.length} comptes actifs
              </span>
            </h1>
            <p className="text-sm text-slate-400">
              Contrôle d'accès par rôle (RBAC), séparation étanche des espaces et liaisons propriétaires/locataires.
                            {isSupabaseOnline ? ' Comptes synchronisés en ligne.' : ' Mode local : comptes visibles uniquement sur ce navigateur.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsNewUserModalOpen(true)}
            className="px-4 py-2.5 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] font-bold rounded-xl text-sm transition-all shadow-lg hover:shadow-[#C9A96E]/20 flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Nouveau Compte</span>
          </button>
        </div>
      </div>

      {/* Sub tabs */}
      <div className="flex border-b border-white/10 gap-6">
        <button
          onClick={() => setActiveTabSub('users')}
          className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 ${
            activeTabSub === 'users' ? 'text-[#C9A96E]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Comptes Utilisateurs ({users.length})</span>
          {activeTabSub === 'users' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C9A96E] rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTabSub('roles')}
          className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 ${
            activeTabSub === 'roles' ? 'text-[#C9A96E]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Matrice des Rôles & Permissions</span>
          {activeTabSub === 'roles' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C9A96E] rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTabSub('security_log')}
          className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 ${
            activeTabSub === 'security_log' ? 'text-[#C9A96E]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Journal de Sécurité & Connexions</span>
          {activeTabSub === 'security_log' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C9A96E] rounded-full" />
          )}
        </button>
      </div>

      {activeTabSub === 'users' && (
        <>
          {/* Filters & Search */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par nom, email, téléphone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#111C2E] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#C9A96E]"
              />
            </div>

            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#111C2E] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#C9A96E]"
              >
                <option value="ALL">Tous les rôles ({users.length})</option>
                <option value="ADMIN">Administrateurs</option>
                <option value="CAISSIER">Caissiers / Comptables</option>
                <option value="GESTIONNAIRE">Gestionnaires Immobiliers</option>
                <option value="PROPRIETAIRE">Propriétaires Bailleurs</option>
                <option value="LOCATAIRE">Locataires</option>
                <option value="AGENT">Agents de terrain</option>
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#111C2E] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#C9A96E]"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="actif">Actif (autorisé)</option>
                <option value="suspendu">Suspendu (bloqué temporairement)</option>
                <option value="desactive">Désactivé (accès révoqué)</option>
              </select>
            </div>
          </div>

          {/* User Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredUsers.map((user) => {
              const roleInfo = ROLE_CONFIG[user.role] || ROLE_CONFIG.AGENT;
              const isOwner = user.role === 'PROPRIETAIRE';
              const isTenant = user.role === 'LOCATAIRE';

              const linkedOwner = isOwner ? owners.find((o) => o.id === user.proprietaireId) : null;
              const linkedTenant = isTenant ? tenants.find((t) => t.id === user.locataireId) : null;

              // ðŸ”§ Calcul dynamique des biens gérés
              const ownerTotalBiens = linkedOwner ? getOwnerTotalBiens(linkedOwner.id) : 0;

              return (
                <div
                  key={user.id}
                  className={`bg-[#111C2E] rounded-2xl p-5 border transition-all hover:border-[#C9A96E]/40 flex flex-col justify-between ${
                    user.statut === 'actif'
                      ? 'border-white/5'
                      : user.statut === 'suspendu'
                      ? 'border-amber-500/30 bg-amber-950/10'
                      : 'border-rose-500/30 bg-rose-950/10 opacity-75'
                  }`}
                >
                  <div className="space-y-4">
                    {/* User Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={user.nom}
                          className="w-12 h-12 rounded-xl object-cover border border-white/10"
                        />
                        <div>
                          <h3 className="font-bold text-white text-base leading-tight">
                            {user.prenom} {user.nom}
                          </h3>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" /> {user.email}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${
                          user.statut === 'actif'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : user.statut === 'suspendu'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {user.statut === 'actif' ? 'Actif' : user.statut === 'suspendu' ? 'Suspendu' : 'Désactivé'}
                      </span>
                    </div>

                    {/* Role Badge & Details */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${roleInfo.bg} ${roleInfo.text} ${roleInfo.border}`}>
                          {roleInfo.label}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {user.telephone}
                        </span>
                      </div>

                      {/* Associated Entity */}
                      {isOwner && (
                        <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs space-y-1">
                          <div className="text-blue-300 font-semibold flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>Bailleur Associé :</span>
                          </div>
                          <p className="text-white font-medium pl-5">
                            {linkedOwner ? `${linkedOwner.prenom} ${linkedOwner.nom} (${ownerTotalBiens} biens gérés)` : 'Compte non rattaché'}
                          </p>
                        </div>
                      )}

                      {isTenant && (
                        <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs space-y-1">
                          <div className="text-purple-300 font-semibold flex items-center gap-1.5">
                            <Home className="w-3.5 h-3.5" />
                            <span>Locataire Associé :</span>
                          </div>
                          <p className="text-white font-medium pl-5">
                            {linkedTenant ? `${linkedTenant.prenom} ${linkedTenant.nom} â€” ${linkedTenant.bienNom || 'Logement'}` : 'Compte non rattaché'}
                          </p>
                        </div>
                      )}

                      <div className="text-[11px] text-slate-400 flex justify-between pt-1">
                        <span>Dernière connexion :</span>
                        <span className="text-slate-300">{user.derniereConnexion || 'Récente'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onSwitchActiveUser(user)}
                      className="px-3 py-1.5 bg-[#C9A96E]/10 hover:bg-[#C9A96E]/20 text-[#E8D5B0] text-xs font-semibold rounded-lg transition-all border border-[#C9A96E]/30 flex items-center gap-1.5 cursor-pointer"
                      title="Se connecter dans l'espace de cet utilisateur"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Accéder à l'Espace</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedUserForEdit(user)}
                        className="p-1.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all cursor-pointer"
                        title="Modifier les rôles & permissions"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleUserStatus(user)}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          user.statut === 'actif'
                            ? 'text-amber-400 hover:bg-amber-500/20 bg-amber-500/10'
                            : 'text-emerald-400 hover:bg-emerald-500/20 bg-emerald-500/10'
                        }`}
                        title={user.statut === 'actif' ? 'Suspendre le compte' : 'Réactiver le compte'}
                      >
                        {user.statut === 'actif' ? <Lock className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Role Matrix Tab */}
      {activeTabSub === 'roles' && (
        <div className="bg-[#111C2E] p-6 rounded-2xl border border-white/5 shadow-xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">Matrice des Rôles & Ségrégation des Tâches (RLS)</h2>
            <p className="text-xs text-slate-400">
              Définition des périmètres d'accès conformément aux règles de gouvernance FITAL-IMMO.
            </p>
          </div>

          <div className="overflow-x-auto">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="py-3 px-4">Permission / Domaine</th>
                  <th className="py-3 px-3 text-center text-rose-400">ADMIN</th>
                  <th className="py-3 px-3 text-center text-emerald-400">CAISSIER</th>
                  <th className="py-3 px-3 text-center text-amber-400">GESTIONNAIRE</th>
                  <th className="py-3 px-3 text-center text-blue-400">PROPRIÃ‰TAIRE</th>
                  <th className="py-3 px-3 text-center text-purple-400">LOCATAIRE</th>
                  <th className="py-3 px-3 text-center text-teal-400">AGENT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {ALL_PERMISSIONS.map((perm) => (
                  <tr key={perm.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{perm.label}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{perm.id}</div>
                    </td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center">
                      {perm.category === 'Finances' ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-slate-600 mx-auto" />}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {['Immobilier', 'Juridique', 'Recouvrement', 'Maintenance'].includes(perm.category) ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-slate-600 mx-auto" />}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {perm.id === 'biens.manage' || perm.id === 'reversements.view' ? <span className="text-[10px] text-blue-400 font-semibold">Propres biens</span> : <X className="w-4 h-4 text-slate-600 mx-auto" />}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {perm.id === 'quittances.generate' ? <span className="text-[10px] text-purple-400 font-semibold">Téléchargement</span> : <X className="w-4 h-4 text-slate-600 mx-auto" />}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {['etats_lieux.manage', 'travaux.manage'].includes(perm.id) ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-slate-600 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* Security Log Tab */}
      {activeTabSub === 'security_log' && (
        <div className="bg-[#111C2E] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-white">Journal des Accès & Ã‰vénements d'Authentification</h2>
          <div className="space-y-3">
            {[
              { id: '1', user: 'Amadou SOW', action: 'Connexion réussie (Admin)', ip: '41.82.190.12 (Dakar, Orange)', date: 'Aujourdâ€™hui à 10:45', status: 'success' },
              { id: '2', user: 'Aminata DIOP', action: 'Connexion réussie (Caisse)', ip: '154.124.78.3 (Dakar, Sonatel)', date: 'Aujourdâ€™hui à 08:30', status: 'success' },
              { id: '3', user: 'Mamadou DIOP', action: 'Téléchargement Quittance Mai 2026', ip: '197.234.221.90 (Mobile)', date: 'Hier à 19:40', status: 'info' },
              { id: '4', user: 'Abdoulaye DIENG', action: 'Consultation Décompte de Gérance', ip: '41.82.110.45 (Bureau)', date: 'Hier à 16:45', status: 'info' },
              { id: '5', user: 'Inconnu (admin@fital.sn)', action: 'Ã‰chec tentative connexion (Mot de passe erroné)', ip: '185.220.101.5 (Proxy)', date: '29 Mai 2026 à 23:12', status: 'danger' },
            ].map((log) => (
              <div key={log.id} className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${log.status === 'success' ? 'bg-emerald-400' : log.status === 'danger' ? 'bg-rose-400' : 'bg-blue-400'}`} />
                  <div>
                    <p className="font-semibold text-white">{log.user} â€” <span className="text-slate-300 font-normal">{log.action}</span></p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{log.ip}</p>
                  </div>
                </div>
                <span className="text-slate-400">{log.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Create User Account */}
      {isNewUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111C2E] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/20 text-[#E8D5B0] flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Créer un Nouveau Compte Utilisateur</h3>
                  <p className="text-xs text-slate-400">Attribution d'un profil métier, rôle et liaisons sécurisées.</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewUserModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 cursor-pointer"
              >
                âœ•
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              {createError && (
  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
    {createError}
  </div>
)}

                {createSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                    {createSuccess}
                  </div>
                )}

                {/* Identité */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Nom *</label>
                    <input
                      type="text"
                      required
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#0A111D] border border-white/10 rounded-xl text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Prénom</label>
                    <input
                      type="text"
                      value={formData.prenom}
                      onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#0A111D] border border-white/10 rounded-xl text-sm text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#0A111D] border border-white/10 rounded-xl text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Téléphone</label>
                    <input
                      type="text"
                      value={formData.telephone}
                      onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#0A111D] border border-white/10 rounded-xl text-sm text-white"
                    />
                  </div>
                </div>

                {/* Rôle */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Rôle *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleRoleChangeInForm(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 bg-[#0A111D] border border-white/10 rounded-xl text-sm text-white"
                  >
                    {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">{ROLE_CONFIG[formData.role].desc}</p>
                </div>

                {/* Rattachement PROPRIETAIRE */}
                {formData.role === 'PROPRIETAIRE' && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-2">
                    <label className="text-xs font-bold text-blue-300">Propriétaire rattaché :</label>
                    <select
                      value={formData.proprietaireId}
                      onChange={(e) => setFormData({ ...formData, proprietaireId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#0A111D] border border-white/10 rounded-xl text-sm text-white"
                    >
                      <option value="">â€” Non rattaché â€”</option>
                      {owners.map((o) => (
                        <option key={o.id} value={o.id}>{o.prenom} {o.nom}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Rattachement LOCATAIRE */}
                {formData.role === 'LOCATAIRE' && (
                  <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl space-y-2">
                    <label className="text-xs font-bold text-purple-300">Locataire rattaché :</label>
                    <select
                      value={formData.locataireId}
                      onChange={(e) => setFormData({ ...formData, locataireId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#0A111D] border border-white/10 rounded-xl text-sm text-white"
                    >
                      <option value="">â€” Non rattaché â€”</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>{t.prenom} {t.nom} â€” {t.bienNom || 'Logement'}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Mot de passe temporaire */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Mot de passe temporaire *</label>
                  <input
                    type="text"
                    required
                    value={formData.tempPassword}
                    onChange={(e) => setFormData({ ...formData, tempPassword: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#0A111D] border border-white/10 rounded-xl text-sm font-mono text-white"
                  />
                </div>

                {/* Permissions */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Permissions</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-[#0A111D] border border-white/10 rounded-xl">
                    {ALL_PERMISSIONS.map((perm) => (
                      <label key={perm.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(perm.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, permissions: [...formData.permissions, perm.id] });
                            } else {
                              setFormData({ ...formData, permissions: formData.permissions.filter((p) => p !== perm.id) });
                            }
                          }}
                          className="rounded border-white/20"
                        />
                        <span>{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Boutons */}
                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsNewUserModalOpen(false)}
                    className="px-4 py-2 bg-white/5 text-white rounded-xl text-xs"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-5 py-2 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] font-bold rounded-xl text-xs shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isCreating ? 'Création...' : 'Créer le Compte'}
                  </button>
                </div>
              </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User */}
      {selectedUserForEdit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111C2E] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="font-bold text-white text-lg">Modifier : {selectedUserForEdit.prenom} {selectedUserForEdit.nom}</h3>
              <button onClick={() => setSelectedUserForEdit(null)} className="text-slate-400 hover:text-white">âœ•</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Rôle</label>
                <select
                  value={selectedUserForEdit.role}
                  onChange={(e) => setSelectedUserForEdit({ ...selectedUserForEdit, role: e.target.value as UserRole })}
                  className="w-full px-3.5 py-2.5 bg-[#0A111D] border border-white/10 rounded-xl text-sm text-white"
                >
                  {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>

              {selectedUserForEdit.role === 'PROPRIETAIRE' && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-2">
                  <label className="text-xs font-bold text-blue-300">Propriétaire rattaché :</label>
                  <select
                    value={selectedUserForEdit.proprietaireId || ''}
                    onChange={(e) => setSelectedUserForEdit({ ...selectedUserForEdit, proprietaireId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#0A111D] border border-white/10 rounded-xl text-sm text-white"
                  >
                    <option value="">â€” Non rattaché â€”</option>
                    {owners.map((o) => (
                      <option key={o.id} value={o.id}>{o.prenom} {o.nom}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedUserForEdit.role === 'LOCATAIRE' && (
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl space-y-2">
                  <label className="text-xs font-bold text-purple-300">Locataire rattaché :</label>
                  <select
                    value={selectedUserForEdit.locataireId || ''}
                    onChange={(e) => setSelectedUserForEdit({ ...selectedUserForEdit, locataireId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#0A111D] border border-white/10 rounded-xl text-sm text-white"
                  >
                    <option value="">â€” Non rattaché â€”</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>{t.prenom} {t.nom} â€” {t.bienNom || 'Logement'}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedUserForEdit(null)}
                  className="px-4 py-2 bg-white/5 text-white rounded-xl text-xs"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateUser(selectedUserForEdit);
                    setSelectedUserForEdit(null);
                  }}
                  className="px-5 py-2 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] font-bold rounded-xl text-xs shadow-md cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
