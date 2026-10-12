import React from "react";
import { FileText, Printer, X } from "lucide-react";
import { Owner, Property, AgencySettings } from "../types";
import { PrintHeader } from "./PrintHeader";
import { printElementById } from "../lib/printDocument";
import { UserSignatureBlock } from "./UserSignatureBlock";
import { formatDate } from "../lib/utils";

interface OwnerMandateModalProps {
  owner: Owner | null;
  properties: Property[];
  agencySettings?: AgencySettings;
  currentUser?: { nom: string; prenom: string; role?: string } | null;
  onClose: () => void;
}

// ============================================================
// FALLBACK (si l'agence n'a pas rempli ses paramètres)
// ============================================================
const FALLBACK = {
  nomAgence: "MON AGENCE",
  slogan1: "",
  slogan2: "",
  adresse: "",
  telephone: "",
  email: "",
  rc: "",
  ninea: "",
  gerantNom: "Le Gérant",
  gerantTitre: "Gérant",
};

export const OwnerMandateModal: React.FC<OwnerMandateModalProps> = ({
  owner,
  properties,
  agencySettings,
  currentUser,
  onClose,
}) => {
  if (!owner) return null;

  const ownerProperties = properties.filter(
    (p) => p.proprietaireId === owner.id,
  );
  const tauxCommission = owner.tauxCommission || 10;

  // ============================================================
  // IDENTITÉ PROPRIÉTAIRE
  // ============================================================
  const typePieceLabel =
    owner.typePiece === "PASSEPORT"
      ? "Passeport"
      : owner.typePiece === "CARTE_CONSULAIRE"
        ? "Carte Consulaire"
        : owner.typePiece === "AUTRE"
          ? "Pièce d'identité"
          : "Carte Nationale d'Identité";
  const numeroPiece = owner.cni || "—";
  const dateEmissionPiece = (owner as any).dateEmissionPiece
    ? formatDate((owner as any).dateEmissionPiece)
    : "—";

  // ============================================================
  // DATE DU MANDAT
  // ============================================================
  const dateMandat = owner.dateMandat || new Date().toISOString().split("T")[0];
  const dateFormatee = new Date(dateMandat).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // ============================================================
  // ADRESSE DU BIEN
  // ============================================================
  const adresseBien =
    ownerProperties.length > 0
      ? ownerProperties
          .map((p) => `${p.nom} — ${p.adresse || p.quartier || ""}`)
          .join(" / ")
      : "________________________________";

  // ============================================================
  // IMPRESSION ISOLÉE : fenêtre dédiée (contenu seul, fond blanc
  // garanti), texte agrandi, pied de page plaqué en bas.
  // ============================================================
  const handlePrint = () => {
    printElementById(
      "printable-mandate",
      `Mandat de Gérance — ${owner.prenom} ${owner.nom}`,
      `
      @page{size:A4 portrait;margin:9mm 10mm;}
      #printable-mandate{font-size:14px !important;line-height:1.6 !important;color:#000 !important;background:#fff !important;padding:0 !important;min-height:278mm;display:flex !important;flex-direction:column !important;}
      #printable-mandate p,#printable-mandate li,#printable-mandate span,#printable-mandate div{font-size:14px !important;line-height:1.6 !important;}
      #printable-mandate .print-footer{margin-top:auto !important;padding-top:5mm !important;font-size:10px !important;}
      #printable-mandate .print-footer p,#printable-mandate .print-footer span,#printable-mandate .print-footer div{font-size:10px !important;}
      `,
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="mandate-print-modal bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header (non imprimable) */}
        <div className="p-4 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80 sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-2.5 text-white font-bold text-sm">
            <FileText className="w-5 h-5 text-[#C9A96E]" />
            <span>
              Mandat de Gérance — {owner.prenom} {owner.nom}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#A8B4C4] hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CONTENU IMPRIMABLE                                          */}
        {/* ============================================================ */}
        <div
          id="printable-mandate"
          className="print-container p-6 sm:p-10 bg-white text-neutral-900 relative"
        >
          {/* Bandeau vertical gauche */}
          <div
            className="absolute left-2 top-1/2 hidden sm:block"
            style={{
              transform: "translateY(-50%) rotate(-90deg)",
              transformOrigin: "center",
              whiteSpace: "nowrap",
            }}
          >
            <span className="text-[8px] text-neutral-400 italic font-semibold tracking-wider">
              La transparence, notre crédo
            </span>
          </div>

          {/* Bandeau vertical droit */}
          <div
            className="absolute right-2 top-1/2 hidden sm:block"
            style={{
              transform: "translateY(-50%) rotate(90deg)",
              transformOrigin: "center",
              whiteSpace: "nowrap",
            }}
          >
            <span className="text-[8px] text-neutral-400 italic font-semibold tracking-wider">
              La transparence, notre crédo
            </span>
          </div>

          {/* EN-TÊTE DYNAMIQUE */}
          <PrintHeader
            agency={agencySettings || null}
            documentType="MANDAT DE GÉRANCE"
          />

          {/* Titre encadré */}
          <div className="mt-3 inline-block border-2 border-neutral-900 px-8 py-1">
            <span className="text-base font-black uppercase tracking-widest text-neutral-900">
              MANDAT DE GÉRANCE
            </span>
          </div>

          {/* ============================================================ */}
          {/* CORPS DU MANDAT                                             */}
          {/* ============================================================ */}
          <div className="text-[14px] text-neutral-900 leading-[1.6] space-y-3 mt-6">
            {/* Préambule */}
            <p className="text-justify">
              Je soussigné Monsieur{" "}
              <strong>
                {owner.prenom} {owner.nom}
              </strong>
              , {typePieceLabel} N° <strong>{numeroPiece}</strong> du{" "}
              <strong>{dateEmissionPiece}</strong>
            </p>

            <p className="text-justify">
              Propriétaire, certifie avoir mandaté l'agence
              <strong>
                {agencySettings?.nomAgence || FALLBACK.nomAgence}
              </strong>{" "}
              sise à <strong>Grand Dakar Pile N° 224</strong>, représenté par
              son Gérant{" "}
              <strong>{agencySettings?.gerantNom || FALLBACK.gerantNom}</strong>
              , de gérer notre maison sis à <strong>{adresseBien}</strong>
            </p>

            {/* L'agence aura pour mission */}
            <p className="mt-4">L'agence aura pour mission :</p>

            <ul className="ml-6 space-y-1.5 mt-2">
              <li className="flex gap-2">
                <span className="text-neutral-900 flex-shrink-0">❖</span>
                <span>De veiller sur la maison</span>
              </li>
              <li className="flex gap-2">
                <span className="text-neutral-900 flex-shrink-0">❖</span>
                <span>D'encaisser les loyers mensuels</span>
              </li>
              <li className="flex gap-2">
                <span className="text-neutral-900 flex-shrink-0">❖</span>
                <span>De recouvrir les arriérés éventuels</span>
              </li>
              <li className="flex gap-2">
                <span className="text-neutral-900 flex-shrink-0">❖</span>
                <span>
                  De poursuivre les locataires qui ne sont pas en règle jusqu'à
                  leur expulsion et d'en trouver d'autres
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-neutral-900 flex-shrink-0">❖</span>
                <span>
                  De faire les réfections avec l'accord du propriétaire
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-neutral-900 flex-shrink-0">❖</span>
                <span>
                  Et tous ces frais seront à déduire du montant à verser
                </span>
              </li>
            </ul>

            {/* Mentions financières */}
            <p className="text-justify mt-4">
              Les déclarations foncières, de revenus et fiscales sont faites par
              le propriétaire.
            </p>

            <p className="text-justify">
              La commission de gérance est de <strong>{tauxCommission}</strong>{" "}
              % sur le montant total encaissé.
            </p>

            {/* Durée */}
            <p className="text-justify">
              Ce présent mandat de gérance est conclu pour une durée
              indéterminée si aucune des parties n'exprime le désir d'y mettre
              fin. Avant la résiliation, la partie résiliente doit donner un
              préavis au moins de deux mois par écrit.
            </p>

            {/* En foi de quoi */}
            <p className="text-justify mt-2">
              En foi de quoi, il est établi pour servir et valoir ce que de
              droit.
            </p>
          </div>

          {/* ============================================================ */}
          {/* DATE + SIGNATURES                                           */}
          {/* ============================================================ */}
          <div className="mt-10 text-[14px] text-neutral-900">
            <div className="text-right mb-8">
              Fait en double à Dakar, le <strong>{dateFormatee}</strong>
            </div>

            <div className="grid grid-cols-2 gap-12">
              <div>
                <div className="font-bold mb-2">Le Gérant :</div>
                <div className="font-bold italic mb-1">
                  {agencySettings?.gerantNom || FALLBACK.gerantNom}
                </div>
                <div className="h-14 border-b border-dotted border-neutral-400"></div>
              </div>

              <div>
                <div className="font-bold mb-2">Le Propriétaire :</div>
                <div className="font-bold italic mb-1">
                  {owner.prenom} {owner.nom}
                </div>
                <div className="h-14 border-b border-dotted border-neutral-400"></div>
              </div>
            </div>
          </div>

          {/* SIGNATURE UTILISATEUR (traçabilité) */}
          <UserSignatureBlock
            userId={(owner as any).created_by_id || (owner as any).createdById}
            label="Établi par"
            date={(owner as any).dateMandat}
          />

          {/* PIED DE PAGE (identique au bulletin, plaqué en bas à l'impression) */}
          <div className="print-footer border-t-2 border-neutral-800 pt-3 mt-6 text-[10px] text-neutral-700 text-center leading-relaxed">
            <div className="font-bold uppercase">
              {agencySettings?.nomAgence || "TRANS IMMOBILIER & SERVICES SARL"}
              {agencySettings?.rcNumero && ` RC : ${agencySettings.rcNumero}`}
              {agencySettings?.nineaNumero &&
                ` N.I.N.E.A : ${agencySettings.nineaNumero}`}
            </div>
            {agencySettings?.adresse && (
              <div>
                Siège {agencySettings.adresse}
                {agencySettings?.ville && ` - ${agencySettings.ville}`}
              </div>
            )}
            <div>
              {agencySettings?.standardTelephone &&
                `Tél : ${agencySettings.standardTelephone}`}
              {agencySettings?.telephone && ` / ${agencySettings.telephone}`}
              {agencySettings?.email && ` - Email : ${agencySettings.email}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
