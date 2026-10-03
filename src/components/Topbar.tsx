import React, { useState } from 'react';
import {
  Search,
  Bell,
  Download,
  Plus,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  Calendar,
  X,
  CreditCard,
  UserCheck,
  ShieldCheck,
  Coins,
  ChevronDown,
  Menu,
  Command,
  PhoneCall,
  Smartphone,
  Database,
} from 'lucide-react';
import { ActiveTab, UserAccount, NotificationItem } from '../types';
import { DatabaseStatusModal } from './DatabaseStatusModal';
import { ThemeToggle } from './ThemeToggle';
import { isSupabaseConfigured } from '../lib/supabase/client';

interface TopbarProps {
  activeTab: ActiveTab;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOpenNewPayment: () => void;
  onOpenNewProperty: () => void;
  onOpenNewTenant?: () => void;
  onOpenReminders: () => void;
  selectedPeriod: string;
  setSelectedPeriod: (p: string) => void;
  unpaidCount: number;
  currentUser: UserAccount;
  allUsers: UserAccount[];
  onSwitchUser: (u: UserAccount) => void;
  onOpenProfile: () => void;
  onSignOut?: () => void;
  notificationsList?: NotificationItem[];
  onToggleMobileMenu?: () => void;
  onOpenGlobalSearch?: () => void;
  onOpenQuickComms?: () => void;
  onOpenMobileMoney?: () => void;
}

// ============================================================
// 🔒 MATRICE DE VISIBILITÉ DES BOUTONS PAR RÔLE
// ============================================================
const CAN_USE_MOBILE_MONEY = ['ADMIN', 'SUPER_ADMIN', 'CAISSIER', 'GESTIONNAIRE', 'LOCATAIRE'];
const CAN_USE_QUICK_COMMS = ['ADMIN', 'SUPER_ADMIN', 'GESTIONNAIRE', 'CAISSIER'];
const CAN_USE_AI_REMINDERS = ['ADMIN', 'SUPER_ADMIN', 'GESTIONNAIRE'];

