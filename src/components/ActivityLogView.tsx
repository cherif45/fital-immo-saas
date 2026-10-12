import React, { useState, useMemo } from "react";
import {
  CalendarDays,
  Search,
  WalletCards,
  FileSignature,
  User,
  UserCheck,
  Wrench,
  ClipboardList,
  Receipt,
  BellRing,
  TrendingUp,
  Clock,
  X,
  ArrowRight,
  Download,
  Printer,
  Building2,
  Home,
  Landmark,
  FileText,
} from "lucide-react";
import { ActivityLog, UserAccount, AgencySettings } from "../types";
import { formatCurrency, formatNumber, formatDate } from "../lib/utils";
import { printElementById } from "../lib/printDocument";

interface ActivityLogViewProps {
  activities: ActivityLog[];
  currentUser?: UserAccount;
  settings?: AgencySettings | null;
  loading?: boolean;
  error?: string | null;
}

const ACTIVITY_CONFIG: Record<
  string,
  { label: string; icon: any; color: string; bgColor: string }
> = {
  PAYMENT: {
    label: "Paiements",
    icon: WalletCards,
    color: "text-[#C9A96E]",
    bgColor: "bg-[#C9A96E]/20",
  },
  CONTRACT: {
    label: "Contrats",
    icon: FileSignature,
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
  },
  TENANT_CREATED: {
    label: "Locataires",
    icon: User,
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
  },
  OWNER_CREATED: {
    label: "Propriétaires",
    icon: UserCheck,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
  },
  PROPERTY_CREATED: {
    label: "Biens immobiliers",
    icon: Home,
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/20",
  },
  BUILDING_CREATED: {
    label: "Immeubles",
    icon: Building2,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
  },
  UNIT_CREATED: {
    label: "Unités",
    icon: Landmark,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
  },
  INVOICE_CREATED: {
    label: "Factures",
    icon: FileText,
    color: "text-pink-400",
    bgColor: "bg-pink-500/20",
  },
  MAINTENANCE: {
    label: "Travaux",
    icon: Wrench,
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
  },
  INSPECTION: {
    label: "États des lieux",
    icon: ClipboardList,
    color: "text-teal-400",
    bgColor: "bg-teal-500/20",
  },
  DISBURSEMENT: {
    label: "Reversements",
    icon: TrendingUp,
    color: "text-sky-400",
    bgColor: "bg-sky-500/20",
  },
  CASH_MOVEMENT: {
    label: "Mouvements de caisse",
    icon: Receipt,
    color: "text-lime-400",
    bgColor: "bg-lime-500/20",
  },
  REMINDER: {
    label: "Relances",
    icon: BellRing,
    color: "text-violet-400",
    bgColor: "bg-violet-500/20",
  },
  OTHER: {
    label: "Autres opérations",
    icon: Clock,
    color: "text-slate-400",
    bgColor: "bg-slate-500/20",
  },
};

// ============================================================
// NETTOYAGE DES TITRES
// ============================================================
const PREFIXES_A_ENLEVER = [
  /^Paiements?\s*:\s*/i,
  /^Biens?\s*:\s*/i,
  /^Propri[ée]taires?\s*:\s*/i,
  /^Locataires?\s*:\s*/i,
  /^Contrats?\s*:\s*/i,
  /^Immeubles?\s*:\s*/i,
  /^Unit[ée]s?\s*:\s*/i,
  /^Factures?\s*:\s*/i,
  /^Travaux\s*:\s*/i,
  /^P[ée]nalit[ée]s?\s*:\s*/i,
  /^Inspections?\s*:\s*/i,
  /^Reversements?\s*:\s*/i,
  /^Mouvements?\s*:\s*/i,
  /^Relances?\s*:\s*/i,
  /^Utilisateurs?\s*:\s*/i,
  /^Properties?\s*:\s*/i,
  /^Owners?\s*:\s*/i,
  /^Tenants?\s*:\s*/i,
  /^Contracts?\s*:\s*/i,
  /^Buildings?\s*:\s*/i,
  /^Units?\s*:\s*/i,
  /^Invoices?\s*:\s*/i,
  /^Profiles?\s*:\s*/i,
];

