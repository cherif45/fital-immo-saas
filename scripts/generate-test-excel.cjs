const XLSX = require('xlsx');
const path = require('path');

const wb = XLSX.utils.book_new();

// ============================================================
// PROPRIÉTAIRES
// ============================================================
const owners = [
  { Ref_Proprietaire: 1001, Nom_Proprietaire: 'DIOP', Prénom_Proprietaire: 'Mamadou', Adresse: 'Sacré-Cœur 3', Téléphone: '+221 77 111 22 33', Email: 'mamadou.diop@gmail.com', Statut_Propriétaire: 'Actif', 'Taux Commission Gérant': 10, Banque: 'CBAO', 'Compte Bancaire N°': '01234567890', NINEA: '00123456789', Observation: 'Propriétaire principal' },
  { Ref_Proprietaire: 1002, Nom_Proprietaire: 'FALL', Prénom_Proprietaire: 'Aïssatou', Adresse: 'Almadies', Téléphone: '+221 76 222 33 44', Email: 'aissatou.fall@gmail.com', Statut_Propriétaire: 'Actif', 'Taux Commission Gérant': 8, Banque: 'SGBS', 'Compte Bancaire N°': '09876543210', NINEA: '00987654321', Observation: '2 immeubles' },
  { Ref_Proprietaire: 1003, Nom_Proprietaire: 'SOW', Prénom_Proprietaire: 'Ibrahima', Adresse: 'Plateau', Téléphone: '+221 77 333 44 55', Email: 'i.sow@gmail.com', Statut_Propriétaire: 'Actif', 'Taux Commission Gérant': 10, Banque: 'Ecobank', 'Compte Bancaire N°': '01112223334', NINEA: '00111222333', Observation: '' },
  { Ref_Proprietaire: 1004, Nom_Proprietaire: 'BA', Prénom_Proprietaire: 'Fatou', Adresse: 'Point E', Téléphone: '+221 78 444 55 66', Email: 'fatou.ba@gmail.com', Statut_Propriétaire: 'Actif', 'Taux Commission Gérant': 12, Banque: 'BICIS', 'Compte Bancaire N°': '02223334445', NINEA: '00222233344', Observation: '' },
  { Ref_Proprietaire: 1005, Nom_Proprietaire: 'NDIAYE', Prénom_Proprietaire: 'Ousmane', Adresse: 'Mermoz', Téléphone: '+221 77 555 66 77', Email: 'o.ndiaye@gmail.com', Statut_Propriétaire: 'Actif', 'Taux Commission Gérant': 10, Banque: 'CBAO', 'Compte Bancaire N°': '03334445556', NINEA: '00333344455', Observation: '' },
];

// ============================================================
// IMMEUBLES
// ============================================================
const buildings = [
  { Ref_Immeuble: 2001, Ref_Proprietaire: 1001, Nom: 'Villa Sacré-Cœur', Type_Immeuble: 'Villa', Adresse: 'Sacré-Cœur 3', Niveau: 1, Caractéristique_Immeuble: '4 chambres + Salon + Jardin', Observation: 'Villa neuve' },
  { Ref_Immeuble: 2002, Ref_Proprietaire: 1002, Nom: 'Immeuble Almadies R+3', Type_Immeuble: 'Immeuble', Adresse: 'Almadies', Niveau: 4, Caractéristique_Immeuble: 'R+3 avec 6 appartements', Observation: 'Proche plage' },
  { Ref_Immeuble: 2003, Ref_Proprietaire: 1003, Nom: 'Résidence Plateau', Type_Immeuble: 'Immeuble', Adresse: 'Plateau', Niveau: 3, Caractéristique_Immeuble: 'R+2 avec 4 appartements', Observation: 'Centre-ville' },
  { Ref_Immeuble: 2004, Ref_Proprietaire: 1004, Nom: 'Immeuble Point E', Type_Immeuble: 'Immeuble', Adresse: 'Point E', Niveau: 2, Caractéristique_Immeuble: 'R+1 avec 2 appartements', Observation: 'Zone calme' },
  { Ref_Immeuble: 2005, Ref_Proprietaire: 1005, Nom: 'Villa Mermoz', Type_Immeuble: 'Villa', Adresse: 'Mermoz', Niveau: 1, Caractéristique_Immeuble: '3 chambres + Salon', Observation: 'Piscine' },
];