export const Topbar: React.FC<TopbarProps> = ({
  activeTab,
  searchQuery,
  setSearchQuery,
  onOpenNewPayment,
  onOpenNewProperty,
  onOpenNewTenant,
  onOpenReminders,
  selectedPeriod,
  setSelectedPeriod,
  unpaidCount,
  currentUser,
  allUsers,
  onSwitchUser,
  onOpenProfile,
  onSignOut,
  notificationsList = [],
  onToggleMobileMenu,
  onOpenGlobalSearch,
  onOpenQuickComms,
  onOpenMobileMoney,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showDbStatusModal, setShowDbStatusModal] = useState(false);

  const noop = () => {};

  // 👑 SUPER_ADMIN_SAAS n'a accès à AUCUN CTA métier
  const isSaasAdmin = currentUser.role === 'SUPER_ADMIN_SAAS';

  // ⬇️ Filtrer les boutons selon le rôle
  const showMobileMoneyBtn = !isSaasAdmin && onOpenMobileMoney && CAN_USE_MOBILE_MONEY.includes(currentUser.role);
  const showQuickCommsBtn = !isSaasAdmin && onOpenQuickComms && CAN_USE_QUICK_COMMS.includes(currentUser.role);
  const showAiRemindersBtn = !isSaasAdmin && CAN_USE_AI_REMINDERS.includes(currentUser.role);

  const tabTitles: Record<string, { title: string; subtitle: string; ctaText?: string; ctaAction?: () => void; hideCta?: boolean }> = {
    'saas-admin': {
      title: 'Super-Admin SaaS',
      subtitle: 'Pilotage global de la plateforme · Toutes les agences',
      hideCta: true,
    },
    dashboard: {
      title: currentUser.role === 'SUPER_ADMIN_SAAS' ? 'Pilotage SaaS Global'
           : currentUser.role === 'PROPRIETAIRE' ? 'Espace Propriétaire Bailleur'
           : currentUser.role === 'LOCATAIRE' ? 'Espace Locataire Dédié'
           : currentUser.role === 'CAISSIER' ? 'Tableau de bord Caisse & Trésorerie'
           : currentUser.role === 'AGENT' ? 'Espace Opérations Terrain'
           : 'Tableau de bord de Gestion',
      subtitle: currentUser.role === 'SUPER_ADMIN_SAAS' 
        ? "Vue d'ensemble de la plateforme SaaS · Toutes les agences"
        : `Vue d'ensemble financière & indicateurs clés — ${selectedPeriod}`,
      ctaText: currentUser.role === 'SUPER_ADMIN_SAAS' ? undefined
             : currentUser.role === 'LOCATAIRE' ? 'Payer mon loyer'
             : currentUser.role === 'PROPRIETAIRE' ? undefined
             : 'Encaisser un loyer',
      ctaAction: (currentUser.role === 'PROPRIETAIRE' || currentUser.role === 'SUPER_ADMIN_SAAS') ? undefined : onOpenNewPayment,
      hideCta: currentUser.role === 'PROPRIETAIRE' || currentUser.role === 'SUPER_ADMIN_SAAS',
    },
    'admin-control': {
      title: 'Centre de Contrôle & Supervision Système',
      subtitle: 'Contrôle global, base de données Supabase, sécurité et intégrité',
      hideCta: true,
    },
    'admin-journal': {
      title: 'Journal d\'Activité & Audit Immuable',
      subtitle: 'Historique exhaustif de toutes les transactions, clôtures et modifications',
      hideCta: true,
    },
    'admin-users': {
      title: 'Gestion Multi-Comptes & Permissions',
      subtitle: 'Contrôle d\'accès par rôle (RBAC), sécurité Supabase Auth et rattachements',
      hideCta: true,
    },
    caisse: {
      title: 'Journal de Caisse & Clôture Journalière',
      subtitle: 'Comptage physique des espèces, contrôle des écarts et arrêtés contradictoires',
      ctaText: 'Mouvement Caisse',
      ctaAction: onOpenNewPayment,
    },
    'pending-payments': {
      title: 'Paiements en Attente de Validation',
      subtitle: 'Vérification et validation comptable des transferts Wave, OM et virements',
      ctaText: 'Vérifier Règlements',
      ctaAction: onOpenNewPayment,
    },
    'payment-methods': {
      title: 'Configuration des Moyens de Paiement',
      subtitle: 'Gestion des canaux de collecte (Wave, OM, Free, Banques) et taux de frais',
      hideCta: true,
    },
    'payment-reports': {
      title: 'Rapports par Moyen de Paiement',
      subtitle: 'Analyse comparative des volumes collectés, ventilations et exports CSV',
      ctaText: 'Exporter Relevé',
      ctaAction: onOpenNewPayment,
    },
    recovery: {
      title: 'Suivi du Recouvrement & Impayés',
      subtitle: `État exhaustif des loyers dus, recouvrés et arriérés par propriétaire — ${selectedPeriod}`,
      ctaText: 'Lancer Relances IA',
      ctaAction: onOpenReminders,
    },
    reminders: {
      title: 'Automatisation des Relances Locataires',
      subtitle: 'Génération intelligente par IA & diffusion instantanée WhatsApp / SMS / Email',
      ctaText: 'Encaisser un loyer',
      ctaAction: onOpenNewPayment,
    },
    payments: {
      title: 'Règlements & Quittances',
      subtitle: 'Registre des paiements, éditions des reçus officiels avec montants en lettres',
      ctaText: 'Enregistrer Paiement',
      ctaAction: onOpenNewPayment,
    },
    properties: {
      title: currentUser.role === 'PROPRIETAIRE' ? 'Mes Biens Immobiliers' : 'Parc Immobilier & Biens',
      subtitle: 'Gestion des appartements, villas, bureaux, magasins et taux de gérance',
      ctaText: currentUser.role === 'LOCATAIRE' || currentUser.role === 'AGENT' || currentUser.role === 'CAISSIER' ? undefined : 'Nouveau Bien',
      ctaAction: currentUser.role === 'LOCATAIRE' || currentUser.role === 'AGENT' || currentUser.role === 'CAISSIER' ? undefined : onOpenNewProperty,
      hideCta: currentUser.role === 'LOCATAIRE' || currentUser.role === 'AGENT' || currentUser.role === 'CAISSIER',
    },
    tenants: {
      title: currentUser.role === 'PROPRIETAIRE' ? 'Mes Locataires' : 'Répertoire des Locataires',
      subtitle: 'Fiches personnelles, solvabilité, coordonnées et historiques',
      hideCta: true,
    },
    owners: {
      title: 'Propriétaires & Mandats',
      subtitle: 'Gérance globale, mandats, comptes bancaires et reversements',
      hideCta: true,
    },
    contracts: {
      title: 'Contrats de Bail & Taxes',
      subtitle: 'Calculs des taxes (TOM, TVA, TLV), charges et cautions d\'adhésion',
      hideCta: true,
    },
    inspections: {
      title: 'États des Lieux d\'Entrée & Sortie',
      subtitle: 'Inventaires détaillés, chiffrage des dégradations et déductions sur caution',
      hideCta: true,
    },
    maintenance: {
      title: 'Maintenance & Travaux',
      subtitle: 'Suivi des interventions techniques, coûts et facturation propriétaire',
      hideCta: true,
    },
    finance: {
      title: currentUser.role === 'PROPRIETAIRE' ? 'Mes Reversements & Décomptes' : 'Comptabilité, Décaissements & Caisse',
      subtitle: 'Revenus agence, commissions, reversements propriétaires et solde de caisse',
      hideCta: true,
    },
    documents: {
      title: 'Documents & Modèles Officiels',
      subtitle: 'Génération instantanée de quittances, bulletins de versement et contrats',
      hideCta: true,
    },
    invoices: {
      title: 'Facturation & Frais de Gestion',
      subtitle: 'Édition des factures d\'adhésion, travaux et frais de dossier',
      ctaText: 'Nouvelle Facture',
      ctaAction: onOpenNewPayment,
    },
    reports: {
      title: 'Rapports & Audit Financier',
      subtitle: 'Balances des impayés, états de vacance et décomptes de gérance',
      hideCta: true,
    },
    settings: {
      title: 'Paramètres & Configuration de l\'Agence',
      subtitle: 'Paramétrage des coordonnées, devises FCFA, taux de gérance et préfixes',
      hideCta: true,
    },
  };

  const currentTab = tabTitles[activeTab] || tabTitles.dashboard;
  const showPrimaryCta = !isSaasAdmin && !currentTab.hideCta && currentTab.ctaText && currentTab.ctaAction;

  return (
    <header className="sticky top-0 z-30 bg-[#0F1B2D]/95 backdrop-blur-xl border-b border-[#C9A96E]/15 px-4 sm:px-6 md:px-8 py-3 sm:py-4 transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        {/* Top line on mobile: Menu button + Title + Mobile quick icons */}
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-2.5 rounded-xl bg-[#162133] border border-[#C9A96E]/20 text-[#A8B4C4] hover:text-white hover:border-[#C9A96E]/50 transition-all flex items-center justify-center flex-shrink-0 min-h-[44px] min-w-[44px] cursor-pointer"
              aria-label="Ouvrir le menu de navigation"
            >
              <Menu className="w-5 h-5 text-[#C9A96E]" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg md:text-xl font-bold text-white tracking-tight font-display truncate">
                  {currentTab.title}
                </h1>
                {unpaidCount > 0 && activeTab === 'recovery' && (
                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold flex items-center gap-1 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    {unpaidCount} retards
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-[#A8B4C4] truncate mt-0.5 hidden sm:block">
                {currentTab.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:hidden">
            {onOpenGlobalSearch && (
              <button
                onClick={onOpenGlobalSearch}
                className="p-2.5 rounded-xl bg-[#162133] border border-[#C9A96E]/20 text-[#A8B4C4] hover:text-[#C9A96E] hover:border-[#C9A96E]/50 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Recherche globale (Ctrl+K)"
              >
                <Search className="w-4 h-4 text-[#C9A96E]" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-between md:justify-end">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 text-[#6B7C94] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Recherche rapide..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-44 md:w-48 lg:w-56 pl-9 sm:pl-10 pr-8 py-2 rounded-xl bg-[#162133] border border-[#C9A96E]/20 text-xs text-white placeholder:text-[#6B7C94] focus:outline-none focus:border-[#C9A96E] focus:ring-1 focus:ring-[#C9A96E] transition-all min-h-[40px]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7C94] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {onOpenGlobalSearch && (
            <button
              onClick={onOpenGlobalSearch}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#162133] border border-[#C9A96E]/20 text-[11px] text-[#A8B4C4] hover:text-white hover:border-[#C9A96E]/40 transition-all cursor-pointer min-h-[40px]"
              title="Ouvrir la recherche globale"
            >
              <Command className="w-3.5 h-3.5 text-[#C9A96E]" />
              <span className="font-mono text-[10px] text-[#C9A96E]">Ctrl+K</span>
            </button>
          )}

          <button
            onClick={() => setShowDbStatusModal(true)}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer min-h-[40px] ${
              isSupabaseConfigured
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
            }`}
            title="Vérifier le statut du service"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline font-mono text-[10px]">
              {isSupabaseConfigured ? 'En ligne' : 'Opérationnel'}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#162133] border border-[#C9A96E]/30 text-xs font-semibold text-white hover:border-[#C9A96E] transition-all cursor-pointer min-h-[40px]"
            >
              <img
                src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={currentUser.nom}
                className="w-6 h-6 rounded-full object-cover border border-[#C9A96E]/40"
              />
              <span className="hidden sm:inline font-medium text-slate-200">{currentUser.prenom}</span>
              <span className="px-1.5 py-0.5 rounded bg-[#C9A96E]/20 text-[#E8D5B0] text-[10px] font-bold">
                {currentUser.role}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-72 max-w-xs bg-[#162133] border border-[#C9A96E]/30 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                  <img
                    src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt={currentUser.nom}
                    className="w-10 h-10 rounded-xl object-cover border border-[#C9A96E]/40 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white text-sm truncate">
                      {currentUser.prenom} {currentUser.nom}
                    </div>
                    <div className="text-[11px] text-slate-300 truncate font-mono">
                      {currentUser.email}
                    </div>
                    <div className="text-[10px] text-[#C9A96E] font-semibold mt-0.5 truncate">
                      {currentUser.role} • {currentUser.organisation || 'FITAL-IMMO'}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onOpenProfile();
                    }}
                    className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 text-white hover:text-[#C9A96E] rounded-xl text-xs font-semibold text-left transition-all cursor-pointer min-h-[36px] flex items-center justify-between"
                  >
                    <span>Mon Profil & Paramètres</span>
                    <span className="text-[10px] text-[#C9A96E]">→</span>
                  </button>
                  {onSignOut && (
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onSignOut();
                      }}
                      className="w-full py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer min-h-[36px] flex items-center justify-between"
                    >
                      <span>Se Déconnecter</span>
                      <span className="text-rose-400 text-[10px]">Quitter</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {showQuickCommsBtn && (
            <button
              onClick={onOpenQuickComms}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer min-h-[40px]"
              title="Centre d'appels et messages (Appel, WhatsApp, SMS)"
            >
              <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
              <span>Appels & SMS</span>
            </button>
          )}

          {showAiRemindersBtn && (
            <button
              onClick={onOpenReminders}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E]/20 via-[#E8A84A]/20 to-[#C9A96E]/10 border border-[#C9A96E]/40 text-[#E8D5B0] hover:border-[#C9A96E] text-xs font-semibold shadow-sm hover:shadow-[#C9A96E]/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer min-h-[40px]"
              title="Ouvrir le module d'automatisation des relances par IA"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C9A96E] animate-pulse" />
              <span>Relances IA</span>
            </button>
          )}

          <div className="relative">
                        <ThemeToggle />

            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative w-9 sm:w-10 h-9 sm:h-10 rounded-xl bg-[#162133] border border-[#C9A96E]/20 flex items-center justify-center text-[#A8B4C4] hover:text-white hover:border-[#C9A96E]/50 transition-all cursor-pointer min-h-[40px] min-w-[40px]"
              title="Notifications & alertes"
            >
              <Bell className="w-4 h-4" />
              {unpaidCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#162133]" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 md:w-96 max-w-sm bg-[#162133] border border-[#C9A96E]/30 rounded-2xl shadow-2xl p-3 sm:p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-[#C9A96E]/15">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 text-[#C9A96E]" />
                    Alertes Immobilières
                  </div>
                  <span className="text-[10px] bg-[#C9A96E]/20 text-[#E8D5B0] px-2 py-0.5 rounded-full font-semibold border border-[#C9A96E]/30">
                    {notificationsList.length} actives
                  </span>
                </div>
                <div className="divide-y divide-[#C9A96E]/10 max-h-72 overflow-y-auto my-2">
                  {notificationsList.length === 0 ? (
                    <div className="py-6 text-center text-[#6B7C94]">
                      <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400/50 mb-2" />
                      <p className="text-xs font-semibold text-white">Aucune alerte active</p>
                      <p className="text-[11px] text-[#6B7C94] mt-0.5">Votre portefeuille est parfaitement à jour.</p>
                    </div>
                  ) : (
                    notificationsList.map((n) => (
                      <div
                        key={n.id}
                        className="py-2.5 flex items-start gap-3 hover:bg-[#1E2E45]/40 px-2 rounded-lg transition-colors cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-white truncate">{n.titre}</div>
                          <div className="text-[11px] text-[#A8B4C4] leading-relaxed line-clamp-2">
                            {n.message}
                          </div>
                          <div className="text-[10px] text-[#6B7C94] mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {n.date}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {showPrimaryCta && (
            <button
              onClick={currentTab.ctaAction || noop}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-lg shadow-[#C9A96E]/20 hover:shadow-[#C9A96E]/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer min-h-[40px]"
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              <span className="truncate max-w-[120px] sm:max-w-none">{currentTab.ctaText}</span>
            </button>
          )}
        </div>
      </div>

      <DatabaseStatusModal
        isOpen={showDbStatusModal}
        onClose={() => setShowDbStatusModal(false)}
      />
    </header>
  );
};