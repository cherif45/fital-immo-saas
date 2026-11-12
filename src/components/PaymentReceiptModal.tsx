import React, { useState, useMemo } from "react";
import { Printer, X } from "lucide-react";
import { Payment, AgencySettings, ReceiptType, Unit, Building } from "../types";
import { formatNumber, formatDate } from "../lib/utils";
import { UserSignatureBlock } from "./UserSignatureBlock";
import { PrintHeader } from "./PrintHeader";
import { printElementById } from "../lib/printDocument";
import { createDocumentNumber } from "../lib/documentNumber";

interface PaymentReceiptModalProps {
  payment: Payment;
  settings?: AgencySettings;
  units?: Unit[];
  buildings?: Building[];
  currentUser?: {
    nom: string;
    prenom: string;
    role?: string;
    initiales?: string;
  } | null;
  onClose: () => void;
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
// Helper : Observation par défaut
// ============================================================
function getDefaultObservation(
  receiptType: ReceiptType,
  periode: string,
): string {
  const mois = (periode || "").toUpperCase();

  if (receiptType === "RECU_ACOMPTE") return `ACOMPTE ${mois}`;

  if (receiptType === "QUITTANCE_SOLDE" || receiptType === "QUITTANCE") {
    return `SOLDE ${mois}`;
  }

  return "";
}

// ============================================================
// Helper : Dates de période
// ============================================================
function getPeriodeDates(periode: string): {
  debut: string;
  fin: string;
} {
  const now = new Date();
  let mois = now.getMonth();
  let annee = now.getFullYear();

  const moisMap: Record<string, number> = {
    janvier: 0,
    février: 1,
    fevrier: 1,
    mars: 2,
    avril: 3,
    mai: 4,
    juin: 5,
    juillet: 6,
    août: 7,
    aout: 7,
    septembre: 8,
    octobre: 9,
    novembre: 10,
    décembre: 11,
    decembre: 11,
  };

  const parts = (periode || "").toLowerCase().trim().split(" ");

  if (parts.length >= 1 && moisMap[parts[0]] !== undefined) {
    mois = moisMap[parts[0]];
  }

  if (parts.length >= 2 && !isNaN(parseInt(parts[1]))) {
    annee = parseInt(parts[1]);
  }

  const debut = new Date(annee, mois, 1);
  const fin = new Date(annee, mois + 1, 0);

  const fmt = (d: Date) =>
    d
      .toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
      .replace(/^./, (lettre) => lettre.toUpperCase());

  return { debut: fmt(debut), fin: fmt(fin) };
}

// ============================================================
// Helper : Rendu d'une COPIE complète
// ============================================================
interface QuittanceCopyProps {
  copyId?: string;
  copyLabel: string;
  titre: string;
  settings?: AgencySettings | null;
  numeroQuittance: number;
  montantPaye: number;
  payment: Payment;
  isRecu: boolean;
  nomUnite: string;
  adresseImmeuble: string;
  dateDebut: string;
  dateFin: string;
  datePaiement: string;
  observation: string;
  referenceCaissier: string;
  currentUser?: {
    nom: string;
    prenom: string;
    role?: string;
    initiales?: string;
  } | null;
}

const QuittanceCopy: React.FC<QuittanceCopyProps> = ({
  copyId,
  copyLabel,
  titre,
  settings,
  numeroQuittance,
  montantPaye,
  payment,
  isRecu,
  nomUnite,
  adresseImmeuble,
  dateDebut,
  dateFin,
  datePaiement,
  observation,
  referenceCaissier,
  currentUser,
}) => (
  <div className="quittance-copy" id={copyId}>
    <PrintHeader agency={settings || null} compact />

    <div className="text-center my-2">
      <div className="receipt-badge-title inline-flex items-center justify-center border-2 border-neutral-900 bg-[#162133] px-8 py-1.5 rounded-[3px] shadow-[2px_2px_0px_#000]">
        <span className="text-[18px] font-black uppercase tracking-[0.22em] text-white">
          {titre}
        </span>
      </div>
    </div>

    <div className="flex justify-between items-center px-4 mb-1">
      <div className="receipt-num-badge inline-flex items-stretch border-2 border-neutral-900 rounded-[2px] overflow-hidden shadow-[1px_1px_0px_#000]">
        <div className="receipt-num-label bg-neutral-900 text-white px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider flex items-center">
          N°
        </div>
        <div className="receipt-num-val bg-white px-3.5 py-0.5 text-xs font-black font-mono text-neutral-900 tracking-wider flex items-center">
          {numeroQuittance}
        </div>
      </div>

      <div className="receipt-amount-badge inline-flex items-stretch border-2 border-neutral-900 rounded-[2px] overflow-hidden shadow-[1px_1px_0px_#000] bg-[#F5EBD5]">
        <div className="receipt-amount-label bg-[#E8D5B0] border-r border-neutral-900 px-3 py-0.5 text-[10px] font-bold text-neutral-900 uppercase tracking-wider flex items-center">
          Montant :
        </div>
        <div className="receipt-amount-val bg-[#F5EBD5] px-4 py-0.5 text-xs font-black font-mono text-neutral-900 tracking-wide flex items-center">
          {formatNumber(montantPaye)} {settings?.devise || "F CFA"}
        </div>
      </div>
    </div>

    <div className="receipt-mid-logo px-4 mt-2 mb-1 flex items-center">
      <img
        src={settings?.logoUrl || "/agency-logo.jpg"}
        alt="Logo agence"
        className="receipt-logo-img h-8 w-auto object-contain"
      />
    </div>

    <div className="body-row px-4 mt-2.5 w-full">
      <div className="quittance-body w-full text-neutral-900 font-bold text-[14.5px] leading-[1.55] space-y-2">
        <div className="flex items-baseline">
          <span className="font-bold">Reçu de Mr (mme) :&nbsp;</span>
          <span className="font-bold underline uppercase">
            {payment.locataireNom}
          </span>
        </div>

        <div className="flex items-baseline">
          <span className="font-bold">La somme de :&nbsp;</span>
          <span className="font-bold">
            {nombreEnLettres(montantPaye)} Francs CFA
          </span>
        </div>

        <div className="flex items-baseline">
          <span className="font-bold">pour la Location de :&nbsp;</span>
          <span className="font-bold">{nomUnite}</span>
        </div>

        <div className="flex items-baseline">
          <span className="font-bold">
            Lieux qu'il occupe dans l'immeuble situé :&nbsp;
          </span>
          <span className="font-bold">{adresseImmeuble}</span>
        </div>

        {!isRecu ? (
          <div className="flex items-baseline">
            <span className="font-bold">Période :&nbsp;</span>
            <span className="font-bold">
              du {dateDebut} au {dateFin}
            </span>
          </div>
        ) : (
          <div className="flex items-baseline">
            <span className="font-bold">Dakar, le :&nbsp;</span>
            <span className="font-bold">{datePaiement}</span>
          </div>
        )}

        {observation && (
          <div className="flex items-baseline">
            <span className="font-bold">Observation :&nbsp;</span>
            <span className="font-bold">{observation}</span>
          </div>
        )}
      </div>
    </div>

    <div className="receipt-signature-row flex items-end justify-between px-4 mt-1">
      <div className="flex-1">
        <UserSignatureBlock
          userId={
            (payment as any).created_by_id ||
            (payment as any).createdById ||
            (currentUser as any)?.id
          }
          label="Encaissé par"
          date={payment.datePaiement || payment.date}
          cachetUrl={settings?.cachetUrl || undefined}
        />
      </div>

      <div className="text-right text-[10px] pl-3 flex-shrink-0">
        <div className="font-bold text-neutral-900 mb-0.5">Réf Caissier</div>
        <div className="font-mono text-xs font-bold text-neutral-900">
          {referenceCaissier}
        </div>
      </div>
    </div>

    <div className="nota-box mt-1 pt-0.5 border-t border-neutral-300 text-[7px] text-neutral-700 leading-tight px-4">
      <div className="font-black uppercase mb-0.5 text-neutral-900">NOTA</div>
      <div>- Un locataire ne peut déménager sans :</div>
      <div className="pl-3">
        1. Qu'il n'ait justifié au propriétaire par une quittance du percepteur
        qu'il acquitte toutes ses contributions personnelles et mobilières de
        l'année courante.
      </div>
      <div className="pl-3">
        2. Qu'il n'est donné ou reçu congé par écrit dans les délais prescrits.
      </div>
      <div className="pl-3">
        3. Qu'il n'ait fait faire toutes les réparations locatives à sa charge
        suivant l'usage ou d'après l'état des lieux s'il en existe un.
      </div>
      <div className="mt-0.5">
        - Il ne pourra sous-louer en tout ou en partie les locaux sans le
        consentement du propriétaire.
      </div>
    </div>

    <div className="quittance-foot mt-0.5 pt-0.5 border-t border-neutral-200 text-center text-[8px] text-neutral-600">
      <span className="font-bold">{settings?.nomAgence || "Agence"}</span>
      {settings?.telephone && <span> — Tél : {settings.telephone}</span>}
      {settings?.rcNumero && <span> — RC : {settings.rcNumero}</span>}
      {settings?.nineaNumero && <span> — NINEA : {settings.nineaNumero}</span>}
    </div>

    <div className="copy-label text-center text-[8.5px] font-bold text-neutral-700 mt-0.5">
      {copyLabel}
    </div>
  </div>
);

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  payment,
  settings,
  units = [],
  buildings = [],
  currentUser,
  onClose,
}) => {
  const montantTotal = payment.montantTotal || 0;
  const montantPaye = payment.montantPaye || 0;
  const montantRestant = payment.montantRestant ?? montantTotal - montantPaye;

  const [receiptType, setReceiptType] = useState<ReceiptType>(() => {
    if (payment.typeRecu) return payment.typeRecu;

    if (montantPaye >= montantTotal && montantRestant === 0) {
      if (
        payment.referencePaiementInitial &&
        payment.referencePaiementInitial !== payment.ref
      ) {
        return "QUITTANCE_SOLDE";
      }
      return "QUITTANCE";
    }

    if (montantPaye > 0 && montantPaye < montantTotal) {
      return "RECU_ACOMPTE";
    }

    return "QUITTANCE";
  });

  const [observation, setObservation] = useState<string>(
    payment.observation || getDefaultObservation(receiptType, payment.periode),
  );

  const [numeroQuittance, setNumeroQuittance] = useState<number>(
    (payment as any).numero_quittance ||
      parseInt(payment.quittanceNumero?.replace(/\D/g, "") || "0") ||
      Number(
        createDocumentNumber(settings?.prefixQuittance, "QUI-")
          .replace(/\D/g, "")
          .slice(-12),
      ),
  );

  const computedInitiales = useMemo(() => {
    if (currentUser?.initiales?.trim()) {
      return currentUser.initiales.trim().toUpperCase();
    }

    if (currentUser?.prenom && currentUser?.nom) {
      const p = currentUser.prenom.trim()[0] || "";
      const n = currentUser.nom.trim()[0] || "";

      if (p || n) return `${p}${n}`.toUpperCase();
    }

    return "PS";
  }, [currentUser]);

  const [referenceCaissier, setReferenceCaissier] = useState<string>(
    String((payment as any).reference_caissier || computedInitiales)
      .toUpperCase()
      .slice(0, 4),
  );

  const unite = useMemo(
    () => units.find((u) => u.id === payment.bienId),
    [units, payment.bienId],
  );

  const immeuble = useMemo(
    () => (unite ? buildings.find((b) => b.id === unite.buildingId) : null),
    [buildings, unite],
  );

  const nomUnite = unite
    ? `${unite.type} - ${unite.nom}${unite.etage ? ` (${unite.etage})` : ""}`
    : payment.bienNom || "—";

  const adresseImmeuble = immeuble
    ? `${immeuble.adresse || ""} ${immeuble.nom || ""}`.trim()
    : payment.bienNom || "—";

  const { debut: dateDebut, fin: dateFin } = getPeriodeDates(payment.periode);

  const datePaiement = payment.datePaiement
    ? formatDate(payment.datePaiement)
    : new Date().toLocaleDateString("fr-FR");

  const titre =
    receiptType === "RECU_ACOMPTE" ? "REÇU DE LOYER" : "QUITTANCE DE LOYER";

  const isRecu = receiptType === "RECU_ACOMPTE";

  const copyProps: Omit<QuittanceCopyProps, "copyLabel"> = {
    titre,
    settings,
    numeroQuittance,
    montantPaye,
    payment,
    isRecu,
    nomUnite,
    adresseImmeuble,
    dateDebut,
    dateFin,
    datePaiement,
    observation,
    referenceCaissier,
    currentUser,
  };

  // ============================================================
  // IMPRESSION : 2 COPIES SUR UNE SEULE PAGE A4
  // ============================================================
  const handlePrint = () => {
    printElementById(
      "printable-quittance",
      `${titre} — ${payment.ref}`,
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

      #printable-quittance {
        width: 200mm !important;
        max-width: 200mm !important;
        margin: 0 auto !important;
        padding: 0 !important;
        background: #fff !important;
        page-break-after: auto !important;
        page-break-inside: auto !important;
        break-inside: auto !important;
      }

      #printable-quittance .quittance-copy {
        display: block !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 1mm !important;
        overflow: visible !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      /* Titre */
      #printable-quittance .receipt-badge-title {
        border: 2px solid #000 !important;
        background-color: #162133 !important;
        color: #fff !important;
        padding: 2.5px 24px !important;
        font-size: 17px !important;
        font-weight: 900 !important;
        letter-spacing: 1.5px !important;
        text-transform: uppercase !important;
        box-shadow: 2px 2px 0 #000 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      #printable-quittance .receipt-badge-title span {
        color: #fff !important;
        font-size: 17px !important;
        font-weight: 900 !important;
        letter-spacing: 1.5px !important;
      }

      /* Cartouche numéro */
      #printable-quittance .receipt-num-badge {
        border: 2px solid #000 !important;
        display: inline-flex !important;
        align-items: stretch !important;
        overflow: hidden !important;
        box-shadow: 1px 1px 0 #000 !important;
      }

      #printable-quittance .receipt-num-label {
        background-color: #000 !important;
        color: #fff !important;
        font-size: 9.5px !important;
        font-weight: 900 !important;
        padding: 1.5px 8px !important;
      }

      #printable-quittance .receipt-num-val {
        background-color: #fff !important;
        color: #000 !important;
        font-size: 11px !important;
        font-weight: 900 !important;
        padding: 1.5px 10px !important;
        font-family: monospace !important;
      }

      /* Cartouche montant */
      #printable-quittance .receipt-amount-badge {
        border: 2px solid #000 !important;
        display: inline-flex !important;
        align-items: stretch !important;
        overflow: hidden !important;
        background-color: #F5EBD5 !important;
        box-shadow: 1px 1px 0 #000 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      #printable-quittance .receipt-amount-label {
        background-color: #E8D5B0 !important;
        color: #000 !important;
        font-size: 9.5px !important;
        font-weight: 700 !important;
        padding: 1.5px 8px !important;
        border-right: 1px solid #000 !important;
      }

      #printable-quittance .receipt-amount-val {
        background-color: #F5EBD5 !important;
        color: #000 !important;
        font-size: 11.5px !important;
        font-weight: 900 !important;
        padding: 1.5px 10px !important;
        font-family: monospace !important;
      }

      /* Logo du milieu : taille prévue (h-8 = 32px) pour tenir sur la page */
      #printable-quittance .receipt-mid-logo {
        margin-top: 0.5mm !important;
        margin-bottom: 0.5mm !important;
        padding-left: 2mm !important;
        padding-right: 2mm !important;
        display: flex !important;
        align-items: center !important;
      }

      #printable-quittance .receipt-logo-img {
        height: 32px !important;
        max-height: 32px !important;
        width: auto !important;
        max-width: 100% !important;
        object-fit: contain !important;
      }

      /* En-tête agence (compact) : rythme serré pour que les 2 copies
         tiennent sur une seule page A4 (textes conservés) */
      #printable-quittance .print-header-compact .pb-2 {
        padding-bottom: 4px !important;
      }

      #printable-quittance .print-header-compact .mb-2 {
        margin-bottom: 4px !important;
      }

      #printable-quittance .print-header-compact .mt-2 {
        margin-top: 4px !important;
      }

      /* Corps : texte 15 px gras avec interlignes resserrées */
      #printable-quittance .body-row {
        margin-top: 0.5mm !important;
        width: 100% !important;
      }

      #printable-quittance .quittance-body {
        width: 100% !important;
        font-size: 15px !important;
        font-weight: 700 !important;
        line-height: 1.3 !important;
      }

      #printable-quittance .quittance-body > div {
        display: flex !important;
        align-items: baseline !important;
        flex-wrap: wrap !important;
        font-size: 15px !important;
        font-weight: 700 !important;
        line-height: 1.3 !important;
        margin: 0 !important;
      }

      #printable-quittance .quittance-body > div + div {
        margin-top: 0.8mm !important;
      }

      #printable-quittance .quittance-body span {
        font-size: 15px !important;
        font-weight: 700 !important;
        line-height: 1.3 !important;
      }

      /* Copies : hauteur naturelle — annule le plafond global de 133 mm
         (index.css) qui faisait déborder le NOTA/pied de la copie 1 sur
         l'en-tête de la copie 2 */
      #printable-quittance .quittance-copy {
        max-height: none !important;
        height: auto !important;
      }

      /* Marges horizontales */
      #printable-quittance .quittance-copy .px-4 {
        padding-left: 2mm !important;
        padding-right: 2mm !important;
      }

      /* Signature et cachet : dimensions naturelles */
      #printable-quittance .receipt-signature-row {
        display: flex !important;
        align-items: flex-end !important;
        justify-content: space-between !important;
        width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        margin-top: 2mm !important;
        overflow: visible !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      #printable-quittance .receipt-signature-row > div {
        min-width: 0 !important;
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
      }

      #printable-quittance .user-signature-block {
        align-items: flex-start !important;
        height: auto !important;
        max-height: none !important;
        min-height: 0 !important;
        margin-top: 0 !important;
        overflow: visible !important;
      }
        /* Descendre uniquement le texte Encaissé par, sans déplacer la signature */