const TITLE_TRANSLATIONS: Record<string, string> = {
  PAYMENT_ENCAISSE: "Loyer encaissé",
  PAYMENT_DELETED: "Paiement supprimé",
  PAYMENT_UPDATED: "Paiement modifié",
  PROPERTY_CREATED: "Nouveau bien enregistré",
  PROPERTY_UPDATED: "Bien modifié",
  PROPERTY_DELETED: "Bien supprimé",
  OWNER_CREATED: "Nouveau propriétaire",
  OWNER_UPDATED: "Propriétaire modifié",
  OWNER_DELETED: "Propriétaire supprimé",
  TENANT_CREATED: "Nouveau locataire",
  TENANT_UPDATED: "Locataire modifié",
  TENANT_EXITED: "Départ du locataire",
  CONTRACT_CREATED: "Nouveau contrat",
  BUILDING_CREATED: "Nouvel immeuble",
  UNIT_CREATED: "Nouvelle unité",
  INVOICE_CREATED: "Nouvelle facture",
  INVOICE_PAID: "Facture payée",
  INVOICE_DELETED: "Facture supprimée",
  MAINTENANCE_CREATED: "Nouveaux travaux",
  PENALTY_CREATED: "Nouvelle pénalité",
  PENALTY_DELETED: "Pénalité supprimée",
  INSPECTION_CREATED: "Nouvelle inspection",
  DISBURSEMENT_CREATED: "Nouveau reversement",
  CASH_MOVEMENT_CREATED: "Mouvement de caisse",
  REMINDER_CREATED: "Nouvelle relance",
  USER_CREATED: "Nouvel utilisateur",
};

// ============================================================
// Traduction contextuelle
// ============================================================
function traduireActionContextuelle(
  action: string,
  description: string,
): string {
  const desc = (description || "").toLowerCase();
  const a = action.toUpperCase();

  let contexte = "élément";
  let genre = "un";

  if (desc.includes("payments") || desc.includes("payment")) {
    contexte = "paiement";
    genre = "un";
  } else if (desc.includes("properties") || desc.includes("property")) {
    contexte = "bien";
    genre = "un";
  } else if (desc.includes("owners") || desc.includes("owner")) {
    contexte = "propriétaire";
    genre = "un";
  } else if (desc.includes("tenants") || desc.includes("tenant")) {
    contexte = "locataire";
    genre = "un";
  } else if (desc.includes("contracts") || desc.includes("contract")) {
    contexte = "contrat";
    genre = "un";
  } else if (desc.includes("buildings") || desc.includes("building")) {
    contexte = "immeuble";
    genre = "un";
  } else if (desc.includes("units") || desc.includes("unit")) {
    contexte = "unité";
    genre = "une";
  } else if (desc.includes("invoices") || desc.includes("invoice")) {
    contexte = "facture";
    genre = "une";
  } else if (desc.includes("maintenance")) {
    contexte = "travaux";
    genre = "des";
  } else if (desc.includes("penalties") || desc.includes("penalty")) {
    contexte = "pénalité";
    genre = "une";
  } else if (desc.includes("inspections") || desc.includes("inspection")) {
    contexte = "inspection";
    genre = "une";
  }

  if (a === "INSERT") {
    return genre === "des"
      ? `Création de ${contexte}`
      : `Création d'${genre === "une" ? "une" : "un"} ${contexte}`;
  }
  if (a === "UPDATE") {
    return genre === "des"
      ? `Modification de ${contexte}`
      : `Modification d'${genre === "une" ? "une" : "un"} ${contexte}`;
  }
  if (a === "DELETE") {
    return genre === "des"
      ? `Suppression de ${contexte}`
      : `Suppression d'${genre === "une" ? "une" : "un"} ${contexte}`;
  }
  return action;
}

