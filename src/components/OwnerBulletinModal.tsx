import React, { useState, useMemo } from "react";
import { X, Printer, FileText, Plus, Trash2, Save } from "lucide-react";
import {
  Owner,
  Property,
  Building,
  Unit,
  Tenant,
  Payment,
  Invoice,
  MaintenanceTicket,
  OwnerDeduction,
  BulletinVersement,
  UserAccount,
  AgencySettings,
} from "../types";
import { formatNumber, formatDate } from "../lib/utils";
import { UserSignatureBlock } from "./UserSignatureBlock";
import { getOwnerBulletinData } from "../lib/supabase/service";
import { useAgencySettings } from "../hooks/useAgencySettings";

interface OwnerBulletinModalProps {
  owner: Owner;
  properties: Property[];
  buildings: Building[];
  units: Unit[];
  tenants: Tenant[];
  payments: Payment[];
  invoices: Invoice[];
  maintenance: MaintenanceTicket[];
  deductions: OwnerDeduction[];
  selectedPeriod: string;
  currentUser?: UserAccount | null;
  settings?: AgencySettings | null;
  onClose: () => void;
  onSaveDeduction?: (deduction: OwnerDeduction) => void;
  onDeleteDeduction?: (deductionId: string) => void;
  onSaveBulletin?: (bulletin: BulletinVersement) => void;
  onRequestPayment?: (period: string) => void;
  isPaymentFormOpen?: boolean;
  paymentRefreshKey?: number;
}

// ============================================================
// HELPER : Montant en lettres
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
// HELPER : Ordre des étages
// ============================================================
function getOrdreEtage(etage: string): number {
  if (!etage) return 999;
  const e = etage.toLowerCase().trim();
  if (e === "sous-sol" || e === "sous sol") return -1;
  if (e === "rdc" || e === "rez-de-chaussée") return 0;
  if (e === "toit-terrasse") return 999;
  const match = e.match(/^(\d+)/);
  if (match) return parseInt(match[1]);
  return 500;
}

// ============================================================
// HELPER : Extraire ref courte
// ============================================================
function getRefCourte(ref: string | undefined): string {
  if (!ref) return "—";
  const cleaned = ref.replace(/[^0-9]/g, "");
  if (cleaned.length >= 4) return cleaned.slice(-4);
  return ref.slice(-4) || "—";
}

function periodToInputValue(period: string): string {
  const normalized = period
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  const inputMatch = normalized.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/);
  if (inputMatch) {
    const month = Number(inputMatch[2]);
    return month >= 1 && month <= 12
      ? `${inputMatch[1]}-${String(month).padStart(2, "0")}`
      : "";
  }

  const parts = normalized.split(/\s+/);
  const months: Record<string, string> = {
    janvier: "01",
    fevrier: "02",
    mars: "03",
    avril: "04",
    mai: "05",
    juin: "06",
    juillet: "07",
    aout: "08",
    septembre: "09",
    octobre: "10",
    novembre: "11",
    decembre: "12",
  };
  const month = months[parts[0]];
  const year = parts[1];
  return month && /^\d{4}$/.test(year || "") ? `${year}-${month}` : "";
}

