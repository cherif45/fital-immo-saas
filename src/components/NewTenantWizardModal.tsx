import React, { useState } from 'react';
import {
  UserPlus, Building, FileText, DollarSign, ClipboardCheck,
  CheckCircle2, X, ChevronRight, ChevronLeft, Calendar, AlertTriangle
} from 'lucide-react';
import { Property, Tenant, LeaseContract, Inspection } from '../types';
import { formatCurrencyFCFA } from '../lib/calculations/financial';

interface NewTenantWizardModalProps {
  properties: Property[];
  onComplete: (data: {
    tenant: Tenant;
    contract: LeaseContract;
    inspection: Inspection;
  }) => void;
  onClose: () => void;
}

export function NewTenantWizardModal({
  properties,
  onComplete,
  onClose,
}: NewTenantWizardModalProps) {
  const [step, setStep] = useState(1);

  // Step 1: Locataire Info
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [cni, setCni] = useState('');
  const [profession, setProfession] = useState('');
  const [employeur, setEmployeur] = useState('');
  const [revenuMensuel, setRevenuMensuel] = useState(600000);

  // Step 2: Choix du Bien — ⬇️ FILTRE VACANTS UNIQUEMENT
  const vacantProperties = properties.filter((p) => p.statut === 'Vacant');
  const [selectedBienId, setSelectedBienId] = useState(
    vacantProperties[0]?.id || ''
  );
  const selectedBien = properties.find((p) => p.id === selectedBienId);

  // Step 3: Contrat Bail
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().split('T')[0]);
  const [dateFin, setDateFin] = useState(
    new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]
  );
    const [loyerBase, setLoyerBase] = useState(selectedBien?.loyerBase || 300000);

  // Step 4: Cautions
  const [cautionMois, setCautionMois] = useState(2);
  const [cautionMontant, setCautionMontant] = useState((selectedBien?.loyerBase || 300000) * 2);
  const [fraisAdhesion, setFraisAdhesion] = useState(50000);

  // Step 5: État des lieux d'entrée
  const [agentNom, setAgentNom] = useState('Agent Gérance FITAL-IMMO');
  const [etatGeneral, setEtatGeneral] = useState('Très bon état général (neuf/repeint)');
  const [compteurEau, setCompteurEau] = useState('142.5 m³');
  const [compteurElec, setCompteurElec] = useState('Woyofal Compteur N° 0418-9214');

  const handleNext = () => {
    if (step === 1 && (!nom || !telephone)) {
      alert('Veuillez renseigner le nom et le téléphone du locataire.');
      return;
    }
    // ⬇️ BLOQUER SI AUCUN BIEN VACANT DISPONIBLE
    if (step === 2 && !selectedBien) {
      alert("Aucun bien vacant n'est disponible. Libérez un bien avant de créer un locataire.");
      return;
    }
    setStep((prev) => Math.min(6, prev + 1));
  };

  const handleFinish = () => {
    // ⬇️ DOUBLE VÉRIFICATION À LA FINALISATION
    if (!selectedBien) {
      alert("Erreur : aucun bien sélectionné.");
      return;
    }
    if (selectedBien.statut !== 'Vacant') {
      alert("Ce bien n'est plus vacant. Impossible de créer le locataire.");
      return;
    }

    const tenantId = crypto.randomUUID();
    const contractId = crypto.randomUUID();
    const inspectionId = crypto.randomUUID();

    const newTenant: Tenant = {
      id: tenantId,
      ref: `LOC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      nom,
      prenom,
      telephone,
      email,
      cni,
      fonction: profession,
      profession,
      employeur,
      revenuMensuel,
      statut: 'À jour',
      scoreSolvabilite: 95,
      bienId: selectedBien.id,
      bienNom: selectedBien.nom,
      proprietaireId: selectedBien.proprietaireId,
      dateEntree: dateDebut,
      loyerMensuel: loyerBase,
      arrieresCumules: 0,
      joursRetard: 0,
    };

    const newContract: LeaseContract = {
      id: contractId,
      ref: `CTR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      typeContrat: "Bail d'habitation",
      locataireId: tenantId,
      locataireNom: `${prenom} ${nom}`,
      bienId: selectedBien.id,
      bienNom: selectedBien.nom,
      proprietaireId: selectedBien.proprietaireId,
      proprietaireNom: selectedBien.proprietaireNom,
           loyerBase,
      charges: 0,
      tva: 0,
      tom: 0,
      tlv: 0,
      cautionMontant,
      cautionMois,
      fraisAdhesion,
      dateDebut,
      dateFin,
      typeReglement: 'Mensuel',
      statut: 'En cours',
      clausePenalitePourcentage: 10,
      dateSignature: dateDebut,
    };

    const newInspection: Inspection = {
      id: inspectionId,
      ref: `EDL-E-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      bienId: selectedBien.id,
      bienNom: selectedBien.nom,
      locataireId: tenantId,
      locataireNom: `${prenom} ${nom}`,
      type: 'Entrée',
      date: dateDebut,
      agentNom,
      elements: [
        { nom: 'Porte d’entrée & Serrures', etat: 'Très bon', commentaire: 'Clés remises (3 jeux)', coutReparationEstime: 0 },
        { nom: 'Murs & Peintures Salon', etat: 'Très bon', commentaire: 'Peinture blanche neuve', coutReparationEstime: 0 },
        { nom: 'Plomberie & Robinetterie', etat: 'Bon état', commentaire: 'Pression normale, aucune fuite', coutReparationEstime: 0 },
        { nom: 'Électricité & Prises', etat: 'Très bon', commentaire: 'Tableau aux normes testé', coutReparationEstime: 0 },
      ],
      coutDegradations: 0,
      retenueCaution: 0,
      montantRestitueCaution: cautionMontant,
      statut: 'Validé',
      commentairesGeneraux: `${etatGeneral}. Compteur eau: ${compteurEau}. Elec: ${compteurElec}.`,
    };

    onComplete({
      tenant: newTenant,
      contract: newContract,
      inspection: newInspection,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#141E30] border border-[#2A3447] text-[#F0EDE8] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-in">
        {/* Header Wizard */}
        <div className="flex items-center justify-between p-5 border-b border-[#2A3447]">
          <div>
            <h2 className="text-lg font-bold text-[#F0EDE8] flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#C9A96E]" />
              Assistant Nouveau Locataire (7 Étapes)
            </h2>
            <p className="text-xs text-[#A0AEC0] mt-0.5">
              Workflow guidé : Fiche d'entrée, bail agréé, dépôt de garantie et état des lieux d'entrée.
            </p>
          </div>
          <button onClick={onClose} className="text-[#A0AEC0] hover:text-[#F0EDE8] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="bg-[#0A111D] px-6 py-3 border-b border-[#2A3447] flex justify-between items-center text-xs">
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
              className={`flex items-center gap-1.5 font-medium ${
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

        {/* Wizard Body */}
        <div className="p-6 space-y-4">
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-sm font-bold text-[#E8D5B0] flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#C9A96E]" />
                Étape 1 : Renseignements Personnels du Locataire
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Prénom *</label>
                  <input
                    type="text"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    placeholder="Ex: Ibrahima"
                    className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Nom de Famille *</label>
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Ex: BA"
                    className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Téléphone Principal *</label>
                  <input
                    type="text"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    placeholder="+221 77 000 00 00"
                    className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="locataire@email.com"
                    className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Numéro CNI / Passeport</label>
                  <input
                    type="text"
                    value={cni}
                    onChange={(e) => setCni(e.target.value)}
                    placeholder="1 254 1990 00214"
                    className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Profession & Entreprise</label>
                  <input
                    type="text"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    placeholder="Cadre / Ingénieur"
                    className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-sm font-bold text-[#E8D5B0] flex items-center gap-2">
                <Building className="w-4 h-4 text-[#C9A96E]" />
                Étape 2 : Affectation du Logement
              </h3>
              <div className="space-y-3">
                <label className="block text-xs text-[#A0AEC0]">Sélectionner un bien disponible :</label>

                {/* ⬇️ SI AUCUN BIEN VACANT, AFFICHER UN MESSAGE */}
                {vacantProperties.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Aucun bien vacant disponible</p>
                      <p className="mt-1 text-amber-200/80">
                        Tous les biens sont actuellement occupés. Libérez un bien (via une sortie locataire) avant de créer un nouveau locataire.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5 max-h-60 overflow-y-auto pr-1">
                    {vacantProperties.map((p) => (
                      <div
                        key={p.id}
                                                onClick={() => {
                          setSelectedBienId(p.id);
                          setLoyerBase(p.loyerBase);
                          setCautionMontant(p.loyerBase * cautionMois);
                        }}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                          selectedBienId === p.id
                            ? 'bg-[#C9A96E]/20 border-[#C9A96E] text-[#F0EDE8]'
                            : 'bg-[#0A111D] border-[#2A3447] hover:border-[#64748B]'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-sm">{p.nom}</div>
                          <div className="text-xs text-[#A0AEC0]">
                            {p.type} • {p.quartier}, {p.ville} • Bailleur: {p.proprietaireNom}
                          </div>
                        </div>
                        <div className="text-right">
                        <div className="text-sm font-bold text-[#C9A96E]">{formatCurrencyFCFA(p.loyerBase)}/m</div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#10B981]/20 text-[#10B981]">
                            Vacant
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-sm font-bold text-[#E8D5B0] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#C9A96E]" />
                Étape 3 : Conditions du Contrat de Bail
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Date d'Entrée / Prise d'Effet</label>
                  <input
                    type="date"
                    value={dateDebut}
                    onChange={(e) => setDateDebut(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Date Fin de Bail (1 an reconductible)</label>
                  <input
                    type="date"
                    value={dateFin}
                    onChange={(e) => setDateFin(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none"
                  />
                </div>
                                <div className="col-span-2">
                  <label className="block text-xs text-[#A0AEC0] mb-1">Loyer Mensuel (FCFA)</label>
                  <input
                    type="number"
                    value={loyerBase}
                    onChange={(e) => setLoyerBase(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-sm font-bold text-[#E8D5B0] flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#C9A96E]" />
                Étape 4 : Cautions & Dépôt de Garantie
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Nombre de mois de caution</label>
                  <select
                    value={cautionMois}
                    onChange={(e) => {
                      const m = Number(e.target.value);
                      setCautionMois(m);
                      setCautionMontant(loyerBase * m);
                    }}
                    className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none"
                  >
                    <option value={1}>1 mois de caution</option>
                    <option value={2}>2 mois de caution (Standard)</option>
                    <option value={3}>3 mois de caution</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Montant Caution Loyer (FCFA)</label>
                  <input
                    type="number"
                    value={cautionMontant}
                    onChange={(e) => setCautionMontant(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Frais d'Adhésion / Dossier</label>
                  <input
                    type="number"
                    value={fraisAdhesion}
                    onChange={(e) => setFraisAdhesion(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-sm font-bold text-[#E8D5B0] flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-[#C9A96E]" />
                Étape 5 : État des Lieux Contradictoire d'Entrée
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Agent Responsable de la Visite</label>
                  <input
                    type="text"
                    value={agentNom}
                    onChange={(e) => setAgentNom(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Index Compteur d'Eau</label>
                  <input
                    type="text"
                    value={compteurEau}
                    onChange={(e) => setCompteurEau(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A0AEC0] mb-1">Index / N° Compteur Électrique</label>
                  <input
                    type="text"
                    value={compteurElec}
                    onChange={(e) => setCompteurElec(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm focus:border-[#C9A96E] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-sm font-bold text-[#10B981] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                Étape 6 : Récapitulatif & Génération Automatique
              </h3>
              <div className="p-4 bg-[#0A111D] rounded-xl border border-[#2A3447] text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#A0AEC0]">Locataire :</span>
                  <span className="font-bold text-[#F0EDE8]">{prenom} {nom} ({telephone})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A0AEC0]">Logement :</span>
                  <span className="font-bold text-[#C9A96E]">{selectedBien?.nom || '—'}</span>
                </div>
                                <div className="flex justify-between">
                  <span className="text-[#A0AEC0]">Loyer Mensuel :</span>
                  <span className="font-bold text-[#10B981]">{formatCurrencyFCFA(loyerBase)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A0AEC0]">Dépôt de Garantie (Caution) :</span>
                  <span className="font-bold text-[#E8D5B0]">{formatCurrencyFCFA(cautionMontant)} ({cautionMois} mois)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A0AEC0]">État des lieux d'entrée :</span>
                  <span className="font-bold text-[#10B981]">Conforme & Prêt à signer</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Controls Footer */}
        <div className="p-5 bg-[#0A111D] border-t border-[#2A3447] flex justify-between items-center">
          {step > 1 ? (
            <button
              onClick={() => setStep((p) => p - 1)}
              className="px-4 py-2 bg-[#141E30] hover:bg-[#1E2C44] text-[#A0AEC0] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Précédent
            </button>
          ) : (
            <div />
          )}

          {step < 6 ? (
            <button
              onClick={handleNext}
              disabled={step === 2 && vacantProperties.length === 0}
              className="px-5 py-2.5 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={!selectedBien}
              className="px-6 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              Finaliser & Créer le Locataire
            </button>
          )}
        </div>
      </div>
    </div>
  );
}