import React, { useState, useEffect } from 'react';
import {
  Crown, Building2, Users, TrendingUp, Plus, Search, CheckCircle2,
  AlertTriangle, RefreshCw, Ban, Play, X, Database, Briefcase, Home,
  Layers, CreditCard,
} from 'lucide-react';
import {
  fetchAllAgencies, fetchAllUsers, fetchGlobalStats,
  createAgencyWithAdmin, toggleAgencyStatus,
} from '../lib/supabase/service';
import { supabase } from '../lib/supabase/client';
import { formatNumber } from '../lib/utils';

interface SuperAdminDashboardProps { currentUser: any; agencyStats?: any; payments?: any[]; invoices?: any[]; cashMovements?: any[]; owners?: any[]; tenants?: any[]; properties?: any[]; buildings?: any[]; units?: any[]; contracts?: any[]; }

interface Agency {
  id: string; name: string; slug: string; email: string; phone: string;
  city: string; status: string; created_at: string;
}

interface GlobalStats {
  totalAgencies: number; totalUsers: number; totalBuildings: number;
  totalUnits: number; totalTenants: number; totalProperties: number;
  totalPayments: number;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ currentUser, agencyStats, payments = [], invoices = [], cashMovements = [], owners = [], tenants = [], properties = [], buildings = [], units = [], contracts = [] }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'agencies' | 'users'>('overview');
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [agencyFilter, setAgencyFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    agencyName: '', agencySlug: '', agencyEmail: '', agencyPhone: '',
    agencyCity: 'Dakar', agencyAddress: '',
    agencyLogoUrl: '', agencyPrimaryColor: '#C9A96E', agencyWebsite: '',
    agencyNinea: '', agencyRc: '', agencyBankName: '', agencyBankAccount: '',
    adminEmail: '', adminPassword: '', adminNom: '', adminPrenom: '', adminTelephone: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [agenciesData, usersData, statsData] = await Promise.all([
        fetchAllAgencies(), fetchAllUsers(), fetchGlobalStats(),
      ]);
      setAgencies(agenciesData);
      setUsers(usersData);
      // Fusionner avec agencyStats (RPC serveur, bypass RLS)
      // PRIORITE 1 : Utiliser les longueurs des props locales (deja chargees par le parent)
      // PRIORITE 2 : Fallback sur agencyStats (RPC serveur)
      // PRIORITE 3 : Fallback sur statsData (fetchGlobalStats, souvent 0 a cause RLS)
      setStats({
        totalAgencies: statsData?.totalAgencies || 0,
        totalUsers: statsData?.totalUsers || 0,
        totalBuildings: buildings.length || agencyStats?.total_properties || statsData?.totalBuildings || 0,
        totalUnits: units.length || agencyStats?.total_units || statsData?.totalUnits || 0,
        totalTenants: tenants.length || agencyStats?.total_tenants || statsData?.totalTenants || 0,
        totalProperties: properties.length || agencyStats?.total_properties || statsData?.totalProperties || 0,
        totalPayments: payments.length || agencyStats?.total_payments || statsData?.totalPayments || 0,
      });
    } catch (err: any) {
      setStatusMessage({ text: '❌ Erreur chargement : ' + err.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreateAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setStatusMessage(null);
    const result = await createAgencyWithAdmin(formData);
    if (result.success) {
      setStatusMessage({
        text: `✅ Agence "${formData.agencyName}" créée. Admin : ${formData.adminEmail}.`,
        type: 'success',
      });
      setIsCreateModalOpen(false);
      setFormData({
        agencyName: '', agencySlug: '', agencyEmail: '', agencyPhone: '',
        agencyCity: 'Dakar', agencyAddress: '',
        agencyLogoUrl: '', agencyPrimaryColor: '#C9A96E', agencyWebsite: '',
        agencyNinea: '', agencyRc: '', agencyBankName: '', agencyBankAccount: '',
        adminEmail: '', adminPassword: '', adminNom: '', adminPrenom: '', adminTelephone: '',
      });
      await loadData();
    } else {
      setStatusMessage({ text: '❌ Erreur : ' + result.error, type: 'error' });
    }
    setIsCreating(false);
  };

  const handleToggleStatus = async (agency: Agency) => {
    const newStatus = agency.status === 'active' ? 'suspendu' : 'active';
    const confirmMsg = newStatus === 'suspendu'
      ? `⚠️ Suspendre l'agence "${agency.name}" ?`
      : `Réactiver l'agence "${agency.name}" ?`;
    if (!window.confirm(confirmMsg)) return;
    const result = await toggleAgencyStatus(agency.id, newStatus);
    if (result.success) {
      setStatusMessage({ text: `✅ Agence "${agency.name}" ${newStatus === 'active' ? 'réactivée' : 'suspendue'}.`, type: 'success' });
      await loadData();
    } else {
      setStatusMessage({ text: '❌ Erreur : ' + result.error, type: 'error' });
    }
  };

  const handleToggleUserStatus = async (user: any) => {
    if (user.role === 'SUPER_ADMIN_SAAS') {
      setStatusMessage({ text: '❌ Impossible de suspendre le Super-Admin SaaS.', type: 'error' });
      return;
    }
    const newStatus = user.statut === 'actif' ? 'suspendu' : 'actif';
    const confirmMsg = newStatus === 'suspendu'
      ? `⚠️ Suspendre ${user.prenom} ${user.nom} ?`
      : `Réactiver ${user.prenom} ${user.nom} ?`;
    if (!window.confirm(confirmMsg)) return;
    try {
      if (!supabase) throw new Error('Supabase non configuré');
      const { error } = await supabase.from('profiles').update({ statut: newStatus }).eq('id', user.id);
      if (error) throw error;
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, statut: newStatus } : u)));
      setStatusMessage({ text: `✅ ${user.prenom} ${user.nom} ${newStatus === 'actif' ? 'réactivé' : 'suspendu'}.`, type: 'success' });
      await loadData();
    } catch (err: any) {
      setStatusMessage({ text: '❌ Erreur : ' + err.message, type: 'error' });
    }
  };

  const filteredAgencies = agencies.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)
      || a.slug.toLowerCase().includes(q) || a.city.toLowerCase().includes(q);
  });

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (agencyFilter !== 'ALL' && u.agency_id !== agencyFilter) return false;
    if (statusFilter !== 'ALL' && u.statut !== statusFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (u.email || '').toLowerCase().includes(q)
      || (u.nom || '').toLowerCase().includes(q)
      || (u.prenom || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#1E2E45] via-[#2A3F5C] to-[#1E2E45] border border-[#C9A96E]/40 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C9A96E] to-[#A07840] flex items-center justify-center shadow-2xl">
            <Crown className="w-7 h-7 text-[#0F1B2D]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white tracking-tight">Super-Admin SaaS</h1>
              <span className="text-[10px] uppercase font-mono px-2.5 py-1 rounded-full bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold">ROOT ACCESS</span>
            </div>
            <p className="text-xs text-[#A8B4C4] mt-1">
              Pilotage global · {agencies.length} agence(s) · {users.length} utilisateur(s)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-[#0A111D]/60 hover:bg-[#0A111D] text-[#C9A96E] border border-[#C9A96E]/30 text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
          <button onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] hover:from-[#D8BA80] hover:to-[#B58C50] text-[#0F1B2D] text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg">
            <Plus className="w-4 h-4" />
            <span>Nouvelle Agence</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
          statusMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          : statusMessage.type === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
        }`}>
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex border-b border-[#C9A96E]/20 gap-2">
        {[
          { id: 'overview', label: "Vue d'ensemble", icon: TrendingUp },
          { id: 'agencies', label: `Agences (${agencies.length})`, icon: Building2 },
          { id: 'users', label: `Utilisateurs (${users.length})`, icon: Users },
        ].map((tab) => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); setSearchQuery(''); }}
            className={`pb-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
              activeTab === tab.id ? 'text-[#C9A96E]' : 'text-[#A8B4C4] hover:text-white'
            }`}>
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {activeTab === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C9A96E] rounded-full" />}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Agences" value={stats.totalAgencies} icon={<Building2 className="w-5 h-5" />} color="from-[#C9A96E] to-[#A07840]" />
            <StatCard label="Utilisateurs" value={stats.totalUsers} icon={<Users className="w-5 h-5" />} color="from-blue-500 to-blue-700" />
            <StatCard label="Immeubles" value={stats.totalBuildings} icon={<Briefcase className="w-5 h-5" />} color="from-purple-500 to-purple-700" />
            <StatCard label="Espaces louables" value={stats.totalUnits} icon={<Layers className="w-5 h-5" />} color="from-teal-500 to-teal-700" />
            <StatCard label="Biens" value={stats.totalProperties} icon={<Home className="w-5 h-5" />} color="from-cyan-500 to-cyan-700" />
            <StatCard label="Locataires" value={stats.totalTenants} icon={<Users className="w-5 h-5" />} color="from-emerald-500 to-emerald-700" />
            <StatCard label="Paiements" value={payments.length || stats?.totalPayments || 0} icon={<CreditCard className="w-5 h-5" />} color="from-amber-500 to-amber-700" />
            <StatCard label="CA (à venir)" value={0} suffix=" FCFA" icon={<TrendingUp className="w-5 h-5" />} color="from-rose-500 to-rose-700" />
          </div>
          <div className="p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-[#C9A96E] flex-shrink-0 mt-0.5" />
              <div className="text-xs text-[#A8B4C4] space-y-2">
                <p className="font-bold text-white">📌 Que peut faire le Super-Admin SaaS ?</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>Voir TOUTES les agences de la plateforme</li>
                  <li>Créer de nouvelles agences avec leur admin</li>
                  <li>Suspendre ou réactiver une agence</li>
                  <li>Consulter les statistiques globales</li>
                  <li>Voir tous les utilisateurs (toutes agences)</li>
                  <li>Suspendre ou réactiver un utilisateur</li>
                </ul>
                <p className="mt-2 text-amber-300">
                  ⚠️ Le Super-Admin SaaS <strong>ne peut PAS</strong> modifier les données métier des agences.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'agencies' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-[#6B7C94] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Rechercher une agence..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#162133] border border-[#C9A96E]/20 text-xs text-white placeholder:text-[#6B7C94] focus:outline-none focus:border-[#C9A96E]" />
          </div>
          <div className="rounded-2xl bg-[#162133] border border-[#C9A96E]/20 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1E2E45]/80 text-[#A8B4C4] text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Agence</th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3">Ville</th>
                  <th className="py-3 px-3 text-center">Statut</th>
                  <th className="py-3 px-3">Créée le</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C9A96E]/10">
                {filteredAgencies.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-500 italic">Aucune agence trouvée</td></tr>
                ) : filteredAgencies.map((agency) => (
                  <tr key={agency.id} className="hover:bg-[#1E2E45]/40">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{agency.name}</div>
                      <div className="text-[10px] text-[#C9A96E] font-mono">{agency.slug}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-300">{agency.email}</div>
                      <div className="text-[10px] text-slate-400">{agency.phone}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{agency.city}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        agency.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>{agency.status === 'active' ? 'ACTIVE' : 'SUSPENDUE'}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      {new Date(agency.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => handleToggleStatus(agency)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 mx-auto cursor-pointer ${
                          agency.status === 'active'
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                        {agency.status === 'active' ? <><Ban className="w-3 h-3" /> Suspendre</> : <><Play className="w-3 h-3" /> Activer</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {[
              { role: 'SUPER_ADMIN_SAAS', label: 'SaaS Owner', color: 'from-[#C9A96E] to-[#A07840]' },
              { role: 'SUPER_ADMIN', label: 'Super Admin', color: 'from-purple-500 to-purple-700' },
              { role: 'ADMIN', label: 'Admin', color: 'from-rose-500 to-rose-700' },
              { role: 'GESTIONNAIRE', label: 'Gestionnaire', color: 'from-blue-500 to-blue-700' },
              { role: 'CAISSIER', label: 'Caissier', color: 'from-emerald-500 to-emerald-700' },
              { role: 'PROPRIETAIRE', label: 'Propriétaire', color: 'from-cyan-500 to-cyan-700' },
              { role: 'LOCATAIRE', label: 'Locataire', color: 'from-teal-500 to-teal-700' },
              { role: 'AGENT', label: 'Agent', color: 'from-amber-500 to-amber-700' },
            ].map((r) => {
              const count = users.filter((u) => u.role === r.role).length;
              return (
                <button key={r.role} onClick={() => setRoleFilter(roleFilter === r.role ? 'ALL' : r.role)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    roleFilter === r.role
                      ? `bg-gradient-to-br ${r.color} text-white border-transparent shadow-lg`
                      : 'bg-[#162133] border-[#C9A96E]/20 hover:border-[#C9A96E]/50'
                  }`}>
                  <div className="text-2xl font-black font-mono text-white">{count}</div>
                  <div className={`text-[10px] uppercase font-bold tracking-wider mt-0.5 ${
                    roleFilter === r.role ? 'text-white/90' : 'text-[#A8B4C4]'
                  }`}>{r.label}</div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#6B7C94] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Rechercher un utilisateur..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#162133] border border-[#C9A96E]/20 text-xs text-white placeholder:text-[#6B7C94] focus:outline-none focus:border-[#C9A96E]" />
            </div>
            <select value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-[#162133] border border-[#C9A96E]/20 text-xs text-white focus:outline-none focus:border-[#C9A96E] cursor-pointer">
              <option value="ALL">Toutes les agences</option>
              {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-[#162133] border border-[#C9A96E]/20 text-xs text-white focus:outline-none focus:border-[#C9A96E] cursor-pointer">
              <option value="ALL">Tous les statuts</option>
              <option value="actif">Actif</option>
              <option value="suspendu">Suspendu</option>
              <option value="desactive">Désactivé</option>
            </select>
          </div>

          <div className="rounded-2xl bg-[#162133] border border-[#C9A96E]/20 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1E2E45]/80 text-[#A8B4C4] text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Utilisateur</th>
                  <th className="py-3 px-3">Email</th>
                  <th className="py-3 px-3">Rôle</th>
                  <th className="py-3 px-3">Agence</th>
                  <th className="py-3 px-3 text-center">Statut</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C9A96E]/10">
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-500 italic">Aucun utilisateur trouvé</td></tr>
                ) : filteredUsers.map((user) => {
                  const canSeePhone = ['SUPER_ADMIN_SAAS', 'SUPER_ADMIN', 'ADMIN'].includes(currentUser.role);
                  return (
                    <tr key={user.id} className="hover:bg-[#1E2E45]/40">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{user.prenom} {user.nom}</div>
                        {canSeePhone && user.telephone && <div className="text-[10px] text-slate-400">{user.telephone}</div>}
                      </td>
                      <td className="py-3 px-3 text-slate-300">{user.email}</td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          user.role === 'SUPER_ADMIN_SAAS'
                            ? 'bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D]'
                            : user.role === 'SUPER_ADMIN' ? 'bg-purple-500/20 text-purple-300'
                            : user.role === 'ADMIN' ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-slate-500/20 text-slate-300'
                        }`}>{user.role}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{user.agencies?.name || '—'}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          user.statut === 'actif' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>{user.statut}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button onClick={() => handleToggleUserStatus(user)} disabled={user.role === 'SUPER_ADMIN_SAAS'}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${
                            user.role === 'SUPER_ADMIN_SAAS' ? 'bg-slate-500/10 text-slate-500 cursor-not-allowed'
                            : user.statut === 'actif' ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                          {user.role === 'SUPER_ADMIN_SAAS' ? '🔒 Protégé' : user.statut === 'actif' ? 'Suspendre' : 'Activer'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/20 text-[#C9A96E] flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Créer une Nouvelle Agence</h2>
                  <p className="text-xs text-[#A8B4C4]">L'agence sera immédiatement active avec son admin</p>
                </div>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAgency} className="p-6 space-y-5 text-xs">
              <div>
                <div className="text-[11px] uppercase font-bold text-[#C9A96E] tracking-wider mb-3">📍 Informations de l'Agence</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Nom *</label>
                    <input type="text" value={formData.agencyName}
                      onChange={(e) => {
                        const name = e.target.value;
                        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                        setFormData({ ...formData, agencyName: name, agencySlug: slug });
                      }}
                      required placeholder="Ex: IMMO DAKAR"
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Slug (auto) *</label>
                    <input type="text" value={formData.agencySlug}
                      onChange={(e) => setFormData({ ...formData, agencySlug: e.target.value })}
                      required className="w-full p-2.5 rounded-xl bg-[#0A111D] border border-[#C9A96E]/10 text-slate-400 font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Email *</label>
                    <input type="email" value={formData.agencyEmail}
                      onChange={(e) => setFormData({ ...formData, agencyEmail: e.target.value })}
                      required placeholder="contact@agence.sn"
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Téléphone *</label>
                    <input type="text" value={formData.agencyPhone}
                      onChange={(e) => setFormData({ ...formData, agencyPhone: e.target.value })}
                      required placeholder="+221 33 000 00 00"
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Ville</label>
                    <input type="text" value={formData.agencyCity}
                      onChange={(e) => setFormData({ ...formData, agencyCity: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Adresse</label>
                    <input type="text" value={formData.agencyAddress}
                      onChange={(e) => setFormData({ ...formData, agencyAddress: e.target.value })}
                      placeholder="Ex: Rue 12 x Avenue"
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white" />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#C9A96E]/15">
                <div className="text-[11px] uppercase font-bold text-[#C9A96E] tracking-wider mb-3">🎨 Identité visuelle</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">URL du Logo</label>
                    <input type="url" value={formData.agencyLogoUrl}
                      onChange={(e) => setFormData({ ...formData, agencyLogoUrl: e.target.value })}
                      placeholder="https://exemple.com/logo.png"
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Couleur primaire</label>
                    <div className="flex gap-2">
                      <input type="color" value={formData.agencyPrimaryColor}
                        onChange={(e) => setFormData({ ...formData, agencyPrimaryColor: e.target.value })}
                        className="w-12 h-10 rounded-xl cursor-pointer" />
                      <input type="text" value={formData.agencyPrimaryColor}
                        onChange={(e) => setFormData({ ...formData, agencyPrimaryColor: e.target.value })}
                        className="flex-1 p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Site web</label>
                    <input type="url" value={formData.agencyWebsite}
                      onChange={(e) => setFormData({ ...formData, agencyWebsite: e.target.value })}
                      placeholder="https://monagence.sn"
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white" />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#C9A96E]/15">
                <div className="text-[11px] uppercase font-bold text-[#C9A96E] tracking-wider mb-3">⚖️ Informations légales & bancaires</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">NINEA</label>
                    <input type="text" value={formData.agencyNinea}
                      onChange={(e) => setFormData({ ...formData, agencyNinea: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">RC</label>
                    <input type="text" value={formData.agencyRc}
                      onChange={(e) => setFormData({ ...formData, agencyRc: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Banque</label>
                    <input type="text" value={formData.agencyBankName}
                      onChange={(e) => setFormData({ ...formData, agencyBankName: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">RIB / IBAN</label>
                    <input type="text" value={formData.agencyBankAccount}
                      onChange={(e) => setFormData({ ...formData, agencyBankAccount: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono" />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#C9A96E]/15">
                <div className="text-[11px] uppercase font-bold text-[#C9A96E] tracking-wider mb-3">👤 Compte Administrateur</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Prénom *</label>
                    <input type="text" value={formData.adminPrenom}
                      onChange={(e) => setFormData({ ...formData, adminPrenom: e.target.value })}
                      required className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Nom *</label>
                    <input type="text" value={formData.adminNom}
                      onChange={(e) => setFormData({ ...formData, adminNom: e.target.value })}
                      required className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Email de connexion *</label>
                    <input type="email" value={formData.adminEmail}
                      onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                      required className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Téléphone *</label>
                    <input type="text" value={formData.adminTelephone}
                      onChange={(e) => setFormData({ ...formData, adminTelephone: e.target.value })}
                      required className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-[#C9A96E] uppercase mb-1">Mot de passe temporaire * (min 6 caractères)</label>
                    <input type="text" value={formData.adminPassword}
                      onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                      required minLength={6} placeholder="Ex: Immo2026!"
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E] text-white font-mono font-bold" />
                    <p className="text-[10px] text-amber-300 mt-1">⚠️ Notez ce mot de passe et communiquez-le à l'admin de la nouvelle agence.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#C9A96E]/15">
                <button type="button" onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1E2E45] text-slate-300 cursor-pointer">Annuler</button>
                <button type="submit" disabled={isCreating}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50">
                  {isCreating ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Création...</>
                    : <><CheckCircle2 className="w-4 h-4" /> Créer l'Agence</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{
  label: string; value: number; suffix?: string;
  icon: React.ReactNode; color: string;
}> = ({ label, value, suffix = '', icon, color }) => (
  <div className="p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl">
    <div className="flex items-center justify-between mb-3">
      <span className="text-[10px] font-bold text-[#A8B4C4] uppercase tracking-wider">{label}</span>
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-lg`}>
        {icon}
      </div>
    </div>
    <div className="text-2xl font-black text-white font-mono">
      {formatNumber(value)}<span className="text-sm text-[#A8B4C4] font-normal">{suffix}</span>
    </div>
  </div>
);