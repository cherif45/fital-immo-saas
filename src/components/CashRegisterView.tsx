import React, { useState } from 'react';
import { 
  CashMovement, 
  CashClosing, 
  CashMovementType, 
  UserAccount 
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
  FileText, 
  Calendar, 
  Check, 
  X,
  Sparkles,
  Download
} from 'lucide-react';

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

  // Initial cash balance (fond de caisse basé sur la dernière clôture ou 0)
  const initialCash = cashClosings.length > 0 ? cashClosings[0].soldeReel : 0;

  // Real-time calculations
  const totalEntries = cashMovements
    .filter((m) => m.type === 'ENTREE' && m.statut === 'Validé')
    .reduce((sum, m) => sum + m.montant, 0);

  const totalExits = cashMovements
    .filter((m) => m.type === 'SORTIE' && m.statut === 'Validé')
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
      dateOperation: new Date().toISOString().split('T')[0],
      type: movementForm.type,
      categorie: movementForm.categorie,
      montant: movementForm.montant,
      description: movementForm.description,
      moyenPaiementCode: 'ESPECES',
      beneficiaireOuPayeur: movementForm.beneficiaireOuPayeur || 'Non précisé',
      justificatifRef: movementForm.pieceJustificative || undefined,
      userId: currentUser.id,
      userNom: `${currentUser.prenom} ${currentUser.nom}`,
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
          <button
            onClick={() => setIsNewMovementModalOpen(true)}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-bold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>+ Mouvement de Caisse</span>
          </button>

          <button
            onClick={() => {
              // Pre-fill physical count with theoretical balance for ease of check
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
            <span>Effectuer la Clôture de Caisse</span>
          </button>
        </div>
      </div>

      {/* Real-time Cash Balance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Solde Initial */}
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

        {/* Entrées Espèces */}
        <div className="bg-[#111C2E] p-5 rounded-2xl border border-emerald-500/20 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Total Entrées (+ )</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-400">+{formatCurrencyFCFA(totalEntries)}</div>
            <div className="text-xs text-slate-400 mt-1">Loyers en espèces et apports</div>
          </div>
        </div>

        {/* Sorties Espèces */}
        <div className="bg-[#111C2E] p-5 rounded-2xl border border-rose-500/20 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Total Sorties (- )</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-400">-{formatCurrencyFCFA(totalExits)}</div>
            <div className="text-xs text-slate-400 mt-1">Dépenses et acomptes propriétaires</div>
          </div>
        </div>

        {/* Solde Théorique Actuel */}
        <div className="bg-gradient-to-br from-[#111C2E] to-[#17253D] p-5 rounded-2xl border border-[#C9A96E]/40 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#E8D5B0] uppercase tracking-wider">Solde Théorique Caisse</span>
            <div className="w-8 h-8 rounded-lg bg-[#C9A96E]/20 text-[#E8D5B0] flex items-center justify-center font-bold">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{formatCurrencyFCFA(theoreticalBalance)}</div>
            <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Montant attendu dans le tiroir</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 gap-6">
        <button
          onClick={() => setActiveTab('journal')}
          className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'journal' ? 'text-[#C9A96E]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Journal des Mouvements ({cashMovements.length})</span>
          {activeTab === 'journal' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C9A96E] rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'history' ? 'text-[#C9A96E]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Historique des Clôtures ({cashClosings.length})</span>
          {activeTab === 'history' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C9A96E] rounded-full" />
          )}
        </button>
      </div>

      {/* TAB: Journal des Mouvements */}
      {activeTab === 'journal' && (
        <div className="bg-[#111C2E] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Opérations d'Espèces Enregistrées</h2>
            <span className="text-xs text-slate-400">Responsable actuel : {currentUser.prenom} {currentUser.nom}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="py-3 px-3">Réf / Date</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Description & Motif</th>
                  <th className="py-3 px-3">Bénéficiaire / Tiers</th>
                  <th className="py-3 px-3">Caissier</th>
                  <th className="py-3 px-3 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {cashMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3">
                      <div className="font-mono font-bold text-white">{m.reference}</div>
                      <div className="text-[10px] text-slate-400">{m.dateOperation}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1 w-fit ${
                          m.type === 'ENTREE'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {m.type === 'ENTREE' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        {m.type === 'ENTREE' ? 'ENTRÉE' : 'SORTIE'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{m.description}</div>
                      <div className="text-[10px] text-slate-400">{m.categorie}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{m.beneficiaireOuPayeur}</td>
                    <td className="py-3 px-3 text-slate-400">{m.caissierNom}</td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`font-bold text-sm ${
                          m.type === 'ENTREE' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {m.type === 'ENTREE' ? '+' : '-'} {formatCurrencyFCFA(m.montant)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: Historique des Clôtures */}
      {activeTab === 'history' && (
        <div className="bg-[#111C2E] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Procès-Verbaux de Clôture Quotidienne</h2>
            <span className="text-xs text-slate-400">Archivage inviolable pour l'expert-comptable</span>
          </div>

          <div className="space-y-3">
            {cashClosings.map((clot) => (
              <div key={clot.id} className="p-4 bg-[#0A111D] border border-white/5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-sm">{clot.reference || clot.numero}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        clot.statut === 'CONFORME' || clot.statut === 'Validé par Responsable'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : clot.statut === 'SURPLUS'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {clot.statut}
                    </span>
                  </div>
                  <p className="text-slate-400">
                    Clôturé le <strong className="text-slate-200">{clot.dateCloture || clot.date} à {clot.heureCloture || '18:00'}</strong> par {clot.caissierNom}
                  </p>
                  <p className="text-slate-500 text-[11px] italic">"{clot.observations || clot.observation}"</p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-slate-400 text-[11px]">Solde Théorique : {formatCurrencyFCFA(clot.soldeTheorique)}</div>
                    <div className="text-sm font-bold text-white">Solde Compté : {formatCurrencyFCFA(clot.soldeReel ?? clot.soldeReelCompte ?? 0)}</div>
                    <div className={`text-[11px] font-bold ${(clot.ecart ?? clot.ecartCaisse ?? 0) === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      Écart : {(clot.ecart ?? clot.ecartCaisse ?? 0) > 0 ? '+' : ''}{formatCurrencyFCFA(clot.ecart ?? clot.ecartCaisse ?? 0)}
                    </div>
                  </div>

                  <button className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg border border-white/10" title="Télécharger PV de Clôture PDF">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: New Cash Movement */}
      {isNewMovementModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111C2E] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                Nouveau Mouvement de Caisse
              </h3>
              <button onClick={() => setIsNewMovementModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateMovement} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMovementForm({ ...movementForm, type: 'ENTREE', categorie: 'ENCAISSEMENT_LOYER' })}
                  className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer ${
                    movementForm.type === 'ENTREE' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-[#0A111D] border-white/10 text-slate-400'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4" />
                  <span>Entrée d'Espèces (+)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMovementForm({ ...movementForm, type: 'SORTIE', categorie: 'DEPENSE_MENUE' })}
                  className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer ${
                    movementForm.type === 'SORTIE' ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'bg-[#0A111D] border-white/10 text-slate-400'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Sortie / Décaissement (-)</span>
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Montant en Espèces (FCFA) *</label>
                <input
                  type="number"
                  required
                  min="100"
                  value={movementForm.montant || ''}
                  onChange={(e) => setMovementForm({ ...movementForm, montant: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-[#0A111D] border border-white/10 rounded-xl text-lg font-bold text-white focus:outline-none focus:border-[#C9A96E]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Description / Motif du mouvement *</label>
                <input
                  type="text"
                  required
                  value={movementForm.description}
                  onChange={(e) => setMovementForm({ ...movementForm, description: e.target.value })}
                  placeholder="Ex: Achat fournitures bureau & papier quittance"
                  className="w-full px-3.5 py-2.5 bg-[#0A111D] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#C9A96E]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Bénéficiaire ou Payeur</label>
                <input
                  type="text"
                  value={movementForm.beneficiaireOuPayeur}
                  onChange={(e) => setMovementForm({ ...movementForm, beneficiaireOuPayeur: e.target.value })}
                  placeholder="Ex: Papeterie Centrale / Artisan Plombier"
                  className="w-full px-3.5 py-2.5 bg-[#0A111D] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#C9A96E]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewMovementModalOpen(false)}
                  className="px-4 py-2 bg-white/5 text-white rounded-xl text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] font-bold rounded-xl text-xs shadow-md cursor-pointer"
                >
                  Enregistrer dans le Journal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Daily Cash Closing with Denomination Counting */}
      {isClosingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111C2E] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/20 text-[#E8D5B0] flex items-center justify-center">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Arrêté & Clôture Journalière de Caisse</h3>
                  <p className="text-xs text-slate-400">Comptage physique des espèces et comparaison contradictoire.</p>
                </div>
              </div>
              <button onClick={() => setIsClosingModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateClosing} className="space-y-4">
              {/* Theoretical Summary */}
              <div className="grid grid-cols-3 gap-3 p-3.5 bg-white/[0.02] border border-white/10 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 block">Solde Initial :</span>
                  <strong className="text-white font-mono">{formatCurrencyFCFA(initialCash)}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Flux Net Jour :</span>
                  <strong className="text-emerald-400 font-mono">+{formatCurrencyFCFA(totalEntries - totalExits)}</strong>
                </div>
                <div>
                  <span className="text-[#E8D5B0] block font-bold">Solde Théorique :</span>
                  <strong className="text-lg text-white font-bold font-mono">{formatCurrencyFCFA(theoreticalBalance)}</strong>
                </div>
              </div>

              {/* Physical Denominations Table */}
              <div>
                <label className="text-xs font-bold text-white block mb-2">Comptage Physique des Billets & Pièces :</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-[#0A111D] border border-white/10 rounded-xl">
                    <span className="text-slate-400 block font-mono">Billets 10 000 FCFA</span>
                    <input
                      type="number"
                      min="0"
                      value={denominations.b10000}
                      onChange={(e) => setDenominations({ ...denominations, b10000: Number(e.target.value) })}
                      className="w-full mt-1 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white font-bold"
                    />
                    <div className="text-[10px] text-[#C9A96E] mt-1 font-mono">{formatCurrencyFCFA(denominations.b10000 * 10000)}</div>
                  </div>

                  <div className="p-3 bg-[#0A111D] border border-white/10 rounded-xl">
                    <span className="text-slate-400 block font-mono">Billets 5 000 FCFA</span>
                    <input
                      type="number"
                      min="0"
                      value={denominations.b5000}
                      onChange={(e) => setDenominations({ ...denominations, b5000: Number(e.target.value) })}
                      className="w-full mt-1 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white font-bold"
                    />
                    <div className="text-[10px] text-[#C9A96E] mt-1 font-mono">{formatCurrencyFCFA(denominations.b5000 * 5000)}</div>
                  </div>

                  <div className="p-3 bg-[#0A111D] border border-white/10 rounded-xl">
                    <span className="text-slate-400 block font-mono">Billets 2 000 FCFA</span>
                    <input
                      type="number"
                      min="0"
                      value={denominations.b2000}
                      onChange={(e) => setDenominations({ ...denominations, b2000: Number(e.target.value) })}
                      className="w-full mt-1 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white font-bold"
                    />
                    <div className="text-[10px] text-[#C9A96E] mt-1 font-mono">{formatCurrencyFCFA(denominations.b2000 * 2000)}</div>
                  </div>

                  <div className="p-3 bg-[#0A111D] border border-white/10 rounded-xl">
                    <span className="text-slate-400 block font-mono">Billets 1 000 FCFA</span>
                    <input
                      type="number"
                      min="0"
                      value={denominations.b1000}
                      onChange={(e) => setDenominations({ ...denominations, b1000: Number(e.target.value) })}
                      className="w-full mt-1 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white font-bold"
                    />
                    <div className="text-[10px] text-[#C9A96E] mt-1 font-mono">{formatCurrencyFCFA(denominations.b1000 * 1000)}</div>
                  </div>

                  <div className="p-3 bg-[#0A111D] border border-white/10 rounded-xl">
                    <span className="text-slate-400 block font-mono">Billets 500 FCFA</span>
                    <input
                      type="number"
                      min="0"
                      value={denominations.b500}
                      onChange={(e) => setDenominations({ ...denominations, b500: Number(e.target.value) })}
                      className="w-full mt-1 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white font-bold"
                    />
                    <div className="text-[10px] text-[#C9A96E] mt-1 font-mono">{formatCurrencyFCFA(denominations.b500 * 500)}</div>
                  </div>

                  <div className="p-3 bg-[#0A111D] border border-white/10 rounded-xl">
                    <span className="text-slate-400 block font-mono">Pièces métalliques</span>
                    <input
                      type="number"
                      min="0"
                      value={denominations.coins}
                      onChange={(e) => setDenominations({ ...denominations, coins: Number(e.target.value) })}
                      className="w-full mt-1 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white font-bold"
                    />
                    <div className="text-[10px] text-[#C9A96E] mt-1 font-mono">{formatCurrencyFCFA(denominations.coins)}</div>
                  </div>
                </div>
              </div>

              {/* Physical Total & Discrepancy Alert */}
              <div className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
                cashDiscrepancy === 0
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : cashDiscrepancy > 0
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                <div>
                  <div className="font-bold text-sm">Total Physique Compté : {formatCurrencyFCFA(physicalCountTotal)}</div>
                  <div className="text-[11px] mt-0.5">
                    {cashDiscrepancy === 0
                      ? '✓ Caisse parfaitement équilibrée (aucun écart)'
                      : cashDiscrepancy > 0
                      ? `Surplus de caisse constaté : +${formatCurrencyFCFA(cashDiscrepancy)}`
                      : `Déficit de caisse constaté : ${formatCurrencyFCFA(cashDiscrepancy)}`}
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-full font-bold text-xs ${
                  cashDiscrepancy === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {cashDiscrepancy === 0 ? 'CONFORME' : cashDiscrepancy > 0 ? 'SURPLUS' : 'DÉFICIT'}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Observations / Commentaires de clôture</label>
                <textarea
                  rows={2}
                  value={closingObservation}
                  onChange={(e) => setClosingObservation(e.target.value)}
                  placeholder="Remarques éventuelles sur la journée de caisse..."
                  className="w-full px-3 py-2 bg-[#0A111D] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#C9A96E]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsClosingModalOpen(false)}
                  className="px-4 py-2 bg-white/5 text-white rounded-xl text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] font-bold rounded-xl text-xs shadow-md cursor-pointer"
                >
                  Valider & Verrouiller la Clôture
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
