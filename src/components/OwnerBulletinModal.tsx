import React, { useState, useMemo } from 'react';
import { X, Printer, FileText, Plus, Trash2, Save } from 'lucide-react';
import {
  Owner, Property, Building, Unit, Tenant, Payment, Invoice,
  MaintenanceTicket, OwnerDeduction, BulletinVersement, UserAccount,
} from '../types';
import { formatNumber } from '../lib/utils';

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
  onClose: () => void;
  onSaveDeduction?: (deduction: OwnerDeduction) => void;
  onDeleteDeduction?: (deductionId: string) => void;
  onSaveBulletin?: (bulletin: BulletinVersement) => void;
}

// ============================================================
// HELPER : Montant en lettres
// ============================================================
function nombreEnLettres(n: number): string {
  if (n === 0) return 'zéro';
  if (n < 0) return 'moins ' + nombreEnLettres(Math.abs(n));
  const unites = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const dizaines = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
  const centaines = ['', 'cent', 'deux cent', 'trois cent', 'quatre cent', 'cinq cent', 'six cent', 'sept cent', 'huit cent', 'neuf cent'];

  function convert(num: number): string {
    if (num === 0) return '';
    if (num < 10) return unites[num];
    if (num < 20) {
      const speciaux = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
      return speciaux[num - 10];
    }
    if (num < 100) {
      const d = Math.floor(num / 10);
      const u = num % 10;
      if (d === 7 || d === 9) return dizaines[d - 1] + '-' + convert(10 + u);
      if (d === 8 && u === 0) return 'quatre-vingts';
      return dizaines[d] + (u > 0 ? '-' + unites[u] : '');
    }
    const c = Math.floor(num / 100);
    const r = num % 100;
    let prefix = centaines[c];
    if (c > 1 && r === 0) prefix += 's';
    return prefix + (r > 0 ? ' ' + convert(r) : '');
  }

  const milliards = Math.floor(n / 1000000000);
  const millions = Math.floor((n % 1000000000) / 1000000);
  const milliers = Math.floor((n % 1000000) / 1000);
  const reste = n % 1000;

  let result = '';
  if (milliards > 0) result += convert(milliards) + ' milliard' + (milliards > 1 ? 's' : '') + ' ';
  if (millions > 0) result += convert(millions) + ' million' + (millions > 1 ? 's' : '') + ' ';
  if (milliers > 0) result += (milliers === 1 ? 'mille' : convert(milliers) + ' mille') + ' ';
  if (reste > 0) result += convert(reste);

  return result.trim();
}

// ============================================================
// HELPER : Ordre des étages
// ============================================================
function getOrdreEtage(etage: string): number {
  if (!etage) return 999;
  const e = etage.toLowerCase().trim();
  if (e === 'sous-sol' || e === 'sous sol') return -1;
  if (e === 'rdc' || e === 'rez-de-chaussée') return 0;
  if (e === 'toit-terrasse') return 999;
  const match = e.match(/^(\d+)/);
  if (match) return parseInt(match[1]);
  return 500;
}

