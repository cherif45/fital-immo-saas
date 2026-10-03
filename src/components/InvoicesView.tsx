import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Download,
  Printer,
  CheckCircle2,
  DollarSign,
  Building,
  User,
  Calendar,
  X,
  Eye
} from 'lucide-react';
import { Invoice, Property, Owner, Tenant } from '../types';
import { formatCurrencyFCFA, numberToWordsFrench } from '../lib/calculations/financial';
import { paginateTable } from '../lib/supabase/service';

interface InvoicesViewProps {
  invoices: Invoice[];
  properties: Property[];
  buildings?: any[];
  units?: any[];
  owners: Owner[];
  tenants: Tenant[];
  onAddInvoice: (newInvoice: Invoice) => void;
  currentUser?: { agencyId?: string } | null;
}

export function InvoicesView({
  invoices,
  properties,
  buildings = [],
  units = [],
  owners,
  tenants,
  onAddInvoice,
  currentUser,
}: InvoicesViewProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  // ðŸ†• Pagination serveur
  const [serverInvoices, setServerInvoices] = useState<Invoice[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [serverPage, setServerPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 50;

  React.useEffect(() => {
    if (!currentUser?.agencyId) return;
    loadInvoicesPage(0);
  }, [currentUser?.agencyId]);

  const loadInvoicesPage = async (page: number) => {
    if (!currentUser?.agencyId) return;
    setIsLoadingMore(true);
    const result = await paginateTable<any>('invoices', currentUser.agencyId, page, PAGE_SIZE);
    const mapped: Invoice[] = result.data.map((r: any) => ({
      ...r,
      id: r.id,
      ref: r.ref || r.numero || 'FAC-?',
      type: r.type || 'Autre',
      proprietaireId: r.proprietaire_id,
      proprietaireNom: r.proprietaire_nom || 'â€”',
      locataireId: r.locataire_id,
      locataireNom: r.locataire_nom || 'â€”',
      bienNom: r.bien_nom || 'â€”',
      dateFacture: r.date_facture || r.created_at,
      dateEcheance: r.date_echeance,
      montantHT: Number(r.montant_ht) || 0,
      tva: Number(r.tva) || 0,
      montantTTC: Number(r.montant_ttc) || 0,
      statut: r.statut || 'En attente',
      notes: r.notes || '',
    }));
    if (page === 0) {
      setServerInvoices(mapped);
    } else {
      setServerInvoices(prev => [...prev, ...mapped]);
    }
    setServerTotal(result.total);
    setServerPage(page);
    setIsLoadingMore(false);
  };

  const displayInvoices = serverInvoices.length > 0 ? serverInvoices : invoices;

  // New Invoice Form State
  const [type, setType] = useState<'AdhÃ©sion' | 'Travaux' | 'Frais de dossier' | 'Autre'>('AdhÃ©sion');
  const [targetOwnerId, setTargetOwnerId] = useState(owners[0]?.id || '');
  const [targetBienNom, setTargetBienNom] = useState(properties[0]?.nom || '');
  const [description, setDescription] = useState("Frais d'adhÃ©sion & mandat de gestion locative");
  const [montantHT, setMontantHT] = useState(150000);
  const [tvaApplicable, setTvaApplicable] = useState(true);
  const [notes, setNotes] = useState('Mandat de gÃ©rance exclusif');

  const filteredInvoices = displayInvoices.filter((inv) => {
    const matchSearch =
      inv.ref.toLowerCase().includes(search.toLowerCase()) ||
      (inv.proprietaireNom || '').toLowerCase().includes(search.toLowerCase()) ||
      (inv.bienNom || '').toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || inv.type === filterType;
    return matchSearch && matchType;
  });

    const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const isForTenant = type === 'Frais de dossier';
    const owner = isForTenant ? null : owners.find((o) => o.id === targetOwnerId);
    const tenant = isForTenant ? tenants.find((t) => t.id === targetOwnerId) : null;
    const taxes = tvaApplicable ? Math.round(montantHT * 0.18) : 0;
    const total = montantHT + taxes;

    // ðŸš¨ CONTRÃ”LE ANTI-DOUBLON FACTURE (AdhÃ©sion / Frais de dossier)
    if (type === 'AdhÃ©sion' || type === 'Frais de dossier') {
      const factureExistante = invoices.find(
        (inv) =>
          inv.type === type &&
          inv.statut !== 'Annulée' &&
          (
            (owner && inv.proprietaireId === owner.id && inv.bienNom === targetBienNom) ||
            (tenant && inv.locataireId === tenant.id && inv.bienNom === targetBienNom)
          )
      );

      if (factureExistante) {
        alert(
          `âš ï¸ FACTURE EN DOUBLE DÃ‰TECTÃ‰E\n\n` +
          `Une facture ${type} a DÃ‰JÃ€ Ã©tÃ© Ã©mise pour ce bien.\n\n` +
          `ðŸ“„ RÃ©fÃ©rence : ${factureExistante.ref}\n` +
          `ðŸ’° Montant : ${formatCurrencyFCFA(factureExistante.total)}\n` +
          `ðŸ“… Date : ${factureExistante.dateFacture}\n\n` +
          `Annulez d'abord l'ancienne facture pour en Ã©mettre une nouvelle.`
        );
        return;
      }
    }

    const newInv: Invoice = {
      id: crypto.randomUUID(),
      ref: `FAC-2026-${String(invoices.length + 1).padStart(4, '0')}-${String(Date.now()).slice(-4)}`,
      numero: `FAC-2026-${String(invoices.length + 1).padStart(4, '0')}`,
      type,
           proprietaireId: owner?.id,
      proprietaireNom: owner ? `${owner.prenom} ${owner.nom}` : undefined,
      locataireId: tenant?.id,
      locataireNom: tenant ? `${tenant.prenom} ${tenant.nom}` : undefined,
      bienNom: targetBienNom,
      dateFacture: new Date().toISOString().split('T')[0],
      dateEcheance: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      sousTotal: montantHT,
      taxes,
      total,
      statut: 'Émise',
      lignes: [
        {
          id: `line-${Date.now()}`,
          description,
          quantite: 1,
          prixUnitaire: montantHT,
          montant: montantHT,
        },
      ],
      notes,
    };

    onAddInvoice(newInv);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2A3447] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#F0EDE8] tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-[#C9A96E]" />
            Facturation & Frais de Gestion
          </h1>
          <p className="text-sm text-[#A0AEC0] mt-1">
            Ã‰dition des factures d'adhÃ©sion de mandats, refacturations de travaux et frais de dossier agrÃ©Ã©s.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Facture
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A0AEC0]" />
          <input
            type="text"
            placeholder="Rechercher par rÃ©fÃ©rence (FAC-...), propriÃ©taire ou bien..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#141E30] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] placeholder-[#64748B] focus:border-[#C9A96E] focus:outline-none"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3.5 py-2.5 bg-[#141E30] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none w-full sm:w-auto"
        >
          <option value="all">Tous les types de facture</option>
          <option value="AdhÃ©sion">Factures d'AdhÃ©sion</option>
          <option value="Travaux">Factures de Travaux</option>
          <option value="Frais de dossier">Frais de Dossier</option>
        </select>
      </div>

      {/* Invoices Table */}
      <div className="bg-[#141E30]/90 border border-[#2A3447] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#F0EDE8]">
            <thead className="bg-[#0A111D]/80 text-xs uppercase tracking-wider text-[#A0AEC0] border-b border-[#2A3447]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">RÃ©fÃ©rence</th>
                <th className="py-3.5 px-4 font-semibold">Type</th>
                <th className="py-3.5 px-4 font-semibold">Destinataire</th>
                <th className="py-3.5 px-4 font-semibold">Bien AssociÃ©</th>
                <th className="py-3.5 px-4 font-semibold">Date Ã‰mission</th>
                <th className="py-3.5 px-4 font-semibold text-right">Montant TTC</th>
                <th className="py-3.5 px-4 font-semibold text-center">Statut</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A3447]/60">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-[#1E2C44]/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#C9A96E]">{inv.ref}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#C9A96E]/15 border border-[#C9A96E]/30 text-[#E8D5B0]">
                      {inv.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#F0EDE8]">{inv.proprietaireNom || inv.locataireNom}</td>
                  <td className="py-3.5 px-4 text-xs text-[#A0AEC0]">{inv.bienNom}</td>
                  <td className="py-3.5 px-4 text-xs text-[#A0AEC0]">{inv.dateFacture}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-[#10B981]">{formatCurrencyFCFA(inv.montantTTC || inv.total || 0)}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        inv.statut === 'Payée'
                          ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                          : 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30'
                      }`}
                    >
                      {inv.statut}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="px-2.5 py-1 bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#E8D5B0] rounded-lg text-xs font-semibold border border-[#C9A96E]/30 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Afficher et imprimer la facture"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#C9A96E]" />
                      <span>Imprimer</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

        {/* 🆕 Bouton Charger plus */}
        {serverInvoices.length > 0 && serverInvoices.length < serverTotal && (
          <div className="flex justify-center mt-4 mb-6">
            <button
              onClick={() => loadInvoicesPage(serverPage + 1)}
              disabled={isLoadingMore}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-sm shadow-lg hover:scale-105 transition-all disabled:opacity-50"
            >
              {isLoadingMore ? '⏳ Chargement...' : `📥 Charger plus (${serverInvoices.length} / ${serverTotal})`}
            </button>
          </div>
        )}
        </div>
      </div>

      {/* New Invoice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141E30] border border-[#2A3447] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between p-5 border-b border-[#2A3447]">
              <h2 className="text-lg font-bold text-[#F0EDE8] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#C9A96E]" />
                CrÃ©er une Nouvelle Facture
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#A0AEC0] hover:text-[#F0EDE8] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-1.5">
                  Type de Facture
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none"
                >
                  <option value="AdhÃ©sion">Facture d'AdhÃ©sion / Mandat de Gestion</option>
                  <option value="Travaux">Facture de Travaux & RÃ©novations</option>
                  <option value="Frais de dossier">Frais de Dossier / Bail</option>
                </select>
              </div>

                            <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-1.5">
                  {type === 'Frais de dossier' ? 'Locataire Destinataire' : 'PropriÃ©taire Destinataire'}
                </label>
                {type === 'Frais de dossier' ? (
                  <select
                    value={targetOwnerId}
                    onChange={(e) => setTargetOwnerId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none"
                  >
                    <option value="">â€” Choisir un locataire â€”</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.prenom} {t.nom} - {t.telephone}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={targetOwnerId}
                    onChange={(e) => setTargetOwnerId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none"
                  >
                    {owners.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.prenom} {o.nom} - {o.telephone}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-1.5">
                  Bien / Immeuble / Espace ConcernÃ©
                </label>
                <select
                  value={targetBienNom}
                  onChange={(e) => setTargetBienNom(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none"
                >
                  <option value="">â€” Choisir â€”</option>

                  {/* Biens simples du propriÃ©taire sÃ©lectionnÃ© */}
                  {(() => {
                    const filteredProps = type === 'Frais de dossier'
                      ? properties.filter((p) => {
                          const t = tenants.find((x) => x.id === targetOwnerId);
                          return t && t.bienId === p.id;
                        })
                      : properties.filter((p) => p.proprietaireId === targetOwnerId);

                    const filteredBuildings = type === 'Frais de dossier'
                      ? []
                      : buildings.filter((b: any) => b.proprietaireId === targetOwnerId);

                    const filteredUnits = type === 'Frais de dossier'
                      ? units.filter((u: any) => {
                          const t = tenants.find((x) => x.id === targetOwnerId);
                          return t && t.bienId === u.id;
                        })
                      : units.filter((u: any) => u.proprietaireId === targetOwnerId);

                    const hasAny = filteredProps.length > 0 || filteredBuildings.length > 0 || filteredUnits.length > 0;

                    if (!hasAny) {
                      return <option value="" disabled>Aucun bien liÃ© Ã  ce destinataire</option>;
                    }

                    return (
                      <>
                        {filteredProps.length > 0 && (
                          <optgroup label="ðŸ  Biens simples">
                            {filteredProps.map((p) => (
                              <option key={p.id} value={p.nom}>
                                {p.nom} ({p.quartier})
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {filteredBuildings.length > 0 && (
                          <optgroup label="ðŸ¢ Immeubles">
                            {filteredBuildings.map((b: any) => (
                              <option key={b.id} value={b.nom}>
                                {b.nom} ({b.quartier || b.adresse})
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {filteredUnits.length > 0 && (
                          <optgroup label="ðŸ”‘ Espaces / UnitÃ©s">
                            {filteredUnits.map((u: any) => (
                              <option key={u.id} value={u.nom}>
                                {u.nom} â€” {u.loyerBase} FCFA
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </>
                    );
                  })()}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-1.5">
                  Description de la prestation
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#A0AEC0] mb-1.5">
                    Montant HT (FCFA)
                  </label>
                  <input
                    type="number"
                    value={montantHT}
                    onChange={(e) => setMontantHT(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-[#0A111D] border border-[#2A3447] rounded-xl text-sm text-[#F0EDE8] focus:border-[#C9A96E] focus:outline-none"
                    required
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 text-xs text-[#E8D5B0] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tvaApplicable}
                      onChange={(e) => setTvaApplicable(e.target.checked)}
                      className="rounded border-[#2A3447] text-[#C9A96E] focus:ring-[#C9A96E]"
                    />
                    Appliquer TVA 18%
                  </label>
                </div>
              </div>

              <div className="p-3 bg-[#0A111D] rounded-xl border border-[#2A3447] flex justify-between items-center text-sm">
                <span className="text-[#A0AEC0]">Total TTC FacturÃ© :</span>
                <span className="text-lg font-bold text-[#10B981]">
                  {formatCurrencyFCFA(montantHT + (tvaApplicable ? Math.round(montantHT * 0.18) : 0))}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#0A111D] hover:bg-[#1E2C44] text-[#A0AEC0] rounded-xl text-sm cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] font-bold rounded-xl text-sm cursor-pointer"
                >
                  Ã‰mettre la Facture
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Printable View Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-[#1E293B] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl p-8 space-y-6 print-container">
            <div className="flex justify-between items-start border-b border-gray-200 pb-5">
              <div>
                <h2 className="text-2xl font-black text-[#0F172A] tracking-wider">FITAL-IMMO</h2>
                <p className="text-xs text-gray-500">Route des Almadies, Immeuble Prestige, Dakar</p>
                <p className="text-xs text-gray-500">NINEA : 008945213 2V3 | TÃ©l : +221 33 824 10 10</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-amber-100 text-amber-900 font-mono font-bold text-xs rounded-lg uppercase">
                  FACTURE OFFICIELLE
                </span>
                <p className="font-mono text-base font-bold text-gray-900 mt-1.5">{selectedInvoice.ref}</p>
                <p className="text-xs text-gray-500">Date : {selectedInvoice.dateFacture}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl text-sm">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase">FacturÃ© Ã  :</p>
                <p className="font-bold text-gray-900">{selectedInvoice.proprietaireNom}</p>
                <p className="text-xs text-gray-600">Bien : {selectedInvoice.bienNom}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase">Conditions :</p>
                <p className="text-xs text-gray-700">Ã‰chÃ©ance : {selectedInvoice.dateEcheance}</p>
                <p className="text-xs text-gray-700">Mode : Virement / ChÃ¨que</p>
              </div>
            </div>

            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300 text-xs uppercase font-bold text-gray-600">
                  <th className="py-2">DÃ©signation</th>
                  <th className="py-2 text-center">QtÃ©</th>
                  <th className="py-2 text-right">Prix Unitaire</th>
                  <th className="py-2 text-right">Total HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {selectedInvoice.lignes.map((l) => (
                  <tr key={l.id}>
                    <td className="py-3 font-medium text-gray-800">{l.description}</td>
                    <td className="py-3 text-center text-gray-600">{l.quantite}</td>
                    <td className="py-3 text-right text-gray-700">{formatCurrencyFCFA(l.prixUnitaire)}</td>
                    <td className="py-3 text-right font-bold text-gray-900">{formatCurrencyFCFA(l.montant)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end pt-3">
              <div className="w-64 space-y-2 text-sm border-t border-gray-200 pt-3">
                <div className="flex justify-between text-gray-600">
                  <span>Sous-total HT :</span>
                  <span className="font-semibold">{formatCurrencyFCFA(selectedInvoice.sousTotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>TVA (18%) :</span>
                  <span className="font-semibold">{formatCurrencyFCFA(selectedInvoice.taxes)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-gray-900 border-t-2 border-gray-900 pt-2">
                  <span>TOTAL TTC :</span>
                  <span className="text-emerald-700">{formatCurrencyFCFA(selectedInvoice.total)}</span>
                </div>
              </div>
            </div>

                       <div className="bg-amber-50 p-3 rounded-lg text-xs text-amber-950 font-medium">
              ArrÃªtÃ©e la prÃ©sente facture Ã  la somme de : <br />
              <strong className="text-sm font-bold">{numberToWordsFrench(selectedInvoice.total)}</strong>
            </div>

            {/* Signatures & TraÃ§abilitÃ© */}
            <div className="grid grid-cols-2 gap-8 pt-6 mt-6 border-t-2 border-gray-300">
              <div>
                <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">
                  Ã‰mis par
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {selectedInvoice.createdByNom || 'Service Facturation'}
                </div>
                <div className="text-[11px] uppercase font-semibold text-gray-500 mt-0.5">
                  RÃ´le : {selectedInvoice.createdByRole || 'â€”'}
                </div>
                {selectedInvoice.createdById && (
                  <div className="text-[9px] font-mono text-gray-400 mt-0.5">
                    ID : {selectedInvoice.createdById.slice(0, 8)}â€¦
                  </div>
                )}
                <div className="text-[10px] text-gray-500 mt-1">
                  Le {new Date(selectedInvoice.dateFacture || Date.now()).toLocaleDateString('fr-FR')}
                </div>
                <div className="font-bold text-gray-700 text-xs mt-3 mb-1">
                  Signature de l'Ã‰metteur :
                </div>
                <div className="h-16 border border-dashed border-gray-400 rounded-lg"></div>
              </div>

              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">
                  Pour l'Agence
                </div>
                <div className="text-sm font-bold text-gray-900">
                  FITAL-IMMO
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  Cachet officiel
                </div>
                <div className="font-bold text-gray-700 text-xs mt-3 mb-1">
                  Cachet & Signature Agence :
                </div>
                <div className="h-16 border border-dashed border-gray-400 rounded-lg"></div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-200 no-print">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm cursor-pointer"
              >
                Fermer
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-[#0F172A] hover:bg-black text-white font-bold rounded-xl text-sm flex items-center gap-2 cursor-pointer shadow"
              >
                <Printer className="w-4 h-4" />
                Imprimer / PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
