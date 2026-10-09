import React, { useState } from "react";
import {
  Building2,
  Plus,
  Search,
  Filter,
  DoorOpen,
  MapPin,
  User,
  Coins,
  CheckCircle2,
  AlertCircle,
  Wrench,
  FileText,
  Percent,
  Edit,
  Trash2,
  Eye,
  Download,
  ShieldAlert,
  ShieldCheck,
  Layers,
  Sparkles,
  X,
} from "lucide-react";
import {
  Property,
  Owner,
  PropertyType,
  PropertyStatus,
  UserAccount,
} from "../types";
import { formatCurrency, formatNumber, exportToCSV } from "../lib/utils";
import { createDocumentNumber } from "../lib/documentNumber";

interface PropertiesViewProps {
  properties: Property[];
  owners: Owner[];
  tenants?: any[];
  currentUser?: UserAccount;
  onAddProperty: (property: Property) => void;
  onUpdateProperty?: (property: Property) => void;
  onDeleteProperty?: (propertyId: string) => void;
  isNewPropertyModalOpen: boolean;
  setIsNewPropertyModalOpen: (open: boolean) => void;
}

export const PropertiesView: React.FC<PropertiesViewProps> = ({
  properties,
  owners,
  tenants = [],
  currentUser,
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty,
  isNewPropertyModalOpen,
  setIsNewPropertyModalOpen,
}) => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [selectedPropertyDetails, setSelectedPropertyDetails] =
    useState<Property | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  // Form State
  const [nom, setNom] = useState("");
  const [type, setType] = useState<PropertyType>("Appartement");
  const [customType, setCustomType] = useState<string>("");
  const [adresse, setAdresse] = useState("");
  const [quartier, setQuartier] = useState("Almadies");
  const [loyerBase, setLoyerBase] = useState<number>(350000);
  const [proprietaireId, setProprietaireId] = useState<string>(
    owners[0]?.id || "",
  );
  const [ownerSearch, setOwnerSearch] = useState<string>("");
  const [pieces, setPieces] = useState<number>(3);
  const [superficie, setSuperficie] = useState<number>(110);
  const [tauxGerance, setTauxGerance] = useState<number>(10);
  const [description, setDescription] = useState("");

  // ============================================================
  // 🔒 MATRICE DE PERMISSIONS
  // ============================================================
  const isTenant = currentUser?.role === "LOCATAIRE";
  const isOwner = currentUser?.role === "PROPRIETAIRE";
  const isCashier = currentUser?.role === "CAISSIER";
  const isAgent = currentUser?.role === "AGENT";

  // Création/modification/suppression : UNIQUEMENT ADMIN/SUPER_ADMIN/GESTIONNAIRE
  const canManageProperties = currentUser
    ? ["SUPER_ADMIN", "ADMIN", "GESTIONNAIRE"].includes(currentUser.role)
    : true;

  // 🔧 Helper : garantit qu'un nom de propriétaire est toujours affiché
  const getOwnerDisplayName = (p: Property): string => {
    if (
      p.proprietaireNom &&
      p.proprietaireNom.trim() &&
      p.proprietaireNom !== "Propriétaire"
    ) {
      return p.proprietaireNom;
    }
    const owner = owners.find((o) => o.id === p.proprietaireId);
    if (owner) return `${owner.prenom} ${owner.nom}`;
    return "Bailleur non référencé";
  };

  // 🔧 Helper : récupère le locataire actuel via le bien (lookup dans tenants)
  const getCurrentTenantName = (p: Property): string => {
    if (p.locataireActuelNom && p.locataireActuelNom.trim())
      return p.locataireActuelNom;
    // Lookup : chercher dans tenants le locataire actif sur ce bien
    const activeTenant = (tenants as any[]).find(
      (t: any) => t.bienId === p.id && !t.dateSortie,
    );
    if (activeTenant) return `${activeTenant.prenom} ${activeTenant.nom}`;
    return "";
  };

  // Filter properties based on role
  let displayableProperties = properties;
  if (isTenant && currentUser?.locataireId) {
    displayableProperties = properties.filter(
      (p) =>
        p.id === currentUser.locataireId ||
        p.locataireActuelNom
          ?.toLowerCase()
          .includes(currentUser.nom.toLowerCase()),
    );
    if (displayableProperties.length === 0) {
      displayableProperties = properties.slice(0, 1);
    }
  } else if (isOwner && currentUser?.proprietaireId) {
    displayableProperties = properties.filter(
      (p) => p.proprietaireId === currentUser.proprietaireId,
    );
  }

  const filteredProperties = displayableProperties.filter((p) => {
    if (typeFilter !== "all" && p.type !== typeFilter) return false;
    if (statusFilter !== "all" && p.statut !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.nom.toLowerCase().includes(q) ||
        p.adresse.toLowerCase().includes(q) ||
        p.quartier.toLowerCase().includes(q) ||
        p.locataireActuelNom?.toLowerCase().includes(q) ||
        p.proprietaireNom?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSubmitProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageProperties) {
      alert(
        "Accès refusé : seuls les administrateurs et gestionnaires peuvent ajouter des biens.",
      );
      return;
    }

    const owner = owners.find((o) => o.id === proprietaireId);
    if (!owner) {
      alert(
        "Impossible : aucun propriétaire sélectionné. Créez d'abord un propriétaire.",
      );
      return;
    }

    // 🚨 CONTRÔLE ANTI-DOUBLON BIEN
    const bienExistant = properties.find(
      (p) =>
        p.proprietaireId === proprietaireId &&
        p.nom.trim().toLowerCase() === nom.trim().toLowerCase() &&
        p.id !== editingProperty?.id, // Exclure le bien en cours de modification
    );

    if (bienExistant) {
      alert(
        `⚠️ BIEN EN DOUBLE DÉTECTÉ\n\n` +
          `Un bien nommé "${nom}" existe déjà pour ${owner.prenom} ${owner.nom}.\n\n` +
          `Si vous voulez modifier le bien existant, ouvrez-le et éditez-le.\n` +
          `Sinon, utilisez un nom différent.`,
      );
      return;
    }
    const effectiveType: any =
      type === "__custom__" && customType.trim() ? customType.trim() : type;
    const newProp: Property = {
      id: crypto.randomUUID(),
      ref: createDocumentNumber(undefined, "LOT-"),
      nom,
      type: effectiveType,
      adresse,
      quartier,
      ville: "Dakar",
      superficie: Number(superficie) || 100,
      nombrePieces: Number(pieces) || 3,
      pieces: Number(pieces) || 3,
      loyerBase: Number(loyerBase),
      charges: 0,
      tvaApplicable: false,
      avatar:
        effectiveType === "Villa"
          ? "🏠"
          : effectiveType === "Commerce"
            ? "🏪"
            : "🏢",
      dateCreation: new Date().toISOString().split("T")[0],
      loyerTotal: Number(loyerBase),
      statut: "Vacant",
      proprietaireId: owner.id,
      proprietaireNom: `${owner.prenom} ${owner.nom}`,
      tauxCommission: Number(tauxGerance),
      description:
        description ||
        `${effectiveType} de haut standing situé à ${quartier}, Dakar.`,
      equipements: [
        "Climatisation split",
        "Compteur Woyofal individuel",
        "Gardiennage 24/7",
        "Groupe électrogène",
      ],
    };

    onAddProperty(newProp);
    setIsNewPropertyModalOpen(false);
    setNom("");
    setAdresse("");
    setDescription("");
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty || !onUpdateProperty) return;
    if (!canManageProperties) {
      alert("Action non autorisée.");
      return;
    }
    onUpdateProperty(editingProperty);
    setEditingProperty(null);
  };

  const handleDelete = (propId: string, propNom: string) => {
    if (!canManageProperties) {
      alert("Action non autorisée.");
      return;
    }
    if (
      window.confirm(
        `Confirmez-vous l'archivage/suppression du bien "${propNom}" ?`,
      )
    ) {
      if (onDeleteProperty) {
        onDeleteProperty(propId);
      }
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "Réf",
      "Nom",
      "Type",
      "Quartier",
      "Adresse",
      "Statut",
      "Loyer (FCFA)",
      "Propriétaire",
      "Locataire Actuel",
    ];
    const rows = filteredProperties.map((p) => [
      p.ref,
      p.nom,
      p.type,
      p.quartier,
      p.adresse,
      p.statut,
      p.loyerBase,
      getOwnerDisplayName(p),
      getCurrentTenantName(p) || "Vacant",
    ]);
    exportToCSV("Parc_Immobilier_FITAL_IMMO", rows, headers);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#C9A96E]/15 text-[#C9A96E] flex items-center justify-center font-bold">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-base font-bold text-white flex items-center gap-2">
              {isTenant
                ? "Mon Logement / Résidence en Location"
                : isOwner
                  ? "Mes Biens Immobiliers"
                  : "Catalogue & Gestion du Parc Immobilier"}
              {isTenant && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Vue Locataire Sécurisée
                </span>
              )}
              {isOwner && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Vue Bailleur
                </span>
              )}
            </div>
            <div className="text-xs text-[#A8B4C4] mt-0.5">
              {filteredProperties.length} bien(s) répertorié(s) ·{" "}
              {filteredProperties.filter((p) => p.statut === "Occupé").length}{" "}
              occupé(s) ·{" "}
              {filteredProperties.filter((p) => p.statut === "Vacant").length}{" "}
              disponible(s)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] border border-[#C9A96E]/30 text-xs font-semibold text-[#E8D5B0] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter CSV</span>
          </button>

          {/* 🔒 SÉCURITÉ : Bouton masqué pour LOCATAIRE, PROPRIÉTAIRE, CAISSIER, AGENT */}
          {canManageProperties && (
            <button
              onClick={() => setIsNewPropertyModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-lg hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un Bien / Lot</span>
            </button>
          )}
        </div>
      </div>

      {/* Info Banner pour Locataire */}
      {isTenant && (
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-200 text-xs flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-purple-400 flex-shrink-0" />
          <span>
            Vous consultez la fiche technique de votre logement sous bail. La
            création, modification et suppression de biens sont strictement
            réservées aux gestionnaires et administrateurs.
          </span>
        </div>
      )}

      {/* Info Banner pour Propriétaire */}
      {isOwner && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <span>
            Vous consultez le portefeuille de vos biens sous mandat. Pour toute
            modification, contactez votre gestionnaire FITAL-IMMO.
          </span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-[#1E2E45] p-1 rounded-xl border border-[#C9A96E]/15 text-xs">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                statusFilter === "all"
                  ? "bg-[#C9A96E] text-[#0F1B2D] font-bold shadow-sm"
                  : "text-[#A8B4C4] hover:text-white"
              }`}
            >
              Tous ({displayableProperties.length})
            </button>
            <button
              onClick={() => setStatusFilter("Occupé")}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                statusFilter === "Occupé"
                  ? "bg-emerald-500 text-white font-bold shadow-sm"
                  : "text-emerald-400 hover:text-white"
              }`}
            >
              Occupés (
              {
                displayableProperties.filter((p) => p.statut === "Occupé")
                  .length
              }
              )
            </button>
            <button
              onClick={() => setStatusFilter("Vacant")}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                statusFilter === "Vacant"
                  ? "bg-sky-500 text-white font-bold shadow-sm"
                  : "text-sky-400 hover:text-white"
              }`}
            >
              Vacants (
              {
                displayableProperties.filter((p) => p.statut === "Vacant")
                  .length
              }
              )
            </button>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-xs text-white focus:outline-none focus:border-[#C9A96E]"
          >
            <option value="all">Tous les Types de biens</option>
            <option value="Studio">Studio</option>
            <option value="Chambre simple">Chambres simples</option>
            <option value="Chambre + Salle de bain">Chambres + SDB</option>
            <option value="1 Chambre + Salon">1 Ch + Salon</option>
            <option value="2 Chambres + Salon">2 Ch + Salon</option>
            <option value="3 Chambres + Salon">3 Ch + Salon</option>
            <option value="4 Chambres + Salon">4 Ch + Salon</option>
            <option value="Appartement">Appartements</option>
            <option value="Duplex">Duplex</option>
            <option value="Villa">Villas</option>
            <option value="Villa duplex">Villas duplex</option>
            <option value="Magasin">Magasins</option>
            <option value="Bureau">Bureaux</option>
            <option value="Entrepôt">Entrepôts</option>
            <option value="Terrain">Terrains</option>
            <option value="Immeuble">Immeubles entiers</option>
          </select>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-[#6B7C94] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher bien, quartier, bailleur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-xs text-white focus:outline-none focus:border-[#C9A96E]"
          />
        </div>
      </div>

      {/* Properties Grid */}
      {filteredProperties.length === 0 ? (
        <div className="py-16 text-center text-[#6B7C94] bg-[#162133] rounded-2xl border border-[#C9A96E]/20 p-8">
          <Building2 className="w-10 h-10 mx-auto text-[#6B7C94]/50 mb-3" />
          <h3 className="text-sm font-bold text-white mb-1">
            Aucun bien immobilier répertorié
          </h3>
          <p className="text-xs text-[#A8B4C4] max-w-sm mx-auto mb-4">
            {isOwner || isTenant
              ? "Aucun bien ne vous est actuellement rattaché."
              : "Enregistrez un bien, un appartement ou une villa avec son loyer de référence pour commencer la gestion locative."}
          </p>
          {canManageProperties && (
            <button
              onClick={() => setIsNewPropertyModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs cursor-pointer"
            >
              + Ajouter un premier bien
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProperties.map((p) => {
            const isOccupied = p.statut === "Occupé";
            const ownerName = getOwnerDisplayName(p);
            const tenantName = getCurrentTenantName(p);

            return (
              <div
                key={p.id}
                className="p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 hover:border-[#C9A96E]/50 transition-all shadow-xl flex flex-col justify-between group"
              >
                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1E2E45] text-[#C9A96E] border border-[#C9A96E]/20">
                        {p.ref} · {p.type}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-1.5 group-hover:text-[#C9A96E] transition-colors">
                        {p.nom}
                      </h3>
                    </div>
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border ${
                        isOccupied
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : p.statut === "Vacant"
                            ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
                            : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      }`}
                    >
                      {p.statut}
                    </span>
                  </div>

                  {/* Location & Specs */}
                  <div className="space-y-1.5 text-xs text-[#A8B4C4] my-3">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#6B7C94] flex-shrink-0" />
                      <span>
                        {p.adresse}, {p.quartier}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[#6B7C94]">
                      <span>{p.pieces || p.nombrePieces} pièces</span>
                      <span>•</span>
                      <span>{p.superficie} m²</span>
                      <span>•</span>
                      <span>Gérance {p.tauxCommission}%</span>
                    </div>
                  </div>

                  {/* Tenant / Owner Info */}
                  <div className="p-3 rounded-xl bg-[#1E2E45]/40 border border-[#C9A96E]/10 space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[#6B7C94]">Propriétaire :</span>
                      <span className="font-semibold text-white truncate max-w-[140px]">
                        {ownerName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#6B7C94]">Locataire actif :</span>
                      <span className="font-semibold text-[#E8D5B0] truncate max-w-[140px]">
                        {tenantName || (
                          <span className="text-sky-400 font-normal">
                            Aucun (Vacant)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Price & Actions */}
                <div className="mt-4 pt-3 border-t border-[#C9A96E]/15 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-[#6B7C94] uppercase">
                      Loyer Mensuel Total
                    </div>
                    <div className="text-sm font-bold text-[#C9A96E] font-mono">
                      {formatCurrency(p.loyerBase)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedPropertyDetails(p)}
                      className="p-1.5 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Voir la fiche détaillée"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* 🔒 Boutons Modifier/Supprimer : UNIQUEMENT ADMIN/GESTIONNAIRE */}
                    {canManageProperties && (
                      <>
                        <button
                          onClick={() => setEditingProperty(p)}
                          className="p-1.5 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
                          title="Modifier le bien"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.nom)}
                          className="p-1.5 rounded-lg bg-[#1E2E45] hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                          title="Archiver / Supprimer"
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

      {/* MODAL : FICHE DÉTAILLÉE DU BIEN */}
      {selectedPropertyDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#C9A96E]/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/15 text-[#C9A96E] flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {selectedPropertyDetails.nom}
                  </h2>
                  <p className="text-xs text-[#A8B4C4]">
                    Réf : {selectedPropertyDetails.ref} ·{" "}
                    {selectedPropertyDetails.type}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPropertyDetails(null)}
                className="text-slate-400 hover:text-white p-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-[#1E2E45]/60 rounded-xl border border-white/5">
                <span className="text-slate-400 block">Adresse</span>
                <strong className="text-white">
                  {selectedPropertyDetails.adresse},{" "}
                  {selectedPropertyDetails.quartier}
                </strong>
              </div>
              <div className="p-3 bg-[#1E2E45]/60 rounded-xl border border-white/5">
                <span className="text-slate-400 block">
                  Superficie & Pièces
                </span>
                <strong className="text-white">
                  {selectedPropertyDetails.superficie} m² ·{" "}
                  {selectedPropertyDetails.pieces ||
                    selectedPropertyDetails.nombrePieces}{" "}
                  pièces
                </strong>
              </div>
              <div className="p-3 bg-[#1E2E45]/60 rounded-xl border border-white/5">
                <span className="text-slate-400 block">Statut Actuel</span>
                <strong className="text-emerald-400">
                  {selectedPropertyDetails.statut}
                </strong>
              </div>
              <div className="p-3 bg-[#1E2E45]/60 rounded-xl border border-white/5">
                <span className="text-slate-400 block">Loyer de Base</span>
                <strong className="text-[#C9A96E]">
                  {formatCurrency(selectedPropertyDetails.loyerBase)}
                </strong>
              </div>
              <div className="p-3 bg-[#1E2E45]/60 rounded-xl border border-white/5">
                <span className="text-slate-400 block">Loyer Mensuel</span>
                <strong className="text-emerald-300 font-bold">
                  {formatCurrency(selectedPropertyDetails.loyerBase)}
                </strong>
              </div>
            </div>

            <div className="p-4 bg-[#1E2E45]/40 rounded-xl border border-[#C9A96E]/10 space-y-2 text-xs">
              <div className="font-bold text-[#E8D5B0]">
                Description & Prestations
              </div>
              <p className="text-slate-300 leading-relaxed">
                {selectedPropertyDetails.description ||
                  "Bien de haut standing administré par le cabinet FITAL-IMMO."}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {selectedPropertyDetails.equipements?.map((eq, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-[#0F1B2D] text-slate-300 text-[11px] border border-white/5"
                  >
                    ✓ {eq}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedPropertyDetails(null)}
                className="px-5 py-2 bg-[#1E2E45] hover:bg-[#2A3F5C] text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL : MODIFIER UN BIEN */}
      {editingProperty && canManageProperties && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#C9A96E]/20 pb-4">
              <h3 className="font-bold text-white text-base">
                Modifier les Données du Bien
              </h3>
              <button
                onClick={() => setEditingProperty(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                  Désignation du Bien
                </label>
                <input
                  type="text"
                  value={editingProperty.nom}
                  onChange={(e) =>
                    setEditingProperty({
                      ...editingProperty,
                      nom: e.target.value,
                    })
                  }
                  required
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Statut d'occupation
                  </label>
                  <select
                    value={editingProperty.statut}
                    onChange={(e) =>
                      setEditingProperty({
                        ...editingProperty,
                        statut: e.target.value as PropertyStatus,
                      })
                    }
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  >
                    <option value="Occupé">Occupé</option>
                    <option value="Vacant">Vacant</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="En litige">En litige</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Quartier
                  </label>
                  <input
                    type="text"
                    value={editingProperty.quartier}
                    onChange={(e) =>
                      setEditingProperty({
                        ...editingProperty,
                        quartier: e.target.value,
                      })
                    }
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#C9A96E] uppercase mb-1">
                    Loyer Base (FCFA)
                  </label>
                  <input
                    type="number"
                    value={editingProperty.loyerBase}
                    onChange={(e) => {
                      const base = Number(e.target.value);
                      setEditingProperty({
                        ...editingProperty,
                        loyerBase: base,
                        loyerTotal: base,
                      });
                    }}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E] text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Gérance (%)
                  </label>
                  <input
                    type="number"
                    value={editingProperty.tauxCommission}
                    onChange={(e) =>
                      setEditingProperty({
                        ...editingProperty,
                        tauxCommission: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingProperty(null)}
                  className="px-4 py-2 rounded-xl bg-[#1E2E45] text-slate-300 hover:bg-[#2A3F5C] cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold cursor-pointer"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ajouter un Nouveau Bien */}
      {canManageProperties && isNewPropertyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Building2 className="w-5 h-5 text-[#C9A96E]" />
                <span>Nouveau Bien Immobilier dans le Parc</span>
              </div>
              <button
                onClick={() => setIsNewPropertyModalOpen(false)}
                className="text-[#A8B4C4] hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSubmitProperty}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                  Nom / Désignation du Bien
                </label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white focus:outline-none focus:border-[#C9A96E]"
                  placeholder="Ex: Résidence Teranga - Apt 302"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Type de Bien
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as PropertyType)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white focus:outline-none focus:border-[#C9A96E]"
                  >
                    <optgroup label="🏠 Logements">
                      <option value="Studio">Studio</option>
                      <option value="Chambre simple">Chambre simple</option>
                      <option value="Chambre + Salle de bain">
                        Chambre + Salle de bain
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
                    <optgroup label="🏡 Villas">
                      <option value="Villa">Villa</option>
                      <option value="Villa duplex">Villa duplex</option>
                    </optgroup>
                    <optgroup label="💼 Professionnel">
                      <option value="Magasin">Magasin / Commerce</option>
                      <option value="Bureau">Bureau / Local pro</option>
                      <option value="Entrepôt">Entrepôt</option>
                    </optgroup>
                    <optgroup label="🏗️ Autres">
                      <option value="Terrain">Terrain</option>
                      <option value="Immeuble">Immeuble entier</option>
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
                    Propriétaire Mandant
                  </label>
                  <input
                    type="text"
                    value={ownerSearch}
                    onChange={(e) => setOwnerSearch(e.target.value)}
                    placeholder="🔍 Rechercher un propriétaire..."
                    className="w-full mb-2 p-2 rounded-xl bg-[#0F1B2D] border border-[#C9A96E]/30 text-white focus:outline-none focus:border-[#C9A96E] text-[11px]"
                  />
                  <select
                    value={proprietaireId}
                    onChange={(e) => setProprietaireId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white focus:outline-none focus:border-[#C9A96E]"
                  >
                    {owners
                      .filter((o) => {
                        if (!ownerSearch.trim()) return true;
                        const q = ownerSearch.toLowerCase().trim();
                        return (
                          `${o.prenom} ${o.nom}`.toLowerCase().includes(q) ||
                          (o.telephone || "").includes(q) ||
                          (o.email || "").toLowerCase().includes(q) ||
                          (o.mandatGerance || "").toLowerCase().includes(q)
                        );
                      })
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.prenom} {o.nom} ({o.mandatGerance})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Adresse complète
                  </label>
                  <input
                    type="text"
                    value={adresse}
                    onChange={(e) => setAdresse(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white focus:outline-none focus:border-[#C9A96E]"
                    placeholder="Ex: Rue 6, Porte 12"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Quartier / Zone
                  </label>
                  <input
                    type="text"
                    value={quartier}
                    onChange={(e) => setQuartier(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white focus:outline-none focus:border-[#C9A96E]"
                    placeholder="Ex: Almadies, Mermoz, Plateau..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#C9A96E] uppercase mb-1">
                    Loyer Base (FCFA)
                  </label>
                  <input
                    type="number"
                    value={loyerBase}
                    onChange={(e) => setLoyerBase(Number(e.target.value))}
                    required
                    min={1000}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E] text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Taux Gérance (%)
                  </label>
                  <input
                    type="number"
                    value={tauxGerance}
                    onChange={(e) => setTauxGerance(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Nombre de pièces
                  </label>
                  <input
                    type="number"
                    value={pieces}
                    onChange={(e) => setPieces(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Superficie (m²)
                  </label>
                  <input
                    type="number"
                    value={superficie}
                    onChange={(e) => setSuperficie(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#C9A96E]/15 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewPropertyModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1E2E45] text-[#A8B4C4] hover:bg-[#2A3F5C] cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold shadow-lg hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Enregistrer le Bien</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
