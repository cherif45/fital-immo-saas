import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  Plus,
  Search,
  Download,
  Printer,
  CheckCircle2,
  DollarSign,
  Building,
  User,
  Calendar,
  X,
  Eye,
  Wrench,
  Trash2,
  PlusCircle,
  Coins,
  ShieldCheck,
  Phone,
  HardHat,
  Receipt,
} from "lucide-react";
import {
  Invoice,
  Property,
  Owner,
  Tenant,
  InvoiceMaterialItem,
  AgencySettings,
} from "../types";
import {
  formatCurrencyFCFA,
  numberToWordsFrench,
} from "../lib/calculations/financial";
import { formatNumber, formatDate } from "../lib/utils";
import { PrintFooter, PrintHeader } from "./PrintHeader";

interface InvoicesViewProps {
  invoices: Invoice[];
  properties: Property[];
  owners: Owner[];
  tenants: Tenant[];
  settings: AgencySettings | null;
  onAddInvoice: (newInvoice: Invoice) => Promise<void>;
}

export function InvoicesView({
  invoices,
  properties,
  owners,
  tenants,
  settings,
  onAddInvoice,
}: InvoicesViewProps) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTravauxModalOpen, setIsTravauxModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Standard Invoice Form State
  const [type, setType] = useState<
    "Adhésion" | "Travaux" | "Frais de dossier" | "Autre"
  >("Adhésion");
  const [targetOwnerId, setTargetOwnerId] = useState(owners[0]?.id || "");
  const [targetBienNom, setTargetBienNom] = useState(properties[0]?.nom || "");
  const [description, setDescription] = useState(
    "Frais d'adhésion & mandat de gestion locative",
  );
  const [montantHT, setMontantHT] = useState(150000);
  const [tvaApplicable, setTvaApplicable] = useState(true);
  const [notes, setNotes] = useState("Mandat de gérance exclusif");

  // Travaux & Réparations Form State
  const [travauxBienId, setTravauxBienId] = useState(properties[0]?.id || "");
  const [travauxNature, setTravauxNature] = useState("Plomberie & Sanitaire");
  const [travauxDescription, setTravauxDescription] = useState(
    "Remplacement robinetterie et réparation fuite d'eau",
  );
  const [prestataireNom, setPrestataireNom] = useState(
    "Plomberie Moderne Dakar (M. Diop)",
  );
  const [prestataireContact, setPrestataireContact] =
    useState("+221 77 654 32 10");
  const [dateTravaux, setDateTravaux] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [mainOeuvre, setMainOeuvre] = useState<number>(35000);
  const [travauxTva, setTravauxTva] = useState(false);
  const [decaisserSurProprietaire, setDecaisserSurProprietaire] =
    useState(true);

  // Matériels & Fournitures achetés dynamiques
  const [materiels, setMateriels] = useState<InvoiceMaterialItem[]>([
    {
      id: "mat-1",
      designation: "Robinet mitigeur lavabo chromé haute qualité",
      quantite: 1,
      prixUnitaire: 25000,
      total: 25000,
    },
    {
      id: "mat-2",
      designation: "Flexible d'alimentation tressé 3/8 inox (la paire)",
      quantite: 2,
      prixUnitaire: 6000,
      total: 12000,
    },
    {
      id: "mat-3",
      designation: "Siphon PVC & bande téflon étanchéité",
      quantite: 1,
      prixUnitaire: 5000,
      total: 5000,
    },
  ]);

  // Dynamic linking: find corresponding tenant and owner for selected property
  const selectedProperty =
    properties.find((p) => p.id === travauxBienId) || properties[0];
  const associatedTenant =
    tenants.find((t) => t.bienId === selectedProperty?.id) ||
    tenants.find((t) => t.bienNom === selectedProperty?.nom);
  const associatedOwner =
    owners.find((o) => o.id === selectedProperty?.proprietaireId) || owners[0];

  const handleAddMaterialRow = () => {
    const newItem: InvoiceMaterialItem = {
      id: `mat-${Date.now()}`,
      designation: "",
      quantite: 1,
      prixUnitaire: 0,
      total: 0,
    };
    setMateriels([...materiels, newItem]);
  };

  const handleUpdateMaterialRow = (
    id: string,
    field: keyof InvoiceMaterialItem,
    value: any,
  ) => {
    setMateriels(
      materiels.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === "quantite" || field === "prixUnitaire") {
            const q = field === "quantite" ? Number(value) : item.quantite;
            const p =
              field === "prixUnitaire" ? Number(value) : item.prixUnitaire;
            updated.total = (q || 0) * (p || 0);
          }
          return updated;
        }
        return item;
      }),
    );
  };

  const handleRemoveMaterialRow = (id: string) => {
    if (materiels.length > 1) {
      setMateriels(materiels.filter((m) => m.id !== id));
    }
  };

  const totalMateriels = materiels.reduce((sum, m) => sum + (m.total || 0), 0);
  const sousTotalTravaux = totalMateriels + (Number(mainOeuvre) || 0);
  const taxesTravaux = travauxTva ? Math.round(sousTotalTravaux * 0.18) : 0;
  const totalGeneralTravaux = sousTotalTravaux + taxesTravaux;

  const filteredInvoices = invoices.filter((inv) => {
    const matchSearch =
      inv.ref.toLowerCase().includes(search.toLowerCase()) ||
      (inv.proprietaireNom || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (inv.bienNom || "").toLowerCase().includes(search.toLowerCase()) ||
      (inv.locataireNom || "").toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || inv.type === filterType;
    return matchSearch && matchType;
  });

  const handleCreateStandardInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    const owner = owners.find((o) => o.id === targetOwnerId);
    const taxes = tvaApplicable ? Math.round(montantHT * 0.18) : 0;
    const total = montantHT + taxes;

    setIsSaving(true);
    setSaveError(null);
    const newInv: Invoice = {
      id: crypto.randomUUID(),
      ref: `FAC-${Date.now()}-${crypto.randomUUID().slice(0, 12).toUpperCase()}`,
      type,
      proprietaireId: owner?.id,
      proprietaireNom: owner ? `${owner.prenom} ${owner.nom}` : "Propriétaire",
      bienNom: targetBienNom,
      dateFacture: new Date().toISOString().split("T")[0],
      dateEcheance: new Date(Date.now() + 15 * 86400000)
        .toISOString()
        .split("T")[0],
      sousTotal: montantHT,
      taxes,
      total,
      statut: "Émise",
      lignes: [
        {
          id: `line-${Date.now()}`,
          description,
          quantite: 1,
          prixUnitaire: montantHT,
          montant: montantHT,
        },
      ],
      notes,
    };

    try {
      await onAddInvoice(newInv);
      setIsModalOpen(false);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer la facture.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateTravauxInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!selectedProperty || !associatedOwner) return;

    setIsSaving(true);
    setSaveError(null);
    const newTravauxInv: Invoice = {
      id: crypto.randomUUID(),
      ref: `FAC-TRV-${Date.now()}-${crypto.randomUUID().slice(0, 12).toUpperCase()}`,
      type: "Travaux",
      proprietaireId: associatedOwner.id,
      proprietaireNom: `${associatedOwner.prenom} ${associatedOwner.nom}`,
      locataireId: associatedTenant?.id,
      locataireNom: associatedTenant
        ? `${associatedTenant.prenom} ${associatedTenant.nom}`
        : "Locataire occupant",
      bienId: selectedProperty.id,
      bienNom: selectedProperty.nom,
      natureTravaux: travauxNature,
      materiels: materiels.filter((m) => m.designation.trim() !== ""),
      mainOeuvre: Number(mainOeuvre) || 0,
      prestataireNom,
      prestataireContact,
      decaisserSurProprietaire,
      statutDecaissement: decaisserSurProprietaire ? "Décaissé" : "Non imputé",
      dateFacture: dateTravaux,
      dateEcheance: dateTravaux,
      sousTotal: sousTotalTravaux,
      taxes: taxesTravaux,
      total: totalGeneralTravaux,
      statut: "Payée",
      lignes: [
        ...materiels.map((m) => ({
          id: m.id,
          description: `Fourniture : ${m.designation}`,
          quantite: m.quantite,
          prixUnitaire: m.prixUnitaire,
          montant: m.total,
        })),
        {
          id: `line-mo-${Date.now()}`,
          description: `Main d'Å“uvre & Intervention : ${prestataireNom}`,
          quantite: 1,
          prixUnitaire: Number(mainOeuvre) || 0,
          montant: Number(mainOeuvre) || 0,
        },
      ],
      notes: `Intervention de travaux chez ${associatedTenant ? `${associatedTenant.prenom} ${associatedTenant.nom}` : "le locataire"}. Imputation comptable sur le bulletin de versement du propriétaire ${associatedOwner.prenom} ${associatedOwner.nom}.`,
    };

    try {
      await onAddInvoice(newTravauxInv);
      setIsTravauxModalOpen(false);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer la facture de travaux.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2A3447] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#F0EDE8] tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-[#C9A96E]" />
            Facturation & Décaissements Travaux
          </h1>
          <p className="text-sm text-[#A0AEC0] mt-1">
            Décompte des fournitures achetées, facturation des réparations
            locatives et décaissement automatique sur les bulletins
            propriétaires.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsTravauxModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-amber-900/20 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Wrench className="w-4 h-4" />
            <span>Facture Travaux (Décaissement Propriétaire)</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#E8D5B0] border border-[#C9A96E]/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4 text-[#C9A96E]" />
            <span>Facture Mandat / Autre</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A0AEC0]" />
          <input
            type="text"
            placeholder="Rechercher par référence (FAC-...), propriétaire, bien ou locataire..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#141E30] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] placeholder-[#64748B] focus:border-[#C9A96E] focus:outline-none"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3.5 py-2.5 bg-[#141E30] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none w-full sm:w-auto"
        >
          <option value="all">Tous les types de facture</option>
          <option value="Travaux">Factures de Travaux & Matériels</option>
          <option value="Adhésion">Factures d'Adhésion Mandat</option>
          <option value="Frais de dossier">Frais de Dossier</option>
        </select>
      </div>

      {/* Invoices Table */}
      <div className="bg-[#141E30]/90 border border-[#2A3447] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0A111D] text-xs uppercase font-semibold text-[#A0AEC0] border-b border-[#2A3447]">
              <tr>
                <th className="py-3.5 px-4">Référence</th>
                <th className="py-3.5 px-4">Type / Prestation</th>
                <th className="py-3.5 px-4">Bien & Locataire</th>
                <th className="py-3.5 px-4">Propriétaire Mandant</th>
                <th className="py-3.5 px-4 text-right">Montant Total</th>
                <th className="py-3.5 px-4 text-center">Décaissement</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A3447]/60 text-xs">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#A0AEC0]">
                    Aucune facture trouvée.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isTravaux = inv.type === "Travaux";
                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-[#1A263B]/60 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        <div>{inv.ref}</div>
                        <div className="text-[10px] text-[#6B7C94] font-normal">
                          {inv.dateFacture}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            isTravaux
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                              : "bg-sky-500/20 text-sky-300 border-sky-500/30"
                          }`}
                        >
                          {isTravaux && <Wrench className="w-3 h-3" />}
                          {inv.type}
                        </span>
                        <div className="text-[11px] text-[#E8D5B0] mt-1 font-medium truncate max-w-[200px]">
                          {inv.natureTravaux || inv.lignes[0]?.description}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">
                          {inv.bienNom || "—"}
                        </div>
                        <div className="text-[10px] text-[#A8B4C4]">
                          {inv.locataireNom
                            ? `Locataire : ${inv.locataireNom}`
                            : "Sans locataire désigné"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#E8D5B0]">
                          {inv.proprietaireNom || "—"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-sm text-[#C9A96E]">
                        {formatNumber(inv.total)} FCFA
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isTravaux && inv.decaisserSurProprietaire !== false ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            - Décaissé Bulletin
                          </span>
                        ) : (
                          <span className="text-[#6B7C94] text-[10px] font-medium">
                            "”
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#C9A96E] font-medium border border-[#C9A96E]/20 transition-all flex items-center gap-1 mx-auto"
                          title="Imprimer ou consulter la facture"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Imprimer</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: FACTURE DE TRAVAUX & DÉCAISSEMENT PROPRIÉTAIRE */}
      {isTravauxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#162133] border border-[#C9A96E]/40 rounded-3xl w-full max-w-3xl max-h-[94vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/90 sticky top-0 z-10">
              <div className="flex items-center gap-2.5 text-white font-bold text-sm">
                <Wrench className="w-5 h-5 text-amber-400" />
                <div>
                  <div>Facture de Travaux & Réparations Locatives</div>
                  <div className="text-[10px] text-[#A8B4C4] font-normal">
                    Décompte des fournitures achetées et imputation automatique
                    sur le bulletin propriétaire
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsTravauxModalOpen(false)}
                className="text-[#A8B4C4] hover:text-white p-1 rounded-lg"
              >
                âœ•
              </button>
            </div>

            <form
              onSubmit={handleCreateTravauxInvoice}
              className="p-6 space-y-5 text-xs"
            >
              {/* Bien, Locataire & Propriétaire Card */}
              <div className="p-4 rounded-2xl bg-[#1E2E45]/50 border border-[#C9A96E]/20 space-y-3">
                <div className="text-[11px] font-bold text-[#E8D5B0] uppercase flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-[#C9A96E]" />
                  <span>1. Localisation des Travaux & Imputation</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#A8B4C4] uppercase mb-1">
                      Bien Immobilier *
                    </label>
                    <select
                      value={travauxBienId}
                      onChange={(e) => setTravauxBienId(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl bg-[#0F1B2D] border border-[#C9A96E]/30 text-white font-semibold"
                    >
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nom} ({p.quartier})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#A8B4C4] uppercase mb-1">
                      Locataire Bénéficiaire
                    </label>
                    <div className="p-2.5 rounded-xl bg-[#0F1B2D] border border-[#C9A96E]/20 text-white truncate font-medium">
                      {associatedTenant
                        ? `${associatedTenant.prenom} ${associatedTenant.nom}`
                        : "Logement vacant"}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#A8B4C4] uppercase mb-1">
                      Propriétaire Imputé (Décaissement)
                    </label>
                    <div className="p-2.5 rounded-xl bg-[#0F1B2D] border border-[#C9A96E]/20 text-[#C9A96E] truncate font-bold">
                      {associatedOwner
                        ? `${associatedOwner.prenom} ${associatedOwner.nom}`
                        : "Propriétaire"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Nature des Travaux et Artisan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Corps d'État / Nature des Travaux *
                  </label>
                  <select
                    value={travauxNature}
                    onChange={(e) => setTravauxNature(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  >
                    <option value="Plomberie & Sanitaire">
                      Plomberie & Sanitaire
                    </option>
                    <option value="Électricité & Éclairage">
                      Électricité & Éclairage
                    </option>
                    <option value="Climatisation & Froid">
                      Climatisation & Froid
                    </option>
                    <option value="Serrurerie & Sécurité">
                      Serrurerie & Sécurité
                    </option>
                    <option value="Menuiserie & Vitrerie">
                      Menuiserie & Vitrerie
                    </option>
                    <option value="Peinture & Rafraîchissement">
                      Peinture & Rafraîchissement
                    </option>
                    <option value="Maçonnerie & Carrelage">
                      Maçonnerie & Carrelage
                    </option>
                    <option value="Étanchéité & Toiture">
                      Étanchéité & Toiture
                    </option>
                    <option value="Autre intervention">
                      Autre intervention technique
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Date d'Intervention / Achat *
                  </label>
                  <input
                    type="date"
                    value={dateTravaux}
                    onChange={(e) => setDateTravaux(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Artisan / Prestataire intervenant
                  </label>
                  <input
                    type="text"
                    value={prestataireNom}
                    onChange={(e) => setPrestataireNom(e.target.value)}
                    placeholder="Ex: Entreprise Diallo BTP, Électricien Sow..."
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Téléphone Artisan
                  </label>
                  <input
                    type="text"
                    value={prestataireContact}
                    onChange={(e) => setPrestataireContact(e.target.value)}
                    placeholder="+221 77 ..."
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Motif / Description des travaux réalisés *
                  </label>
                  <input
                    type="text"
                    value={travauxDescription}
                    onChange={(e) => setTravauxDescription(e.target.value)}
                    required
                    placeholder="Ex: Fuite sous évier cuisine, remplacement mitigeur et réfection des tuyaux souples"
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  />
                </div>
              </div>

              {/* Dynamic Materials & Supplies Breakdown */}
              <div className="p-4 rounded-2xl bg-[#1E2E45]/40 border border-[#C9A96E]/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-[#E8D5B0] uppercase flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-[#C9A96E]" />
                    <span>2. Matériels, Pièces & Fournitures Achetés</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMaterialRow}
                    className="px-3 py-1 rounded-lg bg-[#C9A96E]/20 hover:bg-[#C9A96E]/30 text-[#E8D5B0] text-xs font-semibold flex items-center gap-1 transition-colors border border-[#C9A96E]/30"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter une fourniture</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {materiels.map((m, idx) => (
                    <div
                      key={m.id}
                      className="grid grid-cols-12 gap-2 items-center bg-[#0F1B2D]/80 p-2.5 rounded-xl border border-[#C9A96E]/15"
                    >
                      <div className="col-span-6">
                        <label className="block text-[9px] text-[#A8B4C4] uppercase mb-0.5">
                          Désignation du matériel {idx + 1}
                        </label>
                        <input
                          type="text"
                          value={m.designation}
                          onChange={(e) =>
                            handleUpdateMaterialRow(
                              m.id,
                              "designation",
                              e.target.value,
                            )
                          }
                          required
                          placeholder="Ex: Robinet mitigeur, Tuyau PVC, Disjoncteur..."
                          className="w-full p-1.5 rounded-lg bg-[#162133] border border-[#C9A96E]/20 text-white text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[9px] text-[#A8B4C4] uppercase mb-0.5">
                          Qté
                        </label>
                        <input
                          type="number"
                          value={m.quantite}
                          min={1}
                          onChange={(e) =>
                            handleUpdateMaterialRow(
                              m.id,
                              "quantite",
                              Number(e.target.value),
                            )
                          }
                          required
                          className="w-full p-1.5 rounded-lg bg-[#162133] border border-[#C9A96E]/20 text-white text-xs text-center font-mono"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[9px] text-[#A8B4C4] uppercase mb-0.5">
                          Prix Unit. (F)
                        </label>
                        <input
                          type="number"
                          value={m.prixUnitaire}
                          min={0}
                          onChange={(e) =>
                            handleUpdateMaterialRow(
                              m.id,
                              "prixUnitaire",
                              Number(e.target.value),
                            )
                          }
                          required
                          className="w-full p-1.5 rounded-lg bg-[#162133] border border-[#C9A96E]/20 text-white text-xs text-right font-mono"
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        <div className="text-[9px] text-[#6B7C94] uppercase">
                          Total
                        </div>
                        <div className="text-xs font-mono font-bold text-[#C9A96E] truncate">
                          {formatNumber(m.total)}
                        </div>
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveMaterialRow(m.id)}
                          disabled={materiels.length <= 1}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 disabled:opacity-30"
                          title="Supprimer la ligne"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2 px-1 text-xs border-t border-[#C9A96E]/15">
                  <span className="text-[#A8B4C4]">
                    Sous-total Fournitures & Pièces :
                  </span>
                  <span className="font-mono font-bold text-white text-sm">
                    {formatNumber(totalMateriels)} FCFA
                  </span>
                </div>
              </div>

              {/* Main d'Å“uvre et Totaux */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#1E2E45]/40 border border-[#C9A96E]/20">
                <div>
                  <label className="block text-[11px] font-bold text-[#E8D5B0] uppercase mb-1">
                    Coût de la Main d'Å“uvre / Forfait Artisan (FCFA) *
                  </label>
                  <input
                    type="number"
                    value={mainOeuvre}
                    onChange={(e) => setMainOeuvre(Number(e.target.value))}
                    min={0}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#0F1B2D] border border-[#C9A96E]/30 text-white font-mono font-bold text-sm"
                  />
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="travauxTva"
                      checked={travauxTva}
                      onChange={(e) => setTravauxTva(e.target.checked)}
                      className="rounded border-[#C9A96E]/30 text-[#C9A96E] focus:ring-[#C9A96E]"
                    />
                    <label
                      htmlFor="travauxTva"
                      className="text-xs text-[#A8B4C4] cursor-pointer"
                    >
                      Appliquer TVA 18% sur l'intervention
                    </label>
                  </div>
                </div>

                <div className="flex flex-col justify-between bg-[#0F1B2D] p-3.5 rounded-xl border border-[#C9A96E]/30">
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-[#A8B4C4]">
                      <span>Fournitures matérielles :</span>
                      <span className="font-mono">
                        {formatNumber(totalMateriels)} F
                      </span>
                    </div>
                    <div className="flex justify-between text-[#A8B4C4]">
                      <span>Main d'Å“uvre artisan :</span>
                      <span className="font-mono">
                        {formatNumber(mainOeuvre)} F
                      </span>
                    </div>
                    {travauxTva && (
                      <div className="flex justify-between text-[#A8B4C4]">
                        <span>TVA (18%) :</span>
                        <span className="font-mono">
                          {formatNumber(taxesTravaux)} F
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="pt-2 border-t border-[#C9A96E]/20 flex justify-between items-center">
                    <span className="font-bold text-white text-xs uppercase">
                      TOTAL FACTURÉ :
                    </span>
                    <span className="text-base font-black font-mono text-emerald-400">
                      {formatNumber(totalGeneralTravaux)} FCFA
                    </span>
                  </div>
                </div>
              </div>

              {/* Automatic Disbursement Checkbox */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="decaisserSurProprietaire"
                  checked={decaisserSurProprietaire}
                  onChange={(e) =>
                    setDecaisserSurProprietaire(e.target.checked)
                  }
                  className="mt-1 w-4 h-4 rounded border-amber-500 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <div>
                  <label
                    htmlFor="decaisserSurProprietaire"
                    className="text-xs font-bold text-amber-200 cursor-pointer block"
                  >
                    âœ“ Décaisser automatiquement ce montant sur le bulletin de
                    versement du propriétaire
                  </label>
                  <p className="text-[11px] text-[#A8B4C4] mt-1 leading-relaxed">
                    Le montant de{" "}
                    <strong className="text-white">
                      {formatNumber(totalGeneralTravaux)} FCFA
                    </strong>{" "}
                    sera immédiatement déduit du solde net reversé au bailleur{" "}
                    <strong className="text-white">
                      {associatedOwner
                        ? `${associatedOwner.prenom} ${associatedOwner.nom}`
                        : ""}
                    </strong>{" "}
                    sur son prochain bulletin de versement.
                  </p>
                </div>
              </div>

              {saveError && (
                <p role="alert" className="text-xs text-red-400">
                  Échec de l'enregistrement : {saveError}
                </p>
              )}
              <div className="flex justify-end gap-3 pt-3 border-t border-[#C9A96E]/15">
                <button
                  type="button"
                  onClick={() => setIsTravauxModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1E2E45] text-[#A8B4C4] hover:bg-[#2A3F5C]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs shadow-lg shadow-amber-900/30 flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-60 disabled:cursor-wait"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isSaving
                      ? "Enregistrement..."
                      : "Enregistrer & Décaisser sur Propriétaire"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: FACTURE STANDARD / ADHÉSION */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#C9A96E]" />
                Créer une Facture Standard
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#A0AEC0] hover:text-[#F0EDE8] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateStandardInvoice}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-1.5">
                  Type de Facture
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-xs text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none"
                >
                  <option value="Adhésion">
                    Facture d'Adhésion / Mandat de Gestion
                  </option>
                  <option value="Frais de dossier">
                    Frais de Dossier / Bail
                  </option>
                  <option value="Autre">Autre prestation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-1.5">
                  Propriétaire Destinataire
                </label>
                <select
                  value={targetOwnerId}
                  onChange={(e) => setTargetOwnerId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-xs text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none"
                >
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.prenom} {o.nom} - {o.mandatGerance}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-1.5">
                  Bien Immobilier Concerné
                </label>
                <select
                  value={targetBienNom}
                  onChange={(e) => setTargetBienNom(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-xs text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.nom}>
                      {p.nom} ({p.quartier})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-1.5">
                  Description de la prestation
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-xs text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-1.5">
                    Montant HT (FCFA)
                  </label>
                  <input
                    type="number"
                    value={montantHT}
                    onChange={(e) => setMontantHT(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-xs text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none font-mono"
                    required
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs text-[#E8D5B0] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tvaApplicable}
                      onChange={(e) => setTvaApplicable(e.target.checked)}
                      className="rounded border-[#2A3447] text-[#C9A96E] focus:ring-[#C9A96E]"
                    />
                    Appliquer TVA 18%
                  </label>
                </div>
              </div>

              <div className="p-3 bg-[#0A111D] rounded-xl border border-[#2A3447] flex justify-between items-center text-xs">
                <span className="text-[#A0AEC0]">Total TTC Facturé :</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  {formatCurrencyFCFA(
                    montantHT +
                      (tvaApplicable ? Math.round(montantHT * 0.18) : 0),
                  )}
                </span>
              </div>

              {saveError && (
                <p role="alert" className="text-xs text-red-400">
                  Échec de l'enregistrement : {saveError}
                </p>
              )}
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#0A111D] hover:bg-[#1E2C44] text-[#A0AEC0] rounded-xl text-xs cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] font-bold rounded-xl text-xs cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                >
                  {isSaving ? "Enregistrement..." : "Émettre la Facture"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE INVOICE MODAL (SUPPORT TRAVAUX & FOURNITURES DÉTAILLÉES) */}
      {selectedInvoice &&
        createPortal(
          <div className="invoice-print-modal fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="invoice-print-container print-container bg-white text-neutral-900 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl p-8 space-y-6 font-sans">
            <PrintHeader
              agency={settings}
              documentType={
                selectedInvoice.type === "Travaux"
                  ? "Facture travaux & décompte fournitures"
                  : "Facture officielle"
              }
              documentRef={selectedInvoice.ref}
            />
            <p className="text-right text-xs text-neutral-500">
              Date d'émission : {formatDate(selectedInvoice.dateFacture)}
            </p>

            {/* Imputation & Context Grid */}
            <div className="grid grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-200 text-xs">
              <div>
                <p className="font-bold text-neutral-500 uppercase text-[10px]">
                  BIEN & LOCATAIRE
                </p>
                <p className="font-bold text-neutral-900 text-sm mt-0.5">
                  {selectedInvoice.bienNom || "Lot sous mandat"}
                </p>
                <p className="text-neutral-600 mt-0.5">
                  Locataire :{" "}
                  <strong>{selectedInvoice.locataireNom || "En place"}</strong>
                </p>
                {selectedInvoice.prestataireNom && (
                  <p className="text-neutral-600">
                    Artisan : {selectedInvoice.prestataireNom}{" "}
                    {selectedInvoice.prestataireContact
                      ? `(${selectedInvoice.prestataireContact})`
                      : ""}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold text-neutral-500 uppercase text-[10px]">
                  BAILLEUR DÉBITEUR (IMPUTATION)
                </p>
                <p className="font-bold text-neutral-900 text-sm mt-0.5">
                  {selectedInvoice.proprietaireNom}
                </p>
                <div className="mt-1">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    {selectedInvoice.decaisserSurProprietaire !== false
                      ? "âœ“ Retenue sur reversement de loyer"
                      : "Règlement direct"}
                  </span>
                </div>
              </div>
            </div>

            {/* If Materials exist: Detailed Materials Table */}
            {selectedInvoice.materiels &&
            selectedInvoice.materiels.length > 0 ? (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-2">
                  Décompte des Pièces & Fournitures Achetées :
                </div>
                <table className="w-full text-left text-xs border border-neutral-200 rounded-lg overflow-hidden border-collapse">
                  <thead>
                    <tr className="bg-neutral-900 text-white font-bold text-[10px] uppercase">
                      <th className="py-2 px-3">
                        Désignation du Matériel / Fourniture
                      </th>
                      <th className="py-2 px-3 text-center">Qté</th>
                      <th className="py-2 px-3 text-right">Prix Unitaire</th>
                      <th className="py-2 px-3 text-right">Montant HT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {selectedInvoice.materiels.map((m) => (
                      <tr key={m.id}>
                        <td className="py-2.5 px-3 font-medium text-neutral-900">
                          {m.designation}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {m.quantite}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {formatNumber(m.prixUnitaire)} F
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-900">
                          {formatNumber(m.total)} F
                        </td>
                      </tr>
                    ))}
                    {selectedInvoice.mainOeuvre ? (
                      <tr className="bg-amber-50/50 font-semibold text-neutral-800">
                        <td className="py-2 px-3" colSpan={3}>
                          Main d'Å“uvre & Frais d'intervention (
                          {selectedInvoice.prestataireNom || "Artisan"})
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          {formatNumber(selectedInvoice.mainOeuvre)} F
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Standard lines table */
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-neutral-900 text-[10px] uppercase font-bold text-neutral-700">
                    <th className="py-2">Désignation</th>
                    <th className="py-2 text-center">Qté</th>
                    <th className="py-2 text-right">Prix Unitaire</th>
                    <th className="py-2 text-right">Total HT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {selectedInvoice.lignes.map((l) => (
                    <tr key={l.id}>
                      <td className="py-3 font-medium text-neutral-800">
                        {l.description}
                      </td>
                      <td className="py-3 text-center font-mono">
                        {l.quantite}
                      </td>
                      <td className="py-3 text-right font-mono">
                        {formatNumber(l.prixUnitaire)} F
                      </td>
                      <td className="py-3 text-right font-bold font-mono">
                        {formatNumber(l.montant)} F
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Total Block */}
            <div className="flex justify-end pt-2">
              <div className="w-72 space-y-1.5 text-xs border-t-2 border-neutral-900 pt-3">
                <div className="flex justify-between text-neutral-600">
                  <span>Sous-total HT :</span>
                  <span className="font-mono font-semibold">
                    {formatNumber(selectedInvoice.sousTotal)} FCFA
                  </span>
                </div>
                {selectedInvoice.taxes > 0 && (
                  <div className="flex justify-between text-neutral-600">
                    <span>TVA (18%) :</span>
                    <span className="font-mono font-semibold">
                      {formatNumber(selectedInvoice.taxes)} FCFA
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-neutral-900 border-t-2 border-neutral-900 pt-2">
                  <span>TOTAL TTC :</span>
                  <span className="text-emerald-800 font-mono">
                    {formatNumber(selectedInvoice.total)} FCFA
                  </span>
                </div>
              </div>
            </div>

            {/* Amount in French Words */}
            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-300 text-xs text-neutral-900">
              <span className="font-semibold text-neutral-600">
                Arrêtée la présente facture Ã  la somme de :{" "}
              </span>
              <strong className="font-bold uppercase italic underline">
                {numberToWordsFrench(selectedInvoice.total)}
              </strong>
            </div>

            {/* Mention légale de décaissement */}
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-950">
              <strong>MODALITÉ DE RÃˆGLEMENT :</strong> Montant imputé en
              décaissement direct sur les encaissements de loyers du
              propriétaire <strong>{selectedInvoice.proprietaireNom}</strong>{" "}
              pour le lot <strong>{selectedInvoice.bienNom}</strong>, déductible
              sur son bulletin de versement mensuel.
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-4 border-t border-neutral-200 text-xs">
              <div>
                <p className="font-bold text-neutral-700">
                  Pour Réception des Travaux (Locataire) :
                </p>
                <div className="h-14 border border-dashed border-neutral-300 rounded-lg p-2 mt-1 flex items-end">
                  <span className="text-[10px] text-neutral-400 italic">
                    Signature & Date
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-neutral-900">
                  Pour FITAL-IMMO Services Gérance
                </p>
                <div className="inline-block mt-2 px-3 py-1 border-2 border-dashed border-amber-800/60 bg-amber-50 rounded-lg text-[10px] font-black text-amber-900 uppercase">
                  â˜… TRAVAUX CERTIFIÉS & DÉCAISSÉS â˜…
                </div>
              </div>
            </div>

            <PrintFooter agency={settings} />

            {/* Modal Bottom Buttons (no-print) */}
            <div className="flex justify-between items-center pt-4 border-t border-neutral-200 no-print">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold rounded-xl text-xs cursor-pointer"
              >
                Fermer
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-neutral-900 hover:bg-black text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer la Facture / PDF</span>
              </button>
            </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
