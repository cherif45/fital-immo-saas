import React, { useState } from "react";
import {
  Home,
  Plus,
  Search,
  Filter,
  MapPin,
  Eye,
  Edit,
  Trash2,
  Layers,
  BedDouble,
  Bath,
  Ruler,
  User,
  X,
  ChevronRight,
} from "lucide-react";
import { Building, Unit, Owner, Tenant, UserAccount } from "../types";
import { formatCurrency, formatNumber } from "../lib/utils";

interface UnitsViewProps {
  units: Unit[];
  buildings: Building[];
  owners: Owner[];
  tenants: Tenant[];
  currentUser?: UserAccount;
  onAddUnit: (unit: Unit) => void;
  onUpdateUnit: (unit: Unit) => void;
  onDeleteUnit: (unitId: string) => void;
  initialBuildingId?: string;
}

export const UnitsView: React.FC<UnitsViewProps> = ({
  units,
  buildings,
  owners,
  tenants,
  currentUser,
  onAddUnit,
  onUpdateUnit,
  onDeleteUnit,
  initialBuildingId,
}) => {
  const [search, setSearch] = useState("");
  const [buildingFilter, setBuildingFilter] = useState<string>(
    initialBuildingId || "all",
  );
  const [statutFilter, setStatutFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [isNewUnitModalOpen, setIsNewUnitModalOpen] = useState(false);

  // Form state
  const [nom, setNom] = useState("");
  const [buildingId, setBuildingId] = useState(buildings[0]?.id || "");
  const [type, setType] = useState<string>("Studio");
  const [customType, setCustomType] = useState<string>("");
  const [etage, setEtage] = useState("RDC");
  const [superficie, setSuperficie] = useState(0);
  const [nombrePieces, setNombrePieces] = useState(1);
  const [loyerBase, setLoyerBase] = useState(150000);
  const [statut, setStatut] = useState<
    "Occupé" | "Vacant" | "Maintenance" | "En litige"
  >("Vacant");
  const [locataireActuelId, setLocataireActuelId] = useState<string>("");
  const [tenantSearch, setTenantSearch] = useState<string>("");
  const [description, setDescription] = useState("");

  // 🔒 Permissions
  const role = currentUser?.role || "ADMIN";
  const canManage = ["SUPER_ADMIN", "ADMIN", "GESTIONNAIRE"].includes(role);

  // Filter by role
  let displayableUnits = units;
  if (role === "PROPRIETAIRE" && currentUser?.proprietaireId) {
    displayableUnits = units.filter(
      (u) => u.proprietaireId === currentUser.proprietaireId,
    );
  }

  const filteredUnits = displayableUnits.filter((u) => {
    if (buildingFilter !== "all" && u.buildingId !== buildingFilter)
      return false;
    if (statutFilter !== "all" && u.statut !== statutFilter) return false;
    if (typeFilter !== "all" && u.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        u.nom.toLowerCase().includes(q) ||
        (u.type || "").toLowerCase().includes(q) ||
        (u.etage || "").toLowerCase().includes(q) ||
        (u.locataireActuelNom || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getBuildingName = (id: string): string => {
    const b = buildings.find((x) => x.id === id);
    return b ? b.nom : "Immeuble non référencé";
  };

  const getOwnerName = (id: string): string => {
    const o = owners.find((x) => x.id === id);
    return o ? `${o.prenom} ${o.nom}` : "—";
  };

  const getTenantName = (unit: Unit): string => {
    if (unit.locataireActuelId) {
      const t = tenants.find((x) => x.id === unit.locataireActuelId);
      if (t) return `${t.prenom} ${t.nom}`;
    }
    return unit.locataireActuelNom || "";
  };
  // 🔧 Auto-génération du nom de l'espace
  const generateUnitName = (
    unitType: string,
    unitEtage: string,
    buildingId: string,
    currentUnits: any[],
  ): string => {
    const siblings = currentUnits.filter(
      (u: any) =>
        u.buildingId === buildingId &&
        u.type === unitType &&
        u.etage === unitEtage,
    );

    const num = siblings.length + 1;

    const typeShort: Record<string, string> = {
      Studio: "Studio",
      "Chambre simple": "Ch",
      "Chambre + Salle de bain": "Ch+SDB",
      "Chambre + Cuisine + SDB": "Ch+Cuis+SDB",
      "Chambre + Salon + Cuisine + SDB": "T1",
      "1 Chambre + Salon": "T1",
      "2 Chambres + Salon": "T2",
      "3 Chambres + Salon": "T3",
      "4 Chambres + Salon": "T4",
      Appartement: "Apt",
      Duplex: "Duplex",
      Magasin: "Mag",
      Bureau: "Bur",
      Entrepôt: "Ent",
      Terrasse: "Ter",
      Autre: "Lot",
    };

    const prefix = typeShort[unitType] || "Lot";
    const etageLabel =
      unitEtage && unitEtage !== "RDC" ? unitEtage : unitEtage || "RDC";

    return `${prefix} ${etageLabel} ${num}`.trim();
  };

  const resetForm = () => {
    setNom("");
    setBuildingId(buildings[0]?.id || "");
    setType("Appartement");
    setCustomType("");
    setEtage("RDC");
    setSuperficie(0);
    setNombrePieces(1);
    setLoyerBase(150000);
    setStatut("Vacant");
    setLocataireActuelId("");
    setTenantSearch("");
    setDescription("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    const building = buildings.find((b) => b.id === buildingId);
    if (!building) {
      alert("Impossible : sélectionnez un immeuble.");
      return;
    }

    // 🚨 CONTRÔLE ANTI-DOUBLON ESPACE
    const espaceExistant = units.find(
      (u) =>
        u.buildingId === buildingId &&
        u.nom.trim().toLowerCase() === nom.trim().toLowerCase() &&
        u.id !== editingUnit?.id,
    );

    if (espaceExistant) {
      alert(
        `⚠️ ESPACE EN DOUBLE DÉTECTÉ\n\n` +
          `Un espace nommé "${nom}" existe déjà dans cet immeuble.\n\n` +
          `Utilisez un nom différent ou modifiez l'espace existant.`,
      );
      return;
    }

    const tenant = tenants.find((t) => t.id === locataireActuelId);
    const effectiveType: any =
      type === "__custom__" && customType.trim() ? customType.trim() : type;
    const newUnit: Unit = {
      id: editingUnit?.id || crypto.randomUUID(),
      buildingId,
      buildingNom: building.nom,
      proprietaireId: building.proprietaireId,
      proprietaireNom: getOwnerName(building.proprietaireId),
      nom,
      type: effectiveType,
      etage,
      superficie: Number(superficie) || 0,
      nombrePieces: Number(nombrePieces) || 1,
      loyerBase: Number(loyerBase) || 0,
      charges: 0,
      statut,
      locataireActuelId: locataireActuelId || undefined,
      locataireActuelNom: tenant ? `${tenant.prenom} ${tenant.nom}` : undefined,
      description,
      dateCreation: new Date().toISOString().split("T")[0],
    };

    if (editingUnit) {
      onUpdateUnit(newUnit);
      setEditingUnit(null);
    } else {
      onAddUnit(newUnit);
    }

    resetForm();
    setIsNewUnitModalOpen(false);
  };

  const handleOpenEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setNom(unit.nom);
    setBuildingId(unit.buildingId);
    setType(unit.type);
    setEtage(unit.etage || "RDC");
    setSuperficie(unit.superficie || 0);
    setNombrePieces(unit.nombrePieces || 1);
    setLoyerBase(unit.loyerBase || 0);
    setStatut(unit.statut);
    setLocataireActuelId(unit.locataireActuelId || "");
    setDescription(unit.description || "");
    setIsNewUnitModalOpen(true);
  };

  const handleDelete = (unit: Unit) => {
    if (!canManage) return;
    if (window.confirm(`Supprimer l'espace "${unit.nom}" ?`)) {
      onDeleteUnit(unit.id);
    }
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case "Occupé":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "Vacant":
        return "bg-sky-500/20 text-sky-300 border-sky-500/30";
      case "Maintenance":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "En litige":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#C9A96E]/15 text-[#C9A96E] flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-base font-bold text-white flex items-center gap-2">
              Espaces Louables
              {role === "PROPRIETAIRE" && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Mes Espaces
                </span>
              )}
            </div>
            <div className="text-xs text-[#A8B4C4] mt-0.5">
              {filteredUnits.length} espace(s) ·{" "}
              {filteredUnits.filter((u) => u.statut === "Occupé").length}{" "}
              occupé(s) ·{" "}
              {filteredUnits.filter((u) => u.statut === "Vacant").length}{" "}
              vacant(s)
            </div>
          </div>
        </div>

        {canManage && (
          <button
            onClick={() => {
              resetForm();
              setEditingUnit(null);
              setIsNewUnitModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-lg hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvel Espace</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-xs text-white focus:outline-none"
          >
            <option value="all">Tous les immeubles ({buildings.length})</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nom}
              </option>
            ))}
          </select>

          <select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-xs text-white focus:outline-none"
          >
            <option value="all">Tous les statuts</option>
            <option value="Occupé">Occupés</option>
            <option value="Vacant">Vacants</option>
            <option value="Maintenance">Maintenance</option>
            <option value="En litige">En litige</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-xs text-white focus:outline-none"
          >
            <option value="all">Tous les types</option>
            <option value="Studio">Studios</option>
            <option value="Chambre simple">Chambres simples</option>
            <option value="Chambre + Salle de bain">Chambres + SDB</option>
            <option value="1 Chambre + Salon">1 Ch + Salon</option>
            <option value="2 Chambres + Salon">2 Ch + Salon</option>
            <option value="3 Chambres + Salon">3 Ch + Salon</option>
            <option value="Appartement">Appartements</option>
            <option value="Duplex">Duplex</option>
            <option value="Magasin">Magasins</option>
            <option value="Bureau">Bureaux</option>
            <option value="Terrasse">Terrasses</option>
            <option value="Entrepôt">Entrepôts</option>
          </select>
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

      {/* Units Table */}
      <div className="rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-[#1E2E45]/80 text-[#A8B4C4] font-semibold uppercase tracking-wider text-[10px] border-b border-[#C9A96E]/20">
                <th className="py-3 px-4">Espace</th>
                <th className="py-3 px-3">Immeuble</th>
                <th className="py-3 px-3">Type / Étage</th>
                <th className="py-3 px-3">Locataire actuel</th>
                <th className="py-3 px-3 text-right">Loyer + Charges</th>
                <th className="py-3 px-3 text-center">Statut</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9A96E]/10">
              {filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B7C94]">
                    <Layers className="w-8 h-8 mx-auto text-[#6B7C94]/50 mb-2" />
                    <p className="text-xs font-semibold text-white">
                      Aucun espace louable
                    </p>
                    <p className="text-[11px] text-[#6B7C94] mt-1">
                      Créez un espace dans un immeuble pour commencer.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUnits.map((u) => {
                  const tenantName = getTenantName(u);
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-[#1E2E45]/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{u.nom}</div>
                        <div className="text-[10px] text-[#6B7C94]">
                          {u.superficie} m² · {u.nombrePieces} pièce(s)
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-[#E8D5B0] truncate max-w-[180px]">
                          {u.buildingNom || getBuildingName(u.buildingId)}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#1E2E45] text-[#C9A96E] border border-[#C9A96E]/20 font-medium">
                          {u.type}
                        </span>
                        <div className="text-[10px] text-[#6B7C94] mt-0.5">
                          {u.etage || "—"}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {tenantName ? (
                          <span className="font-semibold text-[#E8D5B0]">
                            {tenantName}
                          </span>
                        ) : (
                          <span className="text-sky-400 text-[11px] italic">
                            Aucun (Vacant)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-white">
                        {formatNumber(u.loyerBase)}{" "}
                        <span className="text-[10px] text-[#C9A96E]">FCFA</span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${getStatusColor(u.statut)}`}
                        >
                          {u.statut}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {canManage && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(u)}
                                className="p-1.5 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
                                title="Modifier"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(u)}
                                className="p-1.5 rounded-lg bg-[#1E2E45] hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
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

      {/* Modal : Nouvel Espace / Modifier */}
      {canManage && isNewUnitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Layers className="w-5 h-5 text-[#C9A96E]" />
                <span>
                  {editingUnit ? "Modifier l'Espace" : "Nouvel Espace Louable"}
                </span>
              </div>
              <button
                onClick={() => {
                  setIsNewUnitModalOpen(false);
                  setEditingUnit(null);
                  resetForm();
                }}
                className="text-[#A8B4C4] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Immeuble parent *
                  </label>
                  <select
                    value={buildingId}
                    onChange={(e) => setBuildingId(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  >
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Nom de l'espace *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                      placeholder="Ex: Apt 2e 1"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const generated = generateUnitName(
                          type,
                          etage,
                          buildingId,
                          units,
                        );
                        setNom(generated);
                      }}
                      className="px-3 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] border border-[#C9A96E]/30 text-[#C9A96E] font-semibold text-[11px] whitespace-nowrap cursor-pointer flex items-center gap-1"
                      title="Générer automatiquement un nom unique"
                    >
                      🎲 Auto
                    </button>
                  </div>
                  <p className="text-[10px] text-[#6B7C94] mt-1">
                    Cliquez sur "Auto" pour générer un nom unique basé sur le
                    type et l'étage
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Type *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  >
                    <optgroup label="🏠 Logements">
                      <option value="Studio">Studio</option>
                      <option value="Chambre simple">Chambre simple</option>
                      <option value="Chambre + Salle de bain">
                        Chambre + SDB
                      </option>
                      <option value="Chambre + Cuisine + SDB">
                        Chambre + Cuisine + SDB
                      </option>
                      <option value="Chambre + Salon + Cuisine + SDB">
                        Chambre + Salon + Cuisine + SDB
                      </option>
                      <option value="1 Chambre + Salon">
                        1 Chambre + Salon
                      </option>
                      <option value="2 Chambres + Salon">
                        2 Chambres + Salon
                      </option>
                      <option value="3 Chambres + Salon">
                        3 Chambres + Salon
                      </option>
                      <option value="4 Chambres + Salon">
                        4 Chambres + Salon
                      </option>
                      <option value="Appartement">Appartement</option>
                      <option value="Duplex">Duplex</option>
                    </optgroup>
                    <optgroup label="💼 Professionnel">
                      <option value="Magasin">Magasin</option>
                      <option value="Bureau">Bureau</option>
                      <option value="Entrepôt">Entrepôt</option>
                    </optgroup>
                    <optgroup label="🏗️ Autres">
                      <option value="Terrasse">Terrasse</option>
                      <option value="Autre">Autre</option>
                      <option value="__custom__">✨ Personnalisé...</option>
                    </optgroup>
                  </select>
                  {type === "__custom__" && (
                    <input
                      type="text"
                      value={customType}
                      onChange={(e) => setCustomType(e.target.value)}
                      placeholder="Entrez le type personnalisé..."
                      className="w-full mt-2 p-2.5 rounded-xl bg-[#0F1B2D] border border-[#C9A96E]/40 text-white focus:outline-none focus:border-[#C9A96E] text-[11px]"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Étage
                  </label>
                  <select
                    value={etage}
                    onChange={(e) => setEtage(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  >
                    <option value="">— Choisir —</option>
                    <option value="Sous-sol">Sous-sol</option>
                    <option value="RDC">RDC (Rez-de-chaussée)</option>
                    {(() => {
                      const selectedBuilding = buildings.find(
                        (b) => b.id === buildingId,
                      );
                      const maxEtages = selectedBuilding?.nombreEtages || 5;
                      const options = [];
                      for (let i = 1; i <= maxEtages; i++) {
                        const suffix = i === 1 ? "er" : "e";
                        options.push(
                          <option key={i} value={`${i}${suffix}`}>
                            {i}
                            {suffix} étage
                          </option>,
                        );
                      }
                      return options;
                    })()}
                    <option value="Toit-terrasse">Toit-terrasse</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Superficie (m²)
                  </label>
                  <input
                    type="number"
                    value={superficie}
                    onChange={(e) => setSuperficie(Number(e.target.value))}
                    min={0}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Nombre de pièces
                  </label>
                  <input
                    type="number"
                    value={nombrePieces}
                    onChange={(e) => setNombrePieces(Number(e.target.value))}
                    min={1}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#C9A96E] uppercase mb-1">
                  Loyer Mensuel (FCFA) *
                </label>
                <input
                  type="number"
                  value={loyerBase}
                  onChange={(e) => setLoyerBase(Number(e.target.value))}
                  required
                  min={0}
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E] text-white font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Statut *
                  </label>
                  <select
                    value={statut}
                    onChange={(e) => setStatut(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  >
                    <option value="Vacant">Vacant</option>
                    <option value="Occupé">Occupé</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="En litige">En litige</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Locataire actuel
                  </label>
                  <input
                    type="text"
                    value={tenantSearch}
                    onChange={(e) => setTenantSearch(e.target.value)}
                    placeholder="🔍 Rechercher un locataire..."
                    className="w-full mb-2 p-2 rounded-xl bg-[#0F1B2D] border border-[#C9A96E]/30 text-white focus:outline-none focus:border-[#C9A96E] text-[11px]"
                  />
                  <select
                    value={locataireActuelId}
                    onChange={(e) => setLocataireActuelId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  >
                    <option value="">— Aucun —</option>
                    {tenants
                      .filter((t) => {
                        if (!tenantSearch.trim()) return true;
                        const q = tenantSearch.toLowerCase().trim();
                        return (
                          `${t.prenom} ${t.nom}`.toLowerCase().includes(q) ||
                          (t.telephone || "").includes(q) ||
                          (t.email || "").toLowerCase().includes(q) ||
                          (t.cni || "").toLowerCase().includes(q)
                        );
                      })
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.prenom} {t.nom}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  placeholder="Ex: Appartement 3 chambres, cuisine équipée..."
                />
              </div>

              <div className="pt-4 border-t border-[#C9A96E]/15 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewUnitModalOpen(false);
                    setEditingUnit(null);
                    resetForm();
                  }}
                  className="px-4 py-2 rounded-xl bg-[#1E2E45] text-[#A8B4C4] hover:bg-[#2A3F5C] cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold shadow-lg hover:scale-105 transition-all cursor-pointer"
                >
                  {editingUnit ? "Enregistrer" : "Créer l'Espace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