// ============================================================
// Traduction d'un titre
// ============================================================
function traduireTitre(titre: string, description: string = ""): string {
  if (!titre) return titre;

  // Corriger encodage cassé
  let cleaned = titre;
  cleaned = cleaned.replace(/Propri\?taires/gi, "Propriétaires");
  cleaned = cleaned.replace(/P\?nalit/gi, "Pénalité");
  cleaned = cleaned.replace(/Biens\s*:/gi, "Biens :");

  // Enlever les préfixes
  for (const regex of PREFIXES_A_ENLEVER) {
    cleaned = cleaned.replace(regex, "");
  }

  // Traductions exactes
  if (TITLE_TRANSLATIONS[cleaned]) return TITLE_TRANSLATIONS[cleaned];
  if (TITLE_TRANSLATIONS[titre]) return TITLE_TRANSLATIONS[titre];

  // INSERT/UPDATE/DELETE seuls
  if (/^INSERT$/i.test(cleaned) || /^Création$/i.test(cleaned)) {
    return traduireActionContextuelle("INSERT", description);
  }
  if (/^UPDATE$/i.test(cleaned) || /^Modification$/i.test(cleaned)) {
    return traduireActionContextuelle("UPDATE", description);
  }
  if (/^DELETE$/i.test(cleaned) || /^Suppression$/i.test(cleaned)) {
    return traduireActionContextuelle("DELETE", description);
  }

  // Traductions partielles
  for (const [key, value] of Object.entries(TITLE_TRANSLATIONS)) {
    if (cleaned.includes(key)) {
      return cleaned.replace(key, value);
    }
  }

  return cleaned;
}

// ============================================================
// Enrichissement des descriptions
// ============================================================
function enrichirDescription(a: ActivityLog): string {
  const desc = a.description || "";
  const title = a.title || "";

  // Description déjà utile (contient ":" et n'est pas générique)
  if (desc.length > 25 && !/^Action (INSERT|UPDATE|DELETE) sur/i.test(desc)) {
    return desc;
  }

  const t = `${title} ${desc}`.toUpperCase();
  const parts: string[] = [];

  // 1. Type d'action
  if (/INSERT/i.test(t)) parts.push("Création");
  else if (/UPDATE/i.test(t)) parts.push("Modification");
  else if (/DELETE/i.test(t)) parts.push("Suppression");
  else if (/ENCAISSE|PAYMENT.*PAYE/i.test(t)) parts.push("Encaissement");

  // 2. Contexte
  let contexte = "";
  if (/PAYMENTS?\b/i.test(t)) contexte = "d'un paiement";
  else if (/PROPERTIES?\b/i.test(t)) contexte = "d'un bien immobilier";
  else if (/OWNERS?\b/i.test(t)) contexte = "d'un propriétaire";
  else if (/TENANTS?\b/i.test(t)) contexte = "d'un locataire";
  else if (/CONTRACTS?\b/i.test(t)) contexte = "d'un contrat";
  else if (/BUILDINGS?\b/i.test(t)) contexte = "d'un immeuble";
  else if (/UNITS?\b/i.test(t)) contexte = "d'une unité";
  else if (/INVOICES?\b/i.test(t)) contexte = "d'une facture";
  else if (/MAINTENANCE/i.test(t)) contexte = "de travaux";
  else if (/PENALT/i.test(t)) contexte = "d'une pénalité";
  else if (/INSPECTION/i.test(t)) contexte = "d'une inspection";
  else if (/DISBURSEMENT|REVERSEMENT/i.test(t)) contexte = "d'un reversement";
  else if (/CASH/i.test(t)) contexte = "d'un mouvement de caisse";
  else if (/REMINDER|RELANCE/i.test(t)) contexte = "d'une relance";

  if (contexte) parts.push(contexte);

  // 3. Extras
  const extras: string[] = [];
  if (a.userNom) extras.push(`par ${a.userNom}`);
  if (a.entityRef) extras.push(`réf. ${a.entityRef}`);

  let result = parts.join(" ");
  if (extras.length > 0) {
    result += " — " + extras.join(" · ");
  }

  return result || desc || "—";
}

