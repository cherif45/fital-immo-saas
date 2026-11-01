import React, { useState, useMemo } from "react";
import {
  AlertTriangle,
  Calculator,
  Search,
  Filter,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  X,
  Download,
  TrendingUp,
  DollarSign,
  Calendar,
  User,
} from "lucide-react";
import {
  Penalty,
  Tenant,
  Payment,
  UserAccount,
  Property,
  Unit,
} from "../types";
import { formatCurrency, formatNumber, formatDate } from "../lib/utils";
import { paginateTable } from "../lib/supabase/service";
import { supabase } from "../lib/supabase/client";

interface PenaltiesViewProps {
  penalties: Penalty[];
  tenants: Tenant[];
  properties: Property[];
  units: Unit[];
  payments: Payment[];
  currentUser?: UserAccount;
  onAddPenalty: (penalty: Penalty) => Promise<boolean>;
  onDeletePenalty: (penaltyId: string) => Promise<boolean>;
  onUpdatePenalty?: (penalty: Penalty) => Promise<boolean>;
}

export const PenaltiesView: React.FC<PenaltiesViewProps> = ({
  penalties,
  tenants,
  properties,
  units = [],
  payments,
  currentUser,
  onAddPenalty,
  onDeletePenalty,
  onUpdatePenalty,
}) => {
  const [search, setSearch] = useState("");
  const [showOldPenalties, setShowOldPenalties] = useState(false);

  // Pagination serveur
  const [serverPenalties, setServerPenalties] = useState<Penalty[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [serverPage, setServerPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 50;

  React.useEffect(() => {
    if (!currentUser?.agencyId) return;
    loadPenaltiesPage(0);
  }, [currentUser?.agencyId]);

  const loadPenaltiesPage = async (page: number) => {
    if (!currentUser?.agencyId) return;
    setIsLoadingMore(true);
    const result = await paginateTable<any>(
      "penalties",
      currentUser.agencyId,
      page,
      PAGE_SIZE,
    );
    const mapped: Penalty[] = (result.data || []).map((r: any) => ({
      id: r.id,
      agencyId: r.agency_id,
      paymentId: r.payment_id,
      locataireId: r.locataire_id,
      locataireNom: r.locataire_nom,
      bienId: r.bien_id,
      bienNom: r.bien_nom,
      periode: r.periode,
      joursRetard: Number(r.jours_retard ?? 0),
      tauxPenalite: Number(r.taux_penalite ?? 10),
      montantBase: Number(r.montant_base ?? 0),
      montantPenalite: Number(r.montant_penalite ?? 0),
      statut: r.statut || "En attente",
      dateCalcul: r.date_calcul || new Date().toISOString().split("T")[0],
      dateApplication: r.date_application,
      notes: r.notes || "",
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    if (page === 0) {
      setServerPenalties(mapped);
    } else {
      setServerPenalties((prev) => [...prev, ...mapped]);
    }
    setServerTotal(result.total);
    setServerPage(page);
    setIsLoadingMore(false);
  };

  const displayPenalties = React.useMemo(() => {
    const sourcePenalties =
      serverPenalties.length > 0 ? serverPenalties : penalties;

    const tenantsById = new Map<string, Tenant>(
      tenants.map((tenant): [string, Tenant] => [tenant.id, tenant]),
    );
    const propertiesById = new Map<string, Property>(
      properties.map((property): [string, Property] => [property.id, property]),
    );
    const unitsById = new Map<string, Unit>(
      units.map((unit): [string, Unit] => [unit.id, unit]),
    );

    return sourcePenalties.map((penalty) => {
      const tenant = penalty.locataireId
        ? tenantsById.get(penalty.locataireId)
        : undefined;

      const propertyId = penalty.bienId || tenant?.bienId;
      const unit = propertyId ? unitsById.get(propertyId) : undefined;
      const property = propertyId ? propertiesById.get(propertyId) : undefined;

      const tenantName = tenant
        ? `${tenant.prenom || ""} ${tenant.nom || ""}`.trim()
        : "";

      const unitName = unit
        ? [unit.buildingNom, unit.nom].filter(Boolean).join(" - ")
        : "";

      return {
        ...penalty,
        locataireNom:
          tenantName ||
          String(penalty.locataireNom || "").trim() ||
          "Locataire introuvable",
        bienNom:
          unitName ||
          String(property?.nom || "").trim() ||
          String(tenant?.bienNom || "").trim() ||
          String(penalty.bienNom || "").trim() ||
          "Bien non renseigné",
      };
    });
  }, [serverPenalties, penalties, tenants, properties, units]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isNewPenaltyModalOpen, setIsNewPenaltyModalOpen] = useState(false);

  // Form state
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [periode, setPeriode] = useState<string>(
    new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
  );
  const [joursRetard, setJoursRetard] = useState(15);
  const [tauxPenalite, setTauxPenalite] = useState(10);
  const [montantBase, setMontantBase] = useState(0);
  const [notes, setNotes] = useState("");

  // ============================================================
  // RECALCUL MANUEL DES STATUTS
  // ============================================================
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleRecalculate = async () => {
    if (!currentUser?.agencyId) return;
    if (
      !window.confirm(
        "Recalculer les statuts de tous les locataires ?\n\n" +
          "Cette action va mettre à jour les locataires en retard/impayé.",
      )
    )
      return;

    setIsRecalculating(true);
    try {
      const { error } = await supabase.rpc("recalculate_tenant_statuses", {
        p_agency_id: currentUser.agencyId,
      });

      if (error) {
        alert(`Erreur : ${error.message}`);
        return;
      }

      alert("OK - Statuts recalculés avec succès. Rechargement de la page...");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      alert("Erreur lors du recalcul : " + String(err));
    } finally {
      setIsRecalculating(false);
    }
  };

  // ============================================================
  // PERMISSIONS
  // ============================================================
  const role = currentUser?.role || "ADMIN";
  const canManage = [
    "ADMIN",
    "SUPER_ADMIN",
    "GESTIONNAIRE",
    "CAISSIER",
  ].includes(role);

  // ============================================================
  // CALCULS
  // ============================================================
  const montantPenalite = Math.round((montantBase * tauxPenalite) / 100);

  // ============================================================
  // FILTRES
  // ============================================================
  const filteredPenalties = React.useMemo(() => {
    return displayPenalties.filter((p) => {
      // Filtre : n'afficher que les pénalités récentes sauf si "Voir anciennes"
      if (!showOldPenalties) {
        const periodeStr = String(p.periode || "").trim();
        const dateCalculStr = String(p.dateCalcul || "");
        // Est "ancienne" si la période est un nombre pur (pas un nom de mois)
        const isOld =
          /^\d+$/.test(periodeStr) &&
          !dateCalculStr.startsWith("2026") &&
          !dateCalculStr.startsWith("2025");
        if (isOld) return false;
      }

      if (statusFilter !== "all" && p.statut !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (p.locataireNom || "").toLowerCase().includes(q) ||
          (p.bienNom || "").toLowerCase().includes(q) ||
          (p.periode || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [displayPenalties, statusFilter, search, showOldPenalties]);

  // ============================================================
  // STATS (sur les pénalités filtrées)
  // ============================================================
  const totalPenalites = filteredPenalties.reduce(
    (sum, p) => sum + p.montantPenalite,
    0,
  );
  const totalEnAttente = filteredPenalties
    .filter((p) => p.statut === "En attente")
    .reduce((sum, p) => sum + p.montantPenalite, 0);
  const totalAppliquees = filteredPenalties
    .filter((p) => p.statut === "Appliquée" || p.statut === "Payée")
    .reduce((sum, p) => sum + p.montantPenalite, 0);

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleTenantChange = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    const tenant = tenants.find((t) => t.id === tenantId);
    if (tenant) {
      setMontantBase(tenant.loyerMensuel || 0);
      if (tenant.joursRetard && tenant.joursRetard > 0) {
        setJoursRetard(tenant.joursRetard);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    if (!selectedTenantId || montantBase <= 0) {
      alert("Veuillez sélectionner un locataire et un montant.");
      return;
    }

    const tenant = tenants.find((t) => t.id === selectedTenantId);
    if (!tenant) return;

    const newPenalty: Penalty = {
      id: crypto.randomUUID(),
      agencyId: currentUser?.agencyId,
      locataireId: tenant.id,
      locataireNom: `${tenant.prenom} ${tenant.nom}`,
      bienId: tenant.bienId,
      bienNom: tenant.bienNom,
      periode,
      joursRetard: Number(joursRetard),
      tauxPenalite: Number(tauxPenalite),
      montantBase: Number(montantBase),
      montantPenalite,
      statut: "En attente",
      dateCalcul: new Date().toISOString().split("T")[0],
      notes: notes || undefined,
    };

    const saved = await onAddPenalty(newPenalty);
    if (!saved) return;
    setServerPenalties((prev) => [newPenalty, ...prev]);
    setServerTotal((prev) => prev + 1);
    setIsNewPenaltyModalOpen(false);

    setSelectedTenantId("");
    setJoursRetard(15);
    setTauxPenalite(10);
    setMontantBase(0);
    setNotes("");
  };

  const handleApplyPenalty = async (penalty: Penalty) => {
    if (!onUpdatePenalty) return;
    if (!canManage) return;
    const updated: Penalty = {
      ...penalty,
      statut: "Appliquée",
      dateApplication: new Date().toISOString().split("T")[0],
    };
    if (await onUpdatePenalty(updated)) {
      setServerPenalties((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
    }
  };

  const handleDeletePenalty = async (penalty: Penalty) => {
    if (!canManage) return;
    if (window.confirm(`Supprimer la pénalité de ${penalty.locataireNom} ?`)) {
      if (await onDeletePenalty(penalty.id)) {
        setServerPenalties((prev) =>
          prev.filter((item) => item.id !== penalty.id),
        );
        setServerTotal((prev) => Math.max(0, prev - 1));
      }
    }
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case "En attente":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "Appliquée":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "Payée":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "Annulée":
        return "bg-slate-500/20 text-slate-300 border-slate-500/30";
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-base font-bold text-white">
              Pénalités de Retard & Indemnités
            </div>
            <div className="text-xs text-[#A8B4C4] mt-0.5">
              {filteredPenalties.length} pénalité(s) -{" "}
              {formatNumber(totalPenalites)} FCFA affichés
            </div>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleRecalculate}
              disabled={isRecalculating}
              className="px-4 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] border border-[#C9A96E]/30 text-[#E8D5B0] font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
              title="Recalculer les statuts des locataires en retard/impayé"
            >
              <Calculator className="w-4 h-4" />
              <span>
                {isRecalculating ? "Recalcul..." : "Recalculer statuts"}
              </span>
            </button>
            <button
              onClick={() => setIsNewPenaltyModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Pénalité</span>
            </button>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/20">
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-[#A8B4C4] uppercase font-semibold">
              Total Pénalités
            </div>
            <DollarSign className="w-4 h-4 text-[#C9A96E]" />
          </div>
          <div className="text-2xl font-bold text-[#E8D5B0] mt-2 font-mono">
            {formatNumber(totalPenalites)} <span className="text-xs">FCFA</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#162133] border border-amber-500/20">
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-amber-300 uppercase font-semibold">
              En Attente
            </div>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2 font-mono">
            {formatNumber(totalEnAttente)} <span className="text-xs">FCFA</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#162133] border border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-emerald-300 uppercase font-semibold">
              Appliquées
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2 font-mono">
            {formatNumber(totalAppliquees)}{" "}
            <span className="text-xs">FCFA</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/15 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              statusFilter === "all"
                ? "bg-[#C9A96E] text-[#0F1B2D] font-bold"
                : "bg-[#1E2E45] text-[#A8B4C4] hover:text-white"
            }`}
          >
            Toutes ({filteredPenalties.length})
          </button>
          <button
            onClick={() => setStatusFilter("En attente")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              statusFilter === "En attente"
                ? "bg-amber-500 text-white font-bold"
                : "bg-[#1E2E45] text-amber-400 hover:text-white"
            }`}
          >
            En attente (
            {filteredPenalties.filter((p) => p.statut === "En attente").length})
          </button>
          <button
            onClick={() => setStatusFilter("Appliquée")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              statusFilter === "Appliquée"
                ? "bg-emerald-500 text-white font-bold"
                : "bg-[#1E2E45] text-emerald-400 hover:text-white"
            }`}
          >
            Appliquées (
            {
              filteredPenalties.filter(
                (p) => p.statut === "Appliquée" || p.statut === "Payée",
              ).length
            }
            )
          </button>
          <button
            onClick={() => setShowOldPenalties(!showOldPenalties)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              showOldPenalties
                ? "bg-slate-500 text-white font-bold"
                : "bg-[#1E2E45] text-slate-400 hover:text-white"
            }`}
          >
            {showOldPenalties ? "Masquer anciennes" : "Voir anciennes"}
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-[#6B7C94] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-xs text-white focus:outline-none focus:border-[#C9A96E]"
          />
        </div>
      </div>

      {/* Tableau */}
      <div className="rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#1E2E45]/80 text-[#A8B4C4] font-semibold uppercase tracking-wider text-[10px] border-b border-[#C9A96E]/20">
                <th className="py-3 px-4">Locataire</th>
                <th className="py-3 px-3">Bien</th>
                <th className="py-3 px-3">Période</th>
                <th className="py-3 px-3 text-center">Jours Retard</th>
                <th className="py-3 px-3 text-right">Loyer Base</th>
                <th className="py-3 px-3 text-right">Pénalité</th>
                <th className="py-3 px-3 text-center">Statut</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9A96E]/10">
              {filteredPenalties.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#6B7C94]">
                    <AlertTriangle className="w-8 h-8 mx-auto text-[#6B7C94]/50 mb-2" />
                    <p className="text-xs font-semibold text-white">
                      Aucune pénalité
                    </p>
                    <p className="text-[11px] text-[#6B7C94] mt-1">
                      Créez une pénalité pour un locataire en retard.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPenalties.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-[#1E2E45]/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-white">
                      {p.locataireNom}
                    </td>
                    <td className="py-3 px-3 text-[#A8B4C4]">{p.bienNom}</td>
                    <td className="py-3 px-3 text-[#A8B4C4]">{p.periode}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-amber-400 font-mono font-bold">
                        J+{p.joursRetard}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-white">
                      {formatNumber(p.montantBase)} F
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#C9A96E]">
                      {formatNumber(p.montantPenalite)} F
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${getStatusColor(p.statut)}`}
                      >
                        {p.statut}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {canManage && p.statut === "En attente" && (
                          <button
                            onClick={() => handleApplyPenalty(p)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-all cursor-pointer"
                            title="Appliquer la pénalité"
                          >
                            Appliquer
                          </button>
                        )}
                        {canManage && (
                          <button
                            onClick={() => handleDeletePenalty(p)}
                            className="p-1.5 rounded-lg bg-[#1E2E45] hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Bouton Charger plus */}
          {serverPenalties.length > 0 &&
            serverPenalties.length < serverTotal && (
              <div className="flex justify-center mt-4 mb-6">
                <button
                  onClick={() => loadPenaltiesPage(serverPage + 1)}
                  disabled={isLoadingMore}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-sm shadow-lg hover:scale-105 transition-all disabled:opacity-50"
                >
                  {isLoadingMore
                    ? "Chargement..."
                    : `Charger plus (${serverPenalties.length} / ${serverTotal})`}
                </button>
              </div>
            )}
        </div>
      </div>

      {/* Modal : Nouvelle Pénalité */}
      {canManage && isNewPenaltyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>Nouvelle Pénalité de Retard</span>
              </div>
              <button
                onClick={() => setIsNewPenaltyModalOpen(false)}
                className="text-[#A8B4C4] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                  Locataire concerné *
                </label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => handleTenantChange(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white focus:outline-none focus:border-[#C9A96E]"
                >
                  <option value="">- Choisir un locataire -</option>
                  {tenants
                    .filter((t) => !t.dateSortie)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.prenom} {t.nom} - {t.bienNom} (
                        {formatNumber(t.loyerMensuel)} FCFA)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                  Période *
                </label>
                <input
                  type="text"
                  value={periode}
                  onChange={(e) => setPeriode(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  placeholder="Ex: Septembre 2026"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                  Jours de retard *
                </label>
                <input
                  type="number"
                  value={joursRetard}
                  onChange={(e) => setJoursRetard(Number(e.target.value))}
                  required
                  min={1}
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Loyer Base (FCFA) *
                  </label>
                  <input
                    type="number"
                    value={montantBase}
                    onChange={(e) => setMontantBase(Number(e.target.value))}
                    required
                    min={0}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#C9A96E] uppercase mb-1">
                    Taux Pénalité (%) *
                  </label>
                  <input
                    type="number"
                    value={tauxPenalite}
                    onChange={(e) => setTauxPenalite(Number(e.target.value))}
                    required
                    min={1}
                    max={50}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E] text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-amber-300">
                    Montant Pénalité Calculé :
                  </span>
                  <span className="text-lg font-bold font-mono text-amber-300">
                    {formatNumber(montantPenalite)} FCFA
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                  Notes / Observation
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  placeholder="Motif, contexte..."
                />
              </div>

              <div className="pt-4 border-t border-[#C9A96E]/15 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewPenaltyModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1E2E45] text-[#A8B4C4] cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold shadow-lg hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Créer la Pénalité</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


