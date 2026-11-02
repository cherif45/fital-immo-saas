import React, { useState } from "react";
import {
  FileSignature,
  Plus,
  Search,
  Printer,
  Calendar,
  DollarSign,
  Building,
  User,
  CheckCircle2,
  ShieldAlert,
  Percent,
  Download,
  FileCheck,
  RotateCw,
  AlertCircle,
  X,
  Save,
  Trash2,
} from "lucide-react";
import {
  LeaseContract,
  Tenant,
  Property,
  Owner,
  UserAccount,
  Unit,
  Building as BuildingType,
  AgencySettings,
} from "../types";
import {
  formatCurrency,
  formatNumber,
  formatDate,
  exportToCSV,
} from "../lib/utils";
import { LeaseContractModal } from "./LeaseContractModal";
import { createDocumentNumber } from "../lib/documentNumber";

interface ContractsViewProps {
  contracts: LeaseContract[];
  tenants: Tenant[];
  properties: Property[];
  units?: Unit[];
  buildings?: BuildingType[];
  owners: Owner[];
  currentUser?: UserAccount;
  settings?: AgencySettings;
  onAddContract: (contract: LeaseContract) => void;
  onUpdateContract?: (contract: LeaseContract) => void;
}

// ============================================================
// Helper : Montant en lettres (français)
// ============================================================
function nombreEnLettres(n: number): string {
  if (n === 0) return "zéro";
  const unites = [
    "",
    "un",
    "deux",
    "trois",
    "quatre",
    "cinq",
    "six",
    "sept",
    "huit",
    "neuf",
  ];
  const dizaines = [
    "",
    "dix",
    "vingt",
    "trente",
    "quarante",
    "cinquante",
    "soixante",
    "soixante-dix",
    "quatre-vingt",
    "quatre-vingt-dix",
  ];
  const centaines = [
    "",
    "cent",
    "deux cent",
    "trois cent",
    "quatre cent",
    "cinq cent",
    "six cent",
    "sept cent",
    "huit cent",
    "neuf cent",
  ];

  function convert(num: number): string {
    if (num === 0) return "";
    if (num < 10) return unites[num];
    if (num < 20) {
      const speciaux = [
        "dix",
        "onze",
        "douze",
        "treize",
        "quatorze",
        "quinze",
        "seize",
        "dix-sept",
        "dix-huit",
        "dix-neuf",
      ];
      return speciaux[num - 10];
    }
    if (num < 100) {
      const d = Math.floor(num / 10);
      const u = num % 10;
      if (d === 7 || d === 9) return dizaines[d - 1] + "-" + convert(10 + u);
      if (d === 8 && u === 0) return "quatre-vingts";
      return dizaines[d] + (u > 0 ? "-" + unites[u] : "");
    }
    const c = Math.floor(num / 100);
    const r = num % 100;
    let prefix = centaines[c];
    if (c > 1 && r === 0) prefix += "s";
    return prefix + (r > 0 ? " " + convert(r) : "");
  }

  const milliards = Math.floor(n / 1000000000);
  const millions = Math.floor((n % 1000000000) / 1000000);
  const milliers = Math.floor((n % 1000000) / 1000);
  const reste = n % 1000;

  let result = "";
  if (milliards > 0)
    result +=
      convert(milliards) + " milliard" + (milliards > 1 ? "s" : "") + " ";
  if (millions > 0)
    result += convert(millions) + " million" + (millions > 1 ? "s" : "") + " ";
  if (milliers > 0)
    result += (milliers === 1 ? "mille" : convert(milliers) + " mille") + " ";
  if (reste > 0) result += convert(reste);

  return result.trim();
}

// ============================================================
// Helper : Type de pièce libellé
// ============================================================
const getPieceLabel = (typePiece?: string): string => {
  switch (typePiece) {
    case "PASSEPORT":
      return "Passeport";
    case "CARTE_CONSULAIRE":
      return "Carte Consulaire";
    case "AUTRE":
      return "Pièce";
    default:
      return "CNI";
  }
};

