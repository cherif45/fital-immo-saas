import React, { useState } from "react";
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Eye,
  Edit,
  Trash2,
  Download,
  Layers,
  Home,
  X,
} from "lucide-react";
import { Building, Unit, Owner, UserAccount } from "../types";
import { formatCurrency, formatNumber } from "../lib/utils";

interface BuildingsViewProps {
  buildings: Building[];
  units: Unit[];
  owners: Owner[];
  currentUser?: UserAccount;
  onAddBuilding: (building: Building) => void;
  onUpdateBuilding: (building: Building) => void;
  onDeleteBuilding: (buildingId: string) => void;
  onSelectBuilding?: (building: Building) => void;
}

export const BuildingsView: React.FC<BuildingsViewProps> = ({
  buildings,
  units,
  owners,
  currentUser,
  onAddBuilding,
  onUpdateBuilding,
  onDeleteBuilding,
  onSelectBuilding,
}) => {
  const [search, setSearch] = useState("");
  const [selectedBuildingForDetails, setSelectedBuildingForDetails] =
    useState<Building | null>(null);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [isNewBuildingModalOpen, setIsNewBuildingModalOpen] = useState(false);

  // Form state
  const [nom, setNom] = useState("");
  const [adresse, setAdresse] = useState("");
  const [quartier, setQuartier] = useState("");
  const [ville, setVille] = useState("Dakar");
  const [type, setType] = useState<
    | "Immeuble"
    | "Villa"
    | "Résidence"
    | "Cité"
    | "Duplex"
    | "Autre"
    | "__custom__"
  >("Immeuble");
  const [customType, setCustomType] = useState<string>("");
  const [nombreEtages, setNombreEtages] = useState(0);
  const [proprietaireId, setProprietaireId] = useState(owners[0]?.id || "");
  const [description, setDescription] = useState("");

  // 🔒 Permissions
  const role = currentUser?.role || "ADMIN";
  const canManage = ["SUPER_ADMIN", "ADMIN", "GESTIONNAIRE"].includes(role);

  // Filter buildings by role
  let displayableBuildings = buildings;
  if (role === "PROPRIETAIRE" && currentUser?.proprietaireId) {
    displayableBuildings = buildings.filter(
      (b) => b.proprietaireId === currentUser.proprietaireId,
    );
  }

  const filteredBuildings = displayableBuildings.filter((b) => {
    if (search) {
      const q = search.toLowerCase();
      return (
        b.nom.toLowerCase().includes(q) ||
        (b.adresse || "").toLowerCase().includes(q) ||
        (b.quartier || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Stats pour chaque immeuble
  const getBuildingStats = (buildingId: string) => {
    const buildingUnits = units.filter((u) => u.buildingId === buildingId);
    const occupes = buildingUnits.filter((u) => u.statut === "Occupé").length;
    const vacants = buildingUnits.filter((u) => u.statut === "Vacant").length;
    const totalLoyer = buildingUnits.reduce((sum, u) => sum + u.loyerBase, 0);
    return { total: buildingUnits.length, occupes, vacants, totalLoyer };
  };

  const getOwnerName = (ownerId: string): string => {
    const owner = owners.find((o) => o.id === ownerId);
    return owner ? `${owner.prenom} ${owner.nom}` : "Bailleur non référencé";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    // 🚨 CONTRÔLE ANTI-DOUBLON IMMEUBLE
    const immeubleExistant = buildings.find(
      (b) =>
        b.proprietaireId === proprietaireId &&
        b.nom.trim().toLowerCase() === nom.trim().toLowerCase() &&
        b.id !== editingBuilding?.id,
    );

    if (immeubleExistant) {
      alert(
        `⚠️ IMMEUBLE EN DOUBLE DÉTECTÉ\n\n` +
          `Un immeuble nommé "${nom}" existe déjà pour ce propriétaire.\n\n` +
          `Utilisez un nom différent ou modifiez l'immeuble existant.`,
      );
      return;
    }

    const effectiveType: any =
      type === "__custom__" && customType.trim() ? customType.trim() : type;
    const newBuilding: Building = {
      id: crypto.randomUUID(),
      proprietaireId,
      proprietaireNom: getOwnerName(proprietaireId),
      nom,
      adresse,
      quartier,
      ville,
      type: effectiveType,
      nombreEtages: Number(nombreEtages) || 0,
      description,
      statut: "Actif",
      dateCreation: new Date().toISOString().split("T")[0],
    };

    if (editingBuilding) {
      onUpdateBuilding({ ...newBuilding, id: editingBuilding.id });
      setEditingBuilding(null);
    } else {
      onAddBuilding(newBuilding);
    }

    // Reset
    setNom("");
    setAdresse("");
    setQuartier("");
    setCustomType("");
    setDescription("");
    setIsNewBuildingModalOpen(false);
  };

  const handleOpenEdit = (building: Building) => {
    setEditingBuilding(building);
    setNom(building.nom);
    setAdresse(building.adresse || "");
    setQuartier(building.quartier || "");
    setVille(building.ville || "Dakar");
    setType(building.type);
    setNombreEtages(building.nombreEtages);
    setProprietaireId(building.proprietaireId);
    setDescription(building.description || "");
    setIsNewBuildingModalOpen(true);
  };

  const handleDelete = (building: Building) => {
    if (!canManage) return;
    if (
      window.confirm(
        `Supprimer l'immeuble "${building.nom}" ? Toutes ses unités seront également supprimées.`,
      )
    ) {
      onDeleteBuilding(building.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#C9A96E]/15 text-[#C9A96E] flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-base font-bold text-white flex items-center gap-2">
              Immeubles & Résidences
              {role === "PROPRIETAIRE" && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Mes Immeubles
                </span>
              )}
            </div>
            <div className="text-xs text-[#A8B4C4] mt-0.5">
              {filteredBuildings.length} immeuble(s) · {units.length} espace(s)
              louable(s)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canManage && (
            <button
              onClick={() => {
                setEditingBuilding(null);
                setNom("");
                setAdresse("");
                setQuartier("");
                setDescription("");
                setIsNewBuildingModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-lg hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvel Immeuble</span>
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/15">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-[#6B7C94] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher immeuble, quartier, adresse..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-xs text-white focus:outline-none focus:border-[#C9A96E]"
          />
        </div>
      </div>

      {/* Buildings Grid */}
      {filteredBuildings.length === 0 ? (
        <div className="py-16 text-center bg-[#162133] rounded-2xl border border-[#C9A96E]/20 p-8">
          <Building2 className="w-10 h-10 mx-auto text-[#6B7C94]/50 mb-3" />
          <h3 className="text-sm font-bold text-white mb-1">Aucun immeuble</h3>
          <p className="text-xs text-[#A8B4C4] max-w-sm mx-auto">
            Créez un immeuble pour commencer la gestion multi-espaces.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBuildings.map((b) => {
            const stats = getBuildingStats(b.id);
            const ownerName = getOwnerName(b.proprietaireId);

            return (
              <div
                key={b.id}
                className="p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 hover:border-[#C9A96E]/50 transition-all shadow-xl flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1E2E45] text-[#C9A96E] border border-[#C9A96E]/20">
                        {b.type} · {b.nombreEtages} étage(s)
                      </span>
                      <h3 className="text-sm font-bold text-white mt-1.5 group-hover:text-[#C9A96E] transition-colors">
                        {b.nom}
                      </h3>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold border bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                      {b.statut}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-[#A8B4C4] my-3">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#6B7C94] flex-shrink-0" />
                      <span>
                        {b.adresse || "—"}, {b.quartier || "—"}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#1E2E45]/40 border border-[#C9A96E]/10 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[#6B7C94]">Propriétaire :</span>
                      <span className="font-semibold text-white truncate max-w-[140px]">
                        {ownerName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 border-t border-[#C9A96E]/10">
                      <span className="text-[#6B7C94] flex items-center gap-1">
                        <Layers className="w-3 h-3" /> Espaces :
                      </span>
                      <span className="font-semibold text-white">
                        {stats.total}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-emerald-400">Occupés :</span>
                      <span className="font-semibold text-emerald-300">
                        {stats.occupes}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sky-400">Vacants :</span>
                      <span className="font-semibold text-sky-300">
                        {stats.vacants}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#C9A96E]/15 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-[#6B7C94] uppercase">
                      Loyer mensuel total
                    </div>
                    <div className="text-sm font-bold text-[#C9A96E] font-mono">
                      {formatCurrency(stats.totalLoyer)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        if (onSelectBuilding) onSelectBuilding(b);
                        setSelectedBuildingForDetails(b);
                      }}
                      className="p-1.5 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Voir les espaces"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {canManage && (
                      <>
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="p-1.5 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(b)}
                          className="p-1.5 rounded-lg bg-[#1E2E45] hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal : Nouveau / Modifier Immeuble */}
      {canManage && isNewBuildingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Building2 className="w-5 h-5 text-[#C9A96E]" />
                <span>
                  {editingBuilding ? "Modifier l'Immeuble" : "Nouvel Immeuble"}
                </span>
              </div>
              <button
                onClick={() => {
                  setIsNewBuildingModalOpen(false);
                  setEditingBuilding(null);
                }}
                className="text-[#A8B4C4] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                  Nom de l'immeuble *
                </label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  placeholder="Ex: Immeuble DIALLO"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  >
                    <option value="Immeuble">Immeuble</option>
                    <option value="Villa">Villa</option>
                    <option value="Résidence">Résidence</option>
                    <option value="Cité">Cité</option>
                    <option value="Duplex">Duplex</option>
                    <option value="Autre">Autre</option>
                    <option value="__custom__">✨ Personnalisé...</option>
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
                    Nombre d'étages
                  </label>
                  <input
                    type="number"
                    value={nombreEtages}
                    onChange={(e) => setNombreEtages(Number(e.target.value))}
                    min={0}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                  Propriétaire *
                </label>
                <select
                  value={proprietaireId}
                  onChange={(e) => setProprietaireId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                >
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.prenom} {o.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={adresse}
                    onChange={(e) => setAdresse(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                    placeholder="Ex: Rue 6, Porte 12"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Quartier
                  </label>
                  <input
                    type="text"
                    value={quartier}
                    onChange={(e) => setQuartier(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                    placeholder="Ex: Fann, Almadies..."
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#C9A96E]/15 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewBuildingModalOpen(false);
                    setEditingBuilding(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#1E2E45] text-[#A8B4C4] hover:bg-[#2A3F5C] cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold shadow-lg hover:scale-105 transition-all cursor-pointer"
                >
                  {editingBuilding ? "Enregistrer" : "Créer l'Immeuble"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