// ============================================================
// Catégorisation
// ============================================================
function categoriserActivite(
  title: string,
  description: string,
  currentType: string,
): string {
  const combined = `${title || ""} ${description || ""}`.toUpperCase();

  if (
    combined.includes("PAYMENT") ||
    combined.includes("PAIEMENT") ||
    combined.includes("ENCAISSE") ||
    combined.includes("LOYER")
  )
    return "PAYMENT";
  if (
    combined.includes("CONTRACT") ||
    combined.includes("CONTRAT") ||
    combined.includes("BAIL")
  )
    return "CONTRACT";
  if (combined.includes("TENANT") || combined.includes("LOCATAIRE"))
    return "TENANT_CREATED";
  if (
    combined.includes("OWNER") ||
    combined.includes("PROPRI") ||
    combined.includes("PROPRIÉTAIRE")
  )
    return "OWNER_CREATED";
  if (
    combined.includes("PROPERTIES") ||
    combined.includes("PROPERTY") ||
    combined.includes("BIEN")
  )
    return "PROPERTY_CREATED";
  if (combined.includes("BUILDING") || combined.includes("IMMEUBLE"))
    return "BUILDING_CREATED";
  if (combined.includes("UNITS") || combined.includes("UNITÉ"))
    return "UNIT_CREATED";
  if (combined.includes("INVOICE") || combined.includes("FACTURE"))
    return "INVOICE_CREATED";
  if (combined.includes("MAINTENANCE") || combined.includes("TRAVAUX"))
    return "MAINTENANCE";
  if (combined.includes("PENALTY") || combined.includes("PENALIT"))
    return "PENALTY_CREATED";
  if (combined.includes("INSPECTION")) return "INSPECTION";
  if (combined.includes("DISBURSEMENT") || combined.includes("REVERSEMENT"))
    return "DISBURSEMENT";
  if (combined.includes("CASH") || combined.includes("CAISSE"))
    return "CASH_MOVEMENT";
  if (combined.includes("REMINDER") || combined.includes("RELANCE"))
    return "REMINDER";

  return currentType || "OTHER";
}

// ============================================================
// Déduplication
// ============================================================
function estTitreTechnique(titre: string): boolean {
  if (!titre) return false;
  const t = titre.trim();

  // Titres courts génériques
  if (/^(INSERT|UPDATE|DELETE)$/i.test(t)) return true;
  if (/^(Création|Modification|Suppression)$/i.test(t)) return true;

  // "XXX : INSERT" ou "XXX : UPDATE"
  if (/\s*:\s*(INSERT|UPDATE|DELETE)\s*$/i.test(t)) return true;

  // Tout en majuscules avec _ (PAYMENTS : INSERT, PAYMENT_ENCAISSE)
  if (/^[A-Z_]+\s*:\s*[A-Z_]+\s*$/i.test(t)) return true;
  if (/^[A-Z_]+$/i.test(t) && t.includes("_")) return true;

  // "Loyer encaissé" / "Encaissement de loyer" → doublons de "Paiement Payé"
  if (/^(Encaissement de loyer|Loyer encaissé)$/i.test(t)) return true;

  // "Propriétaires : OWNER_CREATED"
  if (/^(Propri[ée]taires?|Biens?|Locataires?)\s*:\s*[A-Z_]+$/i.test(t))
    return true;

  return false;
}

function filtrerDoublons(activities: ActivityLog[]): ActivityLog[] {
  const metier = activities.filter((a) => !estTitreTechnique(a.title));
  const technique = activities.filter((a) => estTitreTechnique(a.title));

  // Signature : montant + date (SANS user car il varie)
  const signatureKey = (a: ActivityLog) =>
    `${a.montant || 0}|${a.activityDate || ""}`;

  const signaturesMetier = new Set(
    metier.filter((m) => m.montant && m.montant > 0).map(signatureKey),
  );

  // Helper : convertir "HH:MM:SS" en minutes
  const toMinutes = (h: string) => {
    const parts = (h || "").split(":").map((p) => parseInt(p) || 0);
    return parts[0] * 60 + parts[1];
  };

  const techniquesFiltrees = technique.filter((tech) => {
    // Doublon si même montant + date qu'une action métier
    if (signaturesMetier.has(signatureKey(tech))) return false;

    // Si titre contient PAYMENTS/PAYMENT_ et montant null, cacher si
    // une action métier a été faite dans les 10 minutes suivantes
    if (/PAYMENTS?\s*:|PAYMENT_/i.test(tech.title)) {
      const techMin = toMinutes(tech.activityHour);
      const hasMetier = metier.some((m) => {
        if (m.activityDate !== tech.activityDate) return false;
        const metierMin = toMinutes(m.activityHour);
        return metierMin - techMin >= 0 && metierMin - techMin <= 10;
      });
      if (hasMetier) return false;
    }

    return true;
  });

  return [...metier, ...techniquesFiltrees];
}