// ============================================================
// INTERFACES
// ============================================================
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
  type: 'PROPRIETAIRE' | 'AUTRE';
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
  onClose,
  onSaveDeduction,
  onDeleteDeduction,
  onSaveBulletin,
}) => {
  const [showDeductionForm, setShowDeductionForm] = useState(false);
  const [deductionLibelle, setDeductionLibelle] = useState('');
  const [deductionMontant, setDeductionMontant] = useState(0);

  const ownerProperties = properties.filter((p) => p.proprietaireId === owner.id);
  const ownerBuildings = buildings.filter((b) => b.proprietaireId === owner.id);
  const ownerUnits = units.filter((u) => u.proprietaireId === owner.id);
  const tauxCommission = owner.tauxCommission || 10;

  // Helpers période
  const normalizePeriod = (s: string) => (s || '').toLowerCase().trim();
  const isSamePeriod = (a: string, b: string) => normalizePeriod(a) === normalizePeriod(b);

  const getObservationPeriode = (paymentPeriode: string): string => {
    if (!paymentPeriode) return '';
    if (isSamePeriod(paymentPeriode, selectedPeriod)) return '';

    const moisOrdre: Record<string, number> = {
      janvier: 1, février: 2, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6,
      juillet: 7, août: 8, aout: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12, decembre: 12,
    };

    const extract = (s: string) => {
      const parts = normalizePeriod(s).split(' ');
      return { mois: moisOrdre[parts[0]] || 0, annee: parseInt(parts[1]) || new Date().getFullYear() };
    };

    const bullet = extract(selectedPeriod);
    const pay = extract(paymentPeriode);

    const isAvance = pay.annee > bullet.annee || (pay.annee === bullet.annee && pay.mois > bullet.mois);

    return isAvance
      ? `AVANCE LOYER ${paymentPeriode.toUpperCase()}`
      : `LOYER ${paymentPeriode.toUpperCase()}`;
  };

  // ============================================================
  // LIGNES PRINCIPALES
  // ============================================================
  const loyersData: LoyerLigne[] = useMemo(() => {
    const lines: LoyerLigne[] = [];
    const now = new Date();
    const moisCourant = now.getMonth();
    const anneeCourante = now.getFullYear();

    const findActiveTenant = (bienId: string) =>
      tenants.find((t) => t.bienId === bienId && !t.dateSortie);

    const findPayment = (bienId: string, locataireId: string) =>
      payments.find(
        (p) =>
          p.bienId === bienId &&
          p.locataireId === locataireId &&
          isSamePeriod(p.periode, selectedPeriod) &&
          p.statut === 'Payé'
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
      loyerBase: number
    ): LoyerLigne | null => {
      const tenant = findActiveTenant(unitId);
      if (!tenant) return null;

      const payment = findPayment(unitId, tenant.id);
      const estNonPayeur = !payment;

      const loyerFinal = estNonPayeur ? 0 : loyerBase;
      const netFinal = estNonPayeur ? 0 : Math.round(loyerBase * (1 - tauxCommission / 100));

      const dateEntree = tenant.dateEntree ? new Date(tenant.dateEntree) : null;
      const estNouveau = dateEntree
        ? dateEntree.getMonth() === moisCourant && dateEntree.getFullYear() === anneeCourante
        : false;

      return {
        unitId,
        unitNom,
        immeubleRef,
        immeubleNom,
        type,
        adresse,
        etage,
        locataire: `${tenant.prenom} ${tenant.nom}`,
        locataireRef: tenant.ref || '—',
        loyer: loyerFinal,
        net: netFinal,
        observation: estNonPayeur ? 'NON PAYER' : estNouveau ? 'NOUVEAU LOCATAIRE' : '',
        estNonPayeur,
        ordre,
      };
    };

    ownerUnits.forEach((unit) => {
      const batiment = buildings.find((b) => b.id === unit.buildingId);
      const line = buildLine(
        unit.id,
        unit.nom,
        batiment?.ref || '—',
        batiment?.nom || '—',
        unit.type || 'Appartement',
        batiment?.adresse || '—',
        unit.etage || 'RDC',
        getOrdreEtage(unit.etage || 'RDC'),
        unit.loyerBase || 0
      );
      if (line) lines.push(line);
    });

    ownerProperties.forEach((prop) => {
      const line = buildLine(
        prop.id,
        prop.nom,
        prop.ref || '—',
        '—',
        prop.type || 'Appartement',
        prop.adresse || '—',
        'RDC',
        1000,
        prop.loyerBase || 0
      );
      if (line) lines.push(line);
    });

    lines.sort((a, b) => {
      if (a.immeubleNom !== b.immeubleNom) return a.immeubleNom.localeCompare(b.immeubleNom);
      return a.ordre - b.ordre;
    });

    return lines;
  }, [ownerUnits, ownerProperties, tenants, payments, buildings, selectedPeriod, tauxCommission]);

  const totalLoyer = loyersData.reduce((sum, l) => sum + l.loyer, 0);
  const totalNet = loyersData.reduce((sum, l) => sum + l.net, 0);

  // ============================================================
  // ARRIÉRÉS (paiements d'autres périodes)
  // ============================================================
  const arrieresData: ArriereLigne[] = useMemo(() => {
    const ownerPaymentsOtherPeriod = payments.filter((p) => {
      if (p.proprietaireId !== owner.id) return false;
      if (p.statut !== 'Payé') return false;
      if (isSamePeriod(p.periode, selectedPeriod)) return false;
      const ownsUnit = ownerUnits.some((u) => u.id === p.bienId);
      const ownsProp = ownerProperties.some((pr) => pr.id === p.bienId);
      return ownsUnit || ownsProp;
    });

    return ownerPaymentsOtherPeriod.map((p) => {
      const montantPaye = p.montantPaye || 0;
      const net = Math.round(montantPaye * (1 - tauxCommission / 100));
      return {
        locataire: p.locataireNom,
        ref: tenants.find((t) => t.id === p.locataireId)?.ref || '—',
        reglement: montantPaye,
        arrieres: 0,
        net,
        observations: getObservationPeriode(p.periode),
      };
    });
  }, [payments, owner, ownerUnits, ownerProperties, tenants, selectedPeriod, tauxCommission]);

  const totalArrieres = arrieresData.reduce((sum, a) => sum + a.reglement, 0);
  const totalArrieresNet = arrieresData.reduce((sum, a) => sum + a.net, 0);

  // ============================================================
  // DÉCAISSEMENTS
  // ============================================================
  const ownerDeductions = deductions.filter(
    (d) => d.proprietaireId === owner.id && d.periode === selectedPeriod
  );
  const ownerInvoices = invoices.filter(
    (inv) => inv.proprietaireId === owner.id && inv.statut !== 'Payée'
  );
  const ownerMaintenance = maintenance.filter(
    (m) => m.proprietaireId === owner.id && m.imputableA === 'Propriétaire'
  );

  const decaissementsLignes: DecaissementLigne[] = [
    ...ownerDeductions.map((d) => ({
      id: d.id,
      libelle: d.libelle,
      montant: d.montant,
      type: 'AUTRE' as const,
    })),
    ...ownerInvoices.map((inv) => ({
      id: inv.id,
      libelle: `${inv.type} ${inv.numero}`,
      montant: inv.total || 0,
      type: 'PROPRIETAIRE' as const,
    })),
    ...ownerMaintenance.map((m) => ({
      id: m.id,
      libelle: m.titre,
      montant: m.coutReel || m.coutEstime || 0,
      type: 'PROPRIETAIRE' as const,
    })),
  ];

  const totalDecaissement = decaissementsLignes.reduce((sum, d) => sum + d.montant, 0);

  // ============================================================
  // ENCAISSEMENTS (cautions)
  // ============================================================
  const encaissementsLignes: EncaissementLigne[] = useMemo(() => {
    const cautions = payments.filter((p) => {
      if (p.proprietaireId !== owner.id) return false;
      if (p.statut !== 'Payé') return false;
      const obs = (p.observation || '').toLowerCase();
      return obs.includes('caution') || obs.includes('avance') || obs.includes('dossier');
    });

    return cautions.map((p) => ({
      id: p.id,
      libelle: `CAUTION ${p.locataireNom.toUpperCase()}`,
      montant: p.montantPaye || 0,
    }));
  }, [payments, owner]);

  const totalEncaissement = encaissementsLignes.reduce((sum, e) => sum + e.montant, 0);

  // ============================================================
  // NET À REVERSER
  // ============================================================
  const netAReverser = totalNet + totalArrieresNet - totalDecaissement + totalEncaissement;

  // ============================================================
  // NUMÉRO BULLETIN
  // ============================================================
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const ownerSeq = String(
    (Math.abs(owner.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 999) + 1
  ).padStart(3, '0');
  const numeroBulletin = `BV-${year}-${month}-PROP-${ownerSeq}`;
  const gerantNom = currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Service Gérance';

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
      typeDeduction: 'AUTRE',
      libelle: deductionLibelle,
      montant: deductionMontant,
      dateDeduction: new Date().toISOString().split('T')[0],
    };

    onSaveDeduction(newDeduction);
    setShowDeductionForm(false);
    setDeductionLibelle('');
    setDeductionMontant(0);
  };

  const handleDeleteDeduction = (id: string) => {
    if (!onDeleteDeduction) return;
    if (window.confirm('Supprimer cette déduction ?')) onDeleteDeduction(id);
  };

  const handleSave = () => {
    if (!onSaveBulletin) return;
    const bulletin: BulletinVersement = {
      id: crypto.randomUUID(),
      reference: numeroBulletin,
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
      statut: 'Validé',
      dateValidation: new Date().toISOString().split('T')[0],
      createdById: currentUser?.id,
      createdByNom: gerantNom,
      createdByRole: currentUser?.role,
    };
    onSaveBulletin(bulletin);
    alert('✅ Bulletin enregistré avec succès.');
  };

  // Pagination
  const lignesParPage = 25;
  const totalPages = Math.max(1, Math.ceil(loyersData.length / lignesParPage));

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-6xl max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
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
                N° {numeroBulletin} · Période : {selectedPeriod} · Taux : {tauxCommission}%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} className="px-4 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] border border-[#C9A96E]/30 text-[#E8D5B0] font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer">
              <Save className="w-4 h-4" /><span>Enregistrer</span>
            </button>
            <button onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer">
              <Printer className="w-4 h-4" /><span>Imprimer</span>
            </button>
            <button onClick={onClose} className="p-2 rounded-lg text-[#A8B4C4] hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document */}
        <div className="p-8 bg-white text-neutral-900 overflow-y-auto print:p-4">
          {/* PAGE 1 */}
          <div className="print-page">
            {/* En-tête */}
            <div className="text-center border-b-2 border-neutral-900 pb-3 mb-4">
              <h2 className="text-sm font-bold uppercase text-neutral-900">TRANS IMMOBILIER SERVICES SARL</h2>
              <p className="text-[10px] text-neutral-600">GÉRANCE - LOCATION - VENTE - ACHAT</p>
              <h1 className="text-2xl font-black uppercase tracking-widest text-neutral-900 mt-2">
                BULLETIN DE VERSEMENT
              </h1>
              <div className="text-xs text-neutral-700 mt-1 font-semibold">
                Mois de : <span className="uppercase">{selectedPeriod}</span>
              </div>
            </div>

            {/* En-tête immeuble */}
            {ownerBuildings.length > 0 && (
              <table className="w-full text-[9px] border-collapse mb-3">
                <thead>
                  <tr className="bg-neutral-800 text-white">
                    <th className="p-1 border border-neutral-600 text-left font-bold">Ref_Imm</th>
                    <th className="p-1 border border-neutral-600 text-left font-bold">Nom_Immeuble</th>
                    <th className="p-1 border border-neutral-600 text-left font-bold">Type</th>
                    <th className="p-1 border border-neutral-600 text-left font-bold">Adresse</th>
                    <th className="p-1 border border-neutral-600 text-left font-bold">Propriétaire</th>
                    <th className="p-1 border border-neutral-600 text-center font-bold">Taux Com</th>
                  </tr>
                </thead>
                <tbody>
                  {ownerBuildings.map((b) => (
                    <tr key={b.id}>
                      <td className="p-1 border border-neutral-300 font-mono font-bold">{b.ref || '—'}</td>
                      <td className="p-1 border border-neutral-300 font-bold">{b.nom}</td>
                      <td className="p-1 border border-neutral-300">{b.type}</td>
                      <td className="p-1 border border-neutral-300">{b.adresse || b.quartier || '—'}</td>
                      <td className="p-1 border border-neutral-300 uppercase font-semibold">{owner.prenom} {owner.nom}</td>
                      <td className="p-1 border border-neutral-300 text-center font-mono">{tauxCommission}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Tableau principal */}
            <table className="w-full text-[9px] border-collapse mb-4">
              <thead>
                <tr className="bg-neutral-800 text-white">
                  <th className="p-1 border border-neutral-600 text-left font-bold w-[25px]">N°</th>
                  <th className="p-1 border border-neutral-600 text-left font-bold">Locataire</th>
                  <th className="p-1 border border-neutral-600 text-left font-bold w-[55px]">Ref</th>
                  <th className="p-1 border border-neutral-600 text-left font-bold">Bien Loué</th>
                  <th className="p-1 border border-neutral-600 text-right font-bold w-[65px]">Loyer</th>
                  <th className="p-1 border border-neutral-600 text-right font-bold w-[65px]">Net</th>
                  <th className="p-1 border border-neutral-600 text-left font-bold w-[90px]">Observations</th>
                </tr>
              </thead>
              <tbody>
                {loyersData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-neutral-500 italic">Aucun locataire pour cette période</td>
                  </tr>
                ) : (
                  loyersData.map((l, idx) => (
                    <tr key={l.unitId} className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}>
                      <td className="p-1 border border-neutral-300 text-neutral-700">{idx + 1}</td>
                      <td className="p-1 border border-neutral-300 font-bold text-neutral-900">{l.locataire}</td>
                      <td className="p-1 border border-neutral-300 font-mono text-[8px] text-neutral-900">{l.locataireRef}</td>
                      <td className="p-1 border border-neutral-300 text-neutral-800">{l.unitNom}</td>
                      <td className="p-1 border border-neutral-300 text-right font-mono text-neutral-900">
                        {l.estNonPayeur ? '' : formatNumber(l.loyer)}
                      </td>
                      <td className="p-1 border border-neutral-300 text-right font-mono font-bold text-neutral-900">
                        {l.estNonPayeur ? '' : formatNumber(l.net)}
                      </td>
                      <td className="p-1 border border-neutral-300 text-neutral-600 text-[8px] italic">{l.observation}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-neutral-200 font-bold">
                  <td colSpan={4} className="p-1 border border-neutral-400"></td>
                  <td className="p-1 border border-neutral-400 text-right font-mono text-neutral-900">{formatNumber(totalLoyer)}</td>
                  <td className="p-1 border border-neutral-400 text-right font-mono text-neutral-900">{formatNumber(totalNet)}</td>
                  <td className="p-1 border border-neutral-400"></td>
                </tr>
              </tfoot>
            </table>

            {/* Arriérés */}
            {arrieresData.length > 0 && (
              <table className="w-full text-[9px] border-collapse mb-4">
                <thead>
                  <tr className="bg-neutral-800 text-white">
                    <th className="p-1 border border-neutral-600 text-left font-bold">Locataire</th>
                    <th className="p-1 border border-neutral-600 text-left font-bold w-[55px]">Ref</th>
                    <th className="p-1 border border-neutral-600 text-right font-bold w-[70px]">Règlement</th>
                    <th className="p-1 border border-neutral-600 text-right font-bold w-[70px]">Arriérés</th>
                    <th className="p-1 border border-neutral-600 text-right font-bold w-[70px]">Net</th>
                    <th className="p-1 border border-neutral-600 text-left font-bold">Observations</th>
                  </tr>
                </thead>
                <tbody>
                  {arrieresData.map((a, idx) => (
                    <tr key={idx}>
                      <td className="p-1 border border-neutral-300 font-bold">{a.locataire}</td>
                      <td className="p-1 border border-neutral-300 font-mono text-[8px]">{a.ref}</td>
                      <td className="p-1 border border-neutral-300 text-right font-mono">{formatNumber(a.reglement)}</td>
                      <td className="p-1 border border-neutral-300 text-right font-mono">{formatNumber(a.arrieres)}</td>
                      <td className="p-1 border border-neutral-300 text-right font-mono font-bold">{formatNumber(a.net)}</td>
                      <td className="p-1 border border-neutral-300 text-[8px] italic">{a.observations}</td>
                    </tr>
                  ))}
                  <tr className="bg-neutral-200 font-bold">
                    <td colSpan={2} className="p-1 border border-neutral-400"></td>
                    <td className="p-1 border border-neutral-400 text-right font-mono">{formatNumber(totalArrieres)}</td>
                    <td className="p-1 border border-neutral-400"></td>
                    <td className="p-1 border border-neutral-400 text-right font-mono">{formatNumber(totalArrieresNet)}</td>
                    <td className="p-1 border border-neutral-400"></td>
                  </tr>
                </tbody>
              </table>
            )}

            {/* Décaissement / Encaissement */}
            <div className="grid grid-cols-2 gap-4 mb-4 text-[9px]">
              <div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-neutral-200">
                      <th className="p-1 border border-neutral-400 text-left font-bold">Décaissement</th>
                      <th className="p-1 border border-neutral-400 text-right font-bold w-[80px]">Montant</th>
                      <th className="p-1 border border-neutral-400 text-center font-bold w-[25px] print:hidden"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {decaissementsLignes.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-2 text-center text-neutral-500 italic">Aucun décaissement</td>
                      </tr>
                    ) : (
                      decaissementsLignes.map((d) => (
                        <tr key={d.id}>
                          <td className="p-1 border border-neutral-300 text-[8px]">{d.libelle}</td>
                          <td className="p-1 border border-neutral-300 text-right font-mono text-[8px]">{formatNumber(d.montant)}</td>
                          <td className="p-1 border border-neutral-300 text-center print:hidden">
                            <button onClick={() => handleDeleteDeduction(d.id)} className="text-rose-600 hover:text-rose-800">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold">
                      <td className="p-1 border border-neutral-400 text-right">Total</td>
                      <td className="p-1 border border-neutral-400 text-right font-mono">{formatNumber(totalDecaissement)}</td>
                      <td className="p-1 border border-neutral-400 print:hidden"></td>
                    </tr>
                  </tfoot>
                </table>
                <button onClick={() => setShowDeductionForm(true)} className="mt-1 print:hidden px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-bold flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Ajouter décaissement
                </button>
              </div>

              <div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-neutral-200">
                      <th className="p-1 border border-neutral-400 text-left font-bold">Encaissement</th>
                      <th className="p-1 border border-neutral-400 text-right font-bold w-[80px]">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {encaissementsLignes.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="p-2 text-center text-neutral-500 italic">Aucun encaissement</td>
                      </tr>
                    ) : (
                      encaissementsLignes.map((e) => (
                        <tr key={e.id}>
                          <td className="p-1 border border-neutral-300 text-[8px]">{e.libelle}</td>
                          <td className="p-1 border border-neutral-300 text-right font-mono text-[8px]">{formatNumber(e.montant)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold">
                      <td className="p-1 border border-neutral-400 text-right">Total:</td>
                      <td className="p-1 border border-neutral-400 text-right font-mono">{formatNumber(totalEncaissement)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="text-center text-[9px] text-neutral-500 mt-6 pt-3 border-t border-neutral-300">
              Page 1 sur 2
            </div>
          </div>

          {/* PAGE 2 */}
          <div className="print-page-break mt-8 pt-8 border-t-2 border-dashed border-neutral-300 print:border-none print:mt-0 print:pt-0">
            <div className="mb-8 text-center">
              <div className="inline-block bg-neutral-300 px-4 py-1 text-xs font-bold text-neutral-900 uppercase mb-2">
                Net à Reverser
              </div>
              <div className="text-3xl font-black font-mono text-neutral-900">
                {formatNumber(netAReverser)}
              </div>
            </div>

            <div className="mb-10 text-sm">
              <div className="text-neutral-700 mb-2">Arrêté le Présent Bulletin à la Somme de :</div>
              <div className="text-base font-bold italic text-neutral-900 border-l-4 border-neutral-900 pl-3 py-2">
                {nombreEnLettres(netAReverser)} Francs
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 mb-12 mt-20">
              <div>
                <div className="font-bold text-neutral-800 text-sm mb-2">Le Gérant</div>
                <div className="text-xs text-neutral-700 mb-1">{gerantNom}</div>
                <div className="h-24 border-b border-dotted border-neutral-400"></div>
              </div>
              <div>
                <div className="text-right text-xs text-neutral-700 mb-2">
                  Dakar le <strong>{new Date().toLocaleDateString('fr-FR')}</strong>
                </div>
                <div className="font-bold text-neutral-800 text-sm mb-2 text-right">Le Propriétaire</div>
                <div className="text-xs text-neutral-700 mb-1 text-right uppercase">{owner.prenom} {owner.nom}</div>
                <div className="h-24 border-b border-dotted border-neutral-400"></div>
              </div>
            </div>

            <div className="text-center text-[9px] text-neutral-600 leading-relaxed mt-8">
              <div className="font-bold">FITAL-IMMO SAS RC : SN-DKR-2023. B.12158 N.I.N.E.A: 0101576352V5</div>
              <div>Sicap Baobabs N° 689/F</div>
              <div>Tél : 33 825 59 67 / 77 551 16 70 / 77 602 76 97</div>
              <div>Email contact@fital-immo.com / contactafital@gmail.com</div>
            </div>

            <div className="text-center text-[9px] text-neutral-500 mt-6 pt-3 border-t border-neutral-300">
              Page 2 sur 2
            </div>
          </div>
        </div>

        {/* Modal déduction */}
        {showDeductionForm && (
          <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 print:hidden">
            <div className="bg-[#162133] border border-[#C9A96E]/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-bold text-white text-base">Ajouter un Décaissement</h3>
                <button onClick={() => setShowDeductionForm(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddDeduction} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Libellé *</label>
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
                  <label className="block text-[11px] font-bold text-[#C9A96E] uppercase mb-1">Montant (FCFA) *</label>
                  <input
                    type="number"
                    value={deductionMontant || ''}
                    onChange={(e) => setDeductionMontant(Number(e.target.value))}
                    required
                    min={1}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E] text-white font-mono font-bold"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                  <button type="button" onClick={() => setShowDeductionForm(false)} className="px-4 py-2 rounded-xl bg-[#1E2E45] text-slate-300">Annuler</button>
                  <button type="submit" className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold">Ajouter</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};