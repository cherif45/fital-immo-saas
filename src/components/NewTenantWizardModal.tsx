import React, { useState, useEffect } from 'react';
import {
  UserPlus, Building, FileText, DollarSign, ClipboardCheck,
  CheckCircle2, X, ChevronRight, ChevronLeft, AlertTriangle,
  Percent, User, Users,
} from 'lucide-react';
import { AgencySettings, Property, Tenant, LeaseContract, Inspection, Unit } from '../types';
import { formatCurrencyFCFA } from '../lib/calculations/financial';
import { createDocumentNumber } from '../lib/documentNumber';

interface NewTenantWizardModalProps {
  properties: Property[];
  units?: Unit[];
  settings?: AgencySettings;
  onComplete: (data: {
    tenant: Tenant;
    contract: LeaseContract;
    inspection: Inspection;
  }) => void;
  onClose: () => void;
}

// ============================================================
// Helper : Montant en lettres (français)
// ============================================================
function nombreEnLettres(n: number): string {
  if (n === 0) return 'zéro';
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

export function NewTenantWizardModal({
  properties,
  units = [],
  settings,
  onComplete,
  onClose,
}: NewTenantWizardModalProps) {
  const [step, setStep] = useState(1);

  // ============================================================
  // ÉTAPE 1 : Locataire (identité)
  // ============================================================
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('+221 77 ');
  const [email, setEmail] = useState('');
  const [typePiece, setTypePiece] = useState<string>('CNI');
  const [cni, setCni] = useState('');
  const [profession, setProfession] = useState('');
  const [employeur, setEmployeur] = useState('');
  const [revenuMensuel, setRevenuMensuel] = useState(600000);
  const [conjointNom, setConjointNom] = useState('');
  const [conjointTelephone, setConjointTelephone] = useState('');

  // ============================================================
  // ÉTAPE 2 : Bien (Property ou Unit)
  // ============================================================
  const vacantProperties = properties.filter((p) => p.statut === 'Vacant');
  const vacantUnits = units.filter((u) => u.statut === 'Vacant');
  const allVacantOptions: any[] = [...vacantProperties, ...vacantUnits];

  const [selectedBienId, setSelectedBienId] = useState(allVacantOptions[0]?.id || '');
  const selectedBien: any = allVacantOptions.find((b) => b.id === selectedBienId);
  const isUnit = selectedBien ? 'buildingId' in selectedBien : false;

  // ============================================================
  // ÉTAPE 3 : Contrat (tous les champs de ContractsView)
  // ============================================================
  const [refLocatif, setRefLocatif] = useState(() => createDocumentNumber(settings?.prefixContrat, 'BAIL-'));
  const [dateContrat, setDateContrat] = useState(new Date().toISOString().split('T')[0]);
  const [debutContrat, setDebutContrat] = useState(new Date().toISOString().split('T')[0]);
  const [refPeriode, setRefPeriode] = useState(new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
  const [typeReglement, setTypeReglement] = useState('MENSUEL');
  const [nombreMois, setNombreMois] = useState(1);
  const [lb, setLb] = useState(selectedBien?.loyerBase || 300000);
  // 🆕 TOM / TVA / TLV saisis MANUELLEMENT (comme dans Contrat de l'agence)
  const [tomManuel, setTomManuel] = useState(0);
  const [tvaManuel, setTvaManuel] = useState(0);
  const [tlvManuel, setTlvManuel] = useState(0);
  // ============================================================
  // ÉTAPE 4 : Cautions & Frais (tous les champs)
  // ============================================================
  const [montantCaution, setMontantCaution] = useState((selectedBien?.loyerBase || 300000) * 2);
  const [acompteCaution, setAcompteCaution] = useState(0);
  const [montantCommission, setMontantCommission] = useState(0);
  const [avanceLoyer, setAvanceLoyer] = useState((selectedBien?.loyerBase || 300000) * 2);
  const [cautionEau, setCautionEau] = useState(0);
  const [cautionElectricite, setCautionElectricite] = useState(0);
  const [chargesDiverses, setChargesDiverses] = useState(0);
  const [fraisAdhesion, setFraisAdhesion] = useState(50000);

  // ============================================================
  // ÉTAPE 5 : État des lieux
  // ============================================================
  const [agentNom, setAgentNom] = useState('Agent Gérance FITAL-IMMO');
  const [etatGeneral, setEtatGeneral] = useState('Très bon état général (neuf/repeint)');
  const [compteurEau, setCompteurEau] = useState('142.5 m³');
  const [compteurElec, setCompteurElec] = useState('Woyofal Compteur N° 0418-9214');

   // ============================================================
  // MONTANT LOCATION (= LB)
  // ============================================================
  const montantLocation = lb;
  const montantLocationLettres = nombreEnLettres(montantLocation);

  // 🆕 Bouton "Calculer TOM/TVA/TLV" (au clic, pas en auto)
  const handleCalculerTaxes = () => {
    setTomManuel(Math.round(lb * 0.036));
    setTvaManuel(Math.round(lb * 0.18));
    setTlvManuel(Math.round(lb * 0.025));
  };

  // ============================================================
  // MISE À JOUR AUTO QUAND LE BIEN CHANGE
  // ============================================================
  useEffect(() => {
    if (selectedBien) {
      const baseLoyer = selectedBien.loyerBase || 0;
      setLb(baseLoyer);
      setMontantCaution(baseLoyer * 2);
      setAvanceLoyer(baseLoyer * 2);
    }
  }, [selectedBienId]);

  // ============================================================
  // NAVIGATION
  // ============================================================
  const handleNext = () => {
    if (step === 1 && (!nom || !telephone)) {
      alert('Veuillez renseigner le nom et le téléphone du locataire.');
      return;
    }
    if (step === 2 && !selectedBien) {
      alert("Aucun bien vacant n'est disponible. Libérez un bien avant de créer un locataire.");
      return;
    }
    if (step === 3 && !lb) {
      alert('Veuillez saisir le loyer de base (LB).');
      return;
    }
    setStep((prev) => Math.min(6, prev + 1));
  };

  const handleFinish = () => {
    if (!selectedBien) {
      alert('Erreur : aucun bien sélectionné.');
      return;
    }
    if (selectedBien.statut !== 'Vacant') {
      alert("Ce bien n'est plus vacant. Impossible de créer le locataire.");
      return;
    }

    const tenantId = crypto.randomUUID();
    const contractId = crypto.randomUUID();
    const inspectionId = crypto.randomUUID();

    const refLocataire = createDocumentNumber(undefined, 'LOC-');

    const newTenant: Tenant = {
      id: tenantId,
      ref: refLocataire,
      nom: nom.toUpperCase(),
      prenom,
      telephone,
      email,
      cni,
      typePiece,
      fonction: profession,
      profession,
      employeur,
      revenuMensuel,
      statut: 'À jour',
      scoreSolvabilite: 95,
      solvabiliteScore: 95,
      bienId: selectedBien.id,
      bienNom: selectedBien.nom,
      proprietaireId: selectedBien.proprietaireId,
      dateEntree: debutContrat,
      loyerMensuel: lb,
      arrieresCumules: 0,
      joursRetard: 0,
      conjointNom,
      conjointTelephone,
    };

    // Calcul date de fin selon le type de règlement
    const dureeMois = nombreMois || 12;
    const dateFinContrat = (() => {
      const d = new Date(debutContrat);
      d.setMonth(d.getMonth() + dureeMois);
      return d.toISOString().split('T')[0];
    })();

    const newContract: LeaseContract = {
      id: contractId,
      ref: refLocatif,
      typeContrat: "Bail d'habitation",
      locataireId: tenantId,
      locataireNom: `${prenom} ${nom.toUpperCase()}`,
      bienId: selectedBien.id,
      bienNom: selectedBien.nom,
      proprietaireId: selectedBien.proprietaireId,
      proprietaireNom: selectedBien.proprietaireNom || 'Bailleur',
      loyerBase: lb,
      charges: 0,
      tva: tvaManuel,
      tom: tomManuel,
      tlv: tlvManuel,
      cautionLoyer: montantCaution,
      cautionMontant: montantCaution,
      cautionMois: 2,
      fraisAdhesion,
      dateDebut: debutContrat,
      dateFin: dateFinContrat,
      typeReglement,
      statut: 'En cours',
      // 🆕 Nouveaux champs (ContractsView)
      dateContrat,
      debutContrat,
      refPeriode,
      montantCaution,
      acompteCaution,
      montantCommission,
      avanceLoyer: Number(montantCaution || 0),
      lb,
      cautionEau,
      cautionElectricite,
      chargesDiverses,
      nombreMois: dureeMois,
    };

    const newInspection: Inspection = {
      id: inspectionId,
      ref: createDocumentNumber(undefined, 'EDL-E-'),
      bienId: selectedBien.id,
      bienNom: selectedBien.nom,
      locataireId: tenantId,
      locataireNom: `${prenom} ${nom.toUpperCase()}`,
      type: 'Entrée',
      date: debutContrat,
      agentNom,
      etatGeneral,
      elements: [
        { id: 'el-1', piece: 'Entrée', element: "Porte d'entrée & Serrures", etat: 'Bon', observation: 'Clés remises (3 jeux)' },
        { id: 'el-2', piece: 'Salon', element: 'Murs & Peintures', etat: 'Bon', observation: 'Peinture propre' },
        { id: 'el-3', piece: 'Cuisine', element: 'Plomberie & Robinetterie', etat: 'Bon', observation: 'Aucune fuite' },
        { id: 'el-4', piece: 'Général', element: 'Électricité & Prises', etat: 'Bon', observation: 'Tableau aux normes' },
      ],
      coutDegradations: 0,
      retenueCaution: 0,
      montantRestitueCaution: montantCaution,
      statut: 'Validé',
      remarques: `${etatGeneral}. Compteur eau: ${compteurEau}. Élec: ${compteurElec}.`,
    };

    onComplete({
      tenant: newTenant,
      contract: newContract,
      inspection: newInspection,
    });
    onClose();
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#141E30] border border-[#2A3447] text-[#F0EDE8] rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2A3447]">
          <div>
            <h2 className="text-lg font-bold text-[#F0EDE8] flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#C9A96E]" />
              Assistant Nouveau Locataire (6 Étapes)
            </h2>
            <p className="text-xs text-[#A0AEC0] mt-0.5">
              Fiche complète · Bail · Cautions · État des lieux
            </p>
          </div>
          <button onClick={onClose} className="text-[#A0AEC0] hover:text-[#F0EDE8] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="bg-[#0A111D] px-6 py-3 border-b border-[#2A3447] flex justify-between items-center text-xs overflow-x-auto">
          {[
            { n: 1, label: 'Identité' },
            { n: 2, label: 'Bien' },
            { n: 3, label: 'Contrat' },
            { n: 4, label: 'Cautions' },
            { n: 5, label: 'État Lieux' },
            { n: 6, label: 'Validation' },
          ].map((s) => (
            <div
              key={s.n}
              className={`flex items-center gap-1.5 font-medium whitespace-nowrap ${
                step === s.n ? 'text-[#C9A96E]' : step > s.n ? 'text-[#10B981]' : 'text-[#64748B]'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === s.n
                    ? 'bg-[#C9A96E] text-[#0A111D]'
                    : step > s.n
                    ? 'bg-[#10B981] text-white'
                    : 'bg-[#1E2C44] text-[#A0AEC0]'
                }`}
              >
                {s.n}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* ==================== ÉTAPE 1 : IDENTITÉ ==================== */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#E8D5B0] flex items-center gap-2">
                <User className="w-4 h-4 text-[#C9A96E]" />
                Étape 1 : Identité du Locataire
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Prénom *</label>
                  <input type="text" value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Ex: Ibrahima" className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Nom de Famille *</label>
                  <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex: BA" className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Téléphone *</label>
                  <input type="text" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+221 77 000 00 00" className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="locataire@email.com" className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Type de Pièce</label>
                  <select value={typePiece} onChange={(e) => setTypePiece(e.target.value)} className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none">
                    <option value="CNI">CNI</option>
                    <option value="PASSEPORT">Passeport</option>
                    <option value="CARTE_CONSULAIRE">Carte Consulaire</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">N° de la Pièce</label>
                  <input type="text" value={cni} onChange={(e) => setCni(e.target.value)} placeholder={typePiece === 'CNI' ? '1 254 1990 00214' : typePiece === 'PASSEPORT' ? 'SN1234567' : '...'} className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Profession</label>
                  <input type="text" value={profession} onChange={(e) => setProfession(e.target.value)} placeholder="Cadre, Ingénieur..." className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Employeur</label>
                  <input type="text" value={employeur} onChange={(e) => setEmployeur(e.target.value)} placeholder="Orange, Total..." className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-[#A0AEC0] mb-1">Revenu Mensuel (FCFA)</label>
                  <input type="number" value={revenuMensuel} onChange={(e) => setRevenuMensuel(Number(e.target.value))} className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none font-mono" />
                </div>
              </div>

              <div className="pt-3 border-t border-[#2A3447]">
                <h4 className="text-xs font-bold text-[#C9A96E] mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Conjoint (optionnel)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#A0AEC0] mb-1">Nom du conjoint</label>
                    <input type="text" value={conjointNom} onChange={(e) => setConjointNom(e.target.value)} className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#A0AEC0] mb-1">Téléphone conjoint</label>
                    <input type="text" value={conjointTelephone} onChange={(e) => setConjointTelephone(e.target.value)} className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== ÉTAPE 2 : BIEN ==================== */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#E8D5B0] flex items-center gap-2">
                <Building className="w-4 h-4 text-[#C9A96E]" />
                Étape 2 : Affectation du Logement
              </h3>
              {allVacantOptions.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Aucun bien vacant disponible</p>
                    <p className="mt-1 text-amber-200/80">Libérez un bien avant de créer un nouveau locataire.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {allVacantOptions.map((b: any) => {
                    const isUnitType = 'buildingId' in b;
                    return (
                      <div key={b.id} onClick={() => setSelectedBienId(b.id)} className={`p-3.5 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${selectedBienId === b.id ? 'bg-[#C9A96E]/20 border-[#C9A96E]' : 'bg-[#0A111D] border-[#2A3447] hover:border-[#64748B]'}`}>
                        <div>
                          <div className="font-semibold text-sm">{b.nom} {isUnitType && <span className="text-[10px] text-[#C9A96E]">({b.type})</span>}</div>
                          <div className="text-xs text-[#A0AEC0]">{b.quartier || b.etage || ''}, {b.ville || ''} • Bailleur: {b.proprietaireNom || '—'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-[#C9A96E]">{formatCurrencyFCFA(b.loyerBase || 0)}/m</div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#10B981]/20 text-[#10B981]">Vacant</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================== ÉTAPE 3 : CONTRAT ==================== */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#E8D5B0] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#C9A96E]" />
                Étape 3 : Contrat de Bail & Taxes
              </h3>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Ref Locatif</label>
                  <input type="text" value={refLocatif} onChange={(e) => setRefLocatif(e.target.value)} className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm font-mono focus:border-[#C9A96E] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Ref Période</label>
                  <input type="text" value={refPeriode} onChange={(e) => setRefPeriode(e.target.value)} placeholder="Septembre 2026" className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Type Règlement</label>
                  <select value={typeReglement} onChange={(e) => setTypeReglement(e.target.value)} className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none">
                    <option value="MENSUEL">MENSUEL</option>
                    <option value="TRIMESTRIEL">TRIMESTRIEL</option>
                    <option value="SEMESTRIEL">SEMESTRIEL</option>
                    <option value="ANNUEL">ANNUEL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Date Contrat</label>
                  <input type="date" value={dateContrat} onChange={(e) => setDateContrat(e.target.value)} className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Début Contrat</label>
                  <input type="date" value={debutContrat} onChange={(e) => setDebutContrat(e.target.value)} className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Nombre de mois</label>
                  <input type="number" value={nombreMois} onChange={(e) => setNombreMois(Number(e.target.value))} min={1} max={36} className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm font-mono focus:border-[#C9A96E] focus:outline-none" />
                </div>
              </div>

                            <div className="p-4 rounded-xl bg-[#0A111D] border border-[#C9A96E]/30 space-y-3">
                {/* LB + Montant Location */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#C9A96E] mb-1">LB — Loyer de Base (FCFA) *</label>
                    <input type="number" value={lb} onChange={(e) => setLb(Number(e.target.value))} className="w-full px-3 py-2 bg-[#141E30] border border-[#C9A96E] rounded-xl text-base font-mono font-bold text-[#F0EDE8] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#A0AEC0] mb-1">Montant Location (= LB)</label>
                    <input type="text" value={formatCurrencyFCFA(montantLocation)} readOnly className="w-full px-3 py-2 bg-[#141E30]/60 border border-[#2A3447] rounded-xl text-base font-mono font-bold text-amber-300 cursor-not-allowed" />
                  </div>
                </div>

                {/* TOM / TVA / TLV en SAISIE MANUELLE avec bouton calcul */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#A0AEC0]">TAXES (saisie manuelle)</span>
                    <button
                      type="button"
                      onClick={handleCalculerTaxes}
                      className="px-3 py-1 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] border border-[#C9A96E]/30 text-[#C9A96E] text-[10px] font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Percent className="w-3 h-3" />
                      Calculer auto (3.6% / 18% / 2.5%)
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-[#A0AEC0] mb-1">TOM</label>
                      <input type="number" value={tomManuel} onChange={(e) => setTomManuel(Number(e.target.value))} min={0} className="w-full px-3 py-2 bg-[#141E30] border border-[#2A3447] rounded-xl text-sm font-mono text-amber-300 focus:border-[#C9A96E] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#A0AEC0] mb-1">TVA</label>
                      <input type="number" value={tvaManuel} onChange={(e) => setTvaManuel(Number(e.target.value))} min={0} className="w-full px-3 py-2 bg-[#141E30] border border-[#2A3447] rounded-xl text-sm font-mono text-amber-300 focus:border-[#C9A96E] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#A0AEC0] mb-1">TLV</label>
                      <input type="number" value={tlvManuel} onChange={(e) => setTlvManuel(Number(e.target.value))} min={0} className="w-full px-3 py-2 bg-[#141E30] border border-[#2A3447] rounded-xl text-sm font-mono text-amber-300 focus:border-[#C9A96E] focus:outline-none" />
                    </div>
                  </div>
                </div>

                {/* Montant location en lettres */}
                <div className="text-[11px] text-amber-200 italic p-2 rounded-lg bg-[#141E30] border border-[#C9A96E]/20">
                  <strong>{montantLocationLettres}</strong> Francs CFA
                </div>
              </div>
            </div>
          )}

          {/* ==================== ÉTAPE 4 : CAUTIONS ==================== */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#E8D5B0] flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#C9A96E]" />
                Étape 4 : Cautions & Frais (FCFA)
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Montant Caution</label>
                  <input type="number" value={montantCaution} onChange={(e) => { setMontantCaution(Number(e.target.value)); setAvanceLoyer(Number(e.target.value)); }} min={0} className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm font-mono focus:border-[#C9A96E] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Acompte Caution</label>
                  <input type="number" value={acompteCaution} onChange={(e) => setAcompteCaution(Number(e.target.value))} min={0} className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm font-mono focus:border-[#C9A96E] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Montant Commission</label>
                  <input type="number" value={montantCommission} onChange={(e) => setMontantCommission(Number(e.target.value))} min={0} className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm font-mono focus:border-[#C9A96E] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Avance Loyer</label>
                  <input type="number" value={avanceLoyer} onChange={(e) => setAvanceLoyer(Number(e.target.value))} min={0} className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm font-mono focus:border-[#C9A96E] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Caution Eau</label>
                  <input type="number" value={cautionEau} onChange={(e) => setCautionEau(Number(e.target.value))} min={0} className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm font-mono focus:border-[#C9A96E] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Caution Électricité</label>
                  <input type="number" value={cautionElectricite} onChange={(e) => setCautionElectricite(Number(e.target.value))} min={0} className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm font-mono focus:border-[#C9A96E] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Charges Diverses</label>
                  <input type="number" value={chargesDiverses} onChange={(e) => setChargesDiverses(Number(e.target.value))} min={0} className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm font-mono focus:border-[#C9A96E] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Frais d'Adhésion</label>
                  <input type="number" value={fraisAdhesion} onChange={(e) => setFraisAdhesion(Number(e.target.value))} min={0} className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm font-mono focus:border-[#C9A96E] focus:outline-none" />
                </div>
              </div>
            </div>
          )}

          {/* ==================== ÉTAPE 5 : ÉTAT DES LIEUX ==================== */}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#E8D5B0] flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-[#C9A96E]" />
                Étape 5 : État des Lieux d'Entrée
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Agent Responsable</label>
                  <input type="text" value={agentNom} onChange={(e) => setAgentNom(e.target.value)} className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">État général</label>
                  <input type="text" value={etatGeneral} onChange={(e) => setEtatGeneral(e.target.value)} className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#A0AEC0] mb-1">Compteur Eau</label>
                    <input type="text" value={compteurEau} onChange={(e) => setCompteurEau(e.target.value)} className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#A0AEC0] mb-1">Compteur Électrique</label>
                    <input type="text" value={compteurElec} onChange={(e) => setCompteurElec(e.target.value)} className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== ÉTAPE 6 : VALIDATION ==================== */}
          {step === 6 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#10B981] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Étape 6 : Récapitulatif
              </h3>

              <div className="p-4 bg-[#0A111D] rounded-xl border border-[#2A3447] text-xs space-y-2">
                <div className="flex justify-between"><span className="text-[#A0AEC0]">Locataire :</span><span className="font-bold">{prenom} {nom.toUpperCase()}</span></div>
                <div className="flex justify-between"><span className="text-[#A0AEC0]">Téléphone :</span><span className="font-mono">{telephone}</span></div>
                <div className="flex justify-between"><span className="text-[#A0AEC0]">Type pièce :</span><span className="font-mono">{typePiece}</span></div>
                <div className="flex justify-between"><span className="text-[#A0AEC0]">N° pièce :</span><span className="font-mono">{cni || '—'}</span></div>
                <hr className="border-[#2A3447] my-2" />
                <div className="flex justify-between"><span className="text-[#A0AEC0]">Bien :</span><span className="font-bold text-[#C9A96E]">{selectedBien?.nom}</span></div>
                <div className="flex justify-between"><span className="text-[#A0AEC0]">Ref contrat :</span><span className="font-mono">{refLocatif}</span></div>
                <div className="flex justify-between"><span className="text-[#A0AEC0]">Type règlement :</span><span className="font-bold">{typeReglement}</span></div>
                <hr className="border-[#2A3447] my-2" />
                <div className="flex justify-between"><span className="text-[#A0AEC0]">LB (Loyer Base) :</span><span className="font-mono font-bold text-[#10B981]">{formatCurrencyFCFA(lb)}</span></div>
                <div className="flex justify-between"><span className="text-[#A0AEC0]">Caution :</span><span className="font-mono font-bold text-[#E8D5B0]">{formatCurrencyFCFA(montantCaution)}</span></div>
                <div className="flex justify-between"><span className="text-[#A0AEC0]">TOM :</span><span className="font-mono text-amber-300">{formatCurrencyFCFA(tomManuel)}</span></div>
                <div className="flex justify-between"><span className="text-[#A0AEC0]">TVA :</span><span className="font-mono text-amber-300">{formatCurrencyFCFA(tvaManuel)}</span></div>
                <div className="flex justify-between"><span className="text-[#A0AEC0]">TLV :</span><span className="font-mono text-amber-300">{formatCurrencyFCFA(tlvManuel)}</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 bg-[#0A111D] border-t border-[#2A3447] flex justify-between items-center">
          {step > 1 ? (
            <button onClick={() => setStep((p) => p - 1)} className="px-4 py-2 bg-[#141E30] hover:bg-[#1E2C44] text-[#A0AEC0] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
              <ChevronLeft className="w-4 h-4" /> Précédent
            </button>
          ) : <div />}

          {step < 6 ? (
            <button onClick={handleNext} disabled={step === 2 && allVacantOptions.length === 0} className="px-5 py-2.5 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
              Suivant <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleFinish} disabled={!selectedBien} className="px-6 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
              <CheckCircle2 className="w-4 h-4" /> Finaliser & Créer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}