export const ContractsView: React.FC<ContractsViewProps> = ({
  contracts,
  tenants,
  properties,
  units = [],
  buildings = [],
  owners,
  currentUser,
  settings,
  onAddContract,
  onUpdateContract,
}) => {
  const [search, setSearch] = useState("");
  const [selectedContractForPrint, setSelectedContractForPrint] =
    useState<LeaseContract | null>(null);
  const [isNewContractModalOpen, setIsNewContractModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<LeaseContract | null>(
    null,
  );

  // ============================================================
  // NEW CONTRACT STATE (tous les champs de la capture)
  // ============================================================
  const [locataireId, setLocataireId] = useState(tenants[0]?.id || "");
  const [bienId, setBienId] = useState(properties[0]?.id || "");
  const [refLocatif, setRefLocatif] = useState(() =>
    createDocumentNumber(settings?.prefixContrat, "BAIL-"),
  );
  const [dateContrat, setDateContrat] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [debutContrat, setDebutContrat] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [refPeriode, setRefPeriode] = useState(
    new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
  );

  const [montantCaution, setMontantCaution] = useState(0);
  const [acompteCaution, setAcompteCaution] = useState(0);
  const [montantCommission, setMontantCommission] = useState(0);
  const [avanceLoyer, setAvanceLoyer] = useState(0);
  const [lb, setLb] = useState(properties[0]?.loyerBase || 0);
  const [cautionEau, setCautionEau] = useState(0);
  const [cautionElectricite, setCautionElectricite] = useState(0);
  const [tvaManuel, setTvaManuel] = useState(0);
  const [chargesDiverses, setChargesDiverses] = useState(0);
  const [typeReglement, setTypeReglement] = useState("MENSUEL");
  const [nombreMois, setNombreMois] = useState(1);

  // ============================================================
  // CALCULS AUTOMATIQUES
  // ============================================================
  const montantLocation = lb; // = LB
  const montantTOM = Math.round(lb * 0.036); // 3.6%
  const montantTVA = Math.round(lb * 0.18); // 18%
  const montantTLV = Math.round(lb * 0.025); // 2.5%
  const montantLocationLettres = nombreEnLettres(montantLocation);

  const isTenant = currentUser?.role === "LOCATAIRE";

  // ============================================================
  // HELPERS NOMS
  // ============================================================
  const getLocataireNom = (c: LeaseContract): string => {
    if (c.locataireNom && c.locataireNom.trim()) return c.locataireNom;
    const t = tenants.find((x) => x.id === c.locataireId);
    return t ? `${t.prenom} ${t.nom}` : "Locataire non référencé";
  };

  const getBienNom = (c: LeaseContract): string => {
    if (c.bienNom && c.bienNom.trim()) return c.bienNom;
    const p = properties.find((x) => x.id === c.bienId);
    if (p) return p.nom;
    const unit = units.find((x) => x.id === c.bienId);
    if (unit) {
      const building = buildings.find((x) => x.id === unit.buildingId);
      return `${unit.nom}${building?.nom ? ` — ${building.nom}` : unit.buildingNom ? ` — ${unit.buildingNom}` : ""}`;
    }
    const building = buildings.find((x) => x.id === c.bienId);
    return building?.nom || "Bien non référencé";
  };

  const getProprietaireNom = (c: LeaseContract): string => {
    if (
      c.proprietaireNom &&
      c.proprietaireNom.trim() &&
      c.proprietaireNom !== "Propriétaire"
    )
      return c.proprietaireNom;
    const o1 = owners.find((x) => x.id === c.proprietaireId);
    if (o1) return `${o1.prenom} ${o1.nom}`;
    const p = properties.find((x) => x.id === c.bienId);
    const unit = units.find((x) => x.id === c.bienId);
    const building = unit
      ? buildings.find((x) => x.id === unit.buildingId)
      : undefined;
    const proprietaireId =
      p?.proprietaireId || unit?.proprietaireId || building?.proprietaireId;
    if (proprietaireId) {
      const o2 = owners.find((x) => x.id === proprietaireId);
      if (o2) return `${o2.prenom} ${o2.nom}`;
    }
    return "Bailleur non référencé";
  };

  // ============================================================
  // FILTRES
  // ============================================================
  let displayableContracts = contracts;
  if (isTenant && currentUser?.locataireId) {
    displayableContracts = contracts.filter(
      (c) => c.locataireId === currentUser.locataireId,
    );
    if (displayableContracts.length === 0)
      displayableContracts = contracts.slice(0, 1);
  } else if (
    currentUser?.role === "PROPRIETAIRE" &&
    currentUser?.proprietaireId
  ) {
    displayableContracts = contracts.filter(
      (c) => c.proprietaireId === currentUser.proprietaireId,
    );
  }

  const filteredContracts = displayableContracts.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      return (
        c.ref.toLowerCase().includes(q) ||
        getLocataireNom(c).toLowerCase().includes(q) ||
        getBienNom(c).toLowerCase().includes(q) ||
        getProprietaireNom(c).toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ============================================================
  // HANDLERS
  // ============================================================
  const handlePropertySelect = (pId: string) => {
    setBienId(pId);
    const p = properties.find((item) => item.id === pId);
    if (p) {
      setLb(p.loyerBase || 0);
    }
  };

  const resetForm = () => {
    setLocataireId(tenants[0]?.id || "");
    setBienId(properties[0]?.id || "");
    setRefLocatif(createDocumentNumber(settings?.prefixContrat, "BAIL-"));
    setDateContrat(new Date().toISOString().split("T")[0]);
    setDebutContrat(new Date().toISOString().split("T")[0]);
    setRefPeriode(
      new Date().toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      }),
    );
    setMontantCaution(0);
    setAcompteCaution(0);
    setMontantCommission(0);
    setAvanceLoyer(0);
    setLb(properties[0]?.loyerBase || 0);
    setCautionEau(0);
    setCautionElectricite(0);
    setTvaManuel(0);
    setChargesDiverses(0);
    setTypeReglement("MENSUEL");
    setNombreMois(1);
    setEditingContract(null);
  };

  const handleCreateOrUpdateContract = (e: React.FormEvent) => {
    e.preventDefault();
    const t = tenants.find((item) => item.id === locataireId) || tenants[0];
    const p = properties.find((item) => item.id === bienId) || properties[0];
    const o =
      owners.find((owner) => owner.id === p?.proprietaireId) || owners[0];

    const contractData: LeaseContract = {
      id: editingContract?.id || crypto.randomUUID(),
      ref: refLocatif,
      locataireId: t.id,
      locataireNom: `${t.prenom} ${t.nom}`,
      bienId: p.id,
      bienNom: p.nom,
      proprietaireId: o?.id || "owner-1",
      proprietaireNom: o ? `${o.prenom} ${o.nom}` : "Propriétaire FITAL",
      typeContrat: "Habitation",
      dateDebut: debutContrat,
      dateFin: (() => {
        const d = new Date(debutContrat);
        d.setFullYear(d.getFullYear() + 1);
        return d.toISOString().split("T")[0];
      })(),
      loyerBase: lb,
      avanceLoyer: Number(montantCaution || 0),
      charges: 0, // ⚠️ Supprimé (règle client)
      tva: montantTVA,
      tom: montantTOM,
      tlv: montantTLV,
      cautionMontant: montantCaution,
      cautionMois: 1,
      fraisAdhesion: 0,
      statut: "En cours",
    };

    if (editingContract && onUpdateContract) {
      onUpdateContract(contractData);
    } else {
      onAddContract(contractData);
    }
    setIsNewContractModalOpen(false);
    resetForm();
  };

  const handleExportCSV = () => {
    const headers = [
      "Réf Contrat",
      "Locataire",
      "Bien",
      "Propriétaire",
      "Loyer Base",
      "TOM",
      "TVA",
      "TLV",
      "Caution",
      "Début",
      "Fin",
      "Statut",
    ];
    const rows = filteredContracts.map((c) => [
      c.ref,
      getLocataireNom(c),
      getBienNom(c),
      getProprietaireNom(c),
      c.loyerBase,
      c.tom,
      c.tva,
      c.tlv,
      c.cautionMontant,
      c.dateDebut,
      c.dateFin,
      c.statut,
    ]);
    exportToCSV("Contrats_Baux_FITAL_IMMO", rows, headers);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/15 text-[#C9A96E] flex items-center justify-center font-bold">
            <FileSignature className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              Contrats de Bail & Enregistrement
            </div>
            <div className="text-xs text-[#A8B4C4]">
              {displayableContracts.length} baux · Calcul auto TOM (3.6%), TVA
              (18%), TLV (2.5%)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] border border-[#C9A96E]/30 text-xs font-semibold text-[#E8D5B0] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel / CSV</span>
          </button>

          {["ADMIN", "SUPER_ADMIN", "GESTIONNAIRE"].includes(
            currentUser?.role || "",
          ) && (
            <button
              onClick={() => {
                resetForm();
                setIsNewContractModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-lg hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Contrat</span>
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/15 flex items-center justify-between gap-4">
        <div className="text-xs font-medium text-slate-300">
          Liste des baux FITAL-IMMO
        </div>
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher réf, locataire, bien..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-[#1E2E45]/80 text-[#A8B4C4] font-semibold uppercase tracking-wider text-[10px] border-b border-[#C9A96E]/20">
                <th className="py-3 px-4">Réf Contrat</th>
                <th className="py-3 px-3">Locataire</th>
                <th className="py-3 px-3">Bien</th>
                <th className="py-3 px-3">Propriétaire</th>
                <th className="py-3 px-3 text-right">Loyer Base</th>
                <th className="py-3 px-3 text-right">TOM / TVA / TLV</th>
                <th className="py-3 px-3 text-right text-sky-400">Caution</th>
                <th className="py-3 px-3">Début → Fin</th>
                <th className="py-3 px-3 text-center">Statut</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9A96E]/10">
              {filteredContracts.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-[#1E2E45]/40 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="font-mono font-bold text-white text-[11px]">
                      {c.ref}
                    </div>
                    <div className="text-[10px] text-[#C9A96E]">
                      {c.typeContrat}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-bold text-white">
                    {getLocataireNom(c)}
                  </td>
                  <td className="py-3 px-3 text-[#A8B4C4]">{getBienNom(c)}</td>
                  <td className="py-3 px-3 text-[#A8B4C4]">
                    {getProprietaireNom(c)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-white">
                    {formatNumber(c.loyerBase)}{" "}
                    <span className="text-[10px] text-[#A8B4C4]">F</span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-amber-300">
                    {formatNumber((c.tom || 0) + (c.tva || 0) + (c.tlv || 0))} F
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-sky-300">
                    {formatNumber(
                      c.cautionMontant ||
                        c.montantCaution ||
                        (c.cautionLoyer || 0) +
                          (c.cautionEau || 0) +
                          (c.cautionElectricite || 0),
                    )}{" "}
                    F
                  </td>
                  <td className="py-3 px-3 text-[11px] text-[#A8B4C4]">
                    <div>{formatDate(c.dateDebut)}</div>
                    <div className="text-[10px] text-[#6B7C94]">
                      → {formatDate(c.dateFin)}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                      {c.statut}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setSelectedContractForPrint(c)}
                      className="px-2.5 py-1 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#C9A96E] font-medium text-[11px] border border-[#C9A96E]/20 transition-all flex items-center gap-1 mx-auto cursor-pointer"
                    >
                      <Printer className="w-3 h-3" /> Imprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nouveau/Modifier Contrat */}
      {isNewContractModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#C9A96E]/20 pb-4">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <FileSignature className="w-5 h-5 text-[#C9A96E]" />
                <span>
                  {editingContract
                    ? "Modifier le Contrat"
                    : "Rédaction d'un Nouveau Contrat"}
                </span>
              </div>
              <button
                onClick={() => {
                  setIsNewContractModalOpen(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCreateOrUpdateContract}
              className="space-y-4 text-xs"
            >
              {/* BLOC 1 : Locataire */}
              <div className="p-3 rounded-xl bg-[#0F1B2D] border border-[#C9A96E]/15">
                <div className="font-bold text-[#C9A96E] text-[11px] uppercase mb-2">
                  Locataire
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                      Locataire (sélection)
                    </label>
                    <select
                      value={locataireId}
                      onChange={(e) => setLocataireId(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                    >
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.prenom} {t.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                      Ref Locataire
                    </label>
                    <input
                      type="text"
                      value={
                        tenants.find((t) => t.id === locataireId)?.ref || "—"
                      }
                      readOnly
                      className="w-full p-2.5 rounded-xl bg-[#0A111D] border border-[#C9A96E]/10 text-slate-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                      Téléphone
                    </label>
                    <input
                      type="text"
                      value={
                        tenants.find((t) => t.id === locataireId)?.telephone ||
                        "—"
                      }
                      readOnly
                      className="w-full p-2.5 rounded-xl bg-[#0A111D] border border-[#C9A96E]/10 text-slate-400 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* BLOC 2 : Bien */}
              <div className="p-3 rounded-xl bg-[#0F1B2D] border border-[#C9A96E]/15">
                <div className="font-bold text-[#C9A96E] text-[11px] uppercase mb-2">
                  Bien & Contrat
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                      Bien (sélection)
                    </label>
                    <select
                      value={bienId}
                      onChange={(e) => handlePropertySelect(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                    >
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                      Ref Locatif
                    </label>
                    <input
                      type="text"
                      value={refLocatif}
                      onChange={(e) => setRefLocatif(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                      Ref Période
                    </label>
                    <input
                      type="text"
                      value={refPeriode}
                      onChange={(e) => setRefPeriode(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                      placeholder="Septembre 2026"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                      Date Contrat
                    </label>
                    <input
                      type="date"
                      value={dateContrat}
                      onChange={(e) => setDateContrat(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                      Début Contrat
                    </label>
                    <input
                      type="date"
                      value={debutContrat}
                      onChange={(e) => setDebutContrat(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                      Type Règlement
                    </label>
                    <select
                      value={typeReglement}
                      onChange={(e) => setTypeReglement(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                    >
                      <option value="MENSUEL">MENSUEL</option>
                      <option value="TRIMESTRIEL">TRIMESTRIEL</option>
                      <option value="SEMESTRIEL">SEMESTRIEL</option>
                      <option value="ANNUEL">ANNUEL</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* BLOC 3 : Montants */}
              <div className="p-3 rounded-xl bg-[#0F1B2D] border border-[#C9A96E]/15">
                <div className="font-bold text-[#C9A96E] text-[11px] uppercase mb-2">
                  Montants (FCFA)
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#C9A96E] uppercase mb-1">
                      LB *
                    </label>
                    <input
                      type="number"
                      value={lb || ""}
                      onChange={(e) => setLb(Number(e.target.value))}
                      required
                      min={0}
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E] text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                      Montant caution
                    </label>
                    <input
                      type="number"
                      value={montantCaution || ""}
                      onChange={(e) => {
                        setMontantCaution(Number(e.target.value));
                        setAvanceLoyer(Number(e.target.value));
                      }}
                      min={0}
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                      Acompte caution
                    </label>
                    <input
                      type="number"
                      value={acompteCaution || ""}
                      onChange={(e) =>
                        setAcompteCaution(Number(e.target.value))
                      }
                      min={0}
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                      Montant commission
                    </label>
                    <input
                      type="number"
                      value={montantCommission || ""}
                      onChange={(e) =>
                        setMontantCommission(Number(e.target.value))
                      }
                      min={0}
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3 mt-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                      Avance Loyer
                    </label>
                    <input
                      type="number"
                      value={avanceLoyer || ""}
                      onChange={(e) => setAvanceLoyer(Number(e.target.value))}
                      min={0}
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                      Caution Eau
                    </label>
                    <input
                      type="number"
                      value={cautionEau || ""}
                      onChange={(e) => setCautionEau(Number(e.target.value))}
                      min={0}
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                      Caution Électricité
                    </label>
                    <input
                      type="number"
                      value={cautionElectricite || ""}
                      onChange={(e) =>
                        setCautionElectricite(Number(e.target.value))
                      }
                      min={0}
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                      Charges diverses
                    </label>
                    <input
                      type="number"
                      value={chargesDiverses || ""}
                      onChange={(e) =>
                        setChargesDiverses(Number(e.target.value))
                      }
                      min={0}
                      className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* BLOC 4 : Calculs auto */}
              <div className="p-3 rounded-xl bg-[#0F1B2D] border border-[#C9A96E]/15">
                <div className="font-bold text-[#C9A96E] text-[11px] uppercase mb-2">
                  Calculs automatiques
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                      Montant Location
                    </label>
                    <input
                      type="text"
                      value={formatNumber(montantLocation)}
                      readOnly
                      className="w-full p-2.5 rounded-xl bg-[#0A111D] border border-[#C9A96E]/10 text-amber-300 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                      Montant TOM (3.6%)
                    </label>
                    <input
                      type="text"
                      value={formatNumber(montantTOM)}
                      readOnly
                      className="w-full p-2.5 rounded-xl bg-[#0A111D] border border-[#C9A96E]/10 text-amber-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                      Montant TVA (18%)
                    </label>
                    <input
                      type="text"
                      value={formatNumber(montantTVA)}
                      readOnly
                      className="w-full p-2.5 rounded-xl bg-[#0A111D] border border-[#C9A96E]/10 text-amber-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                      Montant TLV (2.5%)
                    </label>
                    <input
                      type="text"
                      value={formatNumber(montantTLV)}
                      readOnly
                      className="w-full p-2.5 rounded-xl bg-[#0A111D] border border-[#C9A96E]/10 text-amber-300 font-mono"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Montant Location en lettres
                  </label>
                  <div className="p-2.5 rounded-xl bg-[#0A111D] border border-[#C9A96E]/10 text-amber-200 italic font-semibold">
                    {montantLocationLettres} Francs CFA
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-[#C9A96E]/15">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewContractModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 rounded-xl bg-[#1E2E45] text-slate-300 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold shadow-lg cursor-pointer flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {editingContract ? "Enregistrer" : "Créer le Contrat"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Contrat imprimable */}
      {selectedContractForPrint && (
        <LeaseContractModal
          contract={selectedContractForPrint}
          property={properties.find(
            (p) => p.id === selectedContractForPrint.bienId,
          )}
          unit={units.find((u) => u.id === selectedContractForPrint.bienId)}
          building={buildings.find(
            (b) =>
              b.id ===
              (units.find((u) => u.id === selectedContractForPrint.bienId)
                ?.buildingId || selectedContractForPrint.bienId),
          )}
          tenant={tenants.find(
            (t) => t.id === selectedContractForPrint.locataireId,
          )}
          owner={owners.find(
            (o) => o.id === selectedContractForPrint.proprietaireId,
          )}
          settings={settings}
          onClose={() => setSelectedContractForPrint(null)}
        />
      )}
    </div>
  );
};
