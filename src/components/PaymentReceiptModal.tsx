import React, { useState, useMemo } from "react";
import { Printer, X } from "lucide-react";
import { Payment, AgencySettings, ReceiptType, Unit, Building } from "../types";
import { formatNumber, formatDate } from "../lib/utils";
import { UserSignatureBlock } from "./UserSignatureBlock";
import { PrintHeader, PrintFooter } from "./PrintHeader";
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
// Helper : Observation par défaut
// ============================================================
function getDefaultObservation(
  receiptType: ReceiptType,
  periode: string,
): string {
  const mois = (periode || "").toUpperCase();
  if (receiptType === "RECU_ACOMPTE") return `ACOMPTE ${mois}`;
  if (receiptType === "QUITTANCE_SOLDE" || receiptType === "QUITTANCE")
    return `SOLDE ${mois}`;
  return "";
}

// ============================================================
// Helper : Dates de période
// ============================================================
function getPeriodeDates(periode: string): { debut: string; fin: string } {
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
  if (parts.length >= 1 && moisMap[parts[0]] !== undefined)
    mois = moisMap[parts[0]];
  if (parts.length >= 2 && !isNaN(parseInt(parts[1])))
    annee = parseInt(parts[1]);

  const debut = new Date(annee, mois, 1);
  const fin = new Date(annee, mois + 1, 0);
  const fmt = (d: Date) =>
    d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  return { debut: fmt(debut), fin: fmt(fin) };
}

