import React from "react";
import { UserSignatureBlock } from "./UserSignatureBlock";

import { Printer, X, FileSignature } from "lucide-react";
import {
  LeaseContract,
  Property,
  Tenant,
  Owner,
  Building,
  Unit,
  AgencySettings,
} from "../types";
import { formatCurrency, formatNumber, formatDate } from "../lib/utils";
import { PrintHeader, PrintFooter } from "./PrintHeader";
import { printElementById } from "../lib/printDocument";

interface LeaseContractModalProps {
  contract: LeaseContract;
  property?: Property;
  building?: Building;
  unit?: Unit;
  tenant?: Tenant;
  owner?: Owner;
  settings?: AgencySettings;
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

export const LeaseContractModal: React.FC<LeaseContractModalProps> = ({
  contract,
  property,
  building,
  unit,
  tenant,
  owner,
  settings,
  onClose,
}) => {
  const TISER_NAME = settings?.nomAgence || "MON AGENCE";
  const TISER_SUBTITLE = "(T.I.SER) - GÉRANCE - LOCATION - VENTE - ACHAT";
  const TISER_ADRESSE = settings?.adresse || "";
  const TISER_TEL = settings?.telephone || "";
  const TISER_RC = settings?.rcNumero || "";
  const TISER_NINEA = settings?.nineaNumero || "";
  const TISER_EMAIL = settings?.email || "";
  const GERANT_NOM = settings?.gerantNom || "Le Gérant";

  // ============================================================
  // IMPRESSION ISOLÉE
  // ============================================================
  const handlePrint = () => {
    printElementById(
      "printable-contract",
      `Contrat de Bail — ${contract.ref}`,
      `
      @page{size:A4 portrait;margin:7mm 10mm;}
      #printable-contract{--cfs:14px;width:190mm !important;margin:0 auto !important;font-size:var(--cfs) !important;line-height:1.3 !important;color:#000 !important;background:#fff !important;padding:0 !important;}
      #printable-contract p,#printable-contract li,#printable-contract span,#printable-contract div{font-size:var(--cfs) !important;line-height:1.3 !important;}
      #printable-contract [class*="space-y-"] > * + *{margin-top:5px !important;}
      #printable-contract .font-bold.underline{margin-bottom:2px !important;}
      #printable-contract .print-page-break{break-before:page !important;page-break-before:always !important;height:0 !important;margin:0 !important;padding:0 !important;border:none !important;}
      #printable-contract .print-footer{font-size:10px !important;margin-top:4mm !important;}
      #printable-contract .print-footer p,#printable-contract .print-footer span,#printable-contract .print-footer div{font-size:10px !important;}

      /* ─── PAGE 2 : pied collé en bas ───────────────── */
      #contract-page2{
        display: flex !important;
        flex-direction: column !important;
        min-height: 270mm !important;
      }
      #contract-page2 .print-footer{
        margin-top: auto !important;
      }
      `,
      {
        pageIds: ["contract-page1", "contract-page2"],
        baseFontPx: 14,
        minFontPx: 11,
        pageBudgetMm: 283,
        cssVar: "--cfs",
      },
    );
  };

  // ============================================================
  // CALCULS
  // ============================================================
  const loyerBase = contract.loyerBase || 0;
  const charges = contract.charges || 0;
  const loyerTotal = loyerBase + charges;
  const cautionMois = contract.cautionMois || 2;
  const cautionMontant = contract.cautionMontant || loyerBase * cautionMois;

  const locataireNom = (
    contract.locataireNom || (tenant ? `${tenant.prenom} ${tenant.nom}` : "—")
  ).toUpperCase();
  const locataireCNI = tenant?.cni || "—";
  const locataireTel = tenant?.telephone || "—";

  const bienType =
    unit?.type || property?.type || building?.type || "Appartement";
  const bienNom = contract.bienNom || unit?.nom || property?.nom || "—";
  const bienAdresse = building?.adresse || property?.adresse || "—";
  const bienQuartier = building?.quartier || property?.quartier || "";
  const bienVille = building?.ville || property?.ville || "Dakar";
  const adresseComplete = `${bienAdresse}${bienQuartier ? ", " + bienQuartier : ""}, ${bienVille}`;

  const dateDebut = contract.dateDebut ? formatDate(contract.dateDebut) : "—";
  const dateFin = contract.dateFin ? formatDate(contract.dateFin) : "—";
  const dateDuJour = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header (masqué à l'impression) */}
        <div className="p-4 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80 sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/20 text-[#E8D5B0] flex items-center justify-center">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Contrat de Bail d'Habitation
              </h2>
              <p className="text-xs text-[#A8B4C4]">
                Réf : {contract.ref} · Type : {contract.typeContrat}
              </p>
            </div>
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

        {/* CONTENU IMPRIMABLE */}
        <div
          id="printable-contract"
          className="print-container p-8 sm:p-12 bg-white text-neutral-900"
        >
          {/* PAGE 1 */}
          <div id="contract-page1">
            <PrintHeader agency={settings || null} documentType="" compact />

            {/* TITRE PRINCIPAL PAGE 1 */}
            <div className="text-center mb-4">
              <h1 className="text-3xl font-black uppercase tracking-[0.15em] text-[#0F1B2D] border-b-2 border-[#C9A96E] pb-2">
                CONTRAT DE BAIL
              </h1>
            </div>
            {/* PRÉAMBULE */}
            <div className="text-[14px] text-neutral-900 leading-[1.3] mb-2 space-y-1">
              <div>
                <strong>Entre</strong> Monsieur <strong>{GERANT_NOM}</strong>{" "}
                Gérant de <strong>{TISER_NAME}</strong>
              </div>
              <div>
                <strong>D'une part, Et</strong>
              </div>
              <div>
                M. <strong>{locataireNom}</strong> CNI N°{" "}
                <strong>{locataireCNI}</strong>
              </div>
              <div>
                <strong>D'autre part, il a été convenu ce qui suit :</strong>
              </div>
              <div>
                M. <strong>{locataireNom}</strong> accepte un local à usage
                d'habitation : <strong>{bienType}</strong>
              </div>
              <div>
                Sis <strong>{adresseComplete}</strong>
              </div>
              <div>
                Tel : <strong>{locataireTel}</strong>
              </div>
            </div>

            {/* ARTICLES 1 à 6 */}
            <div className="text-[14px] text-neutral-900 leading-[1.3] space-y-2">
              <div>
                <div className="font-bold underline mb-1">Article 1 :</div>
                <p>
                  Le locataire entrera en jouissance des lieux dans l'état où
                  ils se trouvent. Il en assurera l'entente pour les tenir en
                  bon état de réparation les locatives et s'interdira toutes
                  modifications ou transformations sauf accord du Bailleur
                </p>
                <p className="mt-2 pl-4">
                  ❖ Avance :{" "}
                  <strong>
                    {formatNumber(loyerBase)} FCFA ({nombreEnLettres(loyerBase)}{" "}
                    francs)
                  </strong>
                </p>
              </div>

              <div>
                <div className="font-bold underline mb-1">Article 2</div>
                <p>
                  Le locataire (M. {locataireNom}) accepte de payer les 12/12ème
                  de la caution{" "}
                  <strong>{formatNumber(cautionMontant)} FCFA</strong>. Cette
                  caution n'est pas consommable et est remboursable après avoir
                  rendu le local à l'état primitif. Après désistement, l'avance
                  et la caution ne seront restituées qu'après avoir redonné le
                  local. La commission ne peut en aucun manière être remboursée.
                </p>
              </div>

              <div>
                <div className="font-bold underline mb-1">Article 3 :</div>
                <p>
                  Le locataire assistera à toutes les charges et balayages
                  d'hygiène et de police sanitaire auxquelles les locataires
                  sont habituellement tenus. L'évacuation des ordures ménagères,
                  la vidange des fosses septiques, le débouchage des égouts de
                  même que l'eau et l'électricité sont à la charge du locataire.
                  Si les factures d'eau ou d'électricité ne sont pas au nom du
                  locataire ou c'est un compteur collectif, une somme
                  équivalente à la moyenne des 3 dernières factures sera déduite
                  sur la caution pour les factures en cours. Et les surplus
                  éventuels des factures seront payés par le locataire sortant.
                  Au cas échéant, le reste de la somme gardée sera restitué.
                </p>
              </div>

              <div>
                <div className="font-bold underline mb-1">Article 4 :</div>
                <p>
                  Toute sous-location, même temporaire ou partielle, ou simple
                  occupation des lieux par un tiers à quelque titre que ce soit
                  (location gratuite, domiciliation, etc.) est interdite sans le
                  consentement du bailleur, sous peine de résiliation immédiate
                  du présent contrat de bail, à la simple constatation de
                  l'infraction et sans qu'il soit besoin de mise en demeure du
                  preneur. Les anciens locataires de la maison perdent tout
                  droit d'ancienneté et doivent se conformer aux clauses du
                  présent contrat. Les droits de timbres et d'enregistrement
                  sont à la charge du locataire.
                </p>
              </div>

              <div>
                <div className="font-bold underline mb-1">Article 5 :</div>
                <p>
                  Le preneur ne pourra faire aucun aménagement, aucune
                  modification de l'état ou de la disposition des locaux sans
                  autorisation écrite de l'agence. Ainsi il est formellement
                  interdit de percer les murs d'y afficher ou d'y coller des
                  photos, d'y dessiner et de les salir.
                </p>
                <p className="mt-2">
                  Tout aménagement, embellissement, amélioration appartiendront
                  de plein droit au propriétaire en fin de bail sans aucun
                  remboursement ni indemnité.
                </p>
              </div>

              <div>
                <div className="font-bold underline mb-1">Article 6 :</div>
                <p>
                  Le locataire est tenu de cultiver le sens du bon voisinage en
                  évitant tous les actes pouvant perturber la cohabitation
                  (musique forte, bavardage nocturne, .......) L'élevage des
                  animaux domestiques (mouton, chèvre, porc, bœuf, chien,
                  volaille, singe, etc.) est formellement interdit dans le local
                </p>
              </div>
            </div>
          </div>

          {/* SAUT DE PAGE */}
          <div className="print-page-break" aria-hidden="true" />

          {/* PAGE 2 */}
          <div id="contract-page2">
            {/* ─── LOGO + TITRE EN HAUT DE PAGE 2 ─────────────── */}
            <div className="flex items-center justify-between border-b border-[#C9A96E] pb-2 mb-3">
              <div className="flex items-center gap-3">
                {settings?.logoUrl && (
                  <img
                    src={settings.logoUrl}
                    alt="Logo"
                    className="w-12 h-12 object-contain"
                  />
                )}
                <div>
                  <div className="text-xs font-bold text-[#0F1B2D]">
                    {settings?.nomAgence || "MON AGENCE"}
                  </div>
                  <div className="text-[9px] text-[#C9A96E] font-semibold">
                    {settings?.slogan1 || ""}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black uppercase tracking-wider text-[#0F1B2D]">
                  CONTRAT DE BAIL
                </div>
                <div className="text-[10px] text-neutral-500 font-mono">
                  Réf : {contract.ref}
                </div>
              </div>
            </div>

            {/* ARTICLES 7 à 15 */}
            <div className="text-[14px] text-neutral-900 leading-[1.3] space-y-2 mt-0">
              <div>
                <div className="font-bold underline mb-1">Article 7 :</div>
                <p>
                  Le trafic de drogue et de stupéfiant de même sa consommation à
                  l'intérieur des locaux entraîne la résiliation d'office du
                  contrat et des poursuites judiciaires. Tout acte immoral est
                  prohibé (prostitution, ivresse manifeste, débauche, outrage
                  aux mœurs acte contre nature etc.)
                </p>
              </div>

              <div>
                <div className="font-bold underline mb-1">Article 8 :</div>
                <p>
                  Le preneur est tenu de sécuriser ses propres biens. Le
                  bailleur ne saura engager sa responsabilité sur les vols, les
                  fuites d'eau, les avaries et dommages que pourraient causer
                  une tornade, une pluie, un incendie et certains vices
                  techniques dont il n'a pas été l'auteur.
                </p>
              </div>

              <div>
                <div className="font-bold underline mb-1">Article 9 :</div>
                <p>
                  Le locataire devra prendre en charge à compter du jour de son
                  occupation des locaux et régler directement à l'agence ou aux
                  responsables, ses quote - parts relatives aux consommations
                  d'eau et d'électricité et au téléphone. Il est cas contraire
                  directement à la société intéressée. Les frais y compris les
                  pertes d'eau et d'électricité seront payés équitablement entre
                  les locataires. Le locataire est tenu aussi de remettre à
                  l'agence ses copies d'abonnement d'eau et d'électricité pour
                  permettre à l'agence d'avoir ses références en cas de
                  déménagement.
                </p>
              </div>

              <div>
                <div className="font-bold underline mb-1">Article 10 :</div>
                <p>
                  Le locataire laissera au bailleur l'accès du local chaque fois
                  que ce dernier jugera nécessaire. Avant de déménager, il doit
                  aviser par écrit à 2 mois à l'avance. Au cas échéant, la
                  caution ne sera restituée qu'après avoir redonné le local. En
                  déménageant, le locataire doit quitter les lieux occupés au
                  plus tard le 30 (trente) du mois courant. A défaut, tout autre
                  jour consommé sera défalqué sur la caution. A la fin du bail,
                  le locataire doit remettre les locaux dans leur état primitif.
                </p>
              </div>

              <div>
                <div className="font-bold underline mb-1">Article 11 :</div>
                <p>Les grosses réparations sont à la charge du propriétaire</p>
              </div>

              <div>
                <div className="font-bold underline mb-1">Article 12 :</div>
                <p>
                  Le présent contrat est conclu pour une durée de (01) ans
                  renouvelable par tacite reconduction.
                </p>
              </div>

              <div>
                <div className="font-bold underline mb-1">Article 13 :</div>
                <p>
                  ❖ montant du loyer concerné est de :{" "}
                  <strong>{formatNumber(loyerTotal)} FCFA</strong> (
                  <em>{nombreEnLettres(loyerTotal)} francs</em>) Hors Taxes.
                </p>
                <p className="pl-4">
                  ❖ N.B : Le paiement se fera au plus tard le 05 de chaque mois
                  en espèces et à l'agence. Dépassé le 08, le locataire sera
                  assigné en expulsion.
                </p>
              </div>

              <div>
                <div className="font-bold underline mb-1">Article 14 :</div>
                <p>
                  Le non-respect d'un de ces articles entraîne la résiliation
                  d'office de ce présent contrat de bail.
                </p>
              </div>

              <div>
                <div className="font-bold underline mb-1">Article 15 :</div>
                <p>
                  A défaut de paiement à son échéance d'un seul terme ou
                  fraction de terme à son échéance ou en cas d'inexécution d'une
                  des clauses et conditions du bail, et un mois après une mise
                  en demeure par exploit d'huissier restée infructueuse, le bail
                  sera résilié de plein droit et le locataire pourra être
                  expulsé et/ou d'exécution postérieur à l'expiration des délais
                  ci-dessus. Les conditions d'acquisition de cette clause
                  résolutoire seront constatées judiciairement et l'expulsion du
                  preneur devenu occupant sans droit ni titre, ordonnée par le
                  juge. Les frais de procédure et les honoraires de l'avocat
                  sont à la charge du locataire.
                </p>
              </div>
            </div>

            {/* SIGNATURES */}
            <div className="mt-4 text-[14px] text-neutral-900">
              <div className="text-right mb-3">
                Fait en double à Dakar, le <strong>{dateDuJour}</strong>
              </div>

              <UserSignatureBlock
                userId={
                  (contract as any).created_by_id ||
                  (contract as any).createdById
                }
                label="Rédigé par"
                date={
                  (contract as any).created_at || (contract as any).dateContrat
                }
              />

              <div className="grid grid-cols-2 gap-12 mt-4">
                <div>
                  <div className="font-bold mb-2">Le Gérant :</div>
                  <div className="font-bold">
                    M. <span className="underline">{GERANT_NOM}</span>
                  </div>
                  <div className="h-10 border-b border-dotted border-neutral-400 mt-2"></div>
                </div>
                <div>
                  <div className="font-bold mb-2">Le Locataire :</div>
                  <div className="font-bold">
                    M. <span className="underline">{locataireNom}</span>
                  </div>
                  <div className="h-10 border-b border-dotted border-neutral-400 mt-2"></div>
                </div>
              </div>
            </div>

            {/* PIED DE PAGE */}
            <div className="print-footer">
              <div className="font-bold">
                {TISER_NAME} (T.I.SER) {TISER_ADRESSE}
              </div>
              <div>
                Tél : {TISER_TEL} RC : {TISER_RC} NINEA : {TISER_NINEA} E-mail :{" "}
                {TISER_EMAIL}
              </div>
            </div>
          </div>

          {/* Pied de page écran uniquement */}
          <div className="mt-12 pt-4 border-t border-neutral-400 text-center text-[9px] text-neutral-700 leading-relaxed print:hidden">
            <div className="font-bold">
              {TISER_NAME} (T.I.SER) {TISER_ADRESSE}
            </div>
            <div>
              Tél : {TISER_TEL} RC : {TISER_RC} NINEA : {TISER_NINEA} Email :{" "}
              {TISER_EMAIL}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