// ============================================================
// LOCATIFS (UNITÉS)
// ============================================================
const units = [
  { Ref_Locatif: 3001, Ref_Immeuble: 2001, Type_Locatif: 'Villa', Contenu_Locatif: '4 chambres, salon, cuisine, jardin', Niveau: 'RDC', Actif: 'Oui' },
  { Ref_Locatif: 3002, Ref_Immeuble: 2002, Type_Locatif: 'Appartement', Contenu_Locatif: '3 chambres + salon', Niveau: '1er', Actif: 'Oui' },
  { Ref_Locatif: 3003, Ref_Immeuble: 2002, Type_Locatif: 'Appartement', Contenu_Locatif: '2 chambres + salon', Niveau: '2e', Actif: 'Oui' },
  { Ref_Locatif: 3004, Ref_Immeuble: 2002, Type_Locatif: 'Studio', Contenu_Locatif: 'Studio meublé', Niveau: '3e', Actif: 'Oui' },
  { Ref_Locatif: 3005, Ref_Immeuble: 2003, Type_Locatif: 'Appartement', Contenu_Locatif: '3 chambres + salon', Niveau: '1er', Actif: 'Oui' },
  { Ref_Locatif: 3006, Ref_Immeuble: 2003, Type_Locatif: 'Appartement', Contenu_Locatif: '2 chambres + salon', Niveau: '2e', Actif: 'Oui' },
  { Ref_Locatif: 3007, Ref_Immeuble: 2004, Type_Locatif: 'Appartement', Contenu_Locatif: '2 chambres + salon', Niveau: 'RDC', Actif: 'Oui' },
  { Ref_Locatif: 3008, Ref_Immeuble: 2005, Type_Locatif: 'Villa', Contenu_Locatif: '3 chambres + salon + piscine', Niveau: 'RDC', Actif: 'Oui' },
];

// ============================================================
// LOCATAIRES
// ============================================================
const tenants = [
  { Ref_Locataire: 4001, Nom_Locataire: 'GUEYE', Prénom_Locataire: 'Amadou', Téléphone: '+221 77 100 20 30', Fonction: 'Cadre', Société: 'Orange', 'N°CI': '125419900214', Statut_Locataire: 'Payé', 'Téléphone Conjoint': '+221 76 200 30 40', Date_Entrée: '2024-03-15', Arriérés: 0, Observations: 'Locataire exemplaire' },
  { Ref_Locataire: 4002, Nom_Locataire: 'SARR', Prénom_Locataire: 'Awa', Téléphone: '+221 78 200 30 40', Fonction: 'Enseignante', Société: 'Lycée Blaise Diagne', 'N°CI': '125419800315', Statut_Locataire: 'En retard', 'Téléphone Conjoint': '+221 77 300 40 50', Date_Entrée: '2023-06-01', Arriérés: 250000, Observations: 'Relancé 3 fois' },
  { Ref_Locataire: 4003, Nom_Locataire: 'DIALLO', Prénom_Locataire: 'Mamadou', Téléphone: '+221 77 300 40 50', Fonction: 'Commerçant', Société: 'Auto-entrepreneur', 'N°CI': '125419700416', Statut_Locataire: 'Impayé', 'Téléphone Conjoint': '', Date_Entrée: '2022-01-10', Arriérés: 750000, Observations: 'Litige en cours' },
  { Ref_Locataire: 4004, Nom_Locataire: 'NIANG', Prénom_Locataire: 'Fatou', Téléphone: '+221 76 400 50 60', Fonction: 'Infirmière', Société: 'Hôpital Principal', 'N°CI': '125419600517', Statut_Locataire: 'Payé', 'Téléphone Conjoint': '+221 77 500 60 70', Date_Entrée: '2023-09-20', Arriérés: 0, Observations: '' },
  { Ref_Locataire: 4005, Nom_Locataire: 'SECK', Prénom_Locataire: 'Cheikh', Téléphone: '+221 77 500 60 70', Fonction: 'Ingénieur', Société: 'Sonatel', 'N°CI': '125419500618', Statut_Locataire: 'Payé', 'Téléphone Conjoint': '', Date_Entrée: '2024-01-05', Arriérés: 0, Observations: '' },
  { Ref_Locataire: 4006, Nom_Locataire: 'FAYE', Prénom_Locataire: 'Marie', Téléphone: '+221 78 600 70 80', Fonction: 'Médecin', Société: 'Clinique Pasteur', 'N°CI': '125419400719', Statut_Locataire: 'Retard', 'Téléphone Conjoint': '+221 77 700 80 90', Date_Entrée: '2023-04-12', Arriérés: 175000, Observations: 'Acompte partiel' },
  { Ref_Locataire: 4007, Nom_Locataire: 'MBAYE', Prénom_Locataire: 'Alioune', Téléphone: '+221 77 700 80 90', Fonction: 'Fonctionnaire', Société: 'Ministère', 'N°CI': '125419300820', Statut_Locataire: 'Payé', 'Téléphone Conjoint': '', Date_Entrée: '2022-11-08', Arriérés: 0, Observations: '' },
  { Ref_Locataire: 4008, Nom_Locataire: 'TOURE', Prénom_Locataire: 'Khady', Téléphone: '+221 76 800 90 00', Fonction: 'Commerçante', Société: 'Boutique Plateau', 'N°CI': '125419200921', Statut_Locataire: 'Impayé', 'Téléphone Conjoint': '+221 77 900 00 11', Date_Entrée: '2023-02-14', Arriérés: 400000, Observations: '' },
];

