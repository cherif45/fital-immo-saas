import React, { useState } from "react";
import { Printer, X } from "lucide-react";
import {
  AgencySettings,
  Building,
  LeaseContract,
  Property,
  Tenant,
  Unit,
} from "../types";
import { formatNumber, formatDate } from "../lib/utils";
import { UserSignatureBlock } from "./UserSignatureBlock";
import { PrintHeader } from "./PrintHeader";
import { printElementById } from "../lib/printDocument";
import { createDocumentNumber } from "../lib/documentNumber";

// ============================================================
// TYPES & CALCULS — sommes encaissées à l'entrée (étape 4)
// ============================================================
export interface EntryReceiptSums {
  montantCaution: number;
  acompteCaution: number;
  montantCommission: number;
  avanceLoyer: number;
  cautionEau: number;
  cautionElectricite: number;
  chargesDiverses: number;
}

/**
 * Montant réellement encaissé à l'entrée du locataire :
 * - caution versée : l'acompte sur caution s'il est renseigné, sinon la
 *   caution entière ;
 * - + avance loyer + commission (non remboursable) + caution eau +
 *   caution électricité + charges diverses.
 * Aucun paiement n'est créé : ce calcul sert uniquement au reçu.
 */
export function computeEntryReceiptTotal(sums: EntryReceiptSums): number {
  const cautionVersee =
    Number(sums.acompteCaution || 0) > 0
      ? Number(sums.acompteCaution)
      : Number(sums.montantCaution || 0);

  return (
    cautionVersee +
    Number(sums.avanceLoyer || 0) +
    Number(sums.montantCommission || 0) +
    Number(sums.cautionEau || 0) +
    Number(sums.cautionElectricite || 0) +
    Number(sums.chargesDiverses || 0)
  );
}

// ============================================================
// Helper : Montant en lettres
// ============================================================
function nombreEnLettres(n: number): string {
  if (n === 0) return "zéro";
  if (n < 0) return "moins " + nombreEnLettres(Math.abs(n));

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

      if (d === 7 || d === 9) {
        return dizaines[d - 1] + "-" + convert(10 + u);
      }

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

  if (milliards > 0) {
    result +=
      convert(milliards) + " milliard" + (milliards > 1 ? "s" : "") + " ";
  }

  if (millions > 0) {
    result += convert(millions) + " million" + (millions > 1 ? "s" : "") + " ";
  }

  if (milliers > 0) {
    result += (milliers === 1 ? "mille" : convert(milliers) + " mille") + " ";
  }

  if (reste > 0) result += convert(reste);

  return result.trim();
}

// ============================================================
// PROPS
// ============================================================
interface EntryReceiptModalProps {
  tenant: Tenant;
  contract?: LeaseContract | null;
  property?: Property | null;
  units?: Unit[];
  buildings?: Building[];
  sums: EntryReceiptSums;
  settings?: AgencySettings | null;
  currentUser?: {
    id?: string;
    nom: string;
    prenom: string;
    role?: string;
    initiales?: string;
  } | null;
  onClose: () => void;
}

// ============================================================
// UNE COPIE DU REÇU
// ============================================================
interface EntryReceiptCopyProps {
  copyId: string;
  copyLabel: string;
  numeroRecu: string;
  dateRecu: string;
  dateEntree: string;
  tenantName: string;
  nomBien: string;
  adresseBien: string;
  contratRef: string;
  devise: string;
  sums: EntryReceiptSums;
  total: number;
  settings?: AgencySettings | null;
  currentUser?: EntryReceiptModalProps["currentUser"];
}

