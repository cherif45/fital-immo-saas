import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  Building,
  Phone,
  Mail,
  Printer,
  Coins,
  FileCheck,
  FileText,
  CreditCard,
  CheckCircle2,
  Download,
  PhoneCall,
  MessageSquare,
  Send,
} from 'lucide-react';
import { Owner, Property, Payment, Unit } from '../types';
import { formatCurrency, formatNumber, exportToCSV } from '../lib/utils';
import { triggerPhoneCall, triggerSMS, triggerWhatsApp } from '../lib/comms/commsHelper';
import { OwnerMandateModal } from './OwnerMandateModal';

interface OwnersViewProps {
  owners: Owner[];
  properties: Property[];
  buildings?: Building[];
  units?: Unit[];
  payments: Payment[];
  onOpenOwnerSlip: (owner: Owner) => void;
  onOpenBulletin?: (owner: Owner) => void;
  onAddOwner: (owner: Owner) => void;
}

export const OwnersView: React.FC<OwnersViewProps> = ({
  owners,
  properties,
  buildings = [],
  units = [],
  payments,
  onOpenOwnerSlip,
  onOpenBulletin,
  onAddOwner,
}) => {
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedOwnerForMandate, setSelectedOwnerForMandate] = useState<Owner | null>(null);

  // Form State
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('+221 77 ');
  const [email, setEmail] = useState('');
  const [banque, setBanque] = useState('CBAO Groupe Attijariwafa');
  const [compteBancaire, setCompteBancaire] = useState('');
  const [tauxCommission, setTauxCommission] = useState<number>(10);
  const [adresse, setAdresse] = useState('Dakar, Sénégal');

  const filteredOwners = owners.filter((o) => {
    if (search) {
      const q = search.toLowerCase();
      return (
        o.nom.toLowerCase().includes(q) ||
        o.prenom.toLowerCase().includes(q) ||
        o.mandatGerance.toLowerCase().includes(q) ||
        o.telephone.includes(q) ||
        o.banque.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newOwner: Owner = {
      id: crypto.randomUUID(), 
      nom: nom.toUpperCase(),
      prenom,
      telephone,
      email: email || `${prenom.toLowerCase()}.${nom.toLowerCase()}@gmail.com`,
      adresse,
      mandatGerance: `MANDAT-2026-${Math.floor(100 + Math.random() * 900)}`,
      dateMandat: new Date().toISOString().split('T')[0],
      tauxCommission: Number(tauxCommission),
      banque,
      compteBancaire: compteBancaire || `SN08 SN012 012345678901 ${Math.floor(10 + Math.random() * 89)}`,
      totalBiens: 1,
      totalLoyersMensuels: 350000,
    };
    onAddOwner(newOwner);
    setIsAddModalOpen(false);
  };

  const handleExportCSV = () => {
    const headers = ['Propriétaire', 'Mandat', 'Téléphone', 'Banque', 'Compte Bancaire', 'Taux Com (%)', 'Nombre de Biens'];
    const rows = filteredOwners.map((o) => [
      `${o.prenom} ${o.nom}`,
      o.mandatGerance,
      o.telephone,
      o.banque,
      o.compteBancaire,
      `${o.tauxCommission}%`,
      properties.filter((p) => p.proprietaireId === o.id).length,
    ]);
    exportToCSV('Liste_Proprietaires_FITAL_IMMO', rows, headers);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/15 text-[#C9A96E] flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Gestion des Propriétaires & Mandats</div>
            <div className="text-xs text-[#A8B4C4]">
              {owners.length} propriétaires sous contrat de gérance exclusif
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] border border-[#C9A96E]/30 text-xs font-semibold text-[#E8D5B0] transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Propriétaire</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/15 flex items-center justify-between">
        <div className="text-xs text-[#A8B4C4]">
          Édition automatique des <strong className="text-white">Bulletins de Versement</strong> et calcul des commissions agence.
        </div>
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 text-[#6B7C94] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher propriétaire, mandat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-xs text-white focus:outline-none focus:border-[#C9A96E]"
          />
        </div>
      </div>

      {/* Grid of Owners Cards */}
      {filteredOwners.length === 0 ? (
        <div className="py-16 text-center text-[#6B7C94] bg-[#162133] rounded-2xl border border-[#C9A96E]/20 p-8">
          <UserCheck className="w-10 h-10 mx-auto text-[#6B7C94]/50 mb-3" />
          <h3 className="text-sm font-bold text-white mb-1">Aucun propriétaire bailleur</h3>
          <p className="text-xs text-[#A8B4C4] max-w-sm mx-auto mb-4">
            Enregistrez votre premier propriétaire mandant pour commencer à lui rattacher des immeubles et des lots locatifs.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs"
          >
            + Nouveau Propriétaire
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOwners.map((o) => {
          const ownerLots = properties.filter((p) => p.proprietaireId === o.id);
          const totalLotsRent = ownerLots.reduce((sum, p) => sum + p.loyerTotal, 0);

          return (
            <div
              key={o.id}
              className="p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 hover:border-[#C9A96E]/50 transition-all shadow-xl flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1E2E45] text-[#C9A96E] border border-[#C9A96E]/20">
                      {o.mandatGerance}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1.5 group-hover:text-[#C9A96E] transition-colors">
                      {o.prenom} {o.nom}
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#C9A96E]/20 text-[#E8D5B0] border border-[#C9A96E]/30 font-mono">
                    Com. {o.tauxCommission}%
                  </span>
                </div>

                <div className="space-y-2 text-xs text-[#A8B4C4] my-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#6B7C94]" />
                      <span className="font-mono text-white font-semibold">{o.telephone}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => triggerPhoneCall(o.telephone)}
                        className="p-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all"
                        title="Appeler le propriétaire"
                      >
                        <PhoneCall className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerWhatsApp(o.telephone, `Bonjour ${o.prenom} ${o.nom}, l'agence FITAL-IMMO vous contacte au sujet de la gestion de votre patrimoine.`)}
                        className="p-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all"
                        title="Écrire sur WhatsApp"
                      >
                        <Send className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerSMS(o.telephone, `Bonjour ${o.prenom} ${o.nom}, message de l'agence FITAL-IMMO.`)}
                        className="p-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-all"
                        title="Envoyer un SMS"
                      >
                        <MessageSquare className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#6B7C94]" />
                    <span className="truncate">{o.email}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#1E2E45]/40 border border-[#C9A96E]/10 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[#6B7C94]">Banque & Compte :</span>
                    <span className="font-medium text-white truncate max-w-[150px]">{o.banque}</span>
                  </div>
                  <div className="font-mono text-[10px] text-[#A8B4C4] truncate">{o.compteBancaire}</div>
                  <div className="flex justify-between items-center pt-1 border-t border-[#C9A96E]/10">
                    <span className="text-[#6B7C94]">Biens sous gestion :</span>
                    <span className="font-bold text-white">{ownerLots.length} lots</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#C9A96E]/15 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] text-[#6B7C94] uppercase">Potentiel Mensuel</div>
                  <div className="text-sm font-bold text-[#C9A96E] font-mono">
                    {formatNumber(totalLotsRent)} FCFA
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedOwnerForMandate(o)}
                    className="px-2.5 py-1.5 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#E8D5B0] border border-[#C9A96E]/30 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Consulter et imprimer le Mandat de Gérance Exclusif"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#C9A96E]" />
                    <span>Mandat</span>
                  </button>

                                    <button
                    onClick={() => {
                      if (onOpenBulletin) {
                        onOpenBulletin(o);
                      } else {
                        onOpenOwnerSlip(o);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Éditer le Bulletin de Versement Propriétaire complet"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Bulletin de Versement</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Modal: Mandat de Gérance Officiel */}
      {selectedOwnerForMandate && (
        <OwnerMandateModal
          owner={selectedOwnerForMandate}
          properties={properties}
          onClose={() => setSelectedOwnerForMandate(null)}
        />
      )}

      {/* Modal: Ajouter un Nouveau Propriétaire */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <UserCheck className="w-5 h-5 text-[#C9A96E]" />
                <span>Nouveau Propriétaire Mandant</span>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#A8B4C4] hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Prénom</label>
                  <input
                    type="text"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                    placeholder="Mamadou"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Nom</label>
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                    placeholder="SOW"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                    placeholder="contact@exemple.sn"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Banque Bénéficiaire</label>
                  <input
                    type="text"
                    value={banque}
                    onChange={(e) => setBanque(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#C9A96E] uppercase mb-1">Taux Commission (%)</label>
                  <input
                    type="number"
                    value={tauxCommission}
                    onChange={(e) => setTauxCommission(Number(e.target.value))}
                    required
                    min={1}
                    max={25}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E] text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">RIB / Numéro de Compte</label>
                <input
                  type="text"
                  value={compteBancaire}
                  onChange={(e) => setCompteBancaire(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white font-mono"
                  placeholder="SN08 SN012 012345678901 45"
                />
              </div>

              <div className="pt-4 border-t border-[#C9A96E]/15 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1E2E45] text-[#A8B4C4]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Enregistrer le Mandat</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
