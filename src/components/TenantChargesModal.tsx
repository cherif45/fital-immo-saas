import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  Plus,
  Zap,
  Droplets,
  Sparkles,
  Edit2,
  Trash2,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Building,
  User,
  Clock,
  Layers,
} from "lucide-react";
import {
  Tenant,
  Property,
  TenantCharge,
  TenantChargeCategory,
  UserAccount,
} from "../types";
import { formatNumber, formatDate } from "../lib/utils";

interface TenantChargesModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenants: Tenant[];
  properties: Property[];
  tenantCharges: TenantCharge[];
  currentUser?: UserAccount;
  initialTenant?: Tenant | null;
  onAddCharge: (charge: Partial<TenantCharge>) => Promise<boolean | void> | boolean | void;
  onUpdateCharge: (charge: TenantCharge) => Promise<boolean | void> | boolean | void;
  onDeleteCharge: (chargeId: string) => Promise<boolean | void> | boolean | void;
}

export const TenantChargesModal: React.FC<TenantChargesModalProps> = ({
  isOpen,
  onClose,
  tenants,
  properties,
  tenantCharges,
  currentUser,
  initialTenant,
  onAddCharge,
  onUpdateCharge,
  onDeleteCharge,
}) => {
  // Permissions
  const role = currentUser?.role || "ADMIN";
  const canManageCharges =
    role === "ADMIN" ||
    role === "SUPER_ADMIN" ||
    role === "GESTIONNAIRE" ||
    role === "CAISSIER";

  // Filter State
  const [filterTenantId, setFilterTenantId] = useState<string>(
    initialTenant?.id || "ALL",
  );
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterPeriodMonth, setFilterPeriodMonth] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Edit / Form State
  const [editingCharge, setEditingCharge] = useState<TenantCharge | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);

  // Form Fields
  const [locataireId, setLocataireId] = useState<string>(
    initialTenant?.id || (tenants[0]?.id ?? ""),
  );
  const [categorie, setCategorie] = useState<TenantChargeCategory>("Eau");
  const [montant, setMontant] = useState<number | "">("");
  const [dateOperation, setDateOperation] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [periodeMonth, setPeriodeMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [description, setDescription] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;
    setFilterTenantId(initialTenant?.id || "ALL");
    setLocataireId(initialTenant?.id || tenants[0]?.id || "");
    setIsFormOpen(false);
    setEditingCharge(null);
  }, [isOpen, initialTenant?.id, tenants[0]?.id]);

  // Helper : "2026-09" -> "septembre 2026"
  const formatPeriodString = (m: string): string => {
    if (!m) return "";
    const [year, month] = m.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  };

  const toMonthInput = (period: string): string => {
    const [monthName, year] = period.trim().toLocaleLowerCase("fr-FR").split(/\s+/);
    const monthIndex = Array.from({ length: 12 }, (_, index) =>
      new Date(2026, index, 1)
        .toLocaleDateString("fr-FR", { month: "long" })
        .toLocaleLowerCase("fr-FR"),
    ).indexOf(monthName);
    if (!year || monthIndex < 0 || !/^\d{4}$/.test(year)) {
      return periodeMonth;
    }
    return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  };

  const formPeriode = formatPeriodString(periodeMonth);
  const filterPeriode = formatPeriodString(filterPeriodMonth);

  // Auto-resolve property from selected tenant in form
  const selectedTenantObj = useMemo(
    () => tenants.find((t) => t.id === locataireId),
    [locataireId, tenants],
  );

  // Open Add Form
  const handleOpenAdd = () => {
    setEditingCharge(null);
    setLocataireId(
      filterTenantId !== "ALL"
        ? filterTenantId
        : initialTenant?.id || tenants[0]?.id || "",
    );
    setCategorie("Eau");
    setMontant("");
    setDateOperation(new Date().toISOString().split("T")[0]);
    const now = new Date();
    setPeriodeMonth(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    );
    setDescription("");
    setIsFormOpen(true);
  };

  // Open Edit Form
  const handleStartEdit = (charge: TenantCharge) => {
    if (charge.paymentId || charge.statut === "Payé") {
      alert("Cette charge est déjà rattachée à un paiement et ne peut plus être modifiée.");
      return;
    }
    setEditingCharge(charge);
    setLocataireId(charge.locataireId);
    setCategorie(charge.categorie);
    setMontant(charge.montant);
    setDateOperation(charge.dateOperation || new Date().toISOString().split("T")[0]);
    setPeriodeMonth(toMonthInput(charge.periode));
    setDescription(charge.description || "");
    setIsFormOpen(true);
  };

  const handleCancelForm = () => {
    setEditingCharge(null);
    setIsFormOpen(false);
  };

  // Submit Add or Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locataireId) {
      alert("Veuillez sélectionner un locataire.");
      return;
    }
    const parsedMontant = Number(montant);
    if (!parsedMontant || parsedMontant <= 0) {
      alert("Veuillez saisir un montant supérieur à zéro.");
      return;
    }

    const t = tenants.find((item) => item.id === locataireId);
    const bienNom =
      t?.bienNom ||
      properties.find((p) => p.id === t?.bienId)?.nom ||
      "Bien non spécifié";

    let saved: boolean | void;
    if (editingCharge) {
      const updated: TenantCharge = {
        ...editingCharge,
        locataireId,
        locataireNom: t ? `${t.prenom} ${t.nom}` : editingCharge.locataireNom,
        bienId: t?.bienId || editingCharge.bienId,
        bienNom,
        categorie,
        montant: parsedMontant,
        dateOperation,
        periode: formPeriode,
        description: description.trim() || undefined,
        updatedAt: new Date().toISOString(),
      };
      saved = await onUpdateCharge(updated);
    } else {
      const newCharge: Partial<TenantCharge> = {
        id: crypto.randomUUID(),
        locataireId,
        locataireNom: t ? `${t.prenom} ${t.nom}` : "",
        bienId: t?.bienId || "",
        bienNom,
        categorie,
        montant: parsedMontant,
        dateOperation,
        periode: formPeriode,
        description: description.trim() || undefined,
        statut: "En attente",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saved = await onAddCharge(newCharge);
    }

    if (saved === false) return;
    setIsFormOpen(false);
    setEditingCharge(null);
  };

  const handleDelete = async (charge: TenantCharge) => {
    if (!canManageCharges) return;
    if (charge.paymentId || charge.statut === "Payé") {
      alert("Cette charge est déjà rattachée à un paiement et ne peut plus être supprimée.");
      return;
    }
    const confirmMsg = `Confirmez-vous la suppression de la charge de ${charge.categorie} d'un montant de ${formatNumber(charge.montant)} FCFA pour ${charge.locataireNom || "ce locataire"} (${charge.periode}) ?`;
    if (window.confirm(confirmMsg)) {
      await onDeleteCharge(charge.id);
    }
  };

  // Filter charges
  const filteredCharges = useMemo(() => {
    return tenantCharges.filter((c) => {
      if (filterTenantId !== "ALL" && c.locataireId !== filterTenantId) return false;
      if (filterCategory !== "ALL" && c.categorie !== filterCategory) return false;
      if (
        filterPeriodMonth &&
        (c.periode || "").toLowerCase() !== filterPeriode.toLowerCase()
      )
        return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const locataireMatch = (c.locataireNom || "").toLowerCase().includes(q);
        const bienMatch = (c.bienNom || "").toLowerCase().includes(q);
        const descMatch = (c.description || "").toLowerCase().includes(q);
        const catMatch = (c.categorie || "").toLowerCase().includes(q);
        const periodMatch = (c.periode || "").toLowerCase().includes(q);
        if (!locataireMatch && !bienMatch && !descMatch && !catMatch && !periodMatch) {
          return false;
        }
      }
      return true;
    });
  }, [tenantCharges, filterTenantId, filterCategory, filterPeriodMonth, filterPeriode, searchQuery]);

  // Totals calculations
  const totals = useMemo(() => {
    let eau = 0;
    let electricite = 0;
    let nettoyage = 0;

    filteredCharges.forEach((c) => {
      const amt = Number(c.montant) || 0;
      if (c.categorie === "Eau") eau += amt;
      else if (c.categorie === "Électricité") electricite += amt;
      else if (c.categorie === "Nettoyage") nettoyage += amt;
    });

    return {
      eau,
      electricite,
      nettoyage,
      total: eau + electricite + nettoyage,
    };
  }, [filteredCharges]);

  if (!isOpen) return null;

  const getCategoryBadge = (cat: TenantChargeCategory) => {
    switch (cat) {
      case "Eau":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
            <Droplets className="w-3 h-3" />
            Eau
          </span>
        );
      case "Électricité":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Zap className="w-3 h-3" />
            Électricité
          </span>
        );
      case "Nettoyage":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Sparkles className="w-3 h-3" />
            Nettoyage
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/20 text-slate-300 border border-slate-500/30">
            {cat}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121B2B] border border-[#C9A96E]/30 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1A263B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#C9A96E]/30 to-[#C9A96E]/10 border border-[#C9A96E]/40 flex items-center justify-center text-[#C9A96E]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Charges Variables des Locataires
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-[#C9A96E]/20 text-[#C9A96E] border border-[#C9A96E]/30">
                  Eau · Électricité · Nettoyage
                </span>
              </h2>
              <p className="text-xs text-[#A8B4C4]">
                Gestion des consommations et frais ponctuels rattachés aux paiements de loyer
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canManageCharges && !isFormOpen && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] hover:from-[#D8BA80] hover:to-[#B38A50] text-[#0F1B2D] font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter une charge</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[#A8B4C4] hover:text-white hover:bg-[#2A3B54] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Form Modal / Collapsible Section */}
          {isFormOpen && (
            <div className="p-5 rounded-2xl bg-[#182438] border border-[#C9A96E]/40 shadow-xl space-y-4 animate-in slide-in-from-top-4 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-[#C9A96E]/20">
                <div className="flex items-center gap-2 text-sm font-bold text-[#E8D5B0]">
                  {editingCharge ? <Edit2 className="w-4 h-4 text-[#C9A96E]" /> : <Plus className="w-4 h-4 text-[#C9A96E]" />}
                  <span>{editingCharge ? "Modifier la charge" : "Nouvelle charge variable"}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="text-xs text-[#A8B4C4] hover:text-white"
                >
                  Fermer le formulaire
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {/* Locataire */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                      1. Locataire concerné
                    </label>
                    <select
                      value={locataireId}
                      onChange={(e) => setLocataireId(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl bg-[#0F1B2D] border border-[#C9A96E]/30 text-white focus:outline-none focus:border-[#C9A96E]"
                    >
                      <option value="">— Choisir un locataire —</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.prenom} {t.nom} — {t.bienNom}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bien concerné (auto ou indicatif) */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                      Bien rattaché
                    </label>
                    <div className="w-full p-2.5 rounded-xl bg-[#0F1B2D]/50 border border-[#2A3B54] text-[#C9A96E] font-medium truncate">
                      {selectedTenantObj?.bienNom || "Sélectionnez un locataire"}
                    </div>
                  </div>

                  {/* Catégorie */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                      2. Catégorie de charge
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["Eau", "Électricité", "Nettoyage"] as TenantChargeCategory[]).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategorie(cat)}
                          className={`py-2 px-1 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all border ${
                            categorie === cat
                              ? cat === "Eau"
                                ? "bg-sky-500 text-white border-sky-400 shadow-lg shadow-sky-500/20"
                                : cat === "Électricité"
                                  ? "bg-amber-500 text-[#0F1B2D] border-amber-400 font-bold shadow-lg shadow-amber-500/20"
                                  : "bg-emerald-500 text-[#0F1B2D] border-emerald-400 font-bold shadow-lg shadow-emerald-500/20"
                              : "bg-[#0F1B2D] border-[#2A3B54] text-[#A8B4C4] hover:text-white"
                          }`}
                        >
                          {cat === "Eau" && <Droplets className="w-3.5 h-3.5" />}
                          {cat === "Électricité" && <Zap className="w-3.5 h-3.5" />}
                          {cat === "Nettoyage" && <Sparkles className="w-3.5 h-3.5" />}
                          <span>{cat}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Montant */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#C9A96E] uppercase mb-1">
                      3. Montant en FCFA
                    </label>
                    <input
                      type="number"
                      value={montant}
                      onChange={(e) => setMontant(e.target.value === "" ? "" : Number(e.target.value))}
                      required
                      min={1}
                      placeholder="Ex: 15000"
                      className="w-full p-2.5 rounded-xl bg-[#0F1B2D] border border-[#C9A96E] text-white font-mono font-bold text-sm focus:outline-none focus:ring-1 focus:ring-[#C9A96E]"
                    />
                  </div>

                  {/* Date de l'opération */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                      Date de l'opération
                    </label>
                    <input
                      type="date"
                      value={dateOperation}
                      onChange={(e) => setDateOperation(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl bg-[#0F1B2D] border border-[#C9A96E]/30 text-white focus:outline-none focus:border-[#C9A96E]"
                    />
                  </div>

                  {/* Période concernée */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                      Période concernée
                    </label>
                    <input
                      type="month"
                      value={periodeMonth}
                      onChange={(e) => setPeriodeMonth(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl bg-[#0F1B2D] border border-[#C9A96E]/30 text-white focus:outline-none focus:border-[#C9A96E]"
                    />
                    <p className="text-[10px] text-[#A8B4C4] mt-1">
                      Enregistrée comme : <strong className="text-[#C9A96E]">{formPeriode}</strong>
                    </p>
                  </div>
                </div>

                {/* Description ou référence facultative */}
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Description ou référence (facultative)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Facture Senelec Compteur #89124 - Relevé du 28/09"
                    className="w-full p-2.5 rounded-xl bg-[#0F1B2D] border border-[#2A3B54] text-white focus:outline-none focus:border-[#C9A96E]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="px-4 py-2 rounded-xl bg-[#0F1B2D] text-[#A8B4C4] hover:text-white"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] hover:from-[#D8BA80] hover:to-[#B38A50] text-[#0F1B2D] font-bold shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingCharge ? "Mettre à jour" : "Enregistrer la charge"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* KPI Cards: Totaux par catégorie et général */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#162234] border border-sky-500/20">
              <div className="flex items-center justify-between text-sky-400 mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider">Total Eau</span>
                <Droplets className="w-4 h-4" />
              </div>
              <div className="text-lg font-black font-mono text-white">
                {formatNumber(totals.eau)}{" "}
                <span className="text-[10px] text-[#A8B4C4] font-normal">FCFA</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#162234] border border-amber-500/20">
              <div className="flex items-center justify-between text-amber-400 mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider">Total Électricité</span>
                <Zap className="w-4 h-4" />
              </div>
              <div className="text-lg font-black font-mono text-white">
                {formatNumber(totals.electricite)}{" "}
                <span className="text-[10px] text-[#A8B4C4] font-normal">FCFA</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#162234] border border-emerald-500/20">
              <div className="flex items-center justify-between text-emerald-400 mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider">Total Nettoyage</span>
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-lg font-black font-mono text-white">
                {formatNumber(totals.nettoyage)}{" "}
                <span className="text-[10px] text-[#A8B4C4] font-normal">FCFA</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#1E2E45] border border-[#C9A96E]/40">
              <div className="flex items-center justify-between text-[#C9A96E] mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider">Total Charges</span>
                <Layers className="w-4 h-4" />
              </div>
              <div className="text-lg font-black font-mono text-[#E8D5B0]">
                {formatNumber(totals.total)}{" "}
                <span className="text-[10px] text-[#A8B4C4] font-normal">FCFA</span>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-[#162234] border border-[#2A3B54] flex flex-wrap items-center gap-3 text-xs">
            {/* Filter by Tenant */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] text-[#A8B4C4] uppercase font-bold mb-1">
                Filtrer par Locataire
              </label>
              <select
                value={filterTenantId}
                onChange={(e) => setFilterTenantId(e.target.value)}
                className="w-full p-2 rounded-xl bg-[#0F1B2D] border border-[#2A3B54] text-white"
              >
                <option value="ALL">Tous les locataires ({tenants.length})</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.prenom} {t.nom} — {t.bienNom}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Category */}
            <div className="w-40 min-w-[130px]">
              <label className="block text-[10px] text-[#A8B4C4] uppercase font-bold mb-1">
                Catégorie
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full p-2 rounded-xl bg-[#0F1B2D] border border-[#2A3B54] text-white"
              >
                <option value="ALL">Toutes</option>
                <option value="Eau">Eau</option>
                <option value="Électricité">Électricité</option>
                <option value="Nettoyage">Nettoyage</option>
              </select>
            </div>

            {/* Filter by Period */}
            <div className="w-44 min-w-[140px]">
              <label className="block text-[10px] text-[#A8B4C4] uppercase font-bold mb-1">
                Période
              </label>
              <input
                type="month"
                value={filterPeriodMonth}
                onChange={(e) => setFilterPeriodMonth(e.target.value)}
                className="w-full p-2 rounded-xl bg-[#0F1B2D] border border-[#2A3B54] text-white"
              />
            </div>

            {/* Reset Filters */}
            {(filterTenantId !== "ALL" || filterCategory !== "ALL" || filterPeriodMonth) && (
              <div className="self-end pb-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setFilterTenantId("ALL");
                    setFilterCategory("ALL");
                    setFilterPeriodMonth("");
                    setSearchQuery("");
                  }}
                  className="px-3 py-2 rounded-xl bg-[#2A3B54] text-[#A8B4C4] hover:text-white"
                >
                  Réinitialiser
                </button>
              </div>
            )}
          </div>

          {/* History Table */}
          <div className="rounded-2xl bg-[#162234] border border-[#2A3B54] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-[#1A263B] text-[#A8B4C4] font-semibold uppercase tracking-wider text-[10px] border-b border-[#2A3B54]">
                    <th className="py-3 px-4">Date & Période</th>
                    <th className="py-3 px-3">Locataire & Bien</th>
                    <th className="py-3 px-3 text-center">Catégorie</th>
                    <th className="py-3 px-3">Description / Référence</th>
                    <th className="py-3 px-3 text-right">Montant</th>
                    <th className="py-3 px-3 text-center">Statut</th>
                    {canManageCharges && <th className="py-3 px-4 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A3B54]/50">
                  {filteredCharges.length === 0 ? (
                    <tr>
                      <td colSpan={canManageCharges ? 7 : 6} className="py-12 text-center text-[#A8B4C4]">
                        <Layers className="w-8 h-8 mx-auto text-[#6B7C94]/40 mb-2" />
                        <p className="font-semibold text-white">Aucune charge ponctuelle trouvée</p>
                        <p className="text-[11px] text-[#A8B4C4] mt-1">
                          {canManageCharges
                            ? "Cliquez sur 'Ajouter une charge' pour enregistrer une consommation d'eau, d'électricité ou de nettoyage."
                            : "Aucune charge enregistrée pour les filtres sélectionnés."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredCharges.map((c) => (
                      <tr key={c.id} className="hover:bg-[#1C2C44]/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">
                            {c.dateOperation ? formatDate(c.dateOperation) : "—"}
                          </div>
                          <div className="text-[10px] text-[#C9A96E] font-medium">
                            {c.periode}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-white">{c.locataireNom || "Locataire"}</div>
                          <div className="text-[10px] text-[#A8B4C4]">{c.bienNom || "Bien"}</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {getCategoryBadge(c.categorie)}
                        </td>
                        <td className="py-3 px-3 text-[#A8B4C4]">
                          {c.description || <span className="italic text-[#6B7C94]">—</span>}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-white">
                          {formatNumber(c.montant)} FCFA
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                              c.statut === "Payé"
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                : c.statut === "Partiel"
                                  ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                                  : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            }`}
                          >
                            {c.statut || "En attente"}
                          </span>
                        </td>
                        {canManageCharges && (
                          <td className="py-3 px-4 text-center">
                            {c.paymentId || c.statut === "Payé" ? (
                              <span className="text-[10px] text-[#A8B4C4]">
                                Paiement lié
                              </span>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(c)}
                                  className="p-1.5 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#C9A96E] border border-[#C9A96E]/20 transition-all cursor-pointer"
                                  title="Modifier cette charge"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(c)}
                                  className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
                                  title="Supprimer cette charge"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#C9A96E]/20 bg-[#1A263B] flex items-center justify-between text-xs text-[#A8B4C4]">
          <div className="flex items-center gap-2">
            <span>
              Total affiché : <strong className="text-white">{filteredCharges.length}</strong> opération(s)
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#0F1B2D] hover:bg-[#2A3B54] text-white font-medium transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