// ============================================================
// CONTRATS
// ============================================================
const contracts = [
  { Ref_Contrat: 5001, Ref_Locataire: 4001, Ref_Locatif: 3002, 'Date Contrat': '2024-03-01', Début_Contrat: '2024-03-15', Fin_Contrat: '2027-03-15', 'Montant caution': 500000, 'Montant commission': 250000, Montant_Location: 250000, LB: 250000, TVA: 45000, TOM: 9000, TLV: 6250, Modalité_Contrat: 'Mensuel', 'Nombre de mois': 12 },
  { Ref_Contrat: 5002, Ref_Locataire: 4002, Ref_Locatif: 3003, 'Date Contrat': '2023-05-20', Début_Contrat: '2023-06-01', Fin_Contrat: '2026-06-01', 'Montant caution': 400000, 'Montant commission': 200000, Montant_Location: 200000, LB: 200000, TVA: 36000, TOM: 7200, TLV: 5000, Modalité_Contrat: 'Mensuel', 'Nombre de mois': 12 },
  { Ref_Contrat: 5003, Ref_Locataire: 4003, Ref_Locatif: 3005, 'Date Contrat': '2022-01-05', Début_Contrat: '2022-01-10', Fin_Contrat: '2025-01-10', 'Montant caution': 600000, 'Montant commission': 300000, Montant_Location: 300000, LB: 300000, TVA: 54000, TOM: 10800, TLV: 7500, Modalité_Contrat: 'Mensuel', 'Nombre de mois': 12 },
  { Ref_Contrat: 5004, Ref_Locataire: 4004, Ref_Locatif: 3006, 'Date Contrat': '2023-09-15', Début_Contrat: '2023-09-20', Fin_Contrat: '2026-09-20', 'Montant caution': 400000, 'Montant commission': 200000, Montant_Location: 200000, LB: 200000, TVA: 36000, TOM: 7200, TLV: 5000, Modalité_Contrat: 'Mensuel', 'Nombre de mois': 12 },
  { Ref_Contrat: 5005, Ref_Locataire: 4005, Ref_Locatif: 3001, 'Date Contrat': '2024-01-01', Début_Contrat: '2024-01-05', Fin_Contrat: '2027-01-05', 'Montant caution': 700000, 'Montant commission': 350000, Montant_Location: 350000, LB: 350000, TVA: 63000, TOM: 12600, TLV: 8750, Modalité_Contrat: 'Mensuel', 'Nombre de mois': 12 },
  { Ref_Contrat: 5006, Ref_Locataire: 4006, Ref_Locatif: 3007, 'Date Contrat': '2023-04-01', Début_Contrat: '2023-04-12', Fin_Contrat: '2026-04-12', 'Montant caution': 400000, 'Montant commission': 200000, Montant_Location: 200000, LB: 200000, TVA: 36000, TOM: 7200, TLV: 5000, Modalité_Contrat: 'Mensuel', 'Nombre de mois': 12 },
  { Ref_Contrat: 5007, Ref_Locataire: 4007, Ref_Locatif: 3008, 'Date Contrat': '2022-11-01', Début_Contrat: '2022-11-08', Fin_Contrat: '2025-11-08', 'Montant caution': 900000, 'Montant commission': 450000, Montant_Location: 450000, LB: 450000, TVA: 81000, TOM: 16200, TLV: 11250, Modalité_Contrat: 'Mensuel', 'Nombre de mois': 12 },
  { Ref_Contrat: 5008, Ref_Locataire: 4008, Ref_Locatif: 3004, 'Date Contrat': '2023-02-10', Début_Contrat: '2023-02-14', Fin_Contrat: '2026-02-14', 'Montant caution': 250000, 'Montant commission': 125000, Montant_Location: 125000, LB: 125000, TVA: 22500, TOM: 4500, TLV: 3125, Modalité_Contrat: 'Mensuel', 'Nombre de mois': 12 },
];

