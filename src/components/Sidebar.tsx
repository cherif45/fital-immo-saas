import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCheck,
  CreditCard,
  BellRing,
  FileCheck2,
  ClipboardList,
  WalletCards,
  Wrench,
  FolderArchive,
  CalendarDays,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  History,
  TrendingUp,
  FileText,
  Settings,
  Receipt,
  Coins,
  Clock,
  Sliders,
  BarChart3,
  UserCog,
  Smartphone,
  Home,
  X
} from 'lucide-react';
import { ActiveTab, UserAccount, UserRole } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  unpaidCount: number;
  urgentMaintenanceCount: number;
  currentUser: UserAccount;
  onOpenProfile: () => void;
  pendingPaymentsCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  unpaidCount,
  urgentMaintenanceCount,
  currentUser,
  onOpenProfile,
  pendingPaymentsCount = 0,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const role = currentUser.role;

  // Build navigation items based on active role
  const getNavSections = () => {
    if (role === 'CAISSIER') {
      return [
        {
          label: 'ESPACE CAISSIER',
          items: [
            { id: 'dashboard' as ActiveTab, label: 'Tableau de bord Caisse', icon: LayoutDashboard },
            { id: 'caisse' as ActiveTab, label: 'Journal de Caisse & Clôture', icon: Coins },
            { 
              id: 'pending-payments' as ActiveTab, 
              label: 'Paiements en Attente', 
              icon: Clock,
              badge: pendingPaymentsCount > 0 ? `${pendingPaymentsCount} à valider` : undefined,
              badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            },
            { id: 'payments' as ActiveTab, label: 'Paiements & Quittances', icon: CreditCard },
          ],
        },
        {
          label: 'FINANCES & CONSULTATION',
          items: [
            { id: 'payment-reports' as ActiveTab, label: 'Rapports Moyens Paiement', icon: BarChart3 },
            { id: 'tenants' as ActiveTab, label: 'Annuaire Locataires', icon: Users },
            { id: 'finance' as ActiveTab, label: 'Reversements Bailleurs', icon: WalletCards },
            { id: 'documents' as ActiveTab, label: 'Bibliothèque Quittances', icon: FolderArchive },
          ],
        },
      ];
    }

    if (role === 'PROPRIETAIRE') {
      return [
        {
          label: 'ESPACE BAILLEUR',
          items: [
            { id: 'dashboard' as ActiveTab, label: 'Mon Tableau de Bord', icon: LayoutDashboard },
            { id: 'properties' as ActiveTab, label: 'Mes Biens Immobiliers', icon: Building2 },
            { id: 'tenants' as ActiveTab, label: 'Mes Locataires', icon: Users },
          ],
        },
        {
          label: 'COMPTABILITÉ & GÉRANCE',
          items: [
            { id: 'payments' as ActiveTab, label: 'Mes Loyers & Encaissements', icon: Receipt },
            { id: 'finance' as ActiveTab, label: 'Mes Reversements (Bons)', icon: WalletCards },
            { id: 'maintenance' as ActiveTab, label: 'Mes Travaux & Dépenses', icon: Wrench },
            { id: 'documents' as ActiveTab, label: 'Mes Documents & Mandat', icon: FolderArchive },
          ],
        },
      ];
    }

    if (role === 'LOCATAIRE') {
      return [
        {
          label: 'ESPACE LOCATAIRE',
          items: [
            { id: 'dashboard' as ActiveTab, label: 'Mon Espace Locataire', icon: Home },
            { id: 'properties' as ActiveTab, label: 'Mon Logement & Bail', icon: Building2 },
            { id: 'payments' as ActiveTab, label: 'Mes Quittances de Loyer', icon: Receipt },
            { id: 'maintenance' as ActiveTab, label: 'Signaler une Panne', icon: Wrench },
          ],
        },
      ];
    }

    if (role === 'AGENT') {
      return [
        {
          label: 'ESPACE TERRAIN',
          items: [
            { id: 'dashboard' as ActiveTab, label: 'Tableau de bord Terrain', icon: LayoutDashboard },
            { id: 'inspections' as ActiveTab, label: 'États des Lieux (PV)', icon: ClipboardList },
            { id: 'properties' as ActiveTab, label: 'Biens Vacants & Visites', icon: Building2 },
            { id: 'maintenance' as ActiveTab, label: 'Signalements Travaux', icon: Wrench },
            { id: 'recovery' as ActiveTab, label: 'Relances Amiables Terrain', icon: TrendingUp },
          ],
        },
      ];
    }

    if (role === 'GESTIONNAIRE') {
      return [
        {
          label: 'GESTION LOCATIVE',
          items: [
            { id: 'dashboard' as ActiveTab, label: 'Tableau de Bord Gérance', icon: LayoutDashboard },
            { id: 'owners' as ActiveTab, label: 'Propriétaires Mandants', icon: UserCheck },
            { id: 'properties' as ActiveTab, label: 'Biens & Immeubles', icon: Building2 },
            { id: 'tenants' as ActiveTab, label: 'Locataires & Baux', icon: Users },
            { id: 'contracts' as ActiveTab, label: 'Contrats de Bail', icon: FileCheck2 },
            { id: 'inspections' as ActiveTab, label: 'États des Lieux', icon: ClipboardList },
          ],
        },
        {
          label: 'RECOUVREMENT & TRAVAUX',
          items: [
            { 
              id: 'recovery' as ActiveTab, 
              label: 'Suivi Recouvrement', 
              icon: TrendingUp,
              badge: unpaidCount > 0 ? `${unpaidCount} impayés` : undefined,
              badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            },
            { id: 'reminders' as ActiveTab, label: 'Relances IA & WhatsApp', icon: BellRing, highlight: true },
            { id: 'maintenance' as ActiveTab, label: 'Travaux & Dépenses', icon: Wrench },
            { id: 'documents' as ActiveTab, label: 'Documents & Modèles', icon: FolderArchive },
          ],
        },
      ];
    }

    // Default: ADMIN / SUPER_ADMIN
    return [
      {
        label: 'SUPERVISION GLOBALE',
        items: [
          { id: 'dashboard' as ActiveTab, label: 'Tableau de bord Admin', icon: LayoutDashboard },
          { id: 'admin-control' as ActiveTab, label: 'Centre de Contrôle', icon: ShieldAlert, highlight: true },
          { id: 'admin-users' as ActiveTab, label: 'Multi-Comptes & Utilisateurs', icon: UserCog },
          { id: 'admin-journal' as ActiveTab, label: 'Journal d’Audit & Traçabilité', icon: History },
        ],
      },
      {
        label: 'GESTION IMMOBILIÈRE',
        items: [
          { id: 'owners' as ActiveTab, label: 'Propriétaires Mandants', icon: UserCheck },
          { id: 'properties' as ActiveTab, label: 'Biens & Immeubles', icon: Building2 },
          { id: 'tenants' as ActiveTab, label: 'Locataires & Fiches', icon: Users },
          { id: 'contracts' as ActiveTab, label: 'Contrats de Baux', icon: FileCheck2 },
          { id: 'inspections' as ActiveTab, label: 'États des Lieux', icon: ClipboardList },
        ],
      },
      {
        label: 'FINANCES, CAISSE & PAIEMENTS',
        items: [
          { id: 'payments' as ActiveTab, label: 'Paiements & Quittances', icon: CreditCard },
          { 
            id: 'pending-payments' as ActiveTab, 
            label: 'Paiements en Attente', 
            icon: Clock,
            badge: pendingPaymentsCount > 0 ? `${pendingPaymentsCount}` : undefined,
            badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          },
          { id: 'caisse' as ActiveTab, label: 'Journal de Caisse & Clôture', icon: Coins },
          { id: 'payment-methods' as ActiveTab, label: 'Moyens de Paiement Config', icon: Sliders },
          { id: 'payment-reports' as ActiveTab, label: 'Rapports Moyens Paiement', icon: BarChart3 },
          {
            id: 'recovery' as ActiveTab,
            label: 'Suivi Recouvrement',
            icon: TrendingUp,
            badge: unpaidCount > 0 ? `${unpaidCount} impayés` : undefined,
            badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
          },
          {
            id: 'reminders' as ActiveTab,
            label: 'Relances IA & WhatsApp',
            icon: BellRing,
            highlight: true,
          },
          { id: 'invoices' as ActiveTab, label: 'Factures & Adhésions', icon: Receipt },
          { id: 'finance' as ActiveTab, label: 'Comptabilité & Reversements', icon: WalletCards },
          {
            id: 'maintenance' as ActiveTab,
            label: 'Travaux & Dépenses',
            icon: Wrench,
            badge: urgentMaintenanceCount > 0 ? `${urgentMaintenanceCount} urgent` : undefined,
            badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
          },
        ],
      },
      {
        label: 'DOCUMENTS & SYSTÈME',
        items: [
          { id: 'reports' as ActiveTab, label: 'Rapports & Audit Financier', icon: FileText },
          { id: 'documents' as ActiveTab, label: 'Bibliothèque Documents', icon: FolderArchive },
          { id: 'settings' as ActiveTab, label: 'Paramètres Agence', icon: Settings },
        ],
      },
    ];
  };

  const navSections = getNavSections();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 animate-in fade-in"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`w-72 md:w-64 bg-[#162133] border-r border-[#C9A96E]/15 flex flex-col h-screen fixed top-0 left-0 z-50 select-none shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-[#C9A96E]/15 flex items-center justify-between bg-gradient-to-b from-[#1E2E45]/40 to-transparent">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[#C9A96E] via-[#D4B982] to-[#A07840] flex items-center justify-center text-[#0F1B2D] font-bold text-lg shadow-lg shadow-[#C9A96E]/20 flex-shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-[#0F1B2D]" />
            </div>
            <div className="min-w-0">
              <div className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-1">
                <span>FITAL</span>
                <span className="text-[#C9A96E] font-serif">-IMMO</span>
              </div>
              <div className="text-[10px] text-[#A8B4C4] uppercase tracking-wider font-medium truncate">
                {role === 'ADMIN' || role === 'SUPER_ADMIN' ? 'Supervision Globale' : `Espace ${role}`}
              </div>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onCloseMobile}
            className="md:hidden p-2 rounded-xl text-[#A8B4C4] hover:text-white hover:bg-[#1E2E45] border border-transparent hover:border-[#C9A96E]/30 transition-all cursor-pointer"
            aria-label="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navSections.map((section, idx) => (
            <div key={idx}>
              <div className="text-[10px] font-semibold text-[#6B7C94] uppercase tracking-wider px-3 mb-2">
                {section.label}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        onCloseMobile?.();
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all text-left group relative cursor-pointer min-h-[44px] ${
                        isActive
                          ? 'bg-gradient-to-r from-[#C9A96E]/20 to-[#C9A96E]/5 text-[#E8D5B0] border border-[#C9A96E]/30 shadow-md shadow-[#0F1B2D]/50 font-semibold'
                          : 'text-[#A8B4C4] hover:bg-[#1E2E45]/60 hover:text-white border border-transparent'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#C9A96E] rounded-r-full shadow-sm" />
                      )}
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                          isActive ? 'text-[#C9A96E]' : 'text-[#6B7C94] group-hover:text-[#A8B4C4]'
                        }`}
                      />
                      <span className="truncate flex-1">{item.label}</span>
                      {item.highlight && !item.badge && (
                        <Sparkles className="w-3.5 h-3.5 text-[#C9A96E] animate-pulse" />
                      )}
                      {item.badge && (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                            item.badgeColor || 'bg-[#2A3F5C] text-[#F0EDE8]'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User / Workspace Footer */}
        <div className="p-3 border-t border-[#C9A96E]/15 bg-[#162133]/90">
          <div
            onClick={() => {
              onOpenProfile();
              onCloseMobile?.();
            }}
            className="flex items-center gap-3 p-2.5 rounded-xl bg-[#1E2E45]/70 border border-[#C9A96E]/10 hover:border-[#C9A96E]/40 transition-all cursor-pointer group min-h-[44px]"
            title="Mon profil et sécurité"
          >
            <img
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={currentUser.nom}
              className="w-9 h-9 rounded-full object-cover border border-[#C9A96E]/30 shadow-md"
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-[#F0EDE8] truncate group-hover:text-[#C9A96E] transition-colors">
                {currentUser.prenom} {currentUser.nom}
              </div>
              <div className="text-[10px] text-[#C9A96E] truncate font-medium">
                {currentUser.role} • {currentUser.statut}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#6B7C94] group-hover:text-white transition-colors" />
          </div>
        </div>
      </aside>
    </>
  );
};