const EntryReceiptCopy: React.FC<EntryReceiptCopyProps> = ({
  copyId,
  copyLabel,
  numeroRecu,
  dateRecu,
  dateEntree,
  tenantName,
  nomBien,
  adresseBien,
  contratRef,
  devise,
  sums,
  total,
  settings,
  currentUser,
}) => {
  const cautionIncluse =
    Number(sums.acompteCaution || 0) > 0
      ? Number(sums.acompteCaution)
      : Number(sums.montantCaution || 0);
  const soldeCaution =
    Number(sums.montantCaution || 0) - Number(sums.acompteCaution || 0);

  const lignes: Array<{ libelle: string; montant: number; note?: string }> = [
    {
      libelle: "Caution",
      montant: Number(sums.montantCaution || 0),
      note:
        Number(sums.acompteCaution || 0) > 0
          ? `versée : ${formatNumber(cautionIncluse)}`
          : undefined,
    },
    { libelle: "Acompte sur caution", montant: Number(sums.acompteCaution || 0) },
    { libelle: "Avance loyer", montant: Number(sums.avanceLoyer || 0) },
    {
      libelle: "Commission (non remboursable)",
      montant: Number(sums.montantCommission || 0),
    },
    { libelle: "Caution eau", montant: Number(sums.cautionEau || 0) },
    {
      libelle: "Caution électricité",
      montant: Number(sums.cautionElectricite || 0),
    },
    { libelle: "Divers", montant: Number(sums.chargesDiverses || 0) },
  ];

  return (
    <div className="entry-receipt-copy" id={copyId}>
      <PrintHeader agency={settings || null} compact />

      <div className="text-center my-1.5">
        <div className="receipt-badge-title inline-flex items-center justify-center border-2 border-neutral-900 bg-[#162133] px-6 py-1 rounded-[3px] shadow-[2px_2px_0px_#000]">
          <span className="text-[16px] font-black uppercase tracking-[0.22em] text-white">
            REÇU D'ENTRÉE
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center px-4 mb-1">
        <div className="receipt-num-badge inline-flex items-stretch border-2 border-neutral-900 rounded-[2px] overflow-hidden shadow-[1px_1px_0px_#000]">
          <div className="receipt-num-label bg-neutral-900 text-white px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider flex items-center">
            N°
          </div>
          <div className="receipt-num-val bg-white px-3 py-0.5 text-[11px] font-black font-mono text-neutral-900 tracking-wider flex items-center">
            {numeroRecu}
          </div>
        </div>

        <div className="receipt-amount-badge inline-flex items-stretch border-2 border-neutral-900 rounded-[2px] overflow-hidden shadow-[1px_1px_0px_#000] bg-[#F5EBD5]">
          <div className="receipt-amount-label bg-[#E8D5B0] border-r border-neutral-900 px-3 py-0.5 text-[10px] font-bold text-neutral-900 uppercase tracking-wider flex items-center">
            Total encaissé :
          </div>
          <div className="receipt-amount-val bg-[#F5EBD5] px-3 py-0.5 text-[11px] font-black font-mono text-neutral-900 tracking-wide flex items-center">
            {formatNumber(total)} {devise}
          </div>
        </div>
      </div>

      {/* Informations */}
      <div className="entry-receipt-info px-4 mt-1.5 text-neutral-900 font-bold space-y-0.5">
        <div className="flex items-baseline">
          <span>Reçu de Mr (mme) :&nbsp;</span>
          <span className="underline uppercase">{tenantName}</span>
        </div>
        <div className="flex items-baseline">
          <span>pour son entrée dans le bien :&nbsp;</span>
          <span>{nomBien}</span>
        </div>
        <div className="flex items-baseline">
          <span>Sis :&nbsp;</span>
          <span>{adresseBien}</span>
        </div>
        <div className="flex items-baseline flex-wrap">
          <span>Date d'entrée :&nbsp;</span>
          <span>{dateEntree}</span>
          <span>&nbsp;— Contrat :&nbsp;</span>
          <span className="font-mono">{contratRef}</span>
          <span>&nbsp;— Fait le :&nbsp;</span>
          <span>{dateRecu}</span>
        </div>
      </div>

      {/* Détail des sommes encaissées */}
      <table className="entry-receipt-table">
        <thead>
          <tr>
            <th className="entry-receipt-th-libelle">Détail des sommes perçues</th>
            <th className="entry-receipt-th-montant">Montant ({devise})</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((ligne) => (
            <tr key={ligne.libelle}>
              <td>
                {ligne.libelle}
                {ligne.note ? (
                  <span className="entry-receipt-note"> ({ligne.note})</span>
                ) : null}
              </td>
              <td className="entry-receipt-montant">
                {formatNumber(ligne.montant)}
              </td>
            </tr>
          ))}
          <tr className="entry-receipt-total-row">
            <td>MONTANT TOTAL</td>
            <td className="entry-receipt-montant">{formatNumber(total)}</td>
          </tr>
        </tbody>
      </table>

      <div className="entry-receipt-letters px-4 mt-1 text-neutral-900">
        <span className="font-black">Soit en lettres :&nbsp;</span>
        <span className="font-bold">
          {nombreEnLettres(total)} Francs CFA
        </span>
        {Number(sums.acompteCaution || 0) > 0 && soldeCaution > 0 && (
          <span className="entry-receipt-note block">
            Solde de caution restant à verser : {formatNumber(soldeCaution)}{" "}
            {devise}
          </span>
        )}
      </div>

      {/* Signature */}
      <div className="receipt-signature-row flex items-end justify-between px-4 mt-1.5">
        <div className="flex-1 min-w-0">
          <UserSignatureBlock
            userId={currentUser?.id}
            label="Reçu par"
            date={dateRecu}
            cachetUrl={settings?.cachetUrl || undefined}
          />
          <div className="entry-receipt-signature-name text-[9px] text-neutral-800 mt-0.5">
            <span className="font-bold">Reçu par :</span>{" "}
            {currentUser
              ? `${currentUser.prenom} ${currentUser.nom}${
                  currentUser.role ? ` (${currentUser.role})` : ""
                }`
              : "Agence"}
          </div>
        </div>

        <div className="text-right text-[9px] pl-3 flex-shrink-0">
          <div className="font-bold text-neutral-900 mb-0.5">Signature</div>
          <div className="font-mono text-[10px] font-bold text-neutral-900">
            &nbsp;
          </div>
        </div>
      </div>

      {/* Pied de page agence */}
      <div className="quittance-foot mt-0.5 pt-0.5 border-t border-neutral-200 text-center text-[8px] text-neutral-600">
        <span className="font-bold">{settings?.nomAgence || "Agence"}</span>
        {settings?.telephone && <span> — Tél : {settings.telephone}</span>}
        {settings?.adresse && <span> — {settings.adresse}</span>}
        {settings?.rcNumero && <span> — RC : {settings.rcNumero}</span>}
        {settings?.nineaNumero && <span> — NINEA : {settings.nineaNumero}</span>}
      </div>

      <div className="copy-label text-center text-[8.5px] font-bold text-neutral-700 mt-0.5">
        {copyLabel}
      </div>
    </div>
  );
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export const EntryReceiptModal: React.FC<EntryReceiptModalProps> = ({
  tenant,
  contract,
  property,
  units = [],
  buildings = [],
  sums,
  settings,
  currentUser,
  onClose,
}) => {
  const total = computeEntryReceiptTotal(sums);

  const [numeroRecu] = useState<string>(() =>
    createDocumentNumber(undefined, "ENT-"),
  );

  const dateRecu = React.useMemo(
    () =>
      new Date().toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    [],
  );

  const dateEntree = React.useMemo(() => {
    const raw = tenant.dateEntree || contract?.dateDebut || "";
    if (!raw) return dateRecu;
    try {
      return formatDate(raw);
    } catch {
      return raw;
    }
  }, [tenant.dateEntree, contract?.dateDebut, dateRecu]);

  const unite = React.useMemo(
    () => units.find((item) => item.id === tenant.bienId),
    [units, tenant.bienId],
  );

  const immeuble = React.useMemo(
    () => (unite ? buildings.find((b) => b.id === unite.buildingId) : null),
    [buildings, unite],
  );

  const nomBien = unite
    ? `${unite.type} - ${unite.nom}${unite.etage ? ` (${unite.etage})` : ""}`
    : property?.nom || tenant.bienNom || "—";

  const adresseBien = immeuble
    ? `${immeuble.adresse || ""} ${immeuble.nom || ""}`.trim()
    : property?.adresse
      ? `${property.adresse}${property.ville ? ` – ${property.ville}` : ""}`
      : tenant.bienNom || "—";

  const tenantName = `${tenant.prenom} ${tenant.nom}`.trim();
  const devise = settings?.devise || "F CFA";

  const copyProps = {
    numeroRecu,
    dateRecu,
    dateEntree,
    tenantName,
    nomBien,
    adresseBien,
    contratRef: contract?.ref || "—",
    devise,
    sums,
    total,
    settings,
    currentUser,
  };

  // ============================================================
  // IMPRESSION : 2 COPIES SUR UNE SEULE PAGE A4
  // ============================================================
  const handlePrint = () => {
    printElementById(
      "printable-entry-receipt",
      `Reçu d'entrée — ${numeroRecu}`,
      `
      @page {
        size: A4 portrait;
        margin: 4mm 5mm;
      }

      * {
        box-sizing: border-box !important;
      }

      html, body {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        color: #000 !important;
        font-family: Arial, Helvetica, sans-serif !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      #printable-entry-receipt {
        width: 200mm !important;
        max-width: 200mm !important;
        margin: 0 auto !important;
        padding: 0 !important;
        background: #fff !important;
        page-break-after: auto !important;
        break-inside: auto !important;
      }

      /* COPIES : hauteur naturelle, jamais rognées (2 copies / 1 page A4) */
      #printable-entry-receipt .entry-receipt-copy {
        display: block !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 1mm !important;
        overflow: visible !important;
        max-height: none !important;
        height: auto !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      /* Titre */
      #printable-entry-receipt .receipt-badge-title {
        border: 2px solid #000 !important;
        background-color: #162133 !important;
        color: #fff !important;
        padding: 2px 22px !important;
        box-shadow: 2px 2px 0 #000 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      #printable-entry-receipt .receipt-badge-title span {
        color: #fff !important;
        font-size: 15px !important;
        font-weight: 900 !important;
        letter-spacing: 1.5px !important;
      }

      /* Cartouches */
      #printable-entry-receipt .receipt-num-badge,
      #printable-entry-receipt .receipt-amount-badge {
        border: 2px solid #000 !important;
        display: inline-flex !important;
        align-items: stretch !important;
        overflow: hidden !important;
        box-shadow: 1px 1px 0 #000 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      #printable-entry-receipt .receipt-num-label {
        background-color: #000 !important;
        color: #fff !important;
        font-size: 9px !important;
        font-weight: 900 !important;
        padding: 1.5px 7px !important;
      }

      #printable-entry-receipt .receipt-num-val {
        background-color: #fff !important;
        color: #000 !important;
        font-size: 10px !important;
        font-weight: 900 !important;
        padding: 1.5px 8px !important;
        font-family: monospace !important;
      }

      #printable-entry-receipt .receipt-amount-label {
        background-color: #E8D5B0 !important;
        color: #000 !important;
        font-size: 9px !important;
        font-weight: 700 !important;
        padding: 1.5px 7px !important;
        border-right: 1px solid #000 !important;
      }

      #printable-entry-receipt .receipt-amount-val {
        background-color: #F5EBD5 !important;
        color: #000 !important;
        font-size: 10.5px !important;
        font-weight: 900 !important;
        padding: 1.5px 8px !important;
        font-family: monospace !important;
      }

      /* En-tête agence (compact) */
      #printable-entry-receipt .print-header-compact .pb-2 {
        padding-bottom: 3px !important;
      }

      #printable-entry-receipt .print-header-compact .mb-2 {
        margin-bottom: 3px !important;
      }

      /* Informations */
      #printable-entry-receipt .entry-receipt-info {
        width: 100% !important;
        font-size: var(--qfs, 12.5px) !important;
        font-weight: 700 !important;
        line-height: 1.3 !important;
      }

      #printable-entry-receipt .entry-receipt-info > div {
        display: flex !important;
        align-items: baseline !important;
        flex-wrap: wrap !important;
        font-size: var(--qfs, 12.5px) !important;
        font-weight: 700 !important;
        line-height: 1.3 !important;
        margin: 0 !important;
      }

      #printable-entry-receipt .entry-receipt-info span {
        font-size: var(--qfs, 12.5px) !important;
        font-weight: 700 !important;
      }

      /* Tableau des sommes */
      #printable-entry-receipt .entry-receipt-table {
        width: 100% !important;
        border-collapse: collapse !important;
        margin-top: 1.5mm !important;
        font-size: var(--qfs, 12.5px) !important;
        color: #000 !important;
      }

      #printable-entry-receipt .entry-receipt-table th,
      #printable-entry-receipt .entry-receipt-table td {
        border: 1px solid #666 !important;
        padding: 1px 5px !important;
        line-height: 1.2 !important;
        font-size: var(--qfs, 12.5px) !important;
        background-color: #fff !important;
        color: #000 !important;
      }

      #printable-entry-receipt .entry-receipt-th-libelle,
      #printable-entry-receipt .entry-receipt-th-montant {
        background-color: #E8D5B0 !important;
        font-weight: 900 !important;
        font-size: calc(var(--qfs, 12.5px) - 1.5px) !important;
        text-transform: uppercase !important;
        letter-spacing: 0.05em !important;
        text-align: left !important;
      }

      #printable-entry-receipt .entry-receipt-th-montant {
        text-align: right !important;
      }

      #printable-entry-receipt .entry-receipt-montant {
        text-align: right !important;
        font-family: monospace !important;
        font-weight: 700 !important;
        white-space: nowrap !important;
      }

      #printable-entry-receipt .entry-receipt-total-row td {
        background-color: #F5EBD5 !important;
        font-weight: 900 !important;
        font-size: calc(var(--qfs, 12.5px) + 0.5px) !important;
        border-top: 2px solid #000 !important;
      }

      #printable-entry-receipt .entry-receipt-note {
        font-size: calc(var(--qfs, 12.5px) - 2.5px) !important;
        font-style: italic !important;
        font-weight: 500 !important;
        color: #444 !important;
      }

      #printable-entry-receipt .entry-receipt-letters {
        margin-top: 1mm !important;
        font-size: var(--qfs, 12px) !important;
        line-height: 1.3 !important;
      }

      /* Signature */
      #printable-entry-receipt .receipt-signature-row {
        display: flex !important;
        align-items: flex-end !important;
        justify-content: space-between !important;
        width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        margin-top: 1.5mm !important;
        overflow: visible !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      #printable-entry-receipt .receipt-signature-row > div {
        min-width: 0 !important;
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
      }

      #printable-entry-receipt .user-signature-block {
        align-items: flex-start !important;
        height: auto !important;
        max-height: none !important;
        min-height: 0 !important;
        margin-top: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
      }

      #printable-entry-receipt .quittance-signature-container {
        width: 14rem !important;
        flex-shrink: 0 !important;
      }

      #printable-entry-receipt .quittance-signature-zone {
        height: 56px !important;
        min-height: 56px !important;
        max-height: 56px !important;
        overflow: visible !important;
      }

      #printable-entry-receipt img.quittance-signature-image {
        display: block !important;
        max-height: 50px !important;
        max-width: 100% !important;
        width: auto !important;
        height: auto !important;
        object-fit: contain !important;
      }

      #printable-entry-receipt img.quittance-cachet-image {
        display: block !important;
        max-height: 46px !important;
        max-width: 90% !important;
        width: auto !important;
        height: auto !important;
        object-fit: contain !important;
      }

      #printable-entry-receipt .entry-receipt-signature-name {
        font-size: 8.5px !important;
        line-height: 1.2 !important;
        margin-top: 1px !important;
      }

      /* Pied de page & libellé de copie */
      #printable-entry-receipt .quittance-foot {
        margin-top: 1mm !important;
        padding-top: 0.5mm !important;
        font-size: 7.5px !important;
        line-height: 1.2 !important;
        text-align: center !important;
      }

      #printable-entry-receipt .copy-label {
        font-size: 8px !important;
        line-height: 1 !important;
        margin-top: 0.5mm !important;
        text-align: center !important;
      }

      /* Ligne de découpe */
      #printable-entry-receipt .cut-line {
        display: block !important;
        width: 100% !important;
        margin: 1.5mm 0 !important;
        padding: 0 !important;
        text-align: center !important;
        font-size: 8px !important;
        line-height: 1 !important;
        letter-spacing: 0.1em !important;
        border-top: 1px dashed #777 !important;
        border-bottom: 1px dashed #777 !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      /* Masquer les commandes écran */
      button,
      .print\\:hidden {
        display: none !important;
      }

      img {
        max-width: 100% !important;
      }
      `,
      {
        pageIds: ["printable-entry-receipt"],
        baseFontPx: 13,
        minFontPx: 10.5,
        pageBudgetMm: 287,
        cssVar: "--qfs",
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 print-reset">
      <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col print-reset">
        {/* Header écran */}
        <div className="p-4 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80 sticky top-0 z-10 print:hidden">
          <h2 className="text-base font-bold text-white">
            Reçu d'entrée — {tenantName}
          </h2>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer hover:brightness-110 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#A8B4C4] hover:text-white cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Aperçu écran */}
        <div className="p-3 bg-[#0F1B2D] border-b border-[#C9A96E]/20 text-[11px] text-[#A8B4C4] print:hidden">
          N° {numeroRecu} — {dateRecu} — Total encaissé :{" "}
          <span className="font-bold text-[#C9A96E]">
            {formatNumber(total)} {devise}
          </span>
          {" — "}2 copies (LOCATAIRE / AGENCE) sur une seule page A4.
        </div>

        {/* Contenu imprimable : 2 copies sur le même A4 */}
        <div
          id="printable-entry-receipt"
          className="print-container p-6 bg-white text-neutral-900"
        >
          <EntryReceiptCopy
            {...copyProps}
            copyId="entry-receipt-copy-1"
            copyLabel="— 1ère COPIE : LOCATAIRE —"
          />

          <div className="cut-line">
            ✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
            - - - - - - - - - - - - - - - - - - - - - - - -
          </div>

          <EntryReceiptCopy
            {...copyProps}
            copyId="entry-receipt-copy-2"
            copyLabel="— 2ème COPIE : AGENCE —"
          />
        </div>
      </div>
    </div>
  );
};
