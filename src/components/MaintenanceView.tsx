import React, { useState } from 'react';
import {
  Wrench,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building,
  User,
  DollarSign,
  Printer,
  FileText,
  Filter,
  ArrowRight,
  ShieldCheck,
  Phone,
  Calendar,
  Check,
  CreditCard,
  Wallet,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import {
  MaintenanceTicket,
  Property,
  Tenant,
  Owner,
  CashMovement,
  MaintenanceStatus,
  MaintenanceImputation,
  MaintenancePaymentStatus,
  PaymentMethod,
} from '../types';
import { formatCurrency, formatNumber, formatDate } from '../lib/utils';
import { MaintenanceWorkOrderModal } from './MaintenanceWorkOrderModal';

interface MaintenanceViewProps {
  tickets: MaintenanceTicket[];
  properties: Property[];
  tenants: Tenant[];
  owners?: Owner[];
  onAddTicket: (ticket: MaintenanceTicket) => void;
  onUpdateTicket?: (ticket: MaintenanceTicket) => void;
  onAddCashMovement?: (movement: CashMovement) => void;
  onTriggerAuditLog?: (action: string, entite: string, details: string, entiteId?: string) => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  tickets,
  properties,
  tenants,
  owners = [],
  onAddTicket,
  onUpdateTicket,
  onAddCashMovement,
  onTriggerAuditLog,
}) => {
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [filterImputation, setFilterImputation] = useState<string>('all');

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedTicketForPrint, setSelectedTicketForPrint] = useState<MaintenanceTicket | null>(null);
  const [ticketToResolve, setTicketToResolve] = useState<MaintenanceTicket | null>(null);

  // New ticket form state
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [priorite, setPriorite] = useState<'Faible' | 'Moyenne' | 'Haute' | 'Urgente'>('Moyenne');
  const [bienId, setBienId] = useState(properties[0]?.id || '');
  const [coutEstime, setCoutEstime] = useState<number>(45000);
  const [artisanNom, setArtisanNom] = useState('');
  const [imputableA, setImputableA] = useState<MaintenanceImputation>('Propriétaire');
  const [dateIntervention, setDateIntervention] = useState('');

  // Settlement modal state
  const [coutReel, setCoutReel] = useState<number>(0);
  const [modeReglement, setModeReglement] = useState<PaymentMethod>('Espèces');
  const [factureArtisanRef, setFactureArtisanRef] = useState('');
  const [imputationReglement, setImputationReglement] = useState<MaintenanceImputation>('Propriétaire');
  const [enregistrerSortieCaisse, setEnregistrerSortieCaisse] = useState(true);
  const [observationsReglement, setObservationsReglement] = useState('');
  const [dateReglement, setDateReglement] = useState(new Date().toISOString().split('T')[0]);

  // Open resolution modal
  const handleOpenResolveModal = (ticket: MaintenanceTicket) => {
    setTicketToResolve(ticket);
    setCoutReel(ticket.coutReel || ticket.coutEstime || 0);
    setFactureArtisanRef(ticket.factureArtisanRef || `FACT-ART-${Date.now().toString().slice(-4)}`);
    setImputationReglement((ticket.imputableA as MaintenanceImputation) || 'Propriétaire');
    setModeReglement((ticket.modeReglement as PaymentMethod) || 'Espèces');
    setDateReglement(ticket.dateReglement || new Date().toISOString().split('T')[0]);
    setObservationsReglement(ticket.observationsReglement || 'Travaux vérifiés et réceptionnés par l’agence. Règlement effectué.');
    setEnregistrerSortieCaisse(true);
  };

  // Submit resolution and settlement
  const handleConfirmResolution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketToResolve) return;

    const todayStr = dateReglement || new Date().toISOString().split('T')[0];

    const updatedTicket: MaintenanceTicket = {
      ...ticketToResolve,
      statut: 'Traité et Réglé',
      statutReglement: 'Réglé',
      coutReel: Number(coutReel),
      imputableA: imputationReglement,
      modeReglement: modeReglement,
      dateReglement: todayStr,
      dateResolution: todayStr,
      factureArtisanRef: factureArtisanRef || undefined,
      regleParCaisse: enregistrerSortieCaisse && modeReglement === 'Espèces',
      observationsReglement: observationsReglement || 'Travaux traités et réglés avec succès.',
    };

    // 1. Create cash movement if requested (Espèces)
    if (enregistrerSortieCaisse && modeReglement === 'Espèces' && onAddCashMovement && Number(coutReel) > 0) {
      const cashMvt: CashMovement = {
        id: crypto.randomUUID(),
        reference: `DEC-TRV-${Date.now().toString().slice(-5)}`,
        ref: `DEC-TRV-${Date.now().toString().slice(-5)}`,
        type: 'DECAISSEMENT',
        montant: Number(coutReel),
        libelle: `Règlement travaux : ${ticketToResolve.titre} (Artisan: ${ticketToResolve.artisanNom || ticketToResolve.prestataire || 'Artisan'}, Bien: ${ticketToResolve.bienNom})`,
        motif: `Règlement travaux : ${ticketToResolve.titre}`,
        moyenPaiementCode: 'ESPECES',
        beneficiaire: ticketToResolve.artisanNom || ticketToResolve.prestataire || 'Artisan Référencé',
        dateOperation: todayStr,
        dateHeure: new Date().toISOString().replace('T', ' ').substring(0, 16),
        statut: 'Validé',
        justificatifRef: factureArtisanRef || ticketToResolve.ref,
      };
      onAddCashMovement(cashMvt);
      updatedTicket.caisseMouvementId = cashMvt.id;
    }

    // 2. Update ticket state & persist
    if (onUpdateTicket) {
      onUpdateTicket(updatedTicket);
    }

    // 3. Audit log
    if (onTriggerAuditLog) {
      onTriggerAuditLog(
        'TRAVAUX_TRAITE_REGLE',
        'MAINTENANCE',
        `Travaux #${updatedTicket.ref || updatedTicket.id.slice(0, 6)} "${updatedTicket.titre}" confirmés traités et réglés (${formatCurrency(Number(coutReel))}, Imputé à: ${imputationReglement})`,
        updatedTicket.id
      );
    }

    setTicketToResolve(null);
  };

  // Quick status change helper
  const handleQuickStatusChange = (ticket: MaintenanceTicket, newStatut: MaintenanceStatus) => {
    if (!onUpdateTicket) return;
    const updated: MaintenanceTicket = {
      ...ticket,
      statut: newStatut,
    };
    if (newStatut === 'Terminé') {
      updated.dateResolution = new Date().toISOString().split('T')[0];
    }
    onUpdateTicket(updated);
  };

  // Submit new ticket
  const handleSubmitNewTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedProp = properties.find((prop) => prop.id === bienId);
    const selectedTenant = tenants.find((t) => t.bienId === bienId);
    const selectedOwner = owners.find((o) => o.id === selectedProp?.proprietaireId);

    const newTicket: MaintenanceTicket = {
      id: crypto.randomUUID(),
      ref: `TRV-${Date.now().toString().slice(-6)}`,
      bienId,
      bienNom: selectedProp?.nom || 'Bien assigné',
      proprietaireId: selectedProp?.proprietaireId,
      proprietaireNom: selectedOwner ? `${selectedOwner.prenom} ${selectedOwner.nom}` : undefined,
      locataireId: selectedTenant?.id,
      locataireNom: selectedTenant ? `${selectedTenant.prenom} ${selectedTenant.nom}` : (selectedProp?.locataireActuelNom || 'Locataire en place'),
      titre,
      description,
      priorite,
      statut: 'Signalé',
      statutReglement: 'Non réglé',
      dateSignalement: new Date().toISOString().split('T')[0],
      dateIntervention: dateIntervention || undefined,
      coutEstime: Number(coutEstime),
      imputableA: imputableA,
      artisanNom: artisanNom || 'Artisan Référencé FITAL',
      prestataire: artisanNom || 'Artisan Référencé FITAL',
    };

    onAddTicket(newTicket);
    if (onTriggerAuditLog) {
      onTriggerAuditLog(
        'TRAVAUX_SIGNALE',
        'MAINTENANCE',
        `Signalement travaux #${newTicket.ref} pour le bien "${newTicket.bienNom}" (Coût estimé: ${formatCurrency(newTicket.coutEstime)})`,
        newTicket.id
      );
    }

    // Reset form
    setTitre('');
    setDescription('');
    setCoutEstime(45000);
    setArtisanNom('');
    setDateIntervention('');
    setIsNewModalOpen(false);
  };

  // Filters logic
  const filtered = tickets.filter((t) => {
    // Search query
    if (search) {
      const q = search.toLowerCase();
      const matchSearch =
        t.titre.toLowerCase().includes(q) ||
        t.bienNom.toLowerCase().includes(q) ||
        t.locataireNom.toLowerCase().includes(q) ||
        (t.artisanNom && t.artisanNom.toLowerCase().includes(q)) ||
        (t.prestataire && t.prestataire.toLowerCase().includes(q)) ||
        (t.ref && t.ref.toLowerCase().includes(q));
      if (!matchSearch) return false;
    }

    // Status filter
    if (filterStatut === 'pending') {
      if (t.statut !== 'Signalé' && t.statut !== 'En attente') return false;
    } else if (filterStatut === 'in_progress') {
      if (t.statut !== 'En cours' && t.statut !== 'Planifié') return false;
    } else if (filterStatut === 'completed_paid') {
      if (t.statut !== 'Traité et Réglé' && t.statut !== 'Terminé') return false;
    } else if (filterStatut !== 'all') {
      if (t.statut !== filterStatut) return false;
    }

    // Imputation filter
    if (filterImputation !== 'all') {
      if (t.imputableA !== filterImputation) return false;
    }

    return true;
  });

  // KPI Calculations
  const totalTickets = tickets.length;
  const enCoursCount = tickets.filter((t) => t.statut === 'En cours' || t.statut === 'Planifié' || t.statut === 'Signalé' || t.statut === 'En attente').length;
  const traitesReglesCount = tickets.filter((t) => t.statut === 'Traité et Réglé' || t.statut === 'Terminé' || t.statutReglement === 'Réglé').length;
  const totalFraisRegles = tickets
    .filter((t) => t.statut === 'Traité et Réglé' || t.statut === 'Terminé' || t.statutReglement === 'Réglé')
    .reduce((sum, t) => sum + (t.coutReel || t.coutEstime || 0), 0);
  const fraisImputesProprietaires = tickets
    .filter((t) => (t.statut === 'Traité et Réglé' || t.statut === 'Terminé' || t.statutReglement === 'Réglé') && t.imputableA === 'Propriétaire')
    .reduce((sum, t) => sum + (t.coutReel || t.coutEstime || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner with Summary & Actions */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#C9A96E]/15 text-[#C9A96E] flex items-center justify-center border border-[#C9A96E]/30 shadow-inner">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                Gestion des Travaux & Règlement des Frais
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                Contrôle Agence FITAL
              </span>
            </div>
            <p className="text-xs text-[#A8B4C4] mt-0.5">
              Pilotage des réparations, artisans, validation des factures et imputation sur les reversements propriétaires.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-lg hover:brightness-110 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Ticket Travaux</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-3.5 rounded-xl bg-[#162133] border border-[#C9A96E]/15">
          <div className="text-[10px] text-[#A8B4C4] uppercase font-semibold">Total Travaux</div>
          <div className="text-xl font-bold text-white mt-1 font-mono">{totalTickets}</div>
          <div className="text-[10px] text-[#6B7C94] mt-0.5">Toutes interventions</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#162133] border border-amber-500/20">
          <div className="text-[10px] text-amber-300 uppercase font-semibold">Travaux en cours</div>
          <div className="text-xl font-bold text-amber-400 mt-1 font-mono">{enCoursCount}</div>
          <div className="text-[10px] text-amber-300/70 mt-0.5">À finaliser ou en chantier</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#162133] border border-emerald-500/20">
          <div className="text-[10px] text-emerald-300 uppercase font-semibold">Traités & Réglés</div>
          <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">{traitesReglesCount}</div>
          <div className="text-[10px] text-emerald-300/70 mt-0.5">Clôturés & payés</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#162133] border border-[#C9A96E]/25">
          <div className="text-[10px] text-[#C9A96E] uppercase font-semibold">Total Frais Réglés</div>
          <div className="text-lg font-bold text-[#E8D5B0] mt-1 font-mono truncate">
            {formatNumber(totalFraisRegles)} <span className="text-xs text-[#C9A96E]">FCFA</span>
          </div>
          <div className="text-[10px] text-[#A8B4C4] mt-0.5">Dépenses réelles artisans</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#162133] border border-sky-500/20 col-span-2 lg:col-span-1">
          <div className="text-[10px] text-sky-300 uppercase font-semibold">Déductions Propriétaires</div>
          <div className="text-lg font-bold text-sky-300 mt-1 font-mono truncate">
            {formatNumber(fraisImputesProprietaires)} <span className="text-xs text-sky-400">FCFA</span>
          </div>
          <div className="text-[10px] text-[#6B7C94] mt-0.5">À déduire des loyers reversés</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-xl bg-[#162133] border border-[#C9A96E]/15 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A8B4C4]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher incident, bien, locataire, artisan..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#1E2E45] border border-[#C9A96E]/20 text-white text-xs placeholder:text-[#6B7C94] focus:outline-none focus:border-[#C9A96E]"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto">
          <div className="flex items-center gap-1 text-xs text-[#A8B4C4] whitespace-nowrap">
            <Filter className="w-3.5 h-3.5 text-[#C9A96E]" />
            <span>Statut :</span>
          </div>
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#1E2E45] border border-[#C9A96E]/20 text-white text-xs focus:outline-none focus:border-[#C9A96E]"
          >
            <option value="all">Tous les statuts ({tickets.length})</option>
            <option value="pending">En attente / Signalés</option>
            <option value="in_progress">En cours / Planifiés</option>
            <option value="completed_paid">Traités & Réglés</option>
          </select>

          <div className="flex items-center gap-1 text-xs text-[#A8B4C4] whitespace-nowrap ml-2">
            <span>Imputation :</span>
          </div>
          <select
            value={filterImputation}
            onChange={(e) => setFilterImputation(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#1E2E45] border border-[#C9A96E]/20 text-white text-xs focus:outline-none focus:border-[#C9A96E]"
          >
            <option value="all">Toutes imputations</option>
            <option value="Propriétaire">Propriétaire (Déductible)</option>
            <option value="Locataire">Locataire (À facturer)</option>
            <option value="Agence">Agence (Charge Fital)</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#162133] border border-[#C9A96E]/15">
          <Wrench className="w-12 h-12 text-[#6B7C94] mx-auto mb-3 opacity-50" />
          <h3 className="text-sm font-bold text-white">Aucun ticket de travaux trouvé</h3>
          <p className="text-xs text-[#A8B4C4] mt-1 max-w-md mx-auto">
            Aucune intervention ne correspond à vos critères de recherche ou de filtre. Cliquez sur "Nouveau Ticket Travaux" pour en enregistrer un.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map((t) => {
            const isRegle = t.statut === 'Traité et Réglé' || t.statutReglement === 'Réglé';
            const isCompleted = t.statut === 'Terminé' || isRegle;
            const prop = properties.find((p) => p.id === t.bienId);
            const tenant = tenants.find((tn) => tn.id === t.locataireId || tn.bienId === t.bienId);
            const owner = owners.find((o) => o.id === prop?.proprietaireId || o.id === t.proprietaireId);

            return (
              <div
                key={t.id}
                className={`p-5 rounded-2xl bg-[#162133] border transition-all shadow-xl flex flex-col justify-between ${
                  isRegle
                    ? 'border-emerald-500/30 hover:border-emerald-500/60'
                    : 'border-[#C9A96E]/20 hover:border-[#C9A96E]/50'
                }`}
              >
                <div>
                  {/* Top tags row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-[#C9A96E] bg-[#1E2E45] px-2 py-0.5 rounded border border-[#C9A96E]/20">
                        {t.ref || `TRV-${t.id.slice(0, 6)}`}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                          t.priorite === 'Urgente'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : t.priorite === 'Haute'
                            ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        Priorité {t.priorite}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isRegle ? (
                        <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Traité & Réglé
                        </span>
                      ) : t.statut === 'En cours' ? (
                        <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-sky-400 animate-spin" />
                          En cours
                        </span>
                      ) : t.statut === 'Planifié' ? (
                        <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-purple-400" />
                          Planifié
                        </span>
                      ) : (
                        <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          {t.statut}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-sm font-bold text-white mb-1 leading-snug">{t.titre}</h3>
                  <p className="text-xs text-[#A8B4C4] leading-relaxed mb-3 line-clamp-2">
                    {t.description}
                  </p>

                  {/* Details Card */}
                  <div className="p-3 rounded-xl bg-[#1E2E45]/50 border border-[#C9A96E]/15 text-xs space-y-1.5 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[#A8B4C4] flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-[#C9A96E]" /> Bien concerné :
                      </span>
                      <span className="font-semibold text-white truncate max-w-[200px]">{t.bienNom}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#A8B4C4] flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#6B7C94]" /> Locataire :
                      </span>
                      <span className="text-[#E8D5B0]">{t.locataireNom || 'N/A'}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#A8B4C4] flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-[#6B7C94]" /> Artisan / Prestataire :
                      </span>
                      <span className="text-white font-medium">{t.artisanNom || t.prestataire || 'Non assigné'}</span>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-[#C9A96E]/10">
                      <span className="text-[#A8B4C4]">Imputation financière :</span>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                          t.imputableA === 'Propriétaire'
                            ? 'bg-amber-500/20 text-amber-300'
                            : t.imputableA === 'Locataire'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-sky-500/20 text-sky-300'
                        }`}
                      >
                        {t.imputableA || 'Propriétaire'} (
                        {t.imputableA === 'Propriétaire'
                          ? 'Déduit du loyer'
                          : t.imputableA === 'Locataire'
                          ? 'À facturer au locataire'
                          : 'Charge agence'}
                        )
                      </span>
                    </div>

                    {isRegle && t.modeReglement && (
                      <div className="flex justify-between items-center text-[11px] text-emerald-300 pt-1 border-t border-emerald-500/20">
                        <span className="flex items-center gap-1">
                          <Check className="w-3 h-3" /> Réglé le {formatDate(t.dateReglement || t.dateResolution)}
                        </span>
                        <span>Mode : {t.modeReglement} {t.regleParCaisse ? '(Caisse Agence)' : ''}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Financials & Action Buttons */}
                <div>
                  <div className="p-3 rounded-xl bg-[#141E30] border border-[#2A3447] flex items-center justify-between mb-3.5">
                    <div>
                      <div className="text-[10px] text-[#6B7C94] uppercase font-semibold">Coût Estimé</div>
                      <div className="text-xs font-mono text-[#A8B4C4]">{formatCurrency(t.coutEstime)}</div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-[#C9A96E] uppercase font-bold">
                        {isRegle ? 'Coût Réel Réglé' : 'Coût Final à Régler'}
                      </div>
                      <div className="text-sm font-bold font-mono text-[#E8D5B0]">
                        {formatCurrency(t.coutReel || t.coutEstime)}
                      </div>
                    </div>
                  </div>

                  {/* ACTION BUTTONS ROW */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#C9A96E]/15">
                    {/* LE BOUTON CLÉ : CONFIRMER TRAITÉ & RÉGLER */}
                    {!isRegle ? (
                      <button
                        onClick={() => handleOpenResolveModal(t)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-[#0A111D] font-black text-xs shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        title="Confirmer que les travaux sont terminés et régler les frais artisan"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirmer Traité & Régler</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenResolveModal(t)}
                        className="py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Modifier ou réajuster les détails du règlement"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Détails Règlement</span>
                      </button>
                    )}

                    {/* Quick status cycle if not resolved */}
                    {!isRegle && t.statut !== 'En cours' && (
                      <button
                        onClick={() => handleQuickStatusChange(t, 'En cours')}
                        className="py-2 px-2.5 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] text-sky-300 border border-sky-500/20 text-xs font-semibold transition-colors flex items-center gap-1"
                        title="Marquer en cours d'intervention"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Démarrer</span>
                      </button>
                    )}

                    {/* Printable Work Order button */}
                    <button
                      onClick={() => setSelectedTicketForPrint(t)}
                      className="py-2 px-3 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#E8D5B0] border border-[#C9A96E]/20 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Imprimer l'Ordre d'intervention et Bon de règlement officiel"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#C9A96E]" />
                      <span>Bon Travaux</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CONFIRMER TRAITÉ & RÉGLER (RÈGLEMENT FRAIS ET CLÔTURE TRAVAUX) */}
      {/* ========================================================================= */}
      {ticketToResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#162133] border border-emerald-500/40 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-emerald-500/20 flex items-center justify-between bg-[#1E2E45]/90">
              <div className="flex items-center gap-2.5 text-white font-bold text-sm">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-white font-bold">Validation & Règlement des Frais de Travaux</div>
                  <div className="text-[11px] text-[#A8B4C4] font-mono">
                    Réf : {ticketToResolve.ref || ticketToResolve.id.slice(0, 8)} · {ticketToResolve.titre}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setTicketToResolve(null)}
                className="text-[#A8B4C4] hover:text-white p-1 rounded-lg hover:bg-[#162133]"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmResolution} className="p-6 space-y-4 text-xs overflow-y-auto max-h-[80vh]">
              {/* Summary of Intervention */}
              <div className="p-3.5 rounded-xl bg-[#141E30] border border-[#2A3447] text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#A8B4C4]">Bien concerné :</span>
                  <span className="font-semibold text-white">{ticketToResolve.bienNom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A8B4C4]">Artisan intervenant :</span>
                  <span className="font-semibold text-[#E8D5B0]">
                    {ticketToResolve.artisanNom || ticketToResolve.prestataire || 'Artisan Référencé'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A8B4C4]">Coût initial estimé (devis) :</span>
                  <span className="font-mono text-[#C9A96E]">{formatCurrency(ticketToResolve.coutEstime)}</span>
                </div>
              </div>

              {/* Real Cost & Invoice Ref */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#E8D5B0] uppercase mb-1">
                    Coût Réel Définitif (FCFA) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={coutReel}
                      onChange={(e) => setCoutReel(Math.max(0, Number(e.target.value)))}
                      required
                      min={0}
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border-2 border-emerald-500/50 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-400"
                      placeholder="Montant facturé par l'artisan"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#C9A96E] font-bold">
                      FCFA
                    </span>
                  </div>
                  <span className="text-[10px] text-[#6B7C94] mt-1 block">
                    Montant final qui sera réglé et déduit selon l'imputation.
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Réf Facture / Quittance Artisan
                  </label>
                  <input
                    type="text"
                    value={factureArtisanRef}
                    onChange={(e) => setFactureArtisanRef(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono"
                    placeholder="Ex: FACT-2026-041"
                  />
                  <span className="text-[10px] text-[#6B7C94] mt-1 block">
                    Numéro justificatif fourni par le prestataire.
                  </span>
                </div>
              </div>

              {/* Imputation & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Imputation des Frais *
                  </label>
                  <select
                    value={imputationReglement}
                    onChange={(e) => setImputationReglement(e.target.value as MaintenanceImputation)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white focus:outline-none focus:border-[#C9A96E]"
                  >
                    <option value="Propriétaire">Propriétaire (Déduit du prochain loyer reversé)</option>
                    <option value="Locataire">Locataire (Facturé au locataire / retenu caution)</option>
                    <option value="Agence">Agence (Prise en charge frais de gérance)</option>
                  </select>
                  <span className="text-[10px] text-amber-300 mt-1 block">
                    {imputationReglement === 'Propriétaire'
                      ? '✓ Figurera automatiquement sur le bulletin de versement du propriétaire.'
                      : imputationReglement === 'Locataire'
                      ? 'À réclamer au locataire lors du prochain appel de loyer.'
                      : 'Comptabilisé comme dépense d’exploitation de l’agence.'}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Mode de Règlement à l'artisan *
                  </label>
                  <select
                    value={modeReglement}
                    onChange={(e) => setModeReglement(e.target.value as PaymentMethod)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white focus:outline-none focus:border-[#C9A96E]"
                  >
                    <option value="Espèces">Espèces (Caisse physique Agence)</option>
                    <option value="Wave">Wave Mobile Money</option>
                    <option value="Orange Money">Orange Money</option>
                    <option value="Virement">Virement bancaire</option>
                    <option value="Chèque">Chèque bancaire</option>
                  </select>
                  <span className="text-[10px] text-[#6B7C94] mt-1 block">Canal financier utilisé pour payer l'artisan.</span>
                </div>
              </div>

              {/* Date of settlement */}
              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                  Date du Règlement & Clôture
                </label>
                <input
                  type="date"
                  value={dateReglement}
                  onChange={(e) => setDateReglement(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                />
              </div>

              {/* Cash register deduction checkbox */}
              {modeReglement === 'Espèces' && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="chkCashDeduct"
                    checked={enregistrerSortieCaisse}
                    onChange={(e) => setEnregistrerSortieCaisse(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-500 focus:ring-emerald-400 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="chkCashDeduct" className="cursor-pointer">
                    <span className="font-bold text-emerald-300 block text-xs">
                      Enregistrer automatiquement un décaissement (SORTIE) dans le module Caisse
                    </span>
                    <span className="text-[11px] text-emerald-200/80 block mt-0.5">
                      Un bon de décaissement de {formatNumber(coutReel)} FCFA sera généré et déduit du solde de caisse de l'agence.
                    </span>
                  </label>
                </div>
              )}

              {/* Observations / Receipt notes */}
              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                  Observations de Réception & Travaux Réalisés
                </label>
                <textarea
                  rows={2}
                  value={observationsReglement}
                  onChange={(e) => setObservationsReglement(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  placeholder="Ex: Travaux vérifiés, conforme au devis, robinetterie changée avec succès."
                />
              </div>

              {/* Submit / Action buttons */}
              <div className="pt-4 border-t border-[#C9A96E]/20 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setTicketToResolve(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#A8B4C4] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-[#0A111D] font-black text-xs shadow-xl hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmer Traité & Régler ({formatNumber(coutReel)} FCFA)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CRÉATION D'UN NOUVEAU TICKET TRAVAUX */}
      {/* ========================================================================= */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Wrench className="w-5 h-5 text-[#C9A96E]" />
                <span>Nouveau Signalement d'Incident / Travaux</span>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-[#A8B4C4] hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitNewTicket} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                  Titre des travaux / Incident *
                </label>
                <input
                  type="text"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white focus:outline-none focus:border-[#C9A96E]"
                  placeholder="Ex: Remplacement mitigeur cuisine ou Fuite toit terrasse"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Bien concerné *</label>
                  <select
                    value={bienId}
                    onChange={(e) => setBienId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white focus:outline-none focus:border-[#C9A96E]"
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nom} {p.locataireActuelNom ? `(${p.locataireActuelNom})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Priorité *</label>
                  <select
                    value={priorite}
                    onChange={(e) => setPriorite(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white focus:outline-none focus:border-[#C9A96E]"
                  >
                    <option value="Faible">Faible</option>
                    <option value="Moyenne">Moyenne</option>
                    <option value="Haute">Haute</option>
                    <option value="Urgente">Urgente (Dégât des eaux / Sécurité)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Artisan / Prestataire
                  </label>
                  <input
                    type="text"
                    value={artisanNom}
                    onChange={(e) => setArtisanNom(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                    placeholder="Ex: Moussa Plomberie Dakar"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Imputation Prévisionnelle *
                  </label>
                  <select
                    value={imputableA}
                    onChange={(e) => setImputableA(e.target.value as MaintenanceImputation)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  >
                    <option value="Propriétaire">Propriétaire (Déductible loyer)</option>
                    <option value="Locataire">Locataire (Facturé locataire)</option>
                    <option value="Agence">Agence (Frais de gestion)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#C9A96E] uppercase mb-1">
                    Coût Estimé / Devis (FCFA) *
                  </label>
                  <input
                    type="number"
                    value={coutEstime}
                    onChange={(e) => setCoutEstime(Number(e.target.value))}
                    required
                    min={0}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E] text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Date Intervention Prévue
                  </label>
                  <input
                    type="date"
                    value={dateIntervention}
                    onChange={(e) => setDateIntervention(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                  Description Détaillée du Problème *
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  placeholder="Détaillez le problème technique, pièces nécessaires, contraintes d'accès..."
                />
              </div>

              <div className="pt-4 border-t border-[#C9A96E]/15 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#1E2E45] text-[#A8B4C4] hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold shadow-lg hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Créer le Ticket Travaux</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: IMPRESSION BON D'INTERVENTION & RÈGLEMENT */}
      {/* ========================================================================= */}
      {selectedTicketForPrint && (
        <MaintenanceWorkOrderModal
          ticket={selectedTicketForPrint}
          property={properties.find((p) => p.id === selectedTicketForPrint.bienId)}
          tenant={tenants.find((t) => t.id === selectedTicketForPrint.locataireId || t.bienId === selectedTicketForPrint.bienId)}
          owner={owners.find((o) => o.id === selectedTicketForPrint.proprietaireId)}
          onClose={() => setSelectedTicketForPrint(null)}
        />
      )}
    </div>
  );
};