// ============================================================
// Helper : Rendu d'une COPIE complète (utilisé 2x)
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

    {/* Titre */}
    <div className="text-center my-1.5">
      <div className="inline-block border border-neutral-900 px-4 py-0.5">
        <span className="text-sm font-black uppercase tracking-wider text-neutral-900">
          {titre}
        </span>
      </div>
    </div>

    {/* N° et Montant */}
    <div className="flex justify-between items-center px-4 mb-2">
      <div className="border border-neutral-900 px-2.5 py-0.5 text-[11px] font-bold">
        N° <span className="font-mono">{numeroQuittance}</span>
      </div>
      <div className="border border-dashed border-neutral-900 px-3 py-1 bg-neutral-50">
        <span className="text-[9px] text-neutral-600 mr-2">Montant :</span>
        <span className="text-sm font-black text-neutral-900 font-mono">
          {formatNumber(montantPaye)} F CFA
        </span>
      </div>
    </div>

    {/* Corps */}
    <div className="text-[14px] text-neutral-900 leading-snug space-y-1 px-4">
      <div>
        Reçu de Mr (mme) :{" "}
        <strong className="underline">{payment.locataireNom}</strong>
      </div>
      <div>
        {isRecu ? "la somme de : " : "La somme de : "}
        <strong>{nombreEnLettres(montantPaye)}</strong> Francs CFA
      </div>
      <div>
        {isRecu ? "Désignation : " : "pour la Location de : "}
        <strong>{nomUnite}</strong>
      </div>
      <div>
        Lieux qu'il occupe dans l'immeuble situé :{" "}
        <strong>{adresseImmeuble}</strong>
      </div>
      {!isRecu ? (
        <div>
          Période : du <strong>{dateDebut}</strong> au{" "}
          <strong>{dateFin}</strong>
        </div>
      ) : (
        <div>
          Dakar, le <strong>{datePaiement}</strong>
        </div>
      )}
      {observation && (
        <div>
          Observation : <strong>{observation}</strong>
        </div>
      )}
    </div>

    {/* Signature et Réf Caissier */}
    <div className="flex items-end justify-between px-4 mt-2">
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

    {/* NOTA */}
    <div className="mt-1.5 pt-1 border-t border-neutral-300 text-[10px] text-neutral-700 leading-tight px-4">
      <div className="font-black uppercase mb-1">NOTA</div>
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

    {/* Pied de page */}
    <div className="quittance-foot mt-1 pt-0.5 border-t border-neutral-200 text-center text-[9px] text-neutral-600">
      <span className="font-bold">{settings?.nomAgence || "FITAL-IMMO"}</span>
      {settings?.telephone && <span> — Tél : {settings.telephone}</span>}
      {settings?.rcNumero && <span> — RC : {settings.rcNumero}</span>}
      {settings?.nineaNumero && <span> — NINEA : {settings.nineaNumero}</span>}
    </div>

    <div className="copy-label">{copyLabel}</div>
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

  // ============================================================
  // IMPRESSION ISOLÉE : fenêtre dédiée (contenu seul, fond blanc
  // garanti, sans l'en-tête ni le formulaire d'écran). Chaque copie
  // est MESURÉE et la police est réduite au besoin pour que les
  // 2 copies + ligne de découpe tiennent sur UNE page.
  // ============================================================
  const handlePrint = () => {
    printElementById(
      "printable-quittance",
      `${titre} — ${payment.ref}`,
      `
      @page{size:A4 portrait;margin:7mm 10mm;}
      #printable-quittance{--qfs:14px;width:190mm !important;margin:0 auto !important;font-size:var(--qfs) !important;line-height:1.4 !important;color:#000 !important;background:#fff !important;padding:0 !important;}
      #printable-quittance p,#printable-quittance li,#printable-quittance span,#printable-quittance div{font-size:var(--qfs) !important;line-height:1.4 !important;}
      #printable-quittance .quittance-copy{max-height:none !important;overflow:visible !important;break-inside:avoid !important;page-break-inside:avoid !important;}
      #printable-quittance .cut-line{break-inside:avoid !important;page-break-inside:avoid !important;}
      #quittance-copy-2{display:flex !important;flex-direction:column !important;}
      #quittance-copy-2 .quittance-foot{margin-top:auto !important;}
      `,
      {
        pageIds: ["quittance-copy-1", "quittance-copy-2"],
        baseFontPx: 14,
        minFontPx: 10.5,
        pageBudgetMm: 138,
        cssVar: "--qfs",
        finalize: (win) => {
          // Remplit la page : la 2e copie s'étire, son pied colle le bas
          const doc = win.document;
          const container = doc.getElementById(
            "printable-quittance",
          ) as HTMLElement | null;
          const copy2 = doc.getElementById(
            "quittance-copy-2",
          ) as HTMLElement | null;
          if (!container || !copy2) return;
          container.style.minHeight = "283mm";
          container.style.display = "flex";
          container.style.flexDirection = "column";
          copy2.style.flex = "1 0 auto";
        },
      },
    );
  };

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
    if (montantPaye > 0 && montantPaye < montantTotal) return "RECU_ACOMPTE";
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

  // Bug 3 & Bug 21 : Calcul des initiales Prénom + Nom (ex: "TA" pour Test ADMIN, "OF" pour Ousmane FALL)
  const computedInitiales = useMemo(() => {
    if (currentUser?.initiales?.trim())
      return currentUser.initiales.trim().toUpperCase();
    if (currentUser?.prenom && currentUser?.nom) {
      const p = currentUser.prenom.trim()[0] || "";
      const n = currentUser.nom.trim()[0] || "";
      if (p || n) return `${p}${n}`.toUpperCase();
    }
    return "AG";
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
    : immeuble?.nom || payment.bienNom || "—";

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

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 print-reset">
      <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col print-reset">
        {/* Header écran */}
        <div className="p-4 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80 sticky top-0 z-10 print:hidden">
          <h2 className="text-base font-bold text-white">{titre}</h2>
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
              placeholder="OF"
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
              placeholder="SOLDE JUILLET 2026"
              className="w-full px-3 py-1.5 rounded-lg bg-[#1E2E45] border border-[#C9A96E]/30 text-white"
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* CONTENU IMPRIMABLE - 2 COPIES                                */}
        {/* ============================================================ */}
        <div
          id="printable-quittance"
          className="print-container p-6 bg-white text-neutral-900"
        >
          {/* COPIE 1 - LOCATAIRE */}
          <QuittanceCopy
            {...copyProps}
            copyId="quittance-copy-1"
            copyLabel="— COPIE LOCATAIRE —"
          />

          {/* LIGNE DE DÉCOUPE */}
          <div className="cut-line">
            ✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          </div>

          {/* COPIE 2 - AGENCE */}
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