export const ActivityLogView: React.FC<ActivityLogViewProps> = ({
  activities,
  currentUser,
  settings,
  loading = false,
  error = null,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateRangeMode, setDateRangeMode] = useState<
    "day" | "week" | "month" | "all"
  >("day");
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(
    null,
  );

  const getDateRange = () => {
    if (dateRangeMode === "all") return null;
    const ref = new Date(selectedDate);
    const start = new Date(ref);
    const end = new Date(ref);

    if (dateRangeMode === "week") {
      start.setDate(ref.getDate() - ref.getDay());
      end.setDate(start.getDate() + 6);
    } else if (dateRangeMode === "month") {
      start.setDate(1);
      end.setMonth(ref.getMonth() + 1, 0);
    }

    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  };

  const filteredActivities = activities.filter((a) => {
    const range = getDateRange();
    if (range) {
      if (a.activityDate < range.start || a.activityDate > range.end)
        return false;
    }
    if (typeFilter !== "all" && a.activityType !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        (a.description || "").toLowerCase().includes(q) ||
        (a.userNom || "").toLowerCase().includes(q) ||
        (a.entityRef || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredActivitiesSansDoublons = filtrerDoublons(filteredActivities);

  const sortedActivities = React.useMemo(() => {
    return [...filteredActivitiesSansDoublons].sort((a, b) => {
      if (a.activityDate !== b.activityDate)
        return b.activityDate.localeCompare(a.activityDate);
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });
  }, [filteredActivitiesSansDoublons]);

  const statsByType: Record<string, number> = {};
  filteredActivitiesSansDoublons.forEach((a) => {
    const cat = categoriserActivite(
      a.title,
      a.description || "",
      a.activityType,
    );
    statsByType[cat] = (statsByType[cat] || 0) + 1;
  });

  const totalMontant = filteredActivitiesSansDoublons
    .filter((a) => a.montant && a.montant > 0)
    .reduce((sum, a) => sum + (a.montant || 0), 0);

  const handleExportCSV = () => {
    const headers = [
      "Date",
      "Heure",
      "Type",
      "Titre",
      "Description",
      "Utilisateur",
      "Montant",
    ];
    const rows = sortedActivities.map((a) => [
      a.activityDate,
      a.activityHour || "",
      ACTIVITY_CONFIG[
        categoriserActivite(a.title, a.description || "", a.activityType)
      ]?.label || a.activityType,
      traduireTitre(a.title, a.description),
      enrichirDescription(a),
      a.userNom || "",
      a.montant || 0,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(",")]
        .concat(rows.map((r) => r.map((c) => `"${c}"`).join(",")))
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `activites_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintJournal = () => {
    printElementById(
      "activity-journal-printable",
      `Journal d'activités — ${formatDate(selectedDate)}`,
      `
      @page{size:A4 portrait;margin:10mm 12mm;}
      #activity-journal-printable{
        width:100% !important;margin:0 auto !important;
        font-family:'DM Sans',sans-serif !important;font-size:11px !important;
        color:#000 !important;background:#fff !important;padding:0 !important;display:block !important;
      }
      #activity-journal-printable *{color:inherit !important;}
      #activity-journal-printable .journal-header,
      #activity-journal-printable .journal-header *,
      #activity-journal-printable .type-title,
      #activity-journal-printable .type-title *,
      #activity-journal-printable .journal-total,
      #activity-journal-printable .journal-total *,
      #activity-journal-printable .journal-footer,
      #activity-journal-printable .journal-footer *{color:#ffffff !important;}
      #activity-journal-printable .journal-header .agency-slogan,
      #activity-journal-printable .journal-total .total-montant{color:#c9a96e !important;}
      #activity-journal-printable .journal-title{color:#171717 !important;}
      .journal-header{
        background:#171717 !important;color:#fff !important;
        padding:5mm 8mm !important;margin-bottom:4mm !important;
        display:flex !important;justify-content:space-between !important;align-items:center !important;
      }
      .journal-header *{color:#fff !important;}
      .journal-header .agency-name{font-size:16px !important;font-weight:900 !important;}
      .journal-header .agency-slogan{font-size:10px !important;color:#c9a96e !important;font-weight:700 !important;}
      .journal-header .date-info{font-size:11px !important;text-align:right !important;}
      .journal-title{
        background:#c9a96e !important;color:#171717 !important;
        padding:4mm !important;text-align:center !important;
        font-size:18px !important;font-weight:900 !important;
        letter-spacing:0.1em !important;text-transform:uppercase !important;margin-bottom:5mm !important;
      }
      .type-section{margin-bottom:5mm !important;}
      .type-title{
        background:#171717 !important;color:#fff !important;
        padding:2mm 4mm !important;font-size:12px !important;
        font-weight:900 !important;text-transform:uppercase !important;letter-spacing:0.05em !important;
      }
      .type-title *{color:#fff !important;}
      table.journal-table{width:100% !important;border-collapse:collapse !important;margin-top:0 !important;}
      table.journal-table th{
        background:#e5e5e5 !important;color:#171717 !important;
        padding:2mm 3mm !important;font-size:10px !important;font-weight:700 !important;
        text-align:left !important;border:1px solid #999 !important;
      }
      table.journal-table td{
        padding:2mm 3mm !important;font-size:10px !important;
        border:1px solid #ccc !important;color:#171717 !important;
      }
      table.journal-table tbody tr:nth-child(even){background:#f8f8f8 !important;}
      .journal-total{
        background:#171717 !important;color:#fff !important;
        padding:3mm 5mm !important;margin-top:5mm !important;
        display:flex !important;justify-content:space-between !important;
        font-size:12px !important;font-weight:900 !important;
      }
      .journal-total *{color:#fff !important;}
      .journal-total .total-montant{color:#c9a96e !important;font-size:14px !important;}
      .journal-footer{
        background:#171717 !important;color:#fff !important;
        padding:3mm 5mm !important;margin-top:5mm !important;
        text-align:center !important;font-size:9px !important;
      }
      .journal-footer *{color:#fff !important;}
      `,
    );
  };

  const setQuickDate = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200"
        >
          {error}
        </div>
      )}
      {loading && (
        <p role="status" className="text-xs text-[#A8B4C4]">
          Chargement du journal d'activité...
        </p>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#C9A96E]/15 text-[#C9A96E] flex items-center justify-center">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <div className="text-base font-bold text-white">
              SITUATION DU JOUR
            </div>
            <div className="text-xs text-[#A8B4C4] mt-0.5">
              {filteredActivitiesSansDoublons.length} activité(s) · Total
              montants : {formatNumber(totalMontant)} FCFA
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintJournal}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimer le journal</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] border border-[#C9A96E]/30 text-xs font-semibold text-[#E8D5B0] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#C9A96E]" />
            <span>Recherche par date</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setQuickDate(0)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedDate === new Date().toISOString().split("T")[0] &&
                dateRangeMode === "day"
                  ? "bg-[#C9A96E] text-[#0F1B2D]"
                  : "bg-[#1E2E45] text-[#A8B4C4] hover:text-white"
              }`}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => setQuickDate(-1)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedDate ===
                  new Date(Date.now() - 86400000).toISOString().split("T")[0] &&
                dateRangeMode === "day"
                  ? "bg-[#C9A96E] text-[#0F1B2D]"
                  : "bg-[#1E2E45] text-[#A8B4C4] hover:text-white"
              }`}
            >
              Hier
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-bold text-[#A8B4C4] uppercase block mb-1">
              Date de référence
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white text-sm focus:outline-none focus:border-[#C9A96E]"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#A8B4C4] uppercase block mb-1">
              Période
            </label>
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20">
              {[
                { id: "day" as const, label: "Jour" },
                { id: "week" as const, label: "Sem." },
                { id: "month" as const, label: "Mois" },
                { id: "all" as const, label: "Tout" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setDateRangeMode(m.id)}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    dateRangeMode === m.id
                      ? "bg-[#C9A96E] text-[#0F1B2D]"
                      : "text-[#A8B4C4] hover:text-white"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#A8B4C4] uppercase block mb-1">
              Recherche
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#6B7C94] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white text-sm focus:outline-none focus:border-[#C9A96E]"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-white/5">
          <button
            onClick={() => setTypeFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              typeFilter === "all"
                ? "bg-[#C9A96E] text-[#0F1B2D] font-bold"
                : "bg-[#1E2E45] text-[#A8B4C4] hover:text-white"
            }`}
          >
            Tous ({filteredActivitiesSansDoublons.length})
          </button>
          {Object.entries(statsByType).map(([type, count]) => {
            const cfg = ACTIVITY_CONFIG[type] || ACTIVITY_CONFIG.OTHER;
            const Icon = cfg.icon;
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  typeFilter === type
                    ? "bg-[#C9A96E] text-[#0F1B2D] font-bold"
                    : "bg-[#1E2E45] text-[#A8B4C4] hover:text-white"
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>
                  {cfg.label} ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-[#C9A96E]/15 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#C9A96E]" />
            Chronologie des Activités
          </h2>
          <span className="text-xs text-[#A8B4C4]">
            {dateRangeMode === "day" &&
              `Journée du ${formatDate(selectedDate)}`}
            {dateRangeMode === "week" &&
              `Semaine du ${formatDate(selectedDate)}`}
            {dateRangeMode === "month" && `Mois de ${formatDate(selectedDate)}`}
            {dateRangeMode === "all" && "Toutes les activités"}
          </span>
        </div>
        <div className="divide-y divide-[#C9A96E]/10 max-h-[600px] overflow-y-auto">
          {sortedActivities.length === 0 ? (
            <div className="py-16 text-center text-[#6B7C94]">
              <CalendarDays className="w-10 h-10 mx-auto text-[#6B7C94]/50 mb-3" />
              <p className="text-sm font-semibold text-white">
                Aucune activité trouvée
              </p>
              <p className="text-xs text-[#6B7C94] mt-1">
                Aucune action n'a été enregistrée pour cette période.
              </p>
            </div>
          ) : (
            sortedActivities.map((a) => {
              const cat = categoriserActivite(
                a.title,
                a.description || "",
                a.activityType,
              );
              const cfg = ACTIVITY_CONFIG[cat] || ACTIVITY_CONFIG.OTHER;
              const Icon = cfg.icon;
              return (
                <div
                  key={a.id}
                  className="p-4 hover:bg-[#1E2E45]/40 transition-colors cursor-pointer"
                  onClick={() => setSelectedActivity(a)}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl ${cfg.bgColor} flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className={`w-5 h-5 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${cfg.bgColor} ${cfg.color} uppercase`}
                            >
                              {cfg.label}
                            </span>
                            <span className="text-xs font-mono text-[#6B7C94]">
                              {a.activityHour || ""}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-white mt-1">
                            {traduireTitre(a.title, a.description || "")}
                          </div>
                          <div className="text-xs text-[#A8B4C4] mt-0.5 truncate">
                            {enrichirDescription(a)}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-[#6B7C94]">
                            {a.userNom && (
                              <span className="flex items-center gap-1">
                                <UserCheck className="w-3 h-3" />
                                {a.userNom}
                              </span>
                            )}
                            {a.entityRef && (
                              <span className="font-mono">{a.entityRef}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {a.montant && a.montant > 0 ? (
                            <div className="text-sm font-bold font-mono text-[#C9A96E]">
                              {formatNumber(a.montant)}{" "}
                              <span className="text-[10px]">FCFA</span>
                            </div>
                          ) : null}
                          <div className="text-[10px] text-[#6B7C94] mt-1">
                            {formatDate(a.activityDate)}
                          </div>
                          <ArrowRight className="w-4 h-4 text-[#6B7C94] mt-2 ml-auto" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#162133] border border-[#C9A96E]/40 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-4 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80">
              {(() => {
                const cat = categoriserActivite(
                  selectedActivity.title,
                  selectedActivity.description || "",
                  selectedActivity.activityType,
                );
                const cfg = ACTIVITY_CONFIG[cat] || ACTIVITY_CONFIG.OTHER;
                const Icon = cfg.icon;
                return (
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-10 h-10 rounded-xl ${cfg.bgColor} flex items-center justify-center`}
                    >
                      <Icon className={`w-5 h-5 ${cfg.color}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">
                        {cfg.label}
                      </h3>
                      <p className="text-[10px] text-[#A8B4C4] font-mono">
                        {formatDate(selectedActivity.activityDate)}{" "}
                        {selectedActivity.activityHour}
                      </p>
                    </div>
                  </div>
                );
              })()}
              <button
                onClick={() => setSelectedActivity(null)}
                className="p-1.5 rounded-lg text-[#A8B4C4] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div>
                <div className="text-[10px] text-[#6B7C94] uppercase font-bold mb-1">
                  Titre
                </div>
                <div className="text-white font-bold">
                  {traduireTitre(
                    selectedActivity.title,
                    selectedActivity.description || "",
                  )}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#6B7C94] uppercase font-bold mb-1">
                  Description
                </div>
                <div className="text-[#A8B4C4] leading-relaxed">
                  {enrichirDescription(selectedActivity)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {selectedActivity.userNom && (
                  <div className="p-3 bg-[#1E2E45]/40 rounded-xl border border-[#C9A96E]/10">
                    <div className="text-[10px] text-[#6B7C94] uppercase font-bold mb-1">
                      Utilisateur
                    </div>
                    <div className="text-white font-semibold">
                      {selectedActivity.userNom}
                    </div>
                  </div>
                )}
                {selectedActivity.entityRef && (
                  <div className="p-3 bg-[#1E2E45]/40 rounded-xl border border-[#C9A96E]/10">
                    <div className="text-[10px] text-[#6B7C94] uppercase font-bold mb-1">
                      Référence
                    </div>
                    <div className="text-white font-mono">
                      {selectedActivity.entityRef}
                    </div>
                  </div>
                )}
                {selectedActivity.montant !== undefined &&
                  selectedActivity.montant > 0 && (
                    <div className="p-3 bg-[#C9A96E]/10 rounded-xl border border-[#C9A96E]/30 col-span-2">
                      <div className="text-[10px] text-[#C9A96E] uppercase font-bold mb-1">
                        Montant
                      </div>
                      <div className="text-[#E8D5B0] font-bold font-mono text-lg">
                        {formatCurrency(selectedActivity.montant)}
                      </div>
                    </div>
                  )}
              </div>
            </div>
            <div className="p-4 border-t border-[#C9A96E]/20 bg-[#1E2E45]/40 flex justify-end">
              <button
                onClick={() => setSelectedActivity(null)}
                className="px-4 py-2 rounded-xl bg-[#0F1B2D] text-[#A8B4C4] hover:text-white text-xs font-semibold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <div id="activity-journal-printable" style={{ display: "none" }}>
        <div className="journal-header">
          <div>
            <div className="agency-name">{settings?.nomAgence || "AGENCE"}</div>
            <div className="agency-slogan">
              {settings?.slogan1 || "Journal d'activités quotidien"}
            </div>
          </div>
          <div className="date-info">
            <div>
              <strong>Date :</strong> {formatDate(selectedDate)}
            </div>
            <div>
              <strong>Édité le :</strong>{" "}
              {new Date().toLocaleDateString("fr-FR")}
            </div>
          </div>
        </div>

        <div className="journal-title">SITUATION DU JOUR</div>

        {(() => {
          const groups: Record<string, ActivityLog[]> = {};
          sortedActivities.forEach((a) => {
            const type = categoriserActivite(
              a.title,
              a.description || "",
              a.activityType,
            );
            if (!groups[type]) groups[type] = [];
            groups[type].push(a);
          });

          if (Object.keys(groups).length === 0) {
            return (
              <div
                style={{
                  textAlign: "center",
                  padding: "20mm",
                  fontSize: "12px",
                  color: "#666",
                }}
              >
                Aucune activité enregistrée pour cette date.
              </div>
            );
          }

          return Object.entries(groups).map(([type, items]) => {
            const cfg = ACTIVITY_CONFIG[type] || ACTIVITY_CONFIG.OTHER;
            return (
              <div key={type} className="type-section">
                <div className="type-title">
                  {cfg.label} ({items.length})
                </div>
                <table className="journal-table">
                  <thead>
                    <tr>
                      <th style={{ width: "12%" }}>Heure</th>
                      <th style={{ width: "35%" }}>Titre</th>
                      <th style={{ width: "38%" }}>Description</th>
                      <th style={{ width: "15%", textAlign: "right" }}>
                        Montant
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((a) => (
                      <tr key={a.id}>
                        <td>{a.activityHour || "—"}</td>
                        <td>{traduireTitre(a.title, a.description || "")}</td>
                        <td>{enrichirDescription(a)}</td>
                        <td style={{ textAlign: "right" }}>
                          {a.montant && a.montant > 0
                            ? `${formatNumber(a.montant)} F`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          });
        })()}

        <div className="journal-total">
          <span>TOTAL MONTANTS DU JOUR</span>
          <span className="total-montant">
            {formatNumber(totalMontant)} FCFA
          </span>
        </div>

        <div className="journal-footer">
          {settings?.nomAgence || "Journal d'activités"} —{" "}
          {formatDate(selectedDate)}
        </div>
      </div>
    </div>
  );
};
