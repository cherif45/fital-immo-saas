// ============================================================
// FITAL-IMMO — Import Excel vers Supabase (v4 FINALE)
// Usage : node scripts/import-excel.cjs scripts/base_fital_immo_test.xlsx
// ============================================================

const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ============================================================
// CHARGEMENT .env.local
// ============================================================
function loadEnvFile(filename) {
  const filePath = path.resolve(__dirname, '..', filename);
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile('.env.local');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AGENCY_ID = process.env.AGENCY_ID || '5f581aa8-6e92-47a6-ae8e-a28a9de66140';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ============================================================
// HELPERS
// ============================================================
const cleanString = (v) => (v === undefined || v === null ? '' : String(v).trim());
const cleanNumber = (v) => {
  if (v === undefined || v === null || v === '') return 0;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : n;
};
const cleanDate = (v) => {
  const s = cleanString(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
};
const genUUID = () => crypto.randomUUID();

const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warn: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
};

function readSheet(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    log.warn(`Onglet "${sheetName}" introuvable`);
    return [];
  }
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

// ============================================================
// IMPORT PROPRIÉTAIRES
// ============================================================
async function importOwners(rows) {
  if (rows.length === 0) return { count: 0, map: {} };
  const refToUuid = {};

  const owners = rows.map((r) => {
    const ref = cleanString(r.Ref_Proprietaire);
    const uuid = genUUID();
    if (ref) refToUuid[ref] = uuid;

    return {
      id: uuid,
      agency_id: AGENCY_ID,
      ref: `PRO-${ref}`,
      nom: cleanString(r.Nom_Proprietaire).toUpperCase(),
      prenom: cleanString(r['Prénom_Proprietaire'] || r.Prenom_Proprietaire) || '-',
      telephone: cleanString(r['Téléphone']) || '+221 77 000 00 00',
      email: cleanString(r.Email) || `owner-${ref}@fital-immo.com`,
      adresse: cleanString(r.Adresse),
      banque: cleanString(r.Banque) || 'CBAO Attijariwafa Bank',
      compte_bancaire: cleanString(r['Compte Bancaire N°']),
      ninea: cleanString(r.NINEA),
      taux_commission: cleanNumber(r['Taux Commission Gérant']) || 10,
      statut: cleanString(r.Statut_Propriétaire) || 'Actif',
      observations: cleanString(r.Observation),
      mandat_gerance: `MANDAT-${ref}-${new Date().getFullYear()}`,
    };
  });

  const { error } = await supabase.from('owners').insert(owners);
  if (error) throw new Error(`owners: ${error.message}`);
  log.success(`${owners.length} propriétaires importés`);
  return { count: owners.length, map: refToUuid };
}

// ============================================================
// IMPORT IMMEUBLES
// ============================================================
async function importBuildings(rows, ownersMap) {
  if (rows.length === 0) return { count: 0, map: {}, ownersByBuildingRef: {} };
  const refToUuid = {};
  const ownersByBuildingRef = {};

  const buildings = rows.map((r) => {
    const ref = cleanString(r.Ref_Immeuble);
    const uuid = genUUID();
    if (ref) refToUuid[ref] = uuid;

    const ownerRef = cleanString(r.Ref_Proprietaire);
    const ownerUuid = ownersMap[ownerRef] || null;
    if (ref) ownersByBuildingRef[ref] = ownerUuid;

    return {
      id: uuid,
      agency_id: AGENCY_ID,
      ref: `IMM-${ref}`,
      proprietaire_id: ownerUuid,
      nom: cleanString(r.Nom) || `Immeuble ${ref}`,
      adresse: cleanString(r.Adresse),
      quartier: 'Dakar',
      ville: 'Dakar',
      type: cleanString(r.Type_Immeuble) || 'Immeuble',
      nombre_etages: cleanNumber(r.Niveau),
      description: cleanString(r.Caractéristique_Immeuble),
      statut: 'Actif',
    };
  });

  const { error } = await supabase.from('buildings').insert(buildings);
  if (error) throw new Error(`buildings: ${error.message}`);
  log.success(`${buildings.length} immeubles importés`);
  return { count: buildings.length, map: refToUuid, ownersByBuildingRef };
}

// ============================================================
// IMPORT LOCATIFS (UNITS)
// ============================================================
async function importUnits(rows, buildingsMap) {
  if (rows.length === 0) return { count: 0, map: {} };
  const refToUuid = {};

  const units = rows.map((r) => {
    const ref = cleanString(r.Ref_Locatif);
    const uuid = genUUID();
    if (ref) refToUuid[ref] = uuid;

    const buildingRef = cleanString(r.Ref_Immeuble);
    const buildingId = buildingsMap[buildingRef] || null;

    return {
      id: uuid,
      agency_id: AGENCY_ID,
      building_id: buildingId,
      nom: cleanString(r.Contenu_Locatif) || `Local ${ref}`,
      type: cleanString(r.Type_Locatif) || 'Appartement',
      etage: cleanString(r.Niveau),
      superficie: 0,
      nombre_pieces: 1,
      loyer_base: 0,
      charges: 0,
      statut: 'Vacant',
      description: cleanString(r.Contenu_Locatif),
      equipements: [],
    };
  });

  const { error } = await supabase.from('units').insert(units);
  if (error) throw new Error(`units: ${error.message}`);
  log.success(`${units.length} espaces louables importés`);
  return { count: units.length, map: refToUuid };
}

// ============================================================
// IMPORT LOCATAIRES (sans bien_id — sera enrichi après)
// ============================================================
async function importTenants(rows) {
  if (rows.length === 0) return { count: 0, map: {} };
  const refToUuid = {};

  const tenants = rows.map((r) => {
    const ref = cleanString(r.Ref_Locataire);
    const uuid = genUUID();
    if (ref) refToUuid[ref] = uuid;

    const arrieres = cleanNumber(r['Arriérés']);
    const rawStatut = cleanString(r.Statut_Locataire).toLowerCase();
    let statut = 'À jour';
    if (arrieres > 0 || rawStatut.includes('impay')) statut = 'Impayé';
    else if (rawStatut.includes('retard')) statut = 'Retard';

    const nomClean = cleanString(r.Nom_Locataire);
    const prenomClean = cleanString(r['Prénom_Locataire'] || r.Prenom_Locataire);

    return {
      id: uuid,
      agency_id: AGENCY_ID,
      ref: `LOC-${new Date().getFullYear()}-${String(ref).padStart(5, '0')}`,
      nom: nomClean.toUpperCase() || 'LOCATAIRE',
      prenom: prenomClean || '-',
      telephone: cleanString(r['Téléphone']) || '+221 77 000 00 00',
      telephone_secondaire: null,
      email: cleanString(r.Email) || `${prenomClean.toLowerCase() || 'locataire'}.${nomClean.toLowerCase() || ref}@fital-immo.com`,
      cni: cleanString(r['N°CI']) || '000000000000',
      type_piece: 'CNI',
      fonction: cleanString(r.Fonction),
      employeur: cleanString(r.Société),
      revenu_mensuel: 0,
      contact_urgence_nom: null,
      contact_urgence_telephone: cleanString(r['Téléphone Conjoint']) || null,
      statut: statut,
      score_solvabilite: 85,
      bien_id: null,
      proprietaire_id: null,
      date_entree: cleanDate(r.Date_Entrée) || new Date().toISOString().split('T')[0],
      date_sortie: null,
      loyer_mensuel: 0,
      arrieres_cumules: arrieres,
      jours_retard: arrieres > 0 ? 30 : 0,
      observations: cleanString(r.Observations),
    };
  });

  const { error } = await supabase.from('tenants').insert(tenants);
  if (error) throw new Error(`tenants: ${error.message}`);
  log.success(`${tenants.length} locataires importés`);
  return { count: tenants.length, map: refToUuid };
}

// ============================================================
// IMPORT CONTRATS
// ============================================================
async function importContracts(rows, tenantsMap, unitsMap, buildingsMap, ownersByBuildingRef, unitsToBuildingRef) {
  if (rows.length === 0) return { count: 0, map: {} };
  const refToUuid = {};

  const contracts = rows.map((r) => {
    const ref = cleanString(r.Ref_Contrat);
    const uuid = genUUID();
    if (ref) refToUuid[ref] = uuid;

    const locRef = cleanString(r.Ref_Locataire);
    const bienRef = cleanString(r.Ref_Locatif);
    const lb = cleanNumber(r.LB || r.Montant_Location);

    const buildingRef = unitsToBuildingRef[bienRef] || null;
    const proprietaireId = buildingRef ? (ownersByBuildingRef[buildingRef] || null) : null;

    return {
      id: uuid,
      agency_id: AGENCY_ID,
      ref: `CTR-${ref}`,
      type_contrat: 'Habitation',
      locataire_id: tenantsMap[locRef] || null,
      bien_id: unitsMap[bienRef] || buildingsMap[bienRef] || null,
      proprietaire_id: proprietaireId,
      loyer_base: lb,
      charges: 0,
      tva: cleanNumber(r.TVA),
      tom: cleanNumber(r.TOM),
      tlv: cleanNumber(r.TLV),
      caution_loyer: cleanNumber(r['Montant caution']),
      caution_eau: 0,
      caution_electricite: 0,
      frais_adhesion: 0,
      date_debut: cleanDate(r.Début_Contrat) || new Date().toISOString().split('T')[0],
      date_fin: cleanDate(r.Fin_Contrat) || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      type_reglement: 'Mensuel',
      statut: 'En cours',
      date_contrat: cleanDate(r['Date Contrat']) || null,
      debut_contrat: cleanDate(r.Début_Contrat) || null,
      ref_periode: null,
      montant_caution: cleanNumber(r['Montant caution']),
      montant_commission: cleanNumber(r['Montant commission']),
      avance_loyer: 0,
      lb: lb,
      charges_diverses: 0,
    };
  });

  const { error } = await supabase.from('contracts').insert(contracts);
  if (error) throw new Error(`contracts: ${error.message}`);
  log.success(`${contracts.length} contrats importés`);
  return { count: contracts.length, map: refToUuid };
}

// ============================================================
// ENRICHIR LES LOCATAIRES (bien_id + loyer + proprietaire + revenu)
// ============================================================
async function enrichTenants(contractsRows, tenantsMap, unitsMap, buildingsMap, ownersByBuildingRef, unitsToBuildingRef) {
  log.info('Enrichissement des locataires depuis les contrats...');
  let count = 0;

  for (const r of contractsRows) {
    const locRef = cleanString(r.Ref_Locataire);
    const bienRef = cleanString(r.Ref_Locatif);
    const lb = cleanNumber(r.LB || r.Montant_Location);

    const locataireUuid = tenantsMap[locRef];
    const bienUuid = unitsMap[bienRef] || buildingsMap[bienRef] || null;
    const buildingRef = unitsToBuildingRef[bienRef] || null;
    const proprietaireUuid = buildingRef ? (ownersByBuildingRef[buildingRef] || null) : null;

    if (!locataireUuid) continue;

    const updateData = {
      bien_id: bienUuid,
      loyer_mensuel: lb,
      proprietaire_id: proprietaireUuid,
      revenu_mensuel: lb * 3,
    };

    const { error } = await supabase
      .from('tenants')
      .update(updateData)
      .eq('id', locataireUuid);

    if (error) {
      log.warn(`Enrichissement échoué pour ${locRef}: ${error.message}`);
    } else {
      count++;
    }
  }

  log.success(`${count} locataires enrichis (bien + loyer + proprio + revenu)`);
}

// ============================================================
// IMPORT PAIEMENTS
// ============================================================
async function importPayments(rows, tenantsMap, contractsMap, tenantsInfos, tenantsRows) {
  if (rows.length === 0) return { count: 0 };

  const payments = rows.map((r) => {
    const locRef = cleanString(r.Ref_Locataire);
    const montant = cleanNumber(r.Montant_Règlement);
    const locataireId = tenantsMap[locRef] || null;
    const infos = tenantsInfos[locRef] || {};

    const tenantRow = tenantsRows.find((t) => cleanString(t.Ref_Locataire) === locRef);
    const locNom = tenantRow ? `${cleanString(tenantRow['Prénom_Locataire'] || tenantRow.Prenom_Locataire)} ${cleanString(tenantRow.Nom_Locataire).toUpperCase()}` : null;

    return {
      id: genUUID(),
      agency_id: AGENCY_ID,
      ref: `PAY-${cleanString(r.Ref_Règlement)}`,
      quittance_numero: cleanString(r['N° Quittance']) || `QUITT-IMP-${Date.now()}-${Math.random().toString(36).slice(-4)}`,
      locataire_id: locataireId,
      bien_id: infos.bienId || null,
      proprietaire_id: infos.proprietaireId || null,
      contrat_id: infos.contratId || null,
      periode: cleanString(r.Ref_Periode),
      loyer_base: montant,
      charges: 0,
      tva: 0,
      tom: 0,
      penalites: 0,
      montant_total: montant,
      montant_paye: montant,
      montant_restant: 0,
      statut: 'Payé',
      mode_paiement: cleanString(r['Mode Règlement']) || 'Espèces',
      moyen_paiement_code: 'ESPECES',
      verification_statut: 'valide',
      date_paiement: cleanDate(r.Date_Règlement) || new Date().toISOString().split('T')[0],
      date_echeance: cleanDate(r.Date_Règlement) || new Date().toISOString().split('T')[0],
      recu_par: 'Import',
      observation: cleanString(r.Observation),
      locataire_nom: locNom,
      bien_nom: infos.bienNom || null,
      proprietaire_nom: infos.proprietaireNom || null,
    };
  });

  const { error } = await supabase.from('payments').insert(payments);
  if (error) throw new Error(`payments: ${error.message}`);
  log.success(`${payments.length} paiements importés`);
  return { count: payments.length };
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage : node scripts/import-excel.cjs chemin/vers/fichier.xlsx');
    process.exit(1);
  }
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Fichier introuvable : ${filePath}`);
    process.exit(1);
  }

  log.info(`Fichier : ${filePath}`);
  const workbook = XLSX.readFile(filePath);
  log.info(`Onglets : ${workbook.SheetNames.join(', ')}\n`);

  const ownersRows = readSheet(workbook, 'Propriétaires_Table');
  const buildingsRows = readSheet(workbook, 'Immeubles_Table');
  const unitsRows = readSheet(workbook, 'Localifs_Table');
  const tenantsRows = readSheet(workbook, 'Locataires_Table');
  const contractsRows = readSheet(workbook, 'Contrats_Table');
  const paymentsRows = readSheet(workbook, 'Règlements_Loyer_Table');

  log.info(`=== DÉBUT DE L'IMPORT ===\n`);

  // 1. Propriétaires
  const ownersResult = await importOwners(ownersRows);

  // 2. Immeubles
  const buildingsResult = await importBuildings(buildingsRows, ownersResult.map);

  // 3. Units
  const unitsResult = await importUnits(unitsRows, buildingsResult.map);

  // 4. Map Ref_Locatif → Ref_Immeuble
  const unitsToBuildingRef = {};
  unitsRows.forEach((r) => {
    const unitRef = cleanString(r.Ref_Locatif);
    const buildingRef = cleanString(r.Ref_Immeuble);
    if (unitRef && buildingRef) unitsToBuildingRef[unitRef] = buildingRef;
  });

  // 5. Tenants (sans lien)
  const tenantsResult = await importTenants(tenantsRows);

  // 6. Contrats
  const contractsResult = await importContracts(
    contractsRows,
    tenantsResult.map,
    unitsResult.map,
    buildingsResult.map,
    buildingsResult.ownersByBuildingRef,
    unitsToBuildingRef
  );

  // 7. ⭐ ENRICHISSEMENT locataires (bien_id + loyer + proprietaire + revenu)
  await enrichTenants(
    contractsRows,
    tenantsResult.map,
    unitsResult.map,
    buildingsResult.map,
    buildingsResult.ownersByBuildingRef,
    unitsToBuildingRef
  );

  // 8. Construire map Ref_Locataire → infos pour les paiements
  const tenantsInfos = {};
  contractsRows.forEach((r) => {
    const locRef = cleanString(r.Ref_Locataire);
    const bienRef = cleanString(r.Ref_Locatif);
    const contratRef = cleanString(r.Ref_Contrat);
    const buildingRef = unitsToBuildingRef[bienRef] || null;

    const ownerRef = buildingsRows.find((b) => cleanString(b.Ref_Immeuble) === buildingRef)?.Ref_Proprietaire;
    const ownerRow = ownersRows.find((o) => cleanString(o.Ref_Proprietaire) === cleanString(ownerRef));
    const tenantRow2 = tenantsRows.find((t) => cleanString(t.Ref_Locataire) === locRef);

    tenantsInfos[locRef] = {
      bienId: unitsResult.map[bienRef] || buildingsResult.map[bienRef] || null,
      proprietaireId: buildingRef ? (buildingsResult.ownersByBuildingRef[buildingRef] || null) : null,
      contratId: contractsResult.map[contratRef] || null,
      bienNom: unitsRows.find((u) => cleanString(u.Ref_Locatif) === bienRef)?.Contenu_Locatif || buildingsRows.find((b) => cleanString(b.Ref_Immeuble) === buildingRef)?.Nom || null,
      proprietaireNom: ownerRow ? `${cleanString(ownerRow['Prénom_Proprietaire'] || ownerRow.Prenom_Proprietaire)} ${cleanString(ownerRow.Nom_Proprietaire).toUpperCase()}` : null,
      locataireNom: tenantRow2 ? `${cleanString(tenantRow2['Prénom_Locataire'] || tenantRow2.Prenom_Locataire)} ${cleanString(tenantRow2.Nom_Locataire).toUpperCase()}` : null,
    };
  });

  // 9. Payments
  await importPayments(paymentsRows, tenantsResult.map, contractsResult.map, tenantsInfos, tenantsRows);

  log.info(`\n=== IMPORT TERMINÉ ===`);
}

main().catch((err) => {
  console.error('\n❌ ERREUR IMPORT :', err.message);
  process.exit(1);
});