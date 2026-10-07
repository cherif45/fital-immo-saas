import React, { useState } from 'react';
import {
  ClipboardCheck,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Calendar,
  Building,
  User,
  Download
} from 'lucide-react';
import { Inspection, Tenant, Property , AgencySettings } from '../types';
import { formatCurrency, formatNumber, formatDate, exportToCSV } from '../lib/utils';
import { InspectionPrintModal } from './InspectionPrintModal';

interface InspectionsViewProps {
  inspections: Inspection[];
  tenants: Tenant[];
  properties: Property[];
  onAddInspection: (inspection: Inspection) => void;
  settings?: AgencySettings;
}

export const InspectionsView: React.FC<InspectionsViewProps> = ({
  inspections,
  tenants,
  properties,
  onAddInspection,
  settings
}) => {
  const [search, setSearch] = useState('');
  const [selectedInspectionForPrint, setSelectedInspectionForPrint] = useState<Inspection | null>(null);
    // ============================================================
  // ÉTATS POUR LA CRÉATION D'INSPECTION
  // ============================================================
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formBienId, setFormBienId] = useState('');
  const [formLocataireId, setFormLocataireId] = useState('');
  const [formType, setFormType] = useState<'Entrée' | 'Sortie' | 'Périodique'>('Entrée');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formAgentNom, setFormAgentNom] = useState('Agent FITAL-IMMO');
  const [formEtatGeneral, setFormEtatGeneral] = useState('Bon état');
  const [formRemarques, setFormRemarques] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (!formBienId || !formLocataireId) {
      alert('Veuillez sélectionner un bien et un locataire.');
      setIsSubmitting(false);
      return;
    }
    const bien = properties.find((p) => p.id === formBienId);
    const locataire = tenants.find((t) => t.id === formLocataireId);

    const newInspection: Inspection = {
      id: crypto.randomUUID(),
      ref: `EDL-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      bienId: formBienId,
      bienNom: bien?.nom || 'Bien',
      locataireId: formLocataireId,
      locataireNom: locataire ? `${locataire.prenom} ${locataire.nom}` : 'Locataire',
      type: formType,
      date: formDate,
      agentNom: formAgentNom,
      inspecteurNom: formAgentNom,
      etatGeneral: formEtatGeneral,
      remarques: formRemarques,
      statut: 'Validé',
      signe: true
    };

    onAddInspection(newInspection);
setIsAddModalOpen(false);
setIsSubmitting(false);

    // Reset
    setFormBienId('');
    setFormLocataireId('');
    setFormType('Entrée');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormRemarques('');
    setFormEtatGeneral('Bon état');
  };

  // ============================================================
  // 🔧 HELPERS : Récupérer les noms même si les champs sont vides
  // ============================================================
  const getBienNom = (i: Inspection): string => {
    if (i.bienNom && i.bienNom.trim() && i.bienNom !== 'Bien') return i.bienNom;
    const p = properties.find((x) => x.id === i.bienId);
    return p ? p.nom : 'Bien non référencé';
  };

  const getLocataireNom = (i: Inspection): string => {
    if (i.locataireNom && i.locataireNom.trim()) return i.locataireNom;
    const t = tenants.find((x) => x.id === i.locataireId);
    return t ? `${t.prenom} ${t.nom}` : 'Locataire non référencé';
  };

  const filtered = inspections.filter((i) => {
    if (search) {
      const q = search.toLowerCase();
      return (
        getLocataireNom(i).toLowerCase().includes(q) ||
        getBienNom(i).toLowerCase().includes(q) ||
        i.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/15 text-[#C9A96E] flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">États des Lieux d'Entrée & de Sortie</div>
            <div className="text-xs text-[#A8B4C4]">
              {inspections.length} procès-verbaux contradictoires · Inventaires, chiffrage des dégradations et retenues sur caution
            </div>
          </div>
        </div>
      </div>

            {/* Search + Bouton Ajouter */}
      <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/15 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-xs font-medium text-slate-300">
          Liste des PV d'états des lieux certifiés ({inspections.length})
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par locataire, bien..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Inspection</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-[#1E2E45]/80 text-[#A8B4C4] font-semibold uppercase tracking-wider text-[10px] border-b border-[#C9A96E]/20">
                <th className="py-3 px-4">Date & Type</th>
                <th className="py-3 px-3">Bien / Lot</th>
                <th className="py-3 px-3">Locataire</th>
                <th className="py-3 px-3">Agent Constat</th>
                <th className="py-3 px-3 text-right">Frais Dégradations</th>
                <th className="py-3 px-3 text-right text-emerald-400">Caution Restituée</th>
                <th className="py-3 px-4 text-center">Procès-Verbal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9A96E]/10">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B7C94]">
                    <ClipboardCheck className="w-8 h-8 mx-auto text-[#6B7C94]/50 mb-2" />
                    <p className="text-xs font-semibold text-white">Aucun état des lieux</p>
                    <p className="text-[11px] text-[#6B7C94] mt-1">Les PV apparaîtront ici après enregistrement.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-[#1E2E45]/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-xs">{item.type}</div>
                      <div className="text-[10px] text-[#A8B4C4]">{formatDate(item.date)}</div>
                    </td>

                    <td className="py-3 px-3 font-medium text-white max-w-[180px] truncate">
                      {getBienNom(item)}
                    </td>

                    <td className="py-3 px-3 font-bold text-[#E8D5B0]">{getLocataireNom(item)}</td>

                    <td className="py-3 px-3 text-[#A8B4C4]">{item.agentNom || item.inspecteurNom || 'Agent FITAL-IMMO'}</td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-400">
                      {(item.coutDegradations || item.totalDegats || 0) > 0
                        ? `${formatNumber(item.coutDegradations || item.totalDegats || 0)} FCFA`
                        : '0 FCFA (Impeccable)'}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                      {item.montantRestitueCaution ? `${formatNumber(item.montantRestitueCaution)} FCFA` : '—'}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedInspectionForPrint(item)}
                        className="px-2.5 py-1 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#C9A96E] font-medium text-[11px] border border-[#C9A96E]/20 transition-all flex items-center gap-1 mx-auto cursor-pointer"
                      >
                        <Printer className="w-3 h-3" /> Imprimer PV
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

           {/* Modal : Nouvelle Inspection */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80 sticky top-0 z-10">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <ClipboardCheck className="w-5 h-5 text-[#C9A96E]" />
                <span>Nouvelle Inspection (État des Lieux)</span>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#A8B4C4] hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitInspection} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Bien / Logement *</label>
                <select
                  value={formBienId}
                  onChange={(e) => setFormBienId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                >
                  <option value="">— Choisir un bien —</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Locataire *</label>
                <select
                  value={formLocataireId}
                  onChange={(e) => setFormLocataireId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                >
                  <option value="">— Choisir un locataire —</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.prenom} {t.nom} — {t.bienNom}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Type *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as 'Entrée' | 'Sortie' | 'Périodique')}
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  >
                    <option value="Entrée">Entrée</option>
                    <option value="Sortie">Sortie</option>
                    <option value="Périodique">Périodique</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Date *</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Agent</label>
                <input
                  type="text"
                  value={formAgentNom}
                  onChange={(e) => setFormAgentNom(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">État général</label>
                <select
                  value={formEtatGeneral}
                  onChange={(e) => setFormEtatGeneral(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                >
                  <option value="Bon état">Bon état</option>
                  <option value="État moyen">État moyen</option>
                  <option value="Mauvais état">Mauvais état</option>
                  <option value="Neuf">Neuf</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#A8B4C4] uppercase mb-1">Observations</label>
                <textarea
                  value={formRemarques}
                  onChange={(e) => setFormRemarques(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-white"
                  placeholder="Détails de l'état des lieux..."
                />
              </div>

              <div className="pt-4 border-t border-[#C9A96E]/15 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1E2E45] text-[#A8B4C4] cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold shadow-lg hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Créer l'Inspection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Print État des Lieux */}
      {selectedInspectionForPrint && (
        <InspectionPrintModal
          agencySettings={settings}
          inspection={selectedInspectionForPrint}
          onClose={() => setSelectedInspectionForPrint(null)}
        />
      )}
    </div>
  );
};