#printable-quittance .user-signature-block > div:first-child {
  position: relative !important;
  top: 8mm !important;
}

      /* Libellé Signature & Cachet : interlignage serré (remonte bloc + NOTA) */
      #printable-quittance .quittance-signature-container > div:first-child {
        font-size: 8px !important;
        line-height: 1 !important;
        margin-bottom: 0 !important;
      }

      #printable-quittance .receipt-signature-row img,
      #printable-quittance .user-signature-block img,
      #printable-quittance img[alt*="Cachet"],
      #printable-quittance img[src*="cachet"] {
        display: block !important;
        height: auto !important;
        max-height: none !important;
        max-width: 100% !important;
        width: auto !important;
        object-fit: contain !important;
      }
       #printable-quittance .user-signature-block img.quittance-signature-image {
  max-height: 108px !important;
  max-width: 100% !important;
  height: auto !important;
  width: auto !important;
  object-fit: contain !important;
}

      /* NOTA : texte intégral et hauteur automatique */
      #printable-quittance .nota-box {
        display: block !important;
        position: static !important;
        width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        margin-top: 0 !important;
        padding: 0.5mm 2mm 0 !important;
        font-size: 6px !important;
        line-height: 1.15 !important;
        color: #333 !important;
        overflow: visible !important;
        white-space: normal !important;
        overflow-wrap: normal !important;
        border-top: 1px solid #aaa !important;
      }

      #printable-quittance .nota-box > div {
        display: block !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        margin: 0 !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
        font-size: 6px !important;
        line-height: 1.15 !important;
        overflow: visible !important;
        white-space: normal !important;
      }

      #printable-quittance .nota-box .pl-3 {
        padding-left: 3mm !important;
      }

      #printable-quittance .nota-box > div:first-child {
        font-size: 7px !important;
        font-weight: 900 !important;
        margin-bottom: 0.5mm !important;
      }

      /* Pied de page */
      #printable-quittance .quittance-foot {
        margin-top: 0.5mm !important;
        padding-top: 0.5mm !important;
        font-size: 7.5px !important;
      }

      /* Ligne de découpe */
      #printable-quittance .cut-line {
        display: block !important;
        width: 100% !important;
        margin: 1.5mm 0 !important;
        padding: 0 !important;
        text-align: center !important;
        font-size: 8px !important;
        line-height: 1 !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      /* Libellés des copies */
      #printable-quittance .copy-label {
        font-size: 8px !important;
        line-height: 1 !important;
        margin-top: 0.3mm !important;
        text-align: center !important;
      }
      `,
      {
        pageIds: ["printable-quittance"],
        baseFontPx: 13.5,
        minFontPx: 11,
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
          <h2 className="text-base font-bold text-white">{titre}</h2>

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

        {/* Formulaire écran */}
        <div className="p-4 bg-[#0F1B2D] border-b border-[#C9A96E]/20 flex flex-wrap gap-3 text-xs print:hidden">
          <div>
            <label className="block text-[10px] text-[#A8B4C4] uppercase mb-1">
              Type
            </label>
            <div className="px-3 py-1.5 rounded-lg bg-[#0F1B2D] border border-[#C9A96E]/30 text-[#C9A96E] font-bold text-xs">
              {receiptType === "RECU_ACOMPTE" && "Reçu de Loyer (Acompte)"}
              {receiptType === "QUITTANCE_SOLDE" && "Quittance de Solde"}
              {receiptType === "QUITTANCE" && "Quittance de Loyer"}
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-[#A8B4C4] uppercase mb-1">
              N° Quittance
            </label>
            <input
              type="number"
              value={numeroQuittance}
              onChange={(e) => setNumeroQuittance(Number(e.target.value))}
              className="w-28 px-3 py-1.5 rounded-lg bg-[#1E2E45] border border-[#C9A96E]/30 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] text-[#A8B4C4] uppercase mb-1">
              Réf Caissier
            </label>
            <input
              type="text"
              value={referenceCaissier}
              onChange={(e) =>
                setReferenceCaissier(e.target.value.toUpperCase())
              }
              maxLength={4}
              placeholder="PS"
              className="w-24 px-3 py-1.5 rounded-lg bg-[#1E2E45] border border-[#C9A96E]/30 text-white font-mono uppercase"
            />
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] text-[#A8B4C4] uppercase mb-1">
              Observation
            </label>
            <input
              type="text"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Règlement loyer régulier"
              className="w-full px-3 py-1.5 rounded-lg bg-[#1E2E45] border border-[#C9A96E]/30 text-white"
            />
          </div>
        </div>

        {/* Contenu imprimable : 2 copies sur le même A4 */}
        <div
          id="printable-quittance"
          className="print-container p-6 bg-white text-neutral-900"
        >
          <QuittanceCopy
            {...copyProps}
            copyId="quittance-copy-1"
            copyLabel="— COPIE LOCATAIRE —"
          />

          <div className="cut-line">
            ✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
            - - - - - - - - - - - - - - - - - - - - - - - -
          </div>

          <QuittanceCopy
            {...copyProps}
            copyId="quittance-copy-2"
            copyLabel="— COPIE AGENCE —"
          />
        </div>
      </div>
    </div>
  );
};
