import React, { useState } from 'react';
import {
  FileSignature,
  Plus,
  Search,
  Printer,
  Calendar,
  DollarSign,
  Building,
  User,
  CheckCircle2,
  ShieldAlert,
  Percent,
  Download,
  FileCheck,
  RotateCw,
  AlertCircle,
  X
} from 'lucide-react';
import { LeaseContract, Tenant, Property, Owner, UserAccount } from '../types';
import { formatCurrency, formatNumber, formatDate, nombreEnLettres, exportToCSV } from '../lib/utils';
import { LeaseContractModal } from './LeaseContractModal';

interface ContractsViewProps {
  contracts: LeaseContract[];
  tenants: Tenant[];
  properties: Property[];
  owners: Owner[];
  currentUser?: UserAccount;
  onAddContract: (contract: LeaseContract) => void;
  onUpdateContract?: (contract: LeaseContract) => void;
}

export const ContractsView: React.FC<ContractsViewProps> = ({
  contracts,
  tenants,
  properties,
  owners,
  currentUser,
  onAddContract,
  onUpdateContract,
}) => {
  const [search, setSearch] = useState('');
  const [selectedContractForPrint, setSelectedContractForPrint] = useState<LeaseContract | null>(null);
  const [isNewContractModalOpen, setIsNewContractModalOpen] = useState(false);

  // New Contract State
  const [locataireId, setLocataireId] = useState(tenants[0]?.id || '');
  const [bienId, setBienId] = useState(properties[0]?.id || '');
  const [typeContrat, setTypeContrat] = useState<'Habitation' | 'Commercial' | 'Professionnel'>('Habitation');
  const [loyerBase, setLoyerBase] = useState(properties[0]?.loyerBase || 350000);
  const [charges, setCharges] = useState(properties[0]?.charges || 25000);
  const [cautionMois, setCautionMois] = useState(2);
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().split('T')[0]);
  const [dateFin, setDateFin] = useState(
    new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
  );
  const [fraisAdhesion, setFraisAdhesion] = useState(50000);

  // Computed taxes (Sénégal standard)
  const isCommercial = typeContrat === 'Commercial' || typeContrat === 'Professionnel';
  const tva = isCommercial ? Math.round(loyerBase * 0.18) : 0;
  const tom = Math.round(loyerBase * 0.036);
  const tlv = isCommercial ? Math.round(loyerBase * 0.025) : 0;
  const cautionMontant = loyerBase * cautionMois;

  const isTenant = currentUser?.role === 'LOCATAIRE';

  // ============================================================
  // 🔧 HELPERS : Récupérer les noms même si les champs sont vides
  // ============================================================
  const getLocataireNom = (c: LeaseContract): string => {
    if (c.locataireNom && c.locataireNom.trim()) return c.locataireNom;
    const t = tenants.find((x) => x.id === c.locataireId);
    return t ? `${t.prenom} ${t.nom}` : 'Locataire non référencé';
  };

  const getBienNom = (c: LeaseContract): string => {
    if (c.bienNom && c.bienNom.trim()) return c.bienNom;
    const p = properties.find((x) => x.id === c.bienId);
    return p ? p.nom : 'Bien non référencé';
  };

  const getProprietaireNom = (c: LeaseContract): string => {
    if (c.proprietaireNom && c.proprietaireNom.trim() && c.proprietaireNom !== 'Propriétaire') return c.proprietaireNom;
    const o1 = owners.find((x) => x.id === c.proprietaireId);
    if (o1) return `${o1.prenom} ${o1.nom}`;
    const p = properties.find((x) => x.id === c.bienId);
    if (p?.proprietaireId) {
      const o2 = owners.find((x) => x.id === p.proprietaireId);
      if (o2) return `${o2.prenom} ${o2.nom}`;
    }
    return 'Bailleur non référencé';
  };

  // Filter for contracts
  let displayableContracts = contracts;
  if (isTenant && currentUser?.locataireId) {
    displayableContracts = contracts.filter((c) => c.locataireId === currentUser.locataireId);
    if (displayableContracts.length === 0) displayableContracts = contracts.slice(0, 1);
  } else if (currentUser?.role === 'PROPRIETAIRE' && currentUser?.proprietaireId) {
    displayableContracts = contracts.filter((c) => c.proprietaireId === currentUser.proprietaireId);
  }

  const filteredContracts = displayableContracts.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      return (
        c.ref.toLowerCase().includes(q) ||
        getLocataireNom(c).toLowerCase().includes(q) ||
        getBienNom(c).toLowerCase().includes(q) ||
        getProprietaireNom(c).toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handlePropertySelect = (pId: string) => {
    setBienId(pId);
    const p = properties.find((item) => item.id === pId);
    if (p) {
      setLoyerBase(p.loyerBase);
      setCharges(p.charges || 0);
    }
  };

  const handleCreateContract = (e: React.FormEvent) => {
    e.preventDefault();
    const t = tenants.find((item) => item.id === locataireId) || tenants[0];
    const p = properties.find((item) => item.id === bienId) || properties[0];
    const o = owners.find((owner) => owner.id === p?.proprietaireId) || owners[0];

    const newContract: LeaseContract = {
      id: crypto.randomUUID(),
      ref: `CTR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      locataireId: t.id,
      locataireNom: `${t.prenom} ${t.nom}`,
      bienId: p.id,
      bienNom: p.nom,
      proprietaireId: o?.id || 'owner-1',
      proprietaireNom: o ? `${o.prenom} ${o.nom}` : 'Propriétaire FITAL',
      dateDebut,
      dateFin,
      loyerBase,
      charges,
      tva,
      tom,
      tlv,
      cautionMontant,
      cautionMois,
      fraisAdhesion,
      statut: 'Actif',
      typeContrat,
    };

    onAddContract(newContract);
    setIsNewContractModalOpen(false);
  };

  const handleExportCSV = () => {
    const headers = ['Réf Contrat', 'Locataire', 'Bien', 'Propriétaire', 'Loyer Base', 'Charges', 'Taxes', 'Caution', 'Début', 'Fin', 'Statut'];
    const rows = filteredContracts.map((c) => [
      c.ref,
      getLocataireNom(c),
      getBienNom(c),
      getProprietaireNom(c),
      c.loyerBase,
      c.charges,
      c.tva + c.tom + c.tlv,
      c.cautionMontant,
      c.dateDebut,
      c.dateFin,
      c.statut,
    ]);
    exportToCSV('Contrats_Baux_FITAL_IMMO', rows, headers);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/15 text-[#C9A96E] flex items-center justify-center font-bold">
            <FileSignature className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Contrats de Bail, Taxes & Cautions de Garantie</div>
            <div className="text-xs text-[#A8B4C4]">
              {displayableContracts.length} baux répertoriés · Calcul automatique TOM, TVA (18%), TLV et frais d'enregistrement
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] border border-[#C9A96E]/30 text-xs font-semibold text-[#E8D5B0] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel / CSV</span>
          </button>

          {!isTenant && (
            <button
              onClick={() => setIsNewContractModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-lg hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Rédiger un Nouveau Bail</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter / Search */}
      <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/15 flex items-center justify-between gap-4">
        <div className="text-xs font-medium text-slate-300">
          Liste des baux authentifiés FITAL-IMMO
        </div>
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par réf, locataire, bien..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Contracts Table */}
      <div className="rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-[#1E2E45]/80 text-[#A8B4C4] font-semibold uppercase tracking-wider text-[10px] border-b border-[#C9A96E]/20">
                <th className="py-3 px-4">Réf Contrat & Type</th>
                <th className="py-3 px-3">Locataire & Bien</th>
                <th className="py-3 px-3">Propriétaire</th>
                <th className="py-3 px-3 text-right">Loyer + Charges</th>
                <th className="py-3 px-3 text-right">Taxes (TOM/TVA)</th>
                <th className="py-3 px-3 text-right text-sky-400">Caution Déposée</th>
                <th className="py-3 px-3">Échéance Bail</th>
                <th className="py-3 px-3 text-center">Statut</th>
                <th className="py-3 px-4 text-center">Bail Officiel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9A96E]/10">
              {filteredContracts.map((c) => {
                const totalLoyer = c.loyerBase + c.charges;
                const totalTaxes = c.tva + c.tom + c.tlv;
                return (
                  <tr key={c.id} className="hover:bg-[#1E2E45]/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-white text-[11px]">{c.ref}</div>
                      <div className="text-[10px] text-[#C9A96E] font-medium">{c.typeContrat}</div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{getLocataireNom(c)}</div>
                      <div className="text-[10px] text-[#A8B4C4] truncate max-w-[170px]">{getBienNom(c)}</div>
                    </td>

                    <td className="py-3 px-3 text-[#A8B4C4]">{getProprietaireNom(c)}</td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-white">
                      {formatNumber(totalLoyer)}{' '}
                      <span className="text-[10px] text-[#A8B4C4]">FCFA</span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-amber-300">
                      {totalTaxes > 0 ? `${formatNumber(totalTaxes)} FCFA` : 'Exonéré'}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-sky-300">
                      {formatNumber(c.cautionMontant)} FCFA
                    </td>

                    <td className="py-3 px-3 text-[11px] text-[#A8B4C4]">
                      <div>{formatDate(c.dateDebut)}</div>
                      <div className="text-[10px] text-[#6B7C94]">au {formatDate(c.dateFin)}</div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                        {c.statut}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedContractForPrint(c)}
                        className="px-2.5 py-1 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#C9A96E] font-medium text-[11px] border border-[#C9A96E]/20 transition-all flex items-center gap-1 mx-auto cursor-pointer"
                        title="Imprimer le Contrat de Bail Type FITAL-IMMO"
                      >
                        <Printer className="w-3 h-3" /> Imprimer Bail
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Nouveau Contrat de Bail */}
      {isNewContractModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#C9A96E]/20 pb-4">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <FileSignature className="w-5 h-5 text-[#C9A96E]" />
                <span>Rédaction d'un Nouveau Contrat de Bail</span>
              </div>
              <button onClick={() => setIsNewContractModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateContract} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Locataire Preneur</label>
                  <select
                    value={locataireId}
                    onChange={(e) => setLocataireId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>{t.prenom} {t.nom} ({t.telephone})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Bien Immobiliers / Lot</label>
                  <select
                    value={bienId}
                    onChange={(e) => handlePropertySelect(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>{p.nom} - {p.quartier} ({formatCurrency(p.loyerBase)})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Type de Bail</label>
                  <select
                    value={typeContrat}
                    onChange={(e) => setTypeContrat(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  >
                    <option value="Habitation">Habitation</option>
                    <option value="Commercial">Commercial (TVA 18%)</option>
                    <option value="Professionnel">Professionnel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#C9A96E] uppercase mb-1">Loyer Base (FCFA)</label>
                  <input
                    type="number"
                    value={loyerBase}
                    onChange={(e) => setLoyerBase(Number(e.target.value))}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E] text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Charges (FCFA)</label>
                  <input
                    type="number"
                    value={charges}
                    onChange={(e) => setCharges(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-sky-400 uppercase mb-1">Caution (Mois)</label>
                  <select
                    value={cautionMois}
                    onChange={(e) => setCautionMois(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-sky-500/40 text-white"
                  >
                    <option value={1}>1 Mois</option>
                    <option value={2}>2 Mois (Légal Sénégal)</option>
                    <option value={3}>3 Mois</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Date Début</label>
                  <input
                    type="date"
                    value={dateDebut}
                    onChange={(e) => setDateDebut(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Date Échéance (1 an)</label>
                  <input
                    type="date"
                    value={dateFin}
                    onChange={(e) => setDateFin(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#0F1B2D] rounded-xl border border-[#C9A96E]/20 grid grid-cols-3 gap-2 text-[11px]">
                <div><span className="text-slate-400">Total Mensuel :</span> <strong className="text-white block font-mono">{formatCurrency(loyerBase + charges + tva + tom + tlv)}</strong></div>
                <div><span className="text-slate-400">Caution Totale :</span> <strong className="text-sky-300 block font-mono">{formatCurrency(cautionMontant)}</strong></div>
                <div><span className="text-slate-400">Taxes (TVA+TOM) :</span> <strong className="text-amber-300 block font-mono">{formatCurrency(tva + tom + tlv)}</strong></div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewContractModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1E2E45] text-slate-300 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold shadow-lg cursor-pointer"
                >
                  Générer & Activer le Bail
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Contrat de Bail Officiel Imprimable */}
      {selectedContractForPrint && (
        <LeaseContractModal
          contract={selectedContractForPrint}
          onClose={() => setSelectedContractForPrint(null)}
        />
      )}
    </div>
  );
};