// ============================================================
// PAIEMENTS
// ============================================================
const payments = [
  { Ref_Règlement: 6001, Ref_Locataire: 4001, Ref_Periode: 'Septembre 2026', Date_Règlement: '2026-09-05', Montant_Règlement: 250000, 'N° Quittance': 'QUITT-2026-001', 'Mode Règlement': 'Espèces', Observation: '' },
  { Ref_Règlement: 6002, Ref_Locataire: 4004, Ref_Periode: 'Septembre 2026', Date_Règlement: '2026-09-06', Montant_Règlement: 200000, 'N° Quittance': 'QUITT-2026-002', 'Mode Règlement': 'Wave', Observation: '' },
  { Ref_Règlement: 6003, Ref_Locataire: 4005, Ref_Periode: 'Septembre 2026', Date_Règlement: '2026-09-07', Montant_Règlement: 350000, 'N° Quittance': 'QUITT-2026-003', 'Mode Règlement': 'Espèces', Observation: '' },
  { Ref_Règlement: 6004, Ref_Locataire: 4007, Ref_Periode: 'Septembre 2026', Date_Règlement: '2026-09-08', Montant_Règlement: 450000, 'N° Quittance': 'QUITT-2026-004', 'Mode Règlement': 'Virement', Observation: '' },
  { Ref_Règlement: 6005, Ref_Locataire: 4002, Ref_Periode: 'Août 2026', Date_Règlement: '2026-08-12', Montant_Règlement: 100000, 'N° Quittance': 'QUITT-2026-005', 'Mode Règlement': 'Espèces', Observation: 'Paiement partiel' },
  { Ref_Règlement: 6006, Ref_Locataire: 4006, Ref_Periode: 'Août 2026', Date_Règlement: '2026-08-20', Montant_Règlement: 100000, 'N° Quittance': 'QUITT-2026-006', 'Mode Règlement': 'Espèces', Observation: 'Acompte' },
];

// ============================================================
// CRÉATION DES ONGLETS
// ============================================================
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(owners), 'Propriétaires_Table');
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildings), 'Immeubles_Table');
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(units), 'Localifs_Table');
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tenants), 'Locataires_Table');
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(contracts), 'Contrats_Table');
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payments), 'Règlements_Loyer_Table');

// ============================================================
// SAUVEGARDE
// ============================================================
const outPath = path.join(__dirname, 'base_fital_immo_test.xlsx');
XLSX.writeFile(wb, outPath);
console.log(`✅ Fichier créé : ${outPath}`);
console.log(`📊 6 onglets : Propriétaires (5), Immeubles (5), Localifs (8), Locataires (8), Contrats (8), Règlements (6)`);