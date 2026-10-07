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
// HELPER : Extraire ref courte (4 derniers caractères)
// ============================================================
function getRefCourte(ref: string | undefined): string {
  if (!ref) return "—";
  const cleaned = ref.replace(/[^0-9]/g, "");
  if (cleaned.length >= 4) return cleaned.slice(-4);
  return ref.slice(-4) || "—";
}

interface LoyerLigne {
  ordre: number;
  ref: string;
  unitId: string;
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
}) => {
  const { settings: agencySettings } = useAgencySettings(currentUser?.agencyId);

  const [serverPayments, setServerPayments] = useState<Payment[]>([]);
  const [serverOwnerProps, setServerOwnerProps] = useState<Property[]>([]);
  const [serverOwnerBuildings, setServerOwnerBuildings] = useState<Building[]>(
    [],
  );
  const [serverOwnerUnits, setServerOwnerUnits] = useState<Unit[]>([]);
  const [serverOwnerTenants, setServerOwnerTenants] = useState<Tenant[]>([]);

  React.useEffect(() => {
    if (!currentUser?.agencyId || !owner?.id) return;
    (async () => {
      try {
        const data = await getOwnerBulletinData(currentUser.agencyId, owner.id);
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
            locataireNom: r.locataire_nom_calc
              ? `${r.locataire_prenom_calc || ""} ${r.locataire_nom_calc}`.trim()
              : r.locataire_nom,
            bienNom: r.bien_nom_calc || r.bien_nom,
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
          })),
        );
        setServerOwnerUnits(
          (data.units || []).map((u: any) => ({
            ...u,
            proprietaireId: u.proprietaire_id || u.proprietaireId,
            buildingId: u.building_id || u.buildingId,
            loyerBase: Number(u.loyer_base) || Number(u.loyerBase) || 0,
            bienId: u.bien_id || u.bienId,
          })),
        );
        setServerOwnerTenants(
          (data.tenants || []).map((t: any) => ({
            ...t,
            bienId: t.bien_id || t.bienId,
            proprietaireId: t.proprietaire_id || t.proprietaireId,
            dateSortie: t.date_sortie || t.dateSortie,
            dateEntree: t.date_entree || t.dateEntree,
          })),
        );
      } catch (e) {
        console.warn("loadBulletinData:", e);
      }
    })();
  }, [currentUser?.agencyId, owner?.id, selectedPeriod]);

  const displayPayments = serverPayments.length > 0 ? serverPayments : payments;
  const displayProperties =
    serverOwnerProps.length > 0 ? serverOwnerProps : properties;
  const displayBuildings =
    serverOwnerBuildings.length > 0 ? serverOwnerBuildings : buildings;
  const displayUnits = serverOwnerUnits.length > 0 ? serverOwnerUnits : units;
  const displayTenants =
    serverOwnerTenants.length > 0 ? serverOwnerTenants : tenants;

  const [showDeductionForm, setShowDeductionForm] = useState(false);
  const [deductionLibelle, setDeductionLibelle] = useState("");
  const [deductionMontant, setDeductionMontant] = useState(0);

  // Champs de saisie dynamiques pour les observations
  const [observationsSaisies, setObservationsSaisies] = useState<
    Record<string, string>
  >({});

  const ownerProperties = displayProperties.filter(
    (p) => p.proprietaireId === owner.id,
  );
  const ownerBuildings = displayBuildings.filter(
    (b) => b.proprietaireId === owner.id,
  );
  const ownerUnits = displayUnits.filter((u) => u.proprietaireId === owner.id);
  const tauxCommission = owner.tauxCommission || 10;

  const normalizePeriod = (s: string) => (s || "").toLowerCase().trim();
  const isSamePeriod = (a: string, b: string) =>
    normalizePeriod(a) === normalizePeriod(b);

  const getObservationPeriode = (paymentPeriode: string): string => {
    if (!paymentPeriode) return "";
    if (isSamePeriod(paymentPeriode, selectedPeriod)) return "";

    const moisOrdre: Record<string, number> = {
      janvier: 1,
      février: 2,
      fevrier: 2,
      mars: 3,
      avril: 4,
      mai: 5,
      juin: 6,
      juillet: 7,
      août: 8,
      aout: 8,
      septembre: 9,
      octobre: 10,
      novembre: 11,
      décembre: 12,
      decembre: 12,
    };

    const extract = (s: string) => {
      const parts = normalizePeriod(s).split(" ");
      return {
        mois: moisOrdre[parts[0]] || 0,
        annee: parseInt(parts[1]) || new Date().getFullYear(),
      };
    };

    const bullet = extract(selectedPeriod);
    const pay = extract(paymentPeriode);

    const isAvance =
      pay.annee > bullet.annee ||
      (pay.annee === bullet.annee && pay.mois > bullet.mois);

    return isAvance
      ? `AVANCE LOYER ${paymentPeriode.toUpperCase()}`
      : `LOYER ${paymentPeriode.toUpperCase()}`;
  };

  // ============================================================
  // LIGNES PRINCIPALES LOCATAIRES
  // ============================================================
  const loyersData: LoyerLigne[] = useMemo(() => {
    const lines: LoyerLigne[] = [];
    const now = new Date();
    const moisCourant = now.getMonth();
    const anneeCourante = now.getFullYear();

    const findActiveTenant = (bienId: string) =>
      displayTenants.find((t) => t.bienId === bienId && !t.dateSortie);

    const findPayment = (bienId: string, locataireId: string) =>
      displayPayments.find(
        (p) =>
          p.bienId === bienId &&
          p.locataireId === locataireId &&
          isSamePeriod(p.periode, selectedPeriod) &&
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
    ): LoyerLigne | null => {
      const tenant = findActiveTenant(unitId);
      if (!tenant) return null;

      const payment = findPayment(unitId, tenant.id);
      const estNonPayeur = !payment;

      const loyerFinal = estNonPayeur ? 0 : loyerBase;
      const netFinal = estNonPayeur
        ? 0
        : Math.round(loyerBase * (1 - tauxCommission / 100));

      const dateEntree = tenant.dateEntree ? new Date(tenant.dateEntree) : null;
      const estNouveau = dateEntree
        ? dateEntree.getMonth() === moisCourant &&
          dateEntree.getFullYear() === anneeCourante
        : false;

      // Ref courte = 4 derniers chiffres
      const refCourte = getRefCourte((tenant as any).ref);

      // Bien Loué = nom de l'unité (occupé par le locataire)
      const bienLoue = unitNom || "—";

      return {
        ref: refCourte,
        unitId,
        unitNom: bienLoue,
        immeubleRef,
        immeubleNom,
        type,
        adresse,
        etage,
        locataire: `${tenant.prenom} ${tenant.nom}`,
        locataireRef: refCourte,
        loyer: loyerFinal,
        net: netFinal,
        observation: estNonPayeur
          ? "NON PAYER"
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
    ownerProperties,
    tenants,
    payments,
    buildings,
    selectedPeriod,
    tauxCommission,
  ]);

  const totalLoyer = loyersData.reduce((sum, l) => sum + l.loyer, 0);
  const totalNet = loyersData.reduce((sum, l) => sum + l.net, 0);

  // ============================================================
  // ARRIÉRÉS
  // ============================================================
  const arrieresData: ArriereLigne[] = useMemo(() => {
    const ownerPaymentsOtherPeriod = displayPayments.filter((p) => {
      if (p.proprietaireId !== owner.id) return false;
      if (p.statut !== "Payé") return false;
      if (isSamePeriod(p.periode, selectedPeriod)) return false;
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
    payments,
    owner,
    ownerUnits,
    ownerProperties,
    tenants,
    selectedPeriod,
    tauxCommission,
  ]);

  const totalArrieres = arrieresData.reduce((sum, a) => sum + a.reglement, 0);
  const totalArrieresNet = arrieresData.reduce((sum, a) => sum + a.net, 0);

  // ============================================================
  // DÉCAISSEMENTS
  // ============================================================
  const ownerDeductions = deductions.filter(
    (d) => d.proprietaireId === owner.id && d.periode === selectedPeriod,
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

  // ============================================================
  // ENCAISSEMENTS
  // ============================================================
  const encaissementsLignes: EncaissementLigne[] = useMemo(() => {
    const cautions = displayPayments.filter((p) => {
      if (p.proprietaireId !== owner.id) return false;
      if (p.statut !== "Payé") return false;
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
  }, [payments, owner]);

  const totalEncaissement = encaissementsLignes.reduce(
    (sum, e) => sum + e.montant,
    0,
  );

  // ============================================================
  // NET À REVERSER
  // ============================================================
  const netAReverser =
    totalNet + totalArrieresNet - totalDecaissement + totalEncaissement;

  // ============================================================
  // INFORMATIONS AGENCE DYNAMIQUES
  // ============================================================
  const agency = settings || agencySettings || null;
  const gerantNom = agency?.gerantNom || "Le Gérant";
  const gerantTitre = agency?.gerantTitre || "Gérant";
  const moisEnMajuscules = selectedPeriod.toUpperCase();

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleAddDeduction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deductionLibelle || deductionMontant <= 0) return;
    if (!onSaveDeduction) return;

    const newDeduction: OwnerDeduction = {
      id: crypto.randomUUID(),
      proprietaireId: owner.id,
      periode: selectedPeriod,
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
      periode: selectedPeriod,
      tauxCommission,
      totalLoyersBruts: totalLoyer,
      totalCommission: totalLoyer - totalNet,
      totalTvaCommission: 0,
      totalDecaissements: totalDecaissement,
      totalEncaissements: totalEncaissement,
      netAReverser,
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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
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
                Période : {selectedPeriod} · Taux : {tauxCommission}%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] border border-[#C9A96E]/30 text-[#E8D5B0] font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer</span>
            </button>
            <button
              onClick={() => window.print()}
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

        {/* Document imprimable - CENTRÉ */}
        <div className="bulletin-print-container print-container bg-white text-neutral-900 p-6 max-w-[210mm] mx-auto">
          {/* En-tête agence */}
          <div className="flex items-start justify-between border-b-2 border-neutral-800 pb-3 mb-3">
            <div className="flex items-center gap-3">
              {agency?.logoUrl ? (
                <img
                  src={agency.logoUrl}
                  alt="Logo"
                  className="w-16 h-16 object-contain"
                />
              ) : (
                <div className="w-16 h-16 border-2 border-neutral-800 flex items-center justify-center text-[8px] text-neutral-500">
                  LOGO
                </div>
              )}
              <div>
                <div className="text-sm font-black uppercase text-neutral-900">
                  {agency?.nomAgence || "MON AGENCE"}
                </div>
                <div className="text-[9px] text-neutral-700">
                  {agency?.slogan1 || agency?.slogan || "Gestion Immobilière"}
                </div>
              </div>
            </div>
          </div>

          {/* Titre centré */}
          <div className="text-center mb-3">
            <h1 className="text-xl font-black uppercase tracking-widest text-neutral-900">
              BULLETIN DE VERSEMENT
            </h1>
            <div className="text-[10px] text-neutral-700 mt-0.5 font-semibold">
              Mois de : <span className="uppercase">{moisEnMajuscules}</span>
            </div>
          </div>

          {/* TABLEAU 1 : Immeuble (bandeau) */}
          {ownerBuildings.length > 0 && (
            <table className="w-full text-[8px] border-collapse mb-2">
              <thead>
                <tr className="bg-neutral-300">
                  <th className="p-1 border border-neutral-800 text-left font-bold">
                    Ref_Imm.
                  </th>
                  <th className="p-1 border border-neutral-800 text-left font-bold">
                    Nom_Immeuble
                  </th>
                  <th className="p-1 border border-neutral-800 text-left font-bold w-[35px]">
                    Type
                  </th>
                  <th className="p-1 border border-neutral-800 text-left font-bold">
                    Adresse
                  </th>
                  <th className="p-1 border border-neutral-800 text-left font-bold">
                    Propriétaire
                  </th>
                  <th className="p-1 border border-neutral-800 text-center font-bold w-[45px]">
                    Taux Com.
                  </th>
                </tr>
              </thead>
              <tbody>
                {ownerBuildings.map((b) => (
                  <tr key={b.id}>
                    <td className="p-1 border border-neutral-800 font-mono font-bold">
                      {getRefCourte(b.ref)}
                    </td>
                    <td className="p-1 border border-neutral-800 font-bold">
                      {b.nom}
                    </td>
                    <td className="p-1 border border-neutral-800">
                      {b.type || "R+4"}
                    </td>
                    <td className="p-1 border border-neutral-800">
                      {b.adresse || b.quartier || "—"}
                    </td>
                    <td className="p-1 border border-neutral-800 uppercase font-semibold">
                      {owner.prenom} {owner.nom}
                    </td>
                    <td className="p-1 border border-neutral-800 text-center font-mono">
                      {tauxCommission}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TABLEAU 2 : Locataires */}
          <table className="w-full text-[8px] border-collapse mb-2">
            <thead>
              <tr className="bg-neutral-300">
                <th className="p-1 border border-neutral-800 text-center font-bold w-[20px]"></th>
                <th className="p-1 border border-neutral-800 text-left font-bold">
                  Locataire
                </th>
                <th className="p-1 border border-neutral-800 text-left font-bold w-[50px]">
                  Ref
                </th>
                <th className="p-1 border border-neutral-800 text-left font-bold">
                  Bien Loué
                </th>
                <th className="p-1 border border-neutral-800 text-right font-bold w-[60px]">
                  Loyer
                </th>
                <th className="p-1 border border-neutral-800 text-right font-bold w-[60px]">
                  Net
                </th>
                <th className="p-1 border border-neutral-800 text-left font-bold w-[80px]">
                  Observations
                </th>
              </tr>
            </thead>
            <tbody>
              {loyersData.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-3 text-center text-neutral-500 italic"
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
                    <td className="p-1 border border-neutral-800 text-center text-neutral-700">
                      {idx + 1}
                    </td>
                    <td className="p-1 border border-neutral-800 font-bold text-neutral-900">
                      {l.locataire}
                    </td>
                    <td className="p-1 border border-neutral-800 font-mono text-neutral-900">
                      {l.locataireRef}
                    </td>
                    <td className="p-1 border border-neutral-800 text-neutral-800">
                      {l.unitNom}
                    </td>
                    <td className="p-1 border border-neutral-800 text-right font-mono text-neutral-900">
                      {l.estNonPayeur ? "" : formatNumber(l.loyer)}
                    </td>
                    <td className="p-1 border border-neutral-800 text-right font-mono font-bold text-neutral-900">
                      {l.estNonPayeur ? "" : formatNumber(l.net)}
                    </td>
                    <td className="p-1 border border-neutral-800 text-neutral-700 text-[7px] italic print:hidden">
                      <input
                        type="text"
                        value={observationsSaisies[l.unitId] || l.observation}
                        onChange={(e) =>
                          setObservationsSaisies({
                            ...observationsSaisies,
                            [l.unitId]: e.target.value,
                          })
                        }
                        className="w-full bg-transparent border-none outline-none text-[7px] italic"
                        placeholder="—"
                      />
                    </td>
                    <td className="p-1 border border-neutral-800 text-neutral-700 text-[7px] italic hidden print:table-cell">
                      {observationsSaisies[l.unitId] || l.observation}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-neutral-200 font-bold">
                <td colSpan={4} className="p-1 border border-neutral-800"></td>
                <td className="p-1 border border-neutral-800 text-right font-mono text-neutral-900">
                  {formatNumber(totalLoyer)}
                </td>
                <td className="p-1 border border-neutral-800 text-right font-mono text-neutral-900">
                  {formatNumber(totalNet)}
                </td>
                <td className="p-1 border border-neutral-800"></td>
              </tr>
            </tfoot>
          </table>

          {/* TABLEAU 3 : Arriérés */}
          {arrieresData.length > 0 && (
            <table className="w-full text-[8px] border-collapse mb-2">
              <thead>
                <tr className="bg-neutral-300">
                  <th className="p-1 border border-neutral-800 text-center font-bold w-[20px]"></th>
                  <th className="p-1 border border-neutral-800 text-left font-bold">
                    Locataire
                  </th>
                  <th className="p-1 border border-neutral-800 text-left font-bold w-[50px]">
                    Ref
                  </th>
                  <th className="p-1 border border-neutral-800 text-left font-bold">
                    Règlement Arriérés
                  </th>
                  <th className="p-1 border border-neutral-800 text-right font-bold w-[60px]">
                    Net
                  </th>
                  <th className="p-1 border border-neutral-800 text-left font-bold w-[100px]">
                    Observations
                  </th>
                </tr>
              </thead>
              <tbody>
                {arrieresData.map((a, idx) => (
                  <tr key={idx}>
                    <td className="p-1 border border-neutral-800 text-center"></td>
                    <td className="p-1 border border-neutral-800 font-bold">
                      {a.locataire}
                    </td>
                    <td className="p-1 border border-neutral-800 font-mono">
                      {a.ref}
                    </td>
                    <td className="p-1 border border-neutral-800 text-right font-mono">
                      {formatNumber(a.reglement)}
                    </td>
                    <td className="p-1 border border-neutral-800 text-right font-mono font-bold">
                      {formatNumber(a.net)}
                    </td>
                    <td className="p-1 border border-neutral-800 text-[7px] italic">
                      {a.observations}
                    </td>
                  </tr>
                ))}
                <tr className="bg-neutral-200 font-bold">
                  <td
                    colSpan={3}
                    className="p-1 border border-neutral-800"
                  ></td>
                  <td className="p-1 border border-neutral-800 text-right font-mono">
                    {formatNumber(totalArrieres)}
                  </td>
                  <td className="p-1 border border-neutral-800 text-right font-mono">
                    {formatNumber(totalArrieresNet)}
                  </td>
                  <td className="p-1 border border-neutral-800"></td>
                </tr>
              </tbody>
            </table>
          )}

          {/* TABLEAU 4 : Décaissement / Encaissement côte à côte */}
          <div className="grid grid-cols-2 gap-0 mb-3">
            {/* Décaissement */}
            <table className="w-full text-[8px] border-collapse">
              <thead>
                <tr className="bg-neutral-300">
                  <th className="p-1 border border-neutral-800 text-left font-bold">
                    Décaissement
                  </th>
                  <th className="p-1 border border-neutral-800 text-right font-bold w-[70px]">
                    Montant
                  </th>
                  <th className="p-1 border border-neutral-800 text-center font-bold w-[20px] print:hidden"></th>
                </tr>
              </thead>
              <tbody>
                {decaissementsLignes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="p-2 text-center text-neutral-500 italic"
                    >
                      Aucun décaissement
                    </td>
                  </tr>
                ) : (
                  decaissementsLignes.map((d) => (
                    <tr key={d.id}>
                      <td className="p-1 border border-neutral-800 text-[7px]">
                        {d.libelle}
                      </td>
                      <td className="p-1 border border-neutral-800 text-right font-mono text-[7px]">
                        {formatNumber(d.montant)}
                      </td>
                      <td className="p-1 border border-neutral-800 text-center print:hidden">
                        <button
                          onClick={() => handleDeleteDeduction(d.id)}
                          className="text-rose-600 hover:text-rose-800"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="font-bold bg-neutral-200">
                  <td className="p-1 border border-neutral-800 text-right">
                    Total
                  </td>
                  <td className="p-1 border border-neutral-800 text-right font-mono">
                    {formatNumber(totalDecaissement)}
                  </td>
                  <td className="p-1 border border-neutral-800 print:hidden"></td>
                </tr>
              </tfoot>
            </table>

            {/* Encaissement avec Montant_pro */}
            <table className="w-full text-[8px] border-collapse">
              <thead>
                <tr className="bg-neutral-300">
                  <th className="p-1 border border-neutral-800 text-left font-bold">
                    Encaissement
                  </th>
                  <th className="p-1 border border-neutral-800 text-right font-bold w-[70px]">
                    Montant_pro
                  </th>
                </tr>
              </thead>
              <tbody>
                {encaissementsLignes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="p-2 text-center text-neutral-500 italic"
                    >
                      Aucun encaissement
                    </td>
                  </tr>
                ) : (
                  encaissementsLignes.map((e) => (
                    <tr key={e.id}>
                      <td className="p-1 border border-neutral-800 text-[7px]">
                        {e.libelle}
                      </td>
                      <td className="p-1 border border-neutral-800 text-right font-mono text-[7px]">
                        {formatNumber(e.montant)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="font-bold bg-neutral-200">
                  <td className="p-1 border border-neutral-800 text-right">
                    Total :
                  </td>
                  <td className="p-1 border border-neutral-800 text-right font-mono">
                    {formatNumber(totalEncaissement)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Bouton ajouter décaissement (hors tableau) */}
            <div className="col-span-2 print:hidden">
              <button
                onClick={() => setShowDeductionForm(true)}
                className="mt-1 px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-bold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Ajouter décaissement
              </button>
            </div>
          </div>

          {/* NET À REVERSER */}
          <div className="mb-4 text-center mt-4">
            <div className="inline-block bg-neutral-300 px-4 py-1 text-xs font-bold text-neutral-900 uppercase mb-1 border border-neutral-800">
              Net À Reverser
            </div>
            <div className="text-2xl font-black font-mono text-neutral-900">
              {formatNumber(netAReverser)}
            </div>
          </div>

          {/* Montant en lettres */}
          <div className="mb-6 text-xs">
            <div className="text-neutral-700 mb-1">
              Arrêté le Présent Bulletin à la Somme de :
            </div>
            <div className="text-sm font-bold italic text-neutral-900 border-l-4 border-neutral-900 pl-3 py-1">
              {nombreEnLettres(netAReverser)} Francs
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 mb-6 mt-8">
            <div>
              <div className="font-bold text-neutral-900 text-xs mb-2">
                Le {gerantTitre}
              </div>
              <div className="text-[10px] text-neutral-700 mb-1">
                {gerantNom}
              </div>
              <div className="h-20 border-b border-dotted border-neutral-500"></div>
            </div>
            <div>
              <div className="text-right text-[10px] text-neutral-700 mb-2">
                Dakar le <strong>{formatDate(new Date().toISOString())}</strong>
              </div>
              <div className="font-bold text-neutral-900 text-xs mb-2 text-right">
                Le Propriétaire
              </div>
              <div className="text-[10px] text-neutral-700 mb-1 text-right uppercase">
                {owner.prenom} {owner.nom}
              </div>
              <div className="h-20 border-b border-dotted border-neutral-500"></div>
            </div>
          </div>

          {/* Pied de page dynamique */}
          <div className="border-t-2 border-neutral-800 pt-2 text-[8px] text-neutral-700 text-center">
            <div className="font-bold uppercase">
              {agency?.nomAgence || "FITAL-IMMO SAS"}
              {agency?.rcNumero && ` RC : ${agency.rcNumero}`}
              {agency?.nineaNumero && ` N.I.N.E.A : ${agency.nineaNumero}`}
            </div>
            {agency?.adresse && <div>Siège {agency.adresse}</div>}
            {agency?.standardTelephone && (
              <div>Tél : {agency.standardTelephone}</div>
            )}
            {agency?.email && <div>Email : {agency.email}</div>}
          </div>

          {/* Signature utilisateur (traçabilité) */}
          <UserSignatureBlock
            userId={currentUser?.id}
            label="Émis par"
            date={new Date().toISOString()}
          />
        </div>

        {/* Modal ajout déduction */}
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
