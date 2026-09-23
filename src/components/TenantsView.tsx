import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  Building,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Send,
  Eye,
  FileText,
  Briefcase,
  UserCheck,
  CreditCard,
  ShieldCheck,
  Printer,
  Download,
  PhoneCall,
  MessageSquare,
  Smartphone,
  LogOut,
  X,
} from 'lucide-react';
import { Tenant, Property, ActiveTab, Inspection, UserAccount } from '../types';
import { formatCurrency, formatNumber, formatDate, exportToCSV } from '../lib/utils';
import { triggerPhoneCall, triggerSMS, triggerWhatsApp } from '../lib/comms/commsHelper';
import { MobileMoneyPaymentModal } from './MobileMoneyPaymentModal';

interface TenantsViewProps {
  tenants: Tenant[];
  properties: Property[];
  units?: any[];
  currentUser?: UserAccount;
  onOpenQuickReminder: (tenant: Tenant) => void;
  onOpenNewPayment: (tenant?: Tenant) => void;
  onAddTenant: (tenant: Tenant) => void;
  onOpenMobileMoney?: (tenant: Tenant) => void;
  onAddPayment?: (payment: any) => void;
  onInitiateExit?: (tenant: Tenant) => void;
}

export const TenantsView: React.FC<TenantsViewProps> = ({
  tenants,
  properties,
  units = [],
  currentUser,
  onOpenQuickReminder,
  onOpenNewPayment,
  onAddTenant,
  onOpenMobileMoney,
  onAddPayment,
  onInitiateExit,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTenantForDetails, setSelectedTenantForDetails] = useState<Tenant | null>(null);
  const [selectedTenantForPayment, setSelectedTenantForPayment] = useState<Tenant | null>(null);
  const [isAddTenantModalOpen, setIsAddTenantModalOpen] = useState<boolean>(false);
  const [tenantForExit, setTenantForExit] = useState<Tenant | null>(null);
  const [exitDate, setExitDate] = useState(new Date().toISOString().split('T')[0]);
  const [exitObservations, setExitObservations] = useState('');
  const [retenueCaution, setRetenueCaution] = useState(0);

  // Form State
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [cni, setCni] = useState('');
  const [telephone, setTelephone] = useState('+221 77 ');
  const [email, setEmail] = useState('');
  const [profession, setProfession] = useState('');
  const [employeur, setEmployeur] = useState('');
  const [revenuMensuel, setRevenuMensuel] = useState<number>(1000000);
  const [bienId, setBienId] = useState<string>('');
  const [loyerMensuel, setLoyerMensuel] = useState<number>(0);
  const [conjointNom, setConjointNom] = useState('');
  const [conjointTelephone, setConjointTelephone] = useState('');

  // ============================================================
  // 🔒 MATRICE DE PERMISSIONS
  // ============================================================
  const role = currentUser?.role || 'ADMIN';
  const isOwner = role === 'PROPRIETAIRE';
  const isTenant = role === 'LOCATAIRE';
  const canManageTenants = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'GESTIONNAIRE';
  const canEncaisser = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'GESTIONNAIRE' || role === 'CAISSIER';
  const canContactTenant = !isOwner && !isTenant;

  // ============================================================
  // 🔧 HELPERS : Statut réel du locataire
  // ============================================================
  const isTenantSorted = (t: Tenant): boolean => {
    return !!(t.dateSortie && t.dateSortie.trim());
  };

  const getRealStatus = (t: Tenant): { label: string; bg: string; text: string; border: string } => {
    if (isTenantSorted(t)) {
      return { label: 'SORTI', bg: 'bg-slate-500/20', text: 'text-slate-300', border: 'border-slate-500/30' };
    }
    if (t.statut === 'Impayé') {
      return { label: `IMPAYÉ${t.joursRetard > 0 ? ` (J+${t.joursRetard})` : ''}`, bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/30' };
    }
    if (t.statut === 'Retard') {
      return { label: `RETARD${t.joursRetard > 0 ? ` (J+${t.joursRetard})` : ''}`, bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30' };
    }
    return { label: 'À JOUR', bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30' };
  };

  const getSolvabilite = (t: Tenant): number => {
    return t.solvabiliteScore || t.scoreSolvabilite || 85;
  };

  // Filtres
  const activeTenants = tenants.filter((t) => !isTenantSorted(t));
  const sortedTenants = tenants.filter((t) => isTenantSorted(t));

  const filteredTenants = tenants.filter((t) => {
    if (statusFilter === 'actifs' && isTenantSorted(t)) return false;
    if (statusFilter === 'sortis' && !isTenantSorted(t)) return false;
    if (statusFilter === 'a_jour' && (isTenantSorted(t) || t.statut !== 'À jour')) return false;
    if (statusFilter === 'retard' && (isTenantSorted(t) || t.statut !== 'Retard')) return false;
    if (statusFilter === 'impaye' && (isTenantSorted(t) || t.statut !== 'Impayé')) return false;

    if (search) {
      const q = search.toLowerCase();
      return (
        t.nom.toLowerCase().includes(q) ||
        t.prenom.toLowerCase().includes(q) ||
        t.telephone.includes(q) ||
        t.bienNom.toLowerCase().includes(q) ||
        (t.cni || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ============================================================
  // BIENS VACANTS (properties + units)
  // ============================================================
  const vacantProperties = properties.filter((p) => p.statut === 'Vacant');
  const vacantUnits = (units as any[]).filter((u: any) => u.statut === 'Vacant');
  const allVacantOptions = [...vacantProperties, ...vacantUnits];

  // ============================================================
  // HANDLER : Créer un locataire
  // ============================================================
  const handleSubmitTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageTenants) {
      alert("Action non autorisée.");
      return;
    }

    if (!bienId) {
      alert("Veuillez sélectionner un bien à louer.");
      return;
    }

    // Chercher dans properties PUIS dans units
    const prop = properties.find((p) => p.id === bienId);
    const unit = !prop ? (units as any[]).find((u: any) => u.id === bienId) : null;

    if (!prop && !unit) {
      alert("Impossible : ce bien n'existe pas dans la base.");
      return;
    }

    const bienNomResolu = prop?.nom || unit?.nom || 'Bien non assigné';
    const bienProprioId = prop?.proprietaireId || unit?.proprietaireId || null;
    const statutActuel = prop?.statut || unit?.statut || 'Vacant';

    if (!bienProprioId) {
      alert("Impossible : ce bien n'a pas de propriétaire associé.");
      return;
    }

    // Vérifier qu'aucun locataire actif n'occupe ce bien
    const bienDejaOccupe = tenants.some(
      (t) =>
        t.bienId === bienId &&
        (!t.dateSortie || t.dateSortie.trim() === '')
    );

    if (bienDejaOccupe) {
      alert(
        "Ce bien est déjà occupé par un locataire actif.\n\n" +
        "Veuillez d'abord enregistrer sa sortie."
      );
      return;
    }

    if (statutActuel !== 'Vacant') {
      alert(
        `Ce bien est actuellement "${statutActuel}".\n\n` +
        `Impossible d'y ajouter un locataire. Libérez-le d'abord.`
      );
      return;
    }

    const newTenant: Tenant = {
      id: crypto.randomUUID(),
      nom: nom.toUpperCase(),
      prenom,
      cni,
      telephone,
      email: email || `${prenom.toLowerCase()}.${nom.toLowerCase()}@gmail.com`,
      profession,
      employeur,
      revenuMensuel: Number(revenuMensuel),
      bienId,
      bienNom: bienNomResolu,
      proprietaireId: bienProprioId,
      dateEntree: new Date().toISOString().split('T')[0],
      loyerMensuel: Number(loyerMensuel),
      statut: 'À jour',
      joursRetard: 0,
      arrieresCumules: 0,
      conjointNom,
      conjointTelephone,
      solvabiliteScore: 92,
    };

    onAddTenant(newTenant);

    // Reset
    setIsAddTenantModalOpen(false);
    setNom('');
    setPrenom('');
    setCni('');
    setTelephone('+221 77 ');
    setEmail('');
    setProfession('');
    setEmployeur('');
    setRevenuMensuel(1000000);
    setBienId('');
    setLoyerMensuel(0);
    setConjointNom('');
    setConjointTelephone('');
  };

  const handleConfirmExit = () => {
    if (!tenantForExit) return;
    if (!canManageTenants) {
      alert("Action non autorisée.");
      return;
    }

    if (onInitiateExit) {
      onInitiateExit(tenantForExit);
      setTenantForExit(null);
      return;
    }

    alert(`Sortie du locataire ${tenantForExit.prenom} ${tenantForExit.nom} au ${exitDate}.`);
    setTenantForExit(null);
  };

  const handleExportCSV = () => {
    const headers = ['Nom', 'Prénom', 'CNI', 'Téléphone', 'Email', 'Bien', 'Loyer Mensuel', 'Statut', 'Arriérés', 'Employeur'];
    const rows = filteredTenants.map((t) => [
      t.nom,
      t.prenom,
      t.cni,
      t.telephone,
      t.email,
      t.bienNom,
      t.loyerMensuel,
      t.statut,
      t.arrieresCumules,
      t.employeur,
    ]);
    exportToCSV('Repertoire_Locataires_FITAL_IMMO', rows, headers);
  };
  
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/15 text-[#C9A96E] flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Répertoire & Fiches Locataires</div>
            <div className="text-xs text-[#A8B4C4]">
              {activeTenants.length} actifs · {sortedTenants.length} sortis · {tenants.filter((t) => !isTenantSorted(t) && t.statut === 'À jour').length} à jour · {tenants.filter((t) => !isTenantSorted(t) && t.statut !== 'À jour').length} en retard
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] border border-[#C9A96E]/30 text-xs font-semibold text-[#E8D5B0] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
          {canManageTenants && (
            <button
              onClick={() => setIsAddTenantModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Locataire</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-[#1E2E45] p-1 rounded-xl border border-[#C9A96E]/15 text-xs flex-wrap">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              statusFilter === 'all' ? 'bg-[#C9A96E] text-[#0F1B2D] font-bold shadow-sm' : 'text-[#A8B4C4] hover:text-white'
            }`}
          >
            Tous ({tenants.length})
          </button>
          <button
            onClick={() => setStatusFilter('actifs')}
            className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              statusFilter === 'actifs' ? 'bg-emerald-500 text-white font-bold shadow-sm' : 'text-emerald-400 hover:text-white'
            }`}
          >
            Actifs ({activeTenants.length})
          </button>
          <button
            onClick={() => setStatusFilter('sortis')}
            className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              statusFilter === 'sortis' ? 'bg-slate-500 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sortis ({sortedTenants.length})
          </button>
          <button
            onClick={() => setStatusFilter('retard')}
            className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              statusFilter === 'retard' ? 'bg-amber-500 text-white font-bold shadow-sm' : 'text-amber-400 hover:text-white'
            }`}
          >
            En Retard ({tenants.filter((t) => !isTenantSorted(t) && t.statut === 'Retard').length})
          </button>
          <button
            onClick={() => setStatusFilter('impaye')}
            className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              statusFilter === 'impaye' ? 'bg-rose-500 text-white font-bold shadow-sm' : 'text-rose-400 hover:text-white'
            }`}
          >
            Impayés ({tenants.filter((t) => !isTenantSorted(t) && t.statut === 'Impayé').length})
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-[#6B7C94] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher nom, CNI, téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-xs text-white focus:outline-none focus:border-[#C9A96E]"
          />
        </div>
      </div>

      {/* Tenants Table */}
      <div className="rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#1E2E45]/80 text-[#A8B4C4] font-semibold uppercase tracking-wider text-[10px] border-b border-[#C9A96E]/20">
                <th className="py-3 px-4">Locataire</th>
                <th className="py-3 px-3">Bien Loué</th>
                <th className="py-3 px-3">Contact & CNI</th>
                <th className="py-3 px-3 text-right">Loyer Mensuel</th>
                <th className="py-3 px-3 text-center">Solvabilité</th>
                <th className="py-3 px-3 text-center">Statut</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9A96E]/10">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B7C94]">
                    <UserCheck className="w-8 h-8 mx-auto text-[#6B7C94]/50 mb-2" />
                    <p className="text-xs font-semibold text-white">Aucun locataire trouvé</p>
                    <p className="text-[11px] text-[#6B7C94] mt-1">Modifiez vos filtres ou créez un nouveau locataire.</p>
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => {
                  const sorted = isTenantSorted(t);
                  const realStatus = getRealStatus(t);
                  const solvabilite = getSolvabilite(t);

                  return (
                    <tr key={t.id} className={`hover:bg-[#1E2E45]/40 transition-colors ${sorted ? 'opacity-70' : ''}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${realStatus.bg} ${realStatus.text} ${realStatus.border} border`}
                          >
                            {(t.prenom || '?')[0]}
                            {(t.nom || '?')[0]}
                          </div>
                          <div>
                            <div className="font-bold text-white">
                              {t.prenom} {t.nom}
                            </div>
                            <div className="text-[10px] text-[#A8B4C4] truncate max-w-[140px]">
                              {t.profession} ({t.employeur})
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-white max-w-[180px] truncate">{t.bienNom}</div>
                        <div className="text-[10px] text-[#6B7C94]">
                          Entrée : {formatDate(t.dateEntree)}
                          {sorted && t.dateSortie && ` · Sortie : ${formatDate(t.dateSortie)}`}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-xs font-semibold">{t.telephone}</span>
                          {canContactTenant && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => triggerPhoneCall(t.telephone)}
                                className="p-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all cursor-pointer"
                                title="Appeler"
                              >
                                <PhoneCall className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => triggerWhatsApp(t.telephone, `Bonjour ${t.prenom} ${t.nom}, l'agence FITAL-IMMO vous contacte.`)}
                                className="p-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all cursor-pointer"
                                title="WhatsApp"
                              >
                                <Send className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => triggerSMS(t.telephone, `Bonjour ${t.prenom} ${t.nom}, message de FITAL-IMMO.`)}
                                className="p-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-all cursor-pointer"
                                title="SMS"
                              >
                                <MessageSquare className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] text-[#6B7C94]">CNI: {t.cni}</div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-white">
                        {formatNumber(t.loyerMensuel)}{' '}
                        <span className="text-[10px] text-[#C9A96E]">FCFA</span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`text-xs font-mono font-bold ${solvabilite >= 80 ? 'text-emerald-400' : solvabilite >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {solvabilite}%
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${realStatus.bg} ${realStatus.text} ${realStatus.border}`}>
                          {realStatus.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => setSelectedTenantForDetails(t)}
                            className="p-1.5 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#C9A96E] border border-[#C9A96E]/20 transition-all cursor-pointer"
                            title="Voir Fiche"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {!sorted && (
                            <>
                              {!isOwner && (
                                <button
                                  onClick={() => {
                                    if (onOpenMobileMoney) {
                                      onOpenMobileMoney(t);
                                    } else {
                                      setSelectedTenantForPayment(t);
                                    }
                                  }}
                                  className="px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <Smartphone className="w-3 h-3 text-blue-400" />
                                  <span>Wave / OM</span>
                                </button>
                              )}

                              {canContactTenant && (
                                <button
                                  onClick={() => triggerPhoneCall(t.telephone)}
                                  className="p-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 transition-all cursor-pointer"
                                  title="Appeler"
                                >
                                  <PhoneCall className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {canContactTenant && (
                                <button
                                  onClick={() => {
                                    const defaultMsg = `Bonjour ${t.prenom}, concernant votre location pour ${t.bienNom || 'le logement'} : `;
                                    triggerWhatsApp(t.telephone, defaultMsg);
                                  }}
                                  className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer"
                                  title="WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {canManageTenants && (
                                <button
                                  onClick={() => setTenantForExit(t)}
                                  className="px-2 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                                  title="Sortie"
                                >
                                  <LogOut className="w-3 h-3 text-rose-400" />
                                  <span>Sortie</span>
                                </button>
                              )}

                              {canEncaisser && t.statut !== 'À jour' && (
                                <button
                                  onClick={() => onOpenQuickReminder(t)}
                                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-semibold text-[11px] shadow-sm flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <Send className="w-3 h-3" /> Relance
                                </button>
                              )}

                              {canEncaisser && t.statut === 'À jour' && (
                                <button
                                  onClick={() => onOpenNewPayment(t)}
                                  className="px-2 py-1 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#C9A96E] text-[11px] font-medium transition-all cursor-pointer"
                                >
                                  Encaisser
                                </button>
                              )}
                            </>
                          )}

                          {sorted && (
                            <span className="text-[10px] text-slate-500 italic px-2">Locataire sorti — historique</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL : Confirmation de Sortie Locataire */}
      {canManageTenants && tenantForExit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#162133] border border-rose-500/40 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-rose-500/30 flex items-center justify-between bg-[#1E2E45]/80">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <LogOut className="w-5 h-5 text-rose-400" />
                <span>Confirmer la Sortie</span>
              </div>
              <button
                onClick={() => setTenantForExit(null)}
                className="text-[#A8B4C4] hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-[#0A111D] border border-rose-500/20">
                <div className="font-bold text-white text-sm">
                  {tenantForExit.prenom} {tenantForExit.nom}
                </div>
                <div className="text-[#A8B4C4] mt-0.5">Bien : {tenantForExit.bienNom}</div>
                <div className="text-[#A8B4C4]">Loyer : {formatNumber(tenantForExit.loyerMensuel)} FCFA</div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Date de sortie</label>
                <input
                  type="date"
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Retenue sur caution (FCFA)</label>
                <input
                  type="number"
                  value={retenueCaution}
                  onChange={(e) => setRetenueCaution(Number(e.target.value))}
                  min={0}
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Observations</label>
                <textarea
                  value={exitObservations}
                  onChange={(e) => setExitObservations(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  placeholder="Dégradations, état général..."
                />
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px]">
                ⚠️ Cette action va :
                <ul className="list-disc ml-4 mt-1 space-y-0.5">
                  <li>Créer un état des lieux de sortie</li>
                  <li>Marquer le bien comme "Vacant"</li>
                  <li>Archiver le locataire</li>
                </ul>
              </div>
            </div>

            <div className="p-4 border-t border-rose-500/20 flex items-center justify-end gap-2 bg-[#1E2E45]/40">
              <button
                onClick={() => setTenantForExit(null)}
                className="px-4 py-2 rounded-xl bg-[#0A111D] text-[#A8B4C4] hover:text-white text-xs font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmExit}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-bold text-xs shadow-lg hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Confirmer la Sortie</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Fiche de Renseignements */}
      {selectedTenantForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-4 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80 no-print">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <FileText className="w-5 h-5 text-[#C9A96E]" />
                <span>Fiche de Renseignements Locataire</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimer
                </button>
                <button
                  onClick={() => setSelectedTenantForDetails(null)}
                  className="p-1 rounded-lg text-[#A8B4C4] hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-8 bg-white text-neutral-900 rounded-b-3xl font-sans text-xs print-container">
              <div className="text-center border-b-2 border-neutral-900 pb-3 mb-4">
                <h2 className="text-xl font-black uppercase tracking-wider text-neutral-900">
                  FICHE DE RENSEIGNEMENTS DU LOCATAIRE
                </h2>
                <div className="text-[10px] text-neutral-600 font-semibold uppercase">
                  FITAL-IMMO · DOSSIER DE LOCATION
                </div>
              </div>

              <div className="space-y-4">
                <div className="border border-neutral-300 rounded-xl p-4 bg-neutral-50">
                  <div className="font-bold text-neutral-900 uppercase text-[11px] mb-2 border-b border-neutral-200 pb-1">
                    1. ÉTAT CIVIL & IDENTIFICATION
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-neutral-500">Nom & Prénom : </span>
                      <strong className="text-neutral-900">{selectedTenantForDetails.prenom} {selectedTenantForDetails.nom}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500">N° CNI : </span>
                      <strong className="font-mono text-neutral-900">{selectedTenantForDetails.cni}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500">Téléphone : </span>
                      <strong className="text-neutral-900">{selectedTenantForDetails.telephone}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500">Email : </span>
                      <strong className="text-neutral-900">{selectedTenantForDetails.email}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500">Profession : </span>
                      <strong className="text-neutral-900">{selectedTenantForDetails.profession}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500">Employeur : </span>
                      <strong className="text-neutral-900">{selectedTenantForDetails.employeur}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500">Salaire Mensuel : </span>
                      <strong className="font-mono text-neutral-900">{formatCurrency(selectedTenantForDetails.revenuMensuel)}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500">Solvabilité : </span>
                      <strong className="text-emerald-700 font-bold">{getSolvabilite(selectedTenantForDetails)}/100</strong>
                    </div>
                  </div>
                </div>

                <div className="border border-neutral-300 rounded-xl p-4 bg-neutral-50">
                  <div className="font-bold text-neutral-900 uppercase text-[11px] mb-2 border-b border-neutral-200 pb-1">
                    2. CONJOINT(E)
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-neutral-500">Nom : </span>
                      <strong className="text-neutral-900">{selectedTenantForDetails.conjointNom || 'Non renseigné'}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500">Téléphone : </span>
                      <strong className="text-neutral-900">{selectedTenantForDetails.conjointTelephone || 'Non renseigné'}</strong>
                    </div>
                  </div>
                </div>

                <div className="border border-neutral-300 rounded-xl p-4 bg-neutral-50">
                  <div className="font-bold text-neutral-900 uppercase text-[11px] mb-2 border-b border-neutral-200 pb-1">
                    3. LOGEMENT
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-neutral-500">Bien : </span>
                      <strong className="text-neutral-900">{selectedTenantForDetails.bienNom}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500">Loyer : </span>
                      <strong className="text-neutral-900 font-mono">{formatCurrency(selectedTenantForDetails.loyerMensuel)}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500">Date d'entrée : </span>
                      <strong className="text-neutral-900">{formatDate(selectedTenantForDetails.dateEntree)}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500">Statut : </span>
                      <strong className={selectedTenantForDetails.statut === 'À jour' ? 'text-emerald-700' : 'text-rose-700'}>
                        {selectedTenantForDetails.statut}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-6 mt-6 border-t border-neutral-300">
                <div>
                  <div className="font-bold text-neutral-700">Signature Locataire :</div>
                  <div className="h-14 border border-dashed border-neutral-400 rounded-lg mt-1 p-1">
                    <span className="text-[10px] text-neutral-400 italic">Lu et approuvé</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-neutral-700">Visa Gérance :</div>
                  <div className="h-14 border border-dashed border-neutral-400 rounded-lg mt-1 p-1 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-amber-800 uppercase">★ DOSSIER VALIDÉ ★</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ajouter un Nouveau Locataire */}
      {canManageTenants && isAddTenantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80 sticky top-0 z-10">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Users className="w-5 h-5 text-[#C9A96E]" />
                <span>Nouveau Locataire</span>
              </div>
              <button onClick={() => setIsAddTenantModalOpen(false)} className="text-[#A8B4C4] hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitTenant} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Prénom</label>
                  <input
                    type="text"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                    placeholder="Amadou"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Nom</label>
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                    placeholder="FALL"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">N° CNI</label>
                  <input
                    type="text"
                    value={cni}
                    onChange={(e) => setCni(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                    placeholder="1 755 1989 00412"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Profession</label>
                  <input
                    type="text"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                    placeholder="Ingénieur, Médecin..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Employeur</label>
                  <input
                    type="text"
                    value={employeur}
                    onChange={(e) => setEmployeur(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                    placeholder="Orange, Total..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Bien à Louer</label>
                  <select
                    value={bienId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setBienId(newId);
                      const selectedProp = properties.find((p) => p.id === newId);
                      if (selectedProp) {
                        setLoyerMensuel(selectedProp.loyerTotal || (selectedProp.loyerBase + (selectedProp.charges || 0)));
                        return;
                      }
                      const selectedUnit = (units as any[]).find((u: any) => u.id === newId);
                      if (selectedUnit) {
                        setLoyerMensuel((selectedUnit.loyerBase || 0) + (selectedUnit.charges || 0));
                      }
                    }}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  >
                    <option value="">— Choisir un bien —</option>
                    {allVacantOptions.length === 0 ? (
                      <option value="" disabled>Aucun bien vacant disponible</option>
                    ) : (
                      <>
                        {vacantProperties.length > 0 && (
                          <optgroup label="🏠 Biens simples">
                            {vacantProperties.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nom} ({formatNumber(p.loyerTotal || (p.loyerBase + (p.charges || 0)))} FCFA)
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {vacantUnits.length > 0 && (
                          <optgroup label="🏢 Espaces d'immeubles">
                            {vacantUnits.map((u: any) => (
                              <option key={u.id} value={u.id}>
                                {u.nom} ({formatNumber((u.loyerBase || 0) + (u.charges || 0))} FCFA)
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#C9A96E] uppercase mb-1">Loyer Mensuel (FCFA)</label>
                  <input
                    type="number"
                    value={loyerMensuel || ''}
                    onChange={(e) => setLoyerMensuel(Number(e.target.value))}
                    required
                    min={0}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E] text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#C9A96E]/15 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddTenantModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1E2E45] text-[#A8B4C4] cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold shadow-lg hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Enregistrer le Locataire</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Money Modal */}
      {selectedTenantForPayment && (
        <MobileMoneyPaymentModal
          isOpen={!!selectedTenantForPayment}
          onClose={() => setSelectedTenantForPayment(null)}
          amount={selectedTenantForPayment.arrieresCumules || selectedTenantForPayment.loyerMensuel}
          tenantName={`${selectedTenantForPayment.prenom} ${selectedTenantForPayment.nom}`}
          tenantPhone={selectedTenantForPayment.telephone}
          propertyNom={selectedTenantForPayment.bienNom}
          period="Loyer en cours"
          reference={`LOY-${selectedTenantForPayment.nom.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}`}
          onConfirmPayment={(amount, method, ref) => {
            alert(`Paiement de ${amount.toLocaleString('fr-FR')} FCFA validé pour ${selectedTenantForPayment.prenom} ${selectedTenantForPayment.nom} (Réf: ${ref}).`);
            setSelectedTenantForPayment(null);
          }}
        />
      )}
    </div>
  );
};