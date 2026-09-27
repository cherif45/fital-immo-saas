import React, { useState } from 'react';
import {
  CashMovement,
  CashClosing,
  CashMovementType,
  UserAccount,
} from '../types';
import { formatCurrencyFCFA } from '../lib/calculations/financial';
import {
  Coins,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Calculator,
  History,
  Download,
  Calendar,
  X,
} from 'lucide-react';
import { DailyCashReportModal } from './DailyCashReportModal';


interface CashRegisterViewProps {
  cashMovements: CashMovement[];
  cashClosings: CashClosing[];
  currentUser: UserAccount;
  onAddCashMovement: (movement: CashMovement) => void;
  onAddCashClosing: (closing: CashClosing) => void;
}

export function CashRegisterView({
  cashMovements,
  cashClosings,
  currentUser,
  onAddCashMovement,
  onAddCashClosing,
}: CashRegisterViewProps) {
  const [activeTab, setActiveTab] = useState<'journal' | 'closing' | 'history'>('journal');
  const [isNewMovementModalOpen, setIsNewMovementModalOpen] = useState(false);
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);

  // 🆕 Rapport journalier
  const [selectedReportDate, setSelectedReportDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Initial cash balance
  const initialCash = cashClosings.length > 0 ? (cashClosings[0].soldeReel ?? cashClosings[0].soldeReelCompte ?? 0) : 0;

  // Real-time calculations
  const totalEntries = cashMovements
    .filter((m) => m.type === 'ENTREE' || m.type === 'ENCAISSEMENT')
    .reduce((sum, m) => sum + m.montant, 0);

  const totalExits = cashMovements
    .filter((m) => m.type === 'SORTIE' || m.type === 'DECAISSEMENT')
    .reduce((sum, m) => sum + m.montant, 0);

  const theoreticalBalance = initialCash + totalEntries - totalExits;

  // New Movement Form
  const [movementForm, setMovementForm] = useState<{
    type: CashMovementType;
    categorie: 'ENCAISSEMENT_LOYER' | 'DEPENSE_MENUE' | 'AVANCE_PROPRIETAIRE' | 'APPORT_FOND' | 'AUTRE';
    montant: number;
    description: string;
    beneficiaireOuPayeur: string;
    pieceJustificative: string;
  }>({
    type: 'ENTREE',
    categorie: 'ENCAISSEMENT_LOYER',
    montant: 0,
    description: '',
    beneficiaireOuPayeur: '',
    pieceJustificative: '',
  });

  // Physical Denomination Count for Closing
  const [denominations, setDenominations] = useState<{
    b10000: number;
    b5000: number;
    b2000: number;
    b1000: number;
    b500: number;
    coins: number;
  }>({
    b10000: 0,
    b5000: 0,
    b2000: 0,
    b1000: 0,
    b500: 0,
    coins: 0,
  });

  const [closingObservation, setClosingObservation] = useState('');

  const physicalCountTotal =
    denominations.b10000 * 10000 +
    denominations.b5000 * 5000 +
    denominations.b2000 * 2000 +
    denominations.b1000 * 1000 +
    denominations.b500 * 500 +
    denominations.coins;

  const cashDiscrepancy = physicalCountTotal - theoreticalBalance;

  const handleCreateMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (movementForm.montant <= 0 || !movementForm.description) return;

    const newMov: CashMovement = {
      id: `mov-${Date.now()}`,
      reference: `MVT-${Date.now().toString().slice(-6)}`,
      ref: `MVT-${Date.now().toString().slice(-6)}`,
      dateOperation: new Date().toISOString().split('T')[0],
      dateHeure: new Date().toISOString(),
      type: movementForm.type,
      categorie: movementForm.categorie,
      montant: movementForm.montant,
      description: movementForm.description,
      libelle: movementForm.description,
      moyenPaiementCode: 'ESPECES',
      beneficiaire: movementForm.beneficiaireOuPayeur || 'Non précisé',
      beneficiaireOuPayeur: movementForm.beneficiaireOuPayeur || 'Non précisé',
      justificatifRef: movementForm.pieceJustificative || undefined,
      userId: currentUser.id,
      userNom: `${currentUser.prenom} ${currentUser.nom}`,
      auteurId: currentUser.id,
      auteurNom: `${currentUser.prenom} ${currentUser.nom}`,
      caissierNom: `${currentUser.prenom} ${currentUser.nom}`,
      statut: 'Validé',
      createdAt: new Date().toISOString(),
    };

    onAddCashMovement(newMov);
    setIsNewMovementModalOpen(false);
    setMovementForm({
      type: 'ENTREE',
      categorie: 'ENCAISSEMENT_LOYER',
      montant: 0,
      description: '',
      beneficiaireOuPayeur: '',
      pieceJustificative: '',
    });
  };

  const handleCreateClosing = (e: React.FormEvent) => {
    e.preventDefault();
    const newClosing: CashClosing = {
      id: `cloture-${Date.now()}`,
      reference: `CLOT-${new Date().toISOString().split('T')[0].replace(/-/g, '')}`,
      numero: `CLOT-${new Date().toISOString().split('T')[0].replace(/-/g, '')}`,
      date: new Date().toISOString().split('T')[0],
      dateCloture: new Date().toISOString().split('T')[0],
      heureCloture: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      soldeInitial: initialCash,
      totalEntreesEspeces: totalEntries,
      totalSortiesEspeces: totalExits,
      soldeTheorique: theoreticalBalance,
      soldeReel: physicalCountTotal,
      soldeReelCompte: physicalCountTotal,
      ecart: cashDiscrepancy,
      ecartCaisse: cashDiscrepancy,
      statut: cashDiscrepancy === 0 ? 'CONFORME' : cashDiscrepancy > 0 ? 'SURPLUS' : 'DEFICIT',
      caissierId: currentUser.id,
      caissierNom: `${currentUser.prenom} ${currentUser.nom}`,
      observations: closingObservation || 'Clôture de caisse quotidienne standard effectuée.',
      observation: closingObservation || 'Clôture de caisse quotidienne standard effectuée.',
      createdAt: new Date().toISOString(),
    };

    onAddCashClosing(newClosing);
    setIsClosingModalOpen(false);
    setActiveTab('history');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#111C2E] p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Module Caisse & Trésorerie Guichet
            </span>
            <span className="text-xs text-slate-400">• Journal des Espèces</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Gestion de Caisse & Clôture Journalière</h1>
          <p className="text-xs text-slate-400">
            Contrôle rigoureux des flux d'espèces, décaissements, menues dépenses et arrêtés de caisse contradictoires.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* 🆕 Sélecteur date + Rapport */}
          <div className="flex items-center gap-2 p-1.5 bg-[#0A111D] border border-[#C9A96E]/30 rounded-xl">
            <Calendar className="w-4 h-4 text-[#C9A96E] ml-1" />
            <input
              type="date"
              value={selectedReportDate}
              onChange={(e) => setSelectedReportDate(e.target.value)}
              className="px-2 py-1 bg-transparent text-white text-xs font-mono focus:outline-none cursor-pointer"
            />
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-[#C9A96E] to-[#A07840] hover:from-[#D8BA80] hover:to-[#B58C50] text-[#0F1B2D] font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              title="Générer et télécharger le rapport journalier"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Rapport</span>
            </button>
          </div>

          <button
            onClick={() => setIsNewMovementModalOpen(true)}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-bold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>+ Mouvement de Caisse</span>
          </button>

          <button
            onClick={() => {
              const q10k = Math.floor(theoreticalBalance / 10000);
              const rem = theoreticalBalance % 10000;
              setDenominations({
                b10000: q10k,
                b5000: 0,
                b2000: 0,
                b1000: 0,
                b500: 0,
                coins: rem,
              });
              setIsClosingModalOpen(true);
            }}
            className="px-5 py-2.5 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] font-bold rounded-xl text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>Effectuer la Clôture</span>
          </button>
        </div>
      </div>

      {/* Metrics (identique) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111C2E] p-5 rounded-2xl border border-white/5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fond de Caisse Initial</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{formatCurrencyFCFA(initialCash)}</div>
            <div className="text-xs text-slate-400 mt-1">Ouverture de session</div>
          </div>
        </div>

        <div className="bg-[#111C2E] p-5 rounded-2xl border border-emerald-500/20 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Total Entrées (+)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-400">+{formatCurrencyFCFA(totalEntries)}</div>
            <div className="text-xs text-slate-400 mt-1">Loyers en espèces et apports</div>
          </div>
        </div>

        <div className="bg-[#111C2E] p-5 rounded-2xl border border-rose-500/20 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Total Sorties (-)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-400">-{formatCurrencyFCFA(totalExits)}</div>
            <div className="text-xs text-slate-400 mt-1">Dépenses et acomptes propriétaires</div>
          </div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-xl ${
          theoreticalBalance >= 0
            ? 'bg-gradient-to-br from-[#111C2E] to-[#17253D] border-[#C9A96E]/40'
            : 'bg-gradient-to-br from-[#2E1A1A] to-[#1C1111] border-rose-500/40'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#E8D5B0] uppercase tracking-wider">Solde Théorique Caisse</span>
            <div className="w-8 h-8 rounded-lg bg-[#C9A96E]/20 text-[#E8D5B0] flex items-center justify-center font-bold">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-bold ${theoreticalBalance >= 0 ? 'text-white' : 'text-rose-400'}`}>
              {formatCurrencyFCFA(theoreticalBalance)}
            </div>
            <div className={`text-xs mt-1 flex items-center gap-1 font-semibold ${theoreticalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {theoreticalBalance >= 0 ? (
                <><CheckCircle2 className="w-3.5 h-3.5" /><span>Montant attendu dans le tiroir</span></>
              ) : (
                <><AlertTriangle className="w-3.5 h-3.5" /><span>Solde négatif — vérifier les sorties</span></>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + tables + modals = IDENTIQUES au fichier original */}
      {/* ⬇️ COPIE-COLLE ICI le reste du fichier original à partir de "Tabs" jusqu'à la fin */}
      {/* (Tabs Journal / Historique / Modal Nouveau Mouvement / Modal Clôture) */}
      {/* Ne change rien dans ces parties. */}

      {/* 🆕 MODAL : RAPPORT JOURNALIER */}
      {isReportModalOpen && (
        <DailyCashReportModal
          date={selectedReportDate}
          cashMovements={cashMovements}
          currentUser={currentUser}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}
    </div>
  );
}