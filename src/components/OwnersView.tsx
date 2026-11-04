import React, { useState } from "react";
import {
  UserCheck,
  Plus,
  Search,
  Phone,
  Mail,
  Printer,
  FileText,
  Edit,
  Trash2,
  CheckCircle2,
  Download,
  PhoneCall,
  MessageSquare,
  Send,
} from "lucide-react";

import {
  Owner,
  Property,
  Payment,
  Unit,
  Building,
  AgencySettings,
} from "../types";

import { formatNumber, exportToCSV } from "../lib/utils";
import {
  triggerPhoneCall,
  triggerSMS,
  triggerWhatsApp,
} from "../lib/comms/commsHelper";
import { OwnerMandateModal } from "./OwnerMandateModal";
import { createDocumentNumber } from "../lib/documentNumber";

interface OwnersViewProps {
  owners: Owner[];
  properties: Property[];
  buildings?: Building[];
  units?: Unit[];
  payments: Payment[];
  onOpenOwnerSlip: (owner: Owner) => void;
  onOpenBulletin?: (owner: Owner) => void;
  onAddOwner: (owner: Owner) => void;
  onUpdateOwner?: (owner: Owner) => void;
  onDeleteOwner?: (ownerId: string) => void;
  settings?: AgencySettings;
}

// Libellé du type de pièce
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

export const OwnersView: React.FC<OwnersViewProps> = ({
  owners,
  properties,
  buildings = [],
  units = [],
  onOpenOwnerSlip,
  onOpenBulletin,
  onAddOwner,
  onUpdateOwner,
  onDeleteOwner,
  settings,
}) => {
  const [search, setSearch] = useState("");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const [selectedOwnerForMandate, setSelectedOwnerForMandate] =
    useState<Owner | null>(null);

  // États du formulaire
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [typePiece, setTypePiece] = useState("CNI");
  const [cni, setCni] = useState("");
  const [dateEmissionPiece, setDateEmissionPiece] = useState("");
  const [telephone, setTelephone] = useState("+221 77 ");
  const [email, setEmail] = useState("");
  const [banque, setBanque] = useState("CBAO Groupe Attijariwafa");
  const [compteBancaire, setCompteBancaire] = useState("");
  const [tauxCommission, setTauxCommission] = useState(10);
  const [adresse, setAdresse] = useState("Dakar, Sénégal");

  // Réinitialisation du formulaire
  const resetForm = () => {
    setNom("");
    setPrenom("");
    setTypePiece("CNI");
    setCni("");
    setDateEmissionPiece("");
    setTelephone("+221 77 ");
    setEmail("");
    setBanque("CBAO Groupe Attijariwafa");
    setCompteBancaire("");
    setTauxCommission(10);
    setAdresse("Dakar, Sénégal");
    setEditingOwner(null);
  };

  // Ouvrir le formulaire pour créer un propriétaire
  const handleNewOwner = () => {
    resetForm();
    setIsFormModalOpen(true);
  };

  // Ouvrir le formulaire pour modifier un propriétaire
  const handleEditOwner = (owner: Owner) => {
    setNom(owner.nom || "");
    setPrenom(owner.prenom || "");

    setTypePiece(
      (owner as any).typePiece || (owner as any).type_piece || "CNI",
    );

    setCni((owner as any).cni || (owner as any).numero_piece || "");

    setDateEmissionPiece(
      (owner as any).dateEmissionPiece ||
        (owner as any).date_emission_piece ||
        "",
    );

    setTelephone(owner.telephone || "");
    setEmail((owner as any).email || "");
    setBanque(owner.banque || "");

    setCompteBancaire(
      (owner as any).compteBancaire || (owner as any).compte_bancaire || "",
    );

    setTauxCommission(
      (owner as any).tauxCommission || (owner as any).taux_commission || 10,
    );

    setAdresse((owner as any).adresse || "");

    setEditingOwner(owner);
    setIsFormModalOpen(true);
  };

  // Fermer le formulaire
  const handleCloseForm = () => {
    setIsFormModalOpen(false);
    resetForm();
  };

  // Recherche des propriétaires
  const filteredOwners = owners.filter((owner) => {
    if (!search.trim()) return true;

    const query = search.toLowerCase();

    return (
      owner.nom?.toLowerCase().includes(query) ||
      owner.prenom?.toLowerCase().includes(query) ||
      owner.mandatGerance?.toLowerCase().includes(query) ||
      owner.telephone?.includes(query) ||
      owner.banque?.toLowerCase().includes(query)
    );
  });

  // Suppression d'un propriétaire
  const handleDeleteOwner = (owner: Owner) => {
    const biensCount = properties.filter(
      (property) => property.proprietaireId === owner.id,
    ).length;

    let message = `Supprimer ${owner.prenom} ${owner.nom} ?\n\n`;

    if (biensCount > 0) {
      message +=
        `Attention : ce propriétaire possède ${biensCount} bien(s) rattaché(s).\n` +
        "Les biens risquent de devenir orphelins.\n\n";
    }

    message += "Cette action est irréversible.";

    if (window.confirm(message)) {
      onDeleteOwner?.(owner.id);
    }
  };

  // Création ou modification d'un propriétaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const today = new Date().toISOString().split("T")[0];

    const ownerData: Owner = {
      ...(editingOwner || {}),

      id: editingOwner?.id || crypto.randomUUID(),

      nom: nom.trim().toUpperCase(),
      prenom: prenom.trim(),
      telephone: telephone.trim(),

      email: email.trim() || undefined,
      adresse: adresse.trim(),

      typePiece,
      cni: cni.trim(),
      dateEmissionPiece: dateEmissionPiece || undefined,

      mandatGerance:
        editingOwner?.mandatGerance ||
        createDocumentNumber(undefined, "MANDAT-"),

      dateMandat: editingOwner?.dateMandat || today,

      tauxCommission: Number(tauxCommission),
      banque: banque.trim(),

      compteBancaire: compteBancaire.trim() || undefined,

      totalBiens: editingOwner?.totalBiens ?? 1,
      totalLoyersMensuels: editingOwner?.totalLoyersMensuels ?? 350000,
    };

    // Modification
    if (editingOwner) {
      if (!onUpdateOwner) {
        alert("La modification des propriétaires n'est pas configurée.");
        return;
      }

      onUpdateOwner(ownerData);
    } else {
      // Création
      onAddOwner(ownerData);
    }

    handleCloseForm();
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      "Propriétaire",
      "Type Pièce",
      "N° Pièce",
      "Date de délivrance",
      "Mandat",
      "Téléphone",
      "Banque",
      "Compte Bancaire",
      "Taux Com (%)",
      "Nombre de Biens",
    ];

    const rows = filteredOwners.map((owner) => [
      `${owner.prenom} ${owner.nom}`,
      getPieceLabel(owner.typePiece),
      owner.cni || "",
      (owner as any).dateEmissionPiece || "",
      owner.mandatGerance,
      owner.telephone,
      owner.banque,
      owner.compteBancaire || "",
      `${owner.tauxCommission}%`,
      properties.filter((property) => property.proprietaireId === owner.id)
        .length,
    ]);

    exportToCSV("Liste_Proprietaires_FITAL_IMMO", rows, headers);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/15 text-[#C9A96E] flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>

          <div>
            <div className="text-sm font-bold text-white">
              Gestion des Propriétaires & Mandats
            </div>

            <div className="text-xs text-[#A8B4C4]">
              {owners.length} propriétaires sous contrat de gérance exclusif
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] border border-[#C9A96E]/30 text-xs font-semibold text-[#E8D5B0] transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={handleNewOwner}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Propriétaire</span>
          </button>
        </div>
      </div>

      {/* Recherche */}
      <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/15 flex items-center justify-between gap-4">
        <div className="text-xs text-[#A8B4C4]">
          Édition automatique des{" "}
          <strong className="text-white">Bulletins de Versement</strong> et
          calcul des commissions agence.
        </div>

        <div className="relative w-72 max-w-full">
          <Search className="w-3.5 h-3.5 text-[#6B7C94] absolute left-3 top-1/2 -translate-y-1/2" />

          <input
            type="text"
            placeholder="Rechercher propriétaire, mandat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-xs text-white focus:outline-none focus:border-[#C9A96E]"
          />
        </div>
      </div>

      {/* Liste des propriétaires */}
      {filteredOwners.length === 0 ? (
        <div className="py-16 text-center text-[#6B7C94] bg-[#162133] rounded-2xl border border-[#C9A96E]/20 p-8">
          <UserCheck className="w-10 h-10 mx-auto text-[#6B7C94]/50 mb-3" />

          <h3 className="text-sm font-bold text-white mb-1">
            Aucun propriétaire bailleur
          </h3>

          <p className="text-xs text-[#A8B4C4] max-w-sm mx-auto mb-4">
            Enregistrez votre premier propriétaire mandant pour commencer à lui
            rattacher des immeubles et des lots locatifs.
          </p>

          <button
            type="button"
            onClick={handleNewOwner}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs"
          >
            + Nouveau Propriétaire
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOwners.map((owner) => {
            const ownerLots = properties.filter(
              (property) => property.proprietaireId === owner.id,
            );

            const ownerUnits = (units || []).filter((unit: any) =>
              ownerLots.some(
                (property: any) =>
                  property.id === unit.buildingId ||
                  property.id === unit.bienId,
              ),
            );

            const totalLotsRent = ownerUnits.reduce(
              (sum: number, unit: any) => sum + (Number(unit.loyerBase) || 0),
              0,
            );

            return (
              <div
                key={owner.id}
                className="p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 hover:border-[#C9A96E]/50 transition-all shadow-xl flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1E2E45] text-[#C9A96E] border border-[#C9A96E]/20">
                        {owner.mandatGerance}
                      </span>

                      <h3 className="text-base font-bold text-white mt-1.5 group-hover:text-[#C9A96E] transition-colors">
                        {owner.prenom} {owner.nom}
                      </h3>

                      {owner.cni && (
                        <div className="text-[10px] text-[#A8B4C4] font-mono mt-0.5">
                          {getPieceLabel(owner.typePiece)}: {owner.cni}
                        </div>
                      )}

                      {(owner as any).dateEmissionPiece && (
                        <div className="text-[10px] text-[#A8B4C4] mt-0.5">
                          Délivrée le : {(owner as any).dateEmissionPiece}
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#C9A96E]/20 text-[#E8D5B0] border border-[#C9A96E]/30 font-mono">
                      Com. {owner.tauxCommission}%
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-[#A8B4C4] my-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#6B7C94]" />

                        <span className="font-mono text-white font-semibold">
                          {owner.telephone}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => triggerPhoneCall(owner.telephone)}
                          className="p-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all"
                          title="Appeler le propriétaire"
                        >
                          <PhoneCall className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            triggerWhatsApp(
                              owner.telephone,
                              `Bonjour ${owner.prenom} ${owner.nom}, l'agence FITAL-IMMO vous contacte au sujet de la gestion de votre patrimoine.`,
                            )
                          }
                          className="p-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all"
                          title="Écrire sur WhatsApp"
                        >
                          <Send className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            triggerSMS(
                              owner.telephone,
                              `Bonjour ${owner.prenom} ${owner.nom}, message de l'agence FITAL-IMMO.`,
                            )
                          }
                          className="p-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-all"
                          title="Envoyer un SMS"
                        >
                          <MessageSquare className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#6B7C94]" />
                      <span className="truncate">
                        {owner.email || "Aucun email"}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#1E2E45]/40 border border-[#C9A96E]/10 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[#6B7C94]">Banque & Compte :</span>

                      <span className="font-medium text-white truncate max-w-[150px]">
                        {owner.banque}
                      </span>
                    </div>

                    <div className="font-mono text-[10px] text-[#A8B4C4] truncate">
                      {owner.compteBancaire || "Aucun compte renseigné"}
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-[#C9A96E]/10">
                      <span className="text-[#6B7C94]">
                        Biens sous gestion :
                      </span>

                      <span className="font-bold text-white">
                        {ownerLots.length} biens
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-[#C9A96E]/15 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] text-[#6B7C94] uppercase">
                      Potentiel Mensuel
                    </div>

                    <div className="text-sm font-bold text-[#C9A96E] font-mono">
                      {formatNumber(totalLotsRent)} FCFA
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleEditOwner(owner)}
                      className="px-2 py-1.5 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#C9A96E] border border-[#C9A96E]/30 font-semibold text-xs transition-all flex items-center gap-1"
                      title="Modifier ce propriétaire"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteOwner(owner)}
                      className="px-2 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-semibold text-xs transition-all flex items-center gap-1"
                      title="Supprimer ce propriétaire"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedOwnerForMandate(owner)}
                      className="px-2.5 py-1.5 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#E8D5B0] border border-[#C9A96E]/30 font-semibold text-xs transition-all flex items-center gap-1.5"
                      title="Consulter et imprimer le Mandat de Gérance Exclusif"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#C9A96E]" />
                      <span>Mandat</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenBulletin) {
                          onOpenBulletin(owner);
                        } else {
                          onOpenOwnerSlip(owner);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-1.5"
                      title="Éditer le Bulletin de Versement Propriétaire complet"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Bulletin</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal du mandat */}
      {selectedOwnerForMandate && (
        <OwnerMandateModal
          owner={selectedOwnerForMandate}
          properties={properties}
  buildings={buildings}
  units={units}
          agencySettings={settings}
          onClose={() => setSelectedOwnerForMandate(null)}
        />
      )}

      {/* Formulaire de création / modification */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* En-tête du formulaire */}
            <div className="p-5 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <UserCheck className="w-5 h-5 text-[#C9A96E]" />

                <span>
                  {editingOwner
                    ? "Modifier le Propriétaire"
                    : "Nouveau Propriétaire Mandant"}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCloseForm}
                className="px-4 py-2 rounded-xl bg-[#1E2E45] text-[#A8B4C4] hover:bg-[#2A3F5C]"
              >
                Annuler
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {/* Prénom et nom */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Prénom
                  </label>

                  <input
                    type="text"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                    placeholder="Mamadou"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Nom
                  </label>

                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                    placeholder="SOW"
                  />
                </div>
              </div>

              {/* Type et numéro de pièce */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Type de pièce
                  </label>

                  <select
                    value={typePiece}
                    onChange={(e) => setTypePiece(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  >
                    <option value="CNI">CNI</option>
                    <option value="PASSEPORT">Passeport</option>
                    <option value="CARTE_CONSULAIRE">Carte Consulaire</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    N° de la pièce
                  </label>

                  <input
                    type="text"
                    value={cni}
                    onChange={(e) => setCni(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                    placeholder={
                      typePiece === "CNI"
                        ? "1 755 1989 00412"
                        : typePiece === "PASSEPORT"
                          ? "SN1234567"
                          : "..."
                    }
                  />
                </div>
              </div>

              {/* Date de délivrance */}
              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                  Date de délivrance de la pièce
                </label>

                <input
                  type="date"
                  value={dateEmissionPiece}
                  onChange={(e) => setDateEmissionPiece(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                />
              </div>

              {/* Téléphone et email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Téléphone
                  </label>

                  <input
                    type="text"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                    placeholder="contact@exemple.sn"
                  />
                </div>
              </div>

              {/* Banque et commission */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Banque Bénéficiaire
                  </label>

                  <input
                    type="text"
                    value={banque}
                    onChange={(e) => setBanque(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#C9A96E] uppercase mb-1">
                    Taux Commission (%)
                  </label>

                  <input
                    type="number"
                    value={tauxCommission}
                    onChange={(e) => setTauxCommission(Number(e.target.value))}
                    required
                    min={1}
                    max={25}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E] text-white font-mono font-bold"
                  />
                </div>
              </div>

              {/* RIB */}
              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                  RIB / Numéro de Compte
                </label>

                <input
                  type="text"
                  value={compteBancaire}
                  onChange={(e) => setCompteBancaire(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono"
                  placeholder="SN08 SN012 012345678901 45"
                />
              </div>

              {/* Adresse */}
              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                  Adresse
                </label>

                <input
                  type="text"
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  placeholder="Dakar, Sénégal"
                />
              </div>

              {/* Boutons */}
              <div className="pt-4 border-t border-[#C9A96E]/15 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 rounded-xl bg-[#1E2E45] text-[#A8B4C4]"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />

                  <span>
                    {editingOwner
                      ? "Enregistrer les modifications"
                      : "Enregistrer le Mandat"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