function periodFromInputValue(value: string): string {
  if (!/^\d{4}-\d{2}$/.test(value)) return "";
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

interface LoyerLigne {
  ordre: number;
  ref: string;
  unitId: string;
  tenantId: string;
  unitNom: string;
  immeubleRef: string;
  immeubleNom: string;
  type: string;
  adresse: string;
  etage: string;
  locataire: string;
  locataireRef: string;
  loyer: number;
  net: number;
  observation: string;
  estNonPayeur: boolean;
}

interface ArriereLigne {
  locataire: string;
  ref: string;
  reglement: number;
  arrieres: number;
  net: number;
  observations: string;
}

interface DecaissementLigne {
  id: string;
  libelle: string;
  montant: number;
  type: "PROPRIETAIRE" | "AUTRE";
}

interface EncaissementLigne {
  id: string;
  libelle: string;
  montant: number;
}

export const OwnerBulletinModal: React.FC<OwnerBulletinModalProps> = ({
  owner,
  properties,
  buildings,
  units,
  tenants,
  payments,
  invoices,
  maintenance,
  deductions,
  selectedPeriod,
  currentUser,
  settings,
  onClose,
  onSaveDeduction,
  onDeleteDeduction,
  onSaveBulletin,
  onRequestPayment,
  isPaymentFormOpen = false,
  paymentRefreshKey = 0,
}) => {
  const { settings: agencySettings } = useAgencySettings(currentUser?.agencyId);
  const [bulletinPeriod, setBulletinPeriod] = useState(selectedPeriod);

  const [serverPayments, setServerPayments] = useState<Payment[]>([]);
  const [serverOwnerProps, setServerOwnerProps] = useState<Property[]>([]);
  const [serverOwnerBuildings, setServerOwnerBuildings] = useState<Building[]>(
    [],
  );
  const [serverOwnerUnits, setServerOwnerUnits] = useState<Unit[]>([]);
  const [serverOwnerTenants, setServerOwnerTenants] = useState<Tenant[]>([]);
  const [bulletinDataStatus, setBulletinDataStatus] = useState<
    "loading" | "server" | "local" | "error"
  >(currentUser?.agencyId ? "loading" : "local");
  const [bulletinDataError, setBulletinDataError] = useState("");

  React.useEffect(() => {
    if (!currentUser?.agencyId || !owner?.id) {
      setBulletinDataStatus("local");
      return;
    }
    let cancelled = false;
    setBulletinDataStatus("loading");
    setBulletinDataError("");
    (async () => {
      try {
        const data = await getOwnerBulletinData(currentUser.agencyId, owner.id);
        if (cancelled) return;
        if (!data) {
          setBulletinDataStatus("local");
          return;
        }
        const mappedPayments: Payment[] = (data.payments || []).map(
          (r: any) => ({
            ...r,
            id: r.id,
            montantPaye: Number(r.montant_paye) || 0,
            montantTotal: Number(r.montant_total) || 0,
            montantRestant: Number(r.montant_restant) || 0,
            loyerBase: Number(r.loyer_base) || 0,
            charges: Number(r.charges) || 0,
            tva: Number(r.tva) || 0,
            penalites: Number(r.penalites) || 0,
            datePaiement: r.date_paiement,
            periode: r.periode,
            statut: r.statut,
            modePaiement: r.mode_paiement,
            locataireId: r.locataire_id,
            bienId: r.bien_id,
            proprietaireId: r.proprietaire_id,
            contratId: r.contrat_id,
            locataireNom: r.locataire_nom || (r.locataire_nom_calc
              ? `${r.locataire_prenom_calc || ""} ${r.locataire_nom_calc}`.trim()
              : undefined),
            bienNom: r.bien_nom || r.bien_nom_calc,
          }),
        );
        setServerPayments(mappedPayments);
        setServerOwnerProps(
          (data.properties || []).map((p: any) => ({
            ...p,
            proprietaireId: p.proprietaire_id || p.proprietaireId,
            buildingId: p.building_id || p.buildingId,
            loyerBase: Number(p.loyer_base) || Number(p.loyerBase) || 0,
          })),
        );
        setServerOwnerBuildings(
          (data.buildings || []).map((b: any) => ({
            ...b,
            proprietaireId: b.proprietaire_id || b.proprietaireId,
            loyerBase: Number(b.loyer_base ?? b.loyerBase) || 0,
            tauxCommission:
              b.taux_commission == null
                ? b.tauxCommission
                : Number(b.taux_commission),
          })),
        );
        setServerOwnerUnits(
          (data.units || []).map((u: any) => ({
            ...u,
            proprietaireId: u.proprietaire_id || u.proprietaireId,
            buildingId: u.building_id || u.buildingId,
            loyerBase: Number(u.loyer_base) || Number(u.loyerBase) || 0,
            bienId: u.id || u.bien_id || u.bienId,
            locataireActuelId:
              u.locataire_actuel_id || u.locataireActuelId,
          })),
        );
        setServerOwnerTenants(
          (data.tenants || []).map((t: any) => ({
            ...t,
            bienId: t.bien_id || t.bienId,
            proprietaireId: t.proprietaire_id || t.proprietaireId,
            dateSortie: t.date_sortie || t.dateSortie,
            dateEntree: t.date_entree || t.dateEntree,
            loyerMensuel: Number(t.loyer_mensuel) || Number(t.loyerMensuel) || 0,
          })),
        );
        setBulletinDataStatus("server");
      } catch (e) {
        if (!cancelled) {
          setBulletinDataError(
            e instanceof Error
              ? e.message
              : "Impossible de récupérer les données du bulletin.",
          );
          setBulletinDataStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.agencyId, owner?.id, paymentRefreshKey]);

  const displayPayments =
    bulletinDataStatus === "server"
      ? serverPayments
      : bulletinDataStatus === "local"
        ? payments
        : [];
  const displayProperties =
    bulletinDataStatus === "server"
      ? serverOwnerProps
      : bulletinDataStatus === "local"
        ? properties
        : [];
  const displayBuildings =
    bulletinDataStatus === "server"
      ? serverOwnerBuildings
      : bulletinDataStatus === "local"
        ? buildings
        : [];
  const displayUnits =
    bulletinDataStatus === "server"
      ? serverOwnerUnits
      : bulletinDataStatus === "local"
        ? units
        : [];
  const displayTenants =
    bulletinDataStatus === "server"
      ? serverOwnerTenants
      : bulletinDataStatus === "local"
        ? tenants
        : [];

  const [showDeductionForm, setShowDeductionForm] = useState(false);
  const [deductionLibelle, setDeductionLibelle] = useState("");
  const [deductionMontant, setDeductionMontant] = useState(0);
  const [observationsSaisies, setObservationsSaisies] = useState<
    Record<string, string>
  >({});
  const [montantsPersonnalises, setMontantsPersonnalises] = useState<{
    periode: string;
    valeurs: Record<string, { loyer?: string; net?: string }>;
  }>({
    periode: periodToInputValue(bulletinPeriod) || bulletinPeriod,
    valeurs: {},
  });
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("");

  const ownerProperties = displayProperties.filter(
    (p) => p.proprietaireId === owner.id,
  );
  const ownerBuildings = displayBuildings.filter(
    (b) => b.proprietaireId === owner.id,
  );
  // Auto-sélection du premier immeuble si rien n'est choisi
  React.useEffect(() => {
    if (!selectedBuildingId && ownerBuildings.length > 0) {
      setSelectedBuildingId(ownerBuildings[0].id);
    }
  }, [ownerBuildings.length, selectedBuildingId]);
  const ownerUnits = displayUnits.filter((u) => {
    if (selectedBuildingId && u.buildingId !== selectedBuildingId) return false;
    // Unit direct propriétaire
    if (u.proprietaireId === owner.id) return true;
    // Fallback : via le bâtiment
    const b = displayBuildings.find((bb) => bb.id === u.buildingId);
    return b?.proprietaireId === owner.id;
  });
  // Le taux de commission prioritaire est celui de l'immeuble sélectionné.
  // Si l'immeuble n'en a pas, on retombe sur le taux du propriétaire.
  const selectedBuildingForCommission = selectedBuildingId
    ? displayBuildings.find((b) => b.id === selectedBuildingId)
    : null;
  const tauxCommission =
    selectedBuildingForCommission?.tauxCommission ??
    owner.tauxCommission ??
    10;
  const normalizePeriod = (s: string) =>
    (s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const isSamePeriod = (a: string, b: string) => {
    const periodA = periodToInputValue(a);
    const periodB = periodToInputValue(b);
    return periodA && periodB
      ? periodA === periodB
      : normalizePeriod(a) === normalizePeriod(b);
  };

  const getObservationPeriode = (paymentPeriode: string): string => {
    if (!paymentPeriode) return "";
    if (isSamePeriod(paymentPeriode, bulletinPeriod)) return "";

    const moisOrdre: Record<string, number> = {
      janvier: 1,
      fevrier: 2,
      mars: 3,
      avril: 4,
      mai: 5,
      juin: 6,
      juillet: 7,
      aout: 8,
      septembre: 9,
      octobre: 10,
      novembre: 11,
      decembre: 12,
    };

    const extract = (s: string) => {
      const parts = normalizePeriod(s).split(" ");
      return {
        mois: moisOrdre[parts[0]] || 0,
        annee: parseInt(parts[1]) || new Date().getFullYear(),
      };
    };

    const bullet = extract(bulletinPeriod);
    const pay = extract(paymentPeriode);

    const isAvance =
      pay.annee > bullet.annee ||
      (pay.annee === bullet.annee && pay.mois > bullet.mois);

    return isAvance
      ? `AVANCE LOYER ${paymentPeriode.toUpperCase()}`
      : `LOYER ${paymentPeriode.toUpperCase()}`;
  };

  const loyersData: LoyerLigne[] = useMemo(() => {
    const lines: LoyerLigne[] = [];
    const monthInput = periodToInputValue(bulletinPeriod);
    const [selectedYear, selectedMonth] = monthInput.split("-").map(Number);
    const selectedMonthIndex = selectedYear * 12 + selectedMonth - 1;
    const getDateMonthIndex = (dateValue?: string) => {
      if (!dateValue) return null;
      const isoDate = dateValue.match(/^(\d{4})-(\d{1,2})/);
      if (isoDate) {
        return Number(isoDate[1]) * 12 + Number(isoDate[2]) - 1;
      }
      const date = new Date(dateValue);
      return Number.isNaN(date.getTime())
        ? null
        : date.getFullYear() * 12 + date.getMonth();
    };

    const isTenantActiveForPeriod = (tenant: Tenant) => {
      const status = String(tenant.statut || "").toLocaleLowerCase("fr-FR");
      if (
        !tenant.dateSortie &&
        ["parti", "résilié", "archive", "archivé"].includes(status)
      ) {
        return false;
      }
      const endMonth = getDateMonthIndex(tenant.dateSortie);
      return endMonth === null || endMonth >= selectedMonthIndex;
    };

    const findActiveTenant = (
      bienId: string,
      locataireActuelId?: string,
    ) => {
      const currentTenant = locataireActuelId
        ? displayTenants.find(
            (tenant) =>
              tenant.id === locataireActuelId &&
              isTenantActiveForPeriod(tenant),
          )
        : undefined;
      return (
        currentTenant ||
        displayTenants.find(
          (tenant) =>
            tenant.bienId === bienId && isTenantActiveForPeriod(tenant),
        )
      );
    };

    const findPayment = (bienId: string, locataireId: string) =>
      displayPayments.find(
        (p) =>
          p.bienId === bienId &&
          p.locataireId === locataireId &&
          isSamePeriod(p.periode, bulletinPeriod) &&
          p.statut === "Payé",
      );

    const buildLine = (
      unitId: string,
      unitNom: string,
      immeubleRef: string,
      immeubleNom: string,
      type: string,
      adresse: string,
      etage: string,
      ordre: number,
      loyerBase: number,
      locataireActuelId?: string,
    ): LoyerLigne | null => {
      const tenant = findActiveTenant(unitId, locataireActuelId);
      const historicalPayment = tenant
        ? undefined
        : displayPayments.find(
            (p) =>
              p.bienId === unitId &&
              isSamePeriod(p.periode, bulletinPeriod) &&
              p.statut === "Payé" &&
              Boolean(p.locataireNom),
          );
      if (!tenant && !historicalPayment) return null;

      const payment = tenant
        ? findPayment(unitId, tenant.id)
        : historicalPayment;
      const estNonPayeur = !payment;

      const loyerAttendu =
        loyerBase > 0
          ? loyerBase
          : tenant?.loyerMensuel ||
            historicalPayment?.loyerBase ||
            historicalPayment?.montantTotal ||
            0;
      const netProprietaire = Math.round(
        loyerAttendu * (1 - tauxCommission / 100),
      );

      const estNouveau =
        tenant !== undefined &&
        getDateMonthIndex(tenant.dateEntree) === selectedMonthIndex;

      const refCourte = getRefCourte(tenant?.ref);
      const bienLoue = unitNom || "—";

      return {
        ref: refCourte,
        unitId,
        tenantId: tenant?.id || historicalPayment?.locataireId || "",
        unitNom: bienLoue,
        immeubleRef,
        immeubleNom,
        type,
        adresse,
        etage,
        locataire: tenant
          ? `${tenant.prenom} ${tenant.nom}`
          : historicalPayment?.locataireNom || "—",
        locataireRef: refCourte,
        loyer: loyerAttendu,
        net: netProprietaire,
        observation: estNonPayeur
          ? "LOYER ATTENDU - NON PAYÉ"
          : estNouveau
            ? "NOUVEAU LOCATAIRE"
            : "",
        estNonPayeur,
        ordre,
      };
    };

    ownerUnits.forEach((unit) => {
      const batiment = displayBuildings.find((b) => b.id === unit.buildingId);
      const line = buildLine(
        unit.id,
        unit.nom,
        batiment?.ref || "—",
        batiment?.nom || "—",
        unit.type || "Appartement",
        batiment?.adresse || "—",
        unit.etage || "RDC",
        getOrdreEtage(unit.etage || "RDC"),
        unit.loyerBase || 0,
        unit.locataireActuelId,
      );
      if (line) lines.push(line);
    });

    ownerBuildings
      .filter(
        (building) =>
          !selectedBuildingId || building.id === selectedBuildingId,
      )
      .forEach((building) => {
        const line = buildLine(
          building.id,
          building.nom,
          building.ref || "—",
          building.nom,
          building.type || "Immeuble",
          building.adresse || "—",
          "—",
          1000,
          building.loyerBase || 0,
        );
        if (line) lines.push(line);
      });

    ownerProperties.forEach((prop) => {
      const line = buildLine(
        prop.id,
        prop.nom,
        prop.ref || "—",
        "—",
        prop.type || "Appartement",
        prop.adresse || "—",
        "RDC",
        1000,
        prop.loyerBase || 0,
      );
      if (line) lines.push(line);
    });

    lines.sort((a, b) => {
      if (a.immeubleNom !== b.immeubleNom)
        return a.immeubleNom.localeCompare(b.immeubleNom);
      return a.ordre - b.ordre;
    });

    return lines;
  }, [
    ownerUnits,
    ownerBuildings,
    ownerProperties,
    displayTenants,
    displayPayments,
    displayBuildings,
    bulletinPeriod,
    tauxCommission,
  ]);

  const bulletinPeriodKey = periodToInputValue(bulletinPeriod) || bulletinPeriod;
  const getMontantPersonnalise = (
    tenantId: string,
    champ: "loyer" | "net",
  ): string | undefined =>
    montantsPersonnalises.periode === bulletinPeriodKey
      ? montantsPersonnalises.valeurs[tenantId]?.[champ]
      : undefined;
  const getBulletinMontant = (
    ligne: LoyerLigne,
    champ: "loyer" | "net",
  ): number => {
    const saisie = getMontantPersonnalise(ligne.tenantId, champ);
    if (saisie === undefined || saisie === "") return ligne[champ];
    const montant = Number(saisie);
    return Number.isSafeInteger(montant) && montant >= 0
      ? montant
      : ligne[champ];
  };
  const mettreAJourMontantPersonnalise = (
    tenantId: string,
    champ: "loyer" | "net",
    valeur: string | undefined,
  ) => {
    setMontantsPersonnalises((current) => {
      const valeurs =
        current.periode === bulletinPeriodKey ? { ...current.valeurs } : {};
      const montantsTenant = { ...valeurs[tenantId] };
      if (valeur === undefined) {
        delete montantsTenant[champ];
      } else {
        montantsTenant[champ] = valeur;
      }

      if (Object.keys(montantsTenant).length > 0) {
        valeurs[tenantId] = montantsTenant;
      } else {
        delete valeurs[tenantId];
      }

      return { periode: bulletinPeriodKey, valeurs };
    });
  };
  const calculerMontantAutomatique = (
    champ: "loyer" | "net",
  ): number => loyersData.reduce((sum, ligne) => sum + ligne[champ], 0);
  const totalLoyerAutomatique = calculerMontantAutomatique("loyer");
  const totalNetAutomatique = calculerMontantAutomatique("net");
  const totalLoyer = loyersData.reduce(
    (sum, ligne) => sum + getBulletinMontant(ligne, "loyer"),
    0,
  );
  const totalNet = loyersData.reduce(
    (sum, ligne) => sum + getBulletinMontant(ligne, "net"),
    0,
  );

  const arrieresData: ArriereLigne[] = useMemo(() => {
    const ownerPaymentsOtherPeriod = displayPayments.filter((p) => {
      if (p.proprietaireId !== owner.id) return false;
      if (p.statut !== "Payé") return false;
      if (isSamePeriod(p.periode, bulletinPeriod)) return false;
      const ownsUnit = ownerUnits.some((u) => u.id === p.bienId);
      const ownsProp = ownerProperties.some((pr) => pr.id === p.bienId);
      return ownsUnit || ownsProp;
    });

    return ownerPaymentsOtherPeriod.map((p) => {
      const montantPaye = p.montantPaye || 0;
      const net = Math.round(montantPaye * (1 - tauxCommission / 100));
      const tenantRef = displayTenants.find((t) => t.id === p.locataireId)?.ref;
      return {
        locataire: p.locataireNom,
        ref: getRefCourte(tenantRef),
        reglement: montantPaye,
        arrieres: 0,
        net,
        observations: getObservationPeriode(p.periode),
      };
    });
  }, [
    displayPayments,
    owner,
    ownerUnits,
    ownerProperties,
    displayTenants,
    bulletinPeriod,
    tauxCommission,
  ]);

  const totalArrieres = arrieresData.reduce((sum, a) => sum + a.reglement, 0);
  const totalArrieresNet = arrieresData.reduce((sum, a) => sum + a.net, 0);

  const ownerDeductions = deductions.filter(
    (d) =>
      d.proprietaireId === owner.id && isSamePeriod(d.periode, bulletinPeriod),
  );
  const ownerInvoices = invoices.filter(
    (inv) => inv.proprietaireId === owner.id && inv.statut !== "Payée",
  );
  const ownerMaintenance = maintenance.filter(
    (m) => m.proprietaireId === owner.id && m.imputableA === "Propriétaire",
  );

  const decaissementsLignes: DecaissementLigne[] = [
    ...ownerDeductions.map((d) => ({
      id: d.id,
      libelle: d.libelle,
      montant: d.montant,
      type: "AUTRE" as const,
    })),
    ...ownerInvoices.map((inv) => ({
      id: inv.id,
      libelle: `${inv.type} ${inv.numero}`,
      montant: inv.total || 0,
      type: "PROPRIETAIRE" as const,
    })),
    ...ownerMaintenance.map((m) => ({
      id: m.id,
      libelle: m.titre,
      montant: m.coutReel || m.coutEstime || 0,
      type: "PROPRIETAIRE" as const,
    })),
  ];

  const totalDecaissement = decaissementsLignes.reduce(
    (sum, d) => sum + d.montant,
    0,
  );

  const encaissementsLignes: EncaissementLigne[] = useMemo(() => {
    const cautions = displayPayments.filter((p) => {
      if (p.proprietaireId !== owner.id) return false;
      if (p.statut !== "Payé") return false;
      if (!isSamePeriod(p.periode, bulletinPeriod)) return false;
      const obs = (p.observation || "").toLowerCase();
      return (
        obs.includes("caution") ||
        obs.includes("avance") ||
        obs.includes("dossier")
      );
    });

    return cautions.map((p) => ({
      id: p.id,
      libelle: `CAUTION ${p.locataireNom.toUpperCase()}`,
      montant: p.montantPaye || 0,
    }));
  }, [displayPayments, owner, bulletinPeriod]);

  const totalEncaissement = encaissementsLignes.reduce(
    (sum, e) => sum + e.montant,
    0,
  );

  const netAReverser =
    totalNet + totalArrieresNet - totalDecaissement + totalEncaissement;
  const netAReverserAutomatique =
    totalNetAutomatique +
    totalArrieresNet -
    totalDecaissement +
    totalEncaissement;

  const agency = settings || agencySettings || null;
  const gerantNom = agency?.gerantNom || "Le Gérant";
  const gerantTitre = agency?.gerantTitre || "Gérant";
  const moisEnMajuscules = bulletinPeriod.toUpperCase();

  const dateNow = new Date();
  const dateFormatee = `${String(dateNow.getDate()).padStart(2, "0")}/${String(
    dateNow.getMonth() + 1,
  ).padStart(2, "0")}/${dateNow.getFullYear()}`;

  const handleAddDeduction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deductionLibelle || deductionMontant <= 0) return;
    if (!onSaveDeduction) return;

    const newDeduction: OwnerDeduction = {
      id: crypto.randomUUID(),
      proprietaireId: owner.id,
      periode: bulletinPeriod,
      typeDeduction: "AUTRE",
      libelle: deductionLibelle,
      montant: deductionMontant,
      dateDeduction: new Date().toISOString().split("T")[0],
    };

    onSaveDeduction(newDeduction);
    setShowDeductionForm(false);
    setDeductionLibelle("");
    setDeductionMontant(0);
  };

  const handleDeleteDeduction = (id: string) => {
    if (!onDeleteDeduction) return;
    if (window.confirm("Supprimer cette déduction ?")) onDeleteDeduction(id);
  };

  const handleSave = () => {
    if (!onSaveBulletin) return;
    const bulletin: BulletinVersement = {
      id: crypto.randomUUID(),
      reference: `BV-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
      proprietaireId: owner.id,
      proprietaireNom: `${owner.prenom} ${owner.nom}`,
      periode: bulletinPeriod,
      tauxCommission,
      totalLoyersBruts: totalLoyerAutomatique,
      totalCommission: totalLoyerAutomatique - totalNetAutomatique,
      totalTvaCommission: 0,
      totalDecaissements: totalDecaissement,
      totalEncaissements: totalEncaissement,
      netAReverser: netAReverserAutomatique,
      statut: "Validé",
      dateValidation: new Date().toISOString().split("T")[0],
      createdById: currentUser?.id,
      createdByNom: gerantNom,
      createdByRole: currentUser?.role,
    };
    onSaveBulletin(bulletin);
    alert("✅ Bulletin enregistré avec succès.");
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      style={isPaymentFormOpen ? { display: "none" } : undefined}
    >
      <div className="bulletin-print-modal bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-6xl max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header écran */}
        <div className="p-5 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80 sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/20 text-[#E8D5B0] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Bulletin de Versement — {owner.prenom} {owner.nom}
              </h2>
              <p className="text-xs text-[#A8B4C4]">
                Période : {bulletinPeriod} · Taux : {tauxCommission}%
              </p>
              <label className="mt-2 flex items-center gap-2 text-xs text-[#A8B4C4] print:hidden">
                <span>Mois du bulletin</span>
                <input
                  type="month"
                  aria-label="Mois du bulletin propriétaire"
                  value={periodToInputValue(bulletinPeriod)}
                  onChange={(event) => {
                    if (event.target.value) {
                      const nextPeriod = periodFromInputValue(
                        event.target.value,
                      );
                      setBulletinPeriod(nextPeriod);
                      setMontantsPersonnalises({
                        periode: event.target.value,
                        valeurs: {},
                      });
                    }
                  }}
                  className="rounded border border-[#C9A96E]/30 bg-[#1E2E45] px-2 py-1 text-white"
                />
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={
                bulletinDataStatus === "loading" ||
                bulletinDataStatus === "error"
              }
              className="px-4 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] border border-[#C9A96E]/30 text-[#E8D5B0] font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer</span>
            </button>
            <button
              onClick={() => window.print()}
              disabled={
                bulletinDataStatus === "loading" ||
                bulletinDataStatus === "error"
              }
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

        {bulletinDataStatus === "loading" && (
          <div
            role="status"
            className="mx-8 mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 print:hidden"
          >
            Chargement des données du bulletin depuis Supabase…
          </div>
        )}
        {bulletinDataStatus === "error" && (
          <div
            role="alert"
            className="mx-8 mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900 print:hidden"
          >
            Le bulletin n'a pas pu être chargé depuis Supabase. Aucun
            locataire de repli n'est affiché. {bulletinDataError}
          </div>
        )}

        {/* Document imprimable */}
        <div className="bulletin-print-container print-container bg-white text-neutral-900 p-8 max-w-[210mm] mx-auto relative">
          {/* EN-TÊTE AGENCE - Logo à gauche, texte centré à droite */}
          <div className="flex items-start gap-4 border-b-2 border-neutral-800 pb-3 mb-4">
            {/* Logo à sa place (gauche) */}
            {agency?.logoUrl ? (
              <img
                src={agency.logoUrl}
                alt="Logo"
                className="w-20 h-20 object-contain flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-20 h-20 border-2 border-neutral-400 flex items-center justify-center text-[10px] text-neutral-500 flex-shrink-0">
                LOGO
              </div>
            )}

            {/* Texte CENTRÉ dans l'espace restant */}
            <div className="flex-1 text-center self-center">
              <div className="text-[18px] font-black uppercase text-neutral-900 leading-tight">
                {agency?.nomAgence || "TRANS IMMOBILIER"}
              </div>
              <div className="text-[12px] text-neutral-700 uppercase leading-tight mt-1">
                {agency?.slogan1 || "GÉRANCE - LOCATION - VENTE - ACHAT"}
              </div>
            </div>

            {/* Espace vide à droite pour équilibrer le centrage */}
            <div className="w-20 flex-shrink-0"></div>
          </div>

          {/* TITRE CENTRÉ */}
          <div className="text-center mb-5">
            <h1 className="text-[22px] font-black uppercase tracking-[0.15em] text-neutral-900 leading-none">
              BULLETIN DE VERSEMENT
            </h1>
            <div className="text-[13px] text-neutral-700 mt-2 font-semibold">
              Mois de : <span className="uppercase">{moisEnMajuscules}</span>
            </div>
          </div>

          {/* TABLEAU 1 : IMMEUBLES */}
          {ownerBuildings.length > 1 && (
            <div className="mb-4 flex items-center gap-3 print:hidden">
              <label className="text-sm font-semibold text-neutral-700">
                Immeuble :
              </label>
              <select
                value={selectedBuildingId}
                onChange={(e) => setSelectedBuildingId(e.target.value)}
                className="px-3 py-2 border border-neutral-400 rounded text-sm bg-white text-neutral-900"
              >
                {ownerBuildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nom} {b.ref ? `(${b.ref})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
          {(ownerBuildings.length > 0 || ownerProperties.length > 0) && (
            <table className="w-full text-[11px] border-collapse mb-3">
              <thead>
                <tr className="bg-neutral-200">
                  <th className="p-2 border border-neutral-700 text-left font-bold w-[70px]">
                    Ref_Im.
                  </th>
                  <th className="p-2 border border-neutral-700 text-left font-bold">
                    Nom_Immeuble
                  </th>
                  <th className="p-2 border border-neutral-700 text-left font-bold w-[90px]">
                    Type
                  </th>
                  <th className="p-2 border border-neutral-700 text-left font-bold">
                    Adresse
                  </th>
                  <th className="p-2 border border-neutral-700 text-left font-bold w-[160px]">
                    Propriétaire
                  </th>
                  <th className="p-2 border border-neutral-700 text-center font-bold w-[70px]">
                    Taux Com
                  </th>
                </tr>
              </thead>
              <tbody>
                {ownerBuildings
                  .filter((b) => !selectedBuildingId || b.id === selectedBuildingId)
                  .map((b) => (
                    <tr key={b.id}>
                      <td className="p-2 border border-neutral-700 font-mono">
                        {getRefCourte(b.ref)}
                      </td>
                      <td className="p-2 border border-neutral-700 font-bold uppercase">
                        {b.nom}
                      </td>
                      <td className="p-2 border border-neutral-700">
                        {b.type || "Immeuble"}
                      </td>
                      <td className="p-2 border border-neutral-700">
                        {b.adresse || b.quartier || "—"}
                      </td>
                      <td className="p-2 border border-neutral-700 uppercase">
                        {owner.prenom} {owner.nom}
                      </td>
                      <td className="p-2 border border-neutral-700 text-center font-mono">
                        {tauxCommission}%
                      </td>
                    </tr>
                  ))}
                {ownerProperties
                  .filter((p) => !selectedBuildingId || p.id === selectedBuildingId)
                  .map((p) => (
                    <tr key={p.id}>
                      <td className="p-2 border border-neutral-700 font-mono">
                        {getRefCourte(p.ref)}
                      </td>
                      <td className="p-2 border border-neutral-700 font-bold uppercase">
                        {p.nom}
                      </td>
                      <td className="p-2 border border-neutral-700">
                        {p.type || "Bien"}
                      </td>
                      <td className="p-2 border border-neutral-700">
                        {p.adresse || p.quartier || "—"}
                      </td>
                      <td className="p-2 border border-neutral-700 uppercase">
                        {owner.prenom} {owner.nom}
                      </td>
                      <td className="p-2 border border-neutral-700 text-center font-mono">
                        {tauxCommission}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}

          {/* TABLEAU 2 : LOCATAIRES */}
          <table className="w-full text-[11px] border-collapse mb-3">
            <thead>
              <tr className="bg-neutral-200">
                <th className="p-2 border border-neutral-700 text-left font-bold w-[180px]">
                  Locataire
                </th>
                <th className="p-2 border border-neutral-700 text-left font-bold w-[70px]">
                  Ref
                </th>
                <th className="p-2 border border-neutral-700 text-left font-bold">
                  Bien Loué
                </th>
                <th className="p-2 border border-neutral-700 text-right font-bold w-[90px]">
                  Loyer
                </th>
                <th className="p-2 border border-neutral-700 text-right font-bold w-[90px]">
                  Net
                </th>
                <th className="p-2 border border-neutral-700 text-left font-bold w-[140px]">
                  Observations
                </th>
              </tr>
            </thead>
            <tbody>
              {loyersData.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-4 text-center text-neutral-500 italic text-[11px]"
                  >
                    Aucun locataire pour cette période
                  </td>
                </tr>
              ) : (
                loyersData.map((l, idx) => (
                  <tr
                    key={l.unitId}
                    className={idx % 2 === 0 ? "bg-white" : "bg-neutral-50"}
                  >
                    <td className="p-2 border border-neutral-700 font-bold text-neutral-900 uppercase">
                      {l.locataire}
                    </td>
                    <td className="p-2 border border-neutral-700 font-mono">
                      {l.locataireRef}
                    </td>
                    <td className="p-2 border border-neutral-700">
                      {l.unitNom}
                    </td>
                    <td className="p-2 border border-neutral-700 text-right font-mono">
                      <div className="print:hidden flex items-center justify-end gap-1">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          inputMode="numeric"
                          aria-label={`Loyer en FCFA pour ${l.locataire}`}
                          value={
                            getMontantPersonnalise(l.tenantId, "loyer") ??
                            String(l.loyer)
                          }
                          onChange={(event) => {
                            const value = event.currentTarget.value;
                            if (
                              value === "" ||
                              (/^\d+$/.test(value) &&
                                Number.isSafeInteger(Number(value)))
                            ) {
                              mettreAJourMontantPersonnalise(
                                l.tenantId,
                                "loyer",
                                value,
                              );
                            }
                          }}
                          className="w-24 rounded border border-neutral-300 px-1 py-0.5 text-right font-mono"
                        />
                        {getMontantPersonnalise(l.tenantId, "loyer") !==
                          undefined && (
                          <button
                            type="button"
                            onClick={() =>
                              mettreAJourMontantPersonnalise(
                                l.tenantId,
                                "loyer",
                                undefined,
                              )
                            }
                            aria-label={`Rétablir le loyer automatique pour ${l.locataire}`}
                            className="text-[9px] text-blue-700 underline"
                          >
                            Auto
                          </button>
                        )}
                      </div>
                      <span className="hidden print:block">
                        {formatNumber(getBulletinMontant(l, "loyer"))}
                      </span>
                    </td>
                    <td className="p-2 border border-neutral-700 text-right font-mono font-bold">
                      <div className="print:hidden flex items-center justify-end gap-1">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          inputMode="numeric"
                          aria-label={`Net en FCFA pour ${l.locataire}`}
                          value={
                            getMontantPersonnalise(l.tenantId, "net") ??
                            String(l.net)
                          }
                          onChange={(event) => {
                            const value = event.currentTarget.value;
                            if (
                              value === "" ||
                              (/^\d+$/.test(value) &&
                                Number.isSafeInteger(Number(value)))
                            ) {
                              mettreAJourMontantPersonnalise(
                                l.tenantId,
                                "net",
                                value,
                              );
                            }
                          }}
                          className="w-24 rounded border border-neutral-300 px-1 py-0.5 text-right font-mono font-bold"
                        />
                        {getMontantPersonnalise(l.tenantId, "net") !==
                          undefined && (
                          <button
                            type="button"
                            onClick={() =>
                              mettreAJourMontantPersonnalise(
                                l.tenantId,
                                "net",
                                undefined,
                              )
                            }
                            aria-label={`Rétablir le net automatique pour ${l.locataire}`}
                            className="text-[9px] text-blue-700 underline"
                          >
                            Auto
                          </button>
                        )}
                      </div>
                      <span className="hidden print:block">
                        {formatNumber(getBulletinMontant(l, "net"))}
                      </span>
                    </td>
                    <td className="p-2 border border-neutral-700 italic text-[10px]">
                      <div className="print:hidden">
                        <textarea
                          rows={2}
                          value={observationsSaisies[l.unitId] ?? l.observation}
                          onChange={(e) =>
                            setObservationsSaisies({
                              ...observationsSaisies,
                              [l.unitId]: e.target.value,
                            })
                          }
                          aria-label={`Observation pour ${l.locataire}`}
                          className="w-full resize-y bg-transparent border-none outline-none text-[10px] italic"
                          placeholder="Ajouter une observation..."
                        />
                      </div>
                      <div className="hidden print:block whitespace-pre-wrap break-words">
                        {observationsSaisies[l.unitId] ?? l.observation}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-neutral-100 font-bold">
                <td colSpan={3} className="p-2 border border-neutral-700"></td>
                <td className="p-2 border border-neutral-700 text-right font-mono">
                  {formatNumber(totalLoyer)}
                </td>
                <td className="p-2 border border-neutral-700 text-right font-mono">
                  {formatNumber(totalNet)}
                </td>
                <td className="p-2 border border-neutral-700"></td>
              </tr>
            </tfoot>
          </table>

          {/* TABLEAU 3 : ARRIÉRÉS */}
          {arrieresData.length > 0 && (
            <table className="w-full text-[11px] border-collapse mb-3">
              <thead>
                <tr className="bg-neutral-200">
                  <th className="p-2 border border-neutral-700 text-left font-bold w-[180px]">
                    Locataire
                  </th>
                  <th className="p-2 border border-neutral-700 text-left font-bold w-[70px]">
                    Ref
                  </th>
                  <th className="p-2 border border-neutral-700 text-right font-bold w-[110px]">
                    Règlement
                  </th>
                  <th className="p-2 border border-neutral-700 text-right font-bold w-[90px]">
                    Arriérés
                  </th>
                  <th className="p-2 border border-neutral-700 text-right font-bold w-[90px]">
                    Net
                  </th>
                  <th className="p-2 border border-neutral-700 text-left font-bold">
                    Observations
                  </th>
                </tr>
              </thead>
              <tbody>
                {arrieresData.map((a, idx) => (
                  <tr key={idx}>
                    <td className="p-2 border border-neutral-700 font-bold uppercase">
                      {a.locataire}
                    </td>
                    <td className="p-2 border border-neutral-700 font-mono">
                      {a.ref}
                    </td>
                    <td className="p-2 border border-neutral-700 text-right font-mono">
                      {formatNumber(a.reglement)}
                    </td>
                    <td className="p-2 border border-neutral-700 text-right font-mono">
                      {formatNumber(a.arrieres)}
                    </td>
                    <td className="p-2 border border-neutral-700 text-right font-mono font-bold">
                      {formatNumber(a.net)}
                    </td>
                    <td className="p-2 border border-neutral-700 italic text-[10px]">
                      {a.observations}
                    </td>
                  </tr>
                ))}
                <tr className="bg-neutral-100 font-bold">
                  <td
                    colSpan={2}
                    className="p-2 border border-neutral-700"
                  ></td>
                  <td className="p-2 border border-neutral-700 text-right font-mono">
                    {formatNumber(totalArrieres)}
                  </td>
                  <td className="p-2 border border-neutral-700 text-right font-mono">
                    0
                  </td>
                  <td className="p-2 border border-neutral-700 text-right font-mono">
                    {formatNumber(totalArrieresNet)}
                  </td>
                  <td className="p-2 border border-neutral-700"></td>
                </tr>
              </tbody>
            </table>
          )}

          {/* DÉCAISSEMENT / ENCAISSEMENT côte à côte */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-neutral-200">
                  <th className="p-2 border border-neutral-700 text-left font-bold">
                    Décaissement
                  </th>
                  <th className="p-2 border border-neutral-700 text-right font-bold w-[110px]">
                    Montant
                  </th>
                  <th className="p-2 border border-neutral-700 text-center font-bold w-[30px] print:hidden"></th>
                </tr>
              </thead>
              <tbody>
                {decaissementsLignes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="p-3 text-center text-neutral-500 italic text-[11px]"
                    >
                      Aucun décaissement
                    </td>
                  </tr>
                ) : (
                  decaissementsLignes.map((d) => (
                    <tr key={d.id}>
                      <td className="p-2 border border-neutral-700 text-[10px]">
                        {d.libelle}
                      </td>
                      <td className="p-2 border border-neutral-700 text-right font-mono text-[10px]">
                        {formatNumber(d.montant)}
                      </td>
                      <td className="p-2 border border-neutral-700 text-center print:hidden">
                        <button
                          onClick={() => handleDeleteDeduction(d.id)}
                          className="text-rose-600 hover:text-rose-800"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="font-bold bg-neutral-100">
                  <td className="p-2 border border-neutral-700 text-right text-[11px]">
                    Total
                  </td>
                  <td className="p-2 border border-neutral-700 text-right font-mono text-[11px]">
                    {formatNumber(totalDecaissement)}
                  </td>
                  <td className="p-2 border border-neutral-700 print:hidden"></td>
                </tr>
              </tfoot>
            </table>

            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-neutral-200">
                  <th className="p-2 border border-neutral-700 text-left font-bold">
                    Encaissement
                  </th>
                  <th className="p-2 border border-neutral-700 text-right font-bold w-[110px]">
                    Montant_pro
                  </th>
                </tr>
              </thead>
              <tbody>
                {encaissementsLignes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="p-3 text-center text-neutral-500 italic text-[11px]"
                    >
                      Aucun encaissement
                    </td>
                  </tr>
                ) : (
                  encaissementsLignes.map((e) => (
                    <tr key={e.id}>
                      <td className="p-2 border border-neutral-700 text-[10px]">
                        {e.libelle}
                      </td>
                      <td className="p-2 border border-neutral-700 text-right font-mono text-[10px]">
                        {formatNumber(e.montant)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="font-bold bg-neutral-100">
                  <td className="p-2 border border-neutral-700 text-right text-[11px]">
                    Total :
                  </td>
                  <td className="p-2 border border-neutral-700 text-right font-mono text-[11px]">
                    {formatNumber(totalEncaissement)}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="col-span-2 print:hidden">
              <button
                onClick={() => setShowDeductionForm(true)}
                className="mt-1 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter décaissement
              </button>
              {onRequestPayment && (
                <button
                  onClick={() =>
                    onRequestPayment(periodToInputValue(bulletinPeriod))
                  }
                  className="mt-1 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter encaissement
                </button>
              )}
            </div>
          </div>

          {/* NET À REVERSER - CENTRÉ EN GROS */}
          <div className="text-center my-6">
            <div className="inline-block border-2 border-neutral-800">
              <div className="bg-neutral-800 text-white px-6 py-2 text-[14px] font-bold uppercase tracking-widest">
                Net à Reverser
              </div>
              <div className="px-8 py-4 text-[32px] font-black font-mono text-neutral-900">
                {formatNumber(netAReverser)}
              </div>
            </div>
          </div>

          {/* ARRÊTÉ */}
          <div className="text-[12px] mb-6">
            <div className="text-neutral-700 font-semibold">
              Arrêté le Présent Bulletin à la Somme de :
            </div>
            <div className="font-bold italic text-neutral-900 mt-2 border-l-4 border-neutral-800 pl-3 py-1 text-[14px]">
              {nombreEnLettres(netAReverser)} Francs
            </div>
          </div>

          {/* SIGNATURES - 3 colonnes */}
          <div className="grid grid-cols-3 gap-6 mt-8 mb-4 text-[12px]">
            <div>
              <div className="font-bold text-neutral-900">Le {gerantTitre}</div>
              <div className="text-neutral-700 mb-2 italic">{gerantNom}</div>
              {agency?.cachetUrl ? (
                <img
                  src={agency.cachetUrl}
                  alt="Cachet"
                  className="h-24 w-24 max-w-full object-contain"
                />
              ) : (
                <div className="h-20 border-b border-dotted border-neutral-500"></div>
              )}
              {agency?.gerantSignatureUrl && (
                <img
                  src={agency.gerantSignatureUrl}
                  alt="Signature gérant"
                  className="h-24 max-w-full object-contain -mt-20 ml-3"
                />
              )}
            </div>

            <div className="text-center pt-6">
              <div className="text-neutral-700">
                Dakar le <strong>{dateFormatee}</strong>
              </div>
            </div>

            <div className="text-right">
              <div className="font-bold text-neutral-900">Le Propriétaire</div>
              <div className="text-neutral-700 uppercase mb-2">
                {owner.prenom} {owner.nom}
              </div>
              <div className="h-20 border-b border-dotted border-neutral-500"></div>
            </div>
          </div>

          {/* PIED DE PAGE */}
          <div className="print-footer border-t-2 border-neutral-800 pt-3 mt-6 text-[10px] text-neutral-700 text-center leading-relaxed">
            <div className="font-bold uppercase">
              {agency?.nomAgence || "Agence"}
              {agency?.rcNumero && ` RC : ${agency.rcNumero}`}
              {agency?.nineaNumero && ` N.I.N.E.A : ${agency.nineaNumero}`}
            </div>
            {agency?.adresse && (
              <div>
                Siège {agency.adresse}
                {agency?.ville && ` - ${agency.ville}`}
              </div>
            )}
            <div>
              {agency?.standardTelephone && `Tél : ${agency.standardTelephone}`}
              {agency?.telephone && ` / ${agency.telephone}`}
              {agency?.email && ` - Email : ${agency.email}`}
            </div>
          </div>

          {/* Signature utilisateur - masquée à l'impression */}
          <div className="print:hidden mt-4">
            <UserSignatureBlock
              userId={currentUser?.id}
              label="Émis par"
              date={new Date().toISOString()}
            />
          </div>
        </div>

        {/* MODAL AJOUT DÉDUCTION */}
        {showDeductionForm && (
          <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 print:hidden">
            <div className="bg-[#162133] border border-[#C9A96E]/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-bold text-white text-base">
                  Ajouter un Décaissement
                </h3>
                <button
                  onClick={() => setShowDeductionForm(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddDeduction} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">
                    Libellé *
                  </label>
                  <input
                    type="text"
                    value={deductionLibelle}
                    onChange={(e) => setDeductionLibelle(e.target.value)}
                    required
                    placeholder="Ex: CREDIT WAVE 05/09/2026"
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#C9A96E] uppercase mb-1">
                    Montant (FCFA) *
                  </label>
                  <input
                    type="number"
                    value={deductionMontant || ""}
                    onChange={(e) =>
                      setDeductionMontant(Number(e.target.value))
                    }
                    required
                    min={1}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E] text-white font-mono font-bold"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowDeductionForm(false)}
                    className="px-4 py-2 rounded-xl bg-[#1E2E45] text-slate-300"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold"
                  >
                    Ajouter
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
