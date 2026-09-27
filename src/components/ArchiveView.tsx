import React, { useState, useMemo } from 'react';
import {
  Archive, Search, Eye, Building2, User, Users, FileText, Layers,
  FileSignature, WalletCards, ClipboardList, Wrench, Receipt, Calendar,
  X, Printer, Download, TrendingUp, Home,
} from 'lucide-react';
import {
  ArchiveRecord, UserAccount, Tenant, Owner, Property, Building, Unit,
  LeaseContract, Payment, OwnerDisbursement, Inspection, MaintenanceTicket,
  Invoice, BulletinVersement,
} from '../types';
import { formatCurrency, formatNumber, formatDate, exportToCSV } from '../lib/utils';

interface ArchiveViewProps {
  currentUser?: UserAccount;
  tenants?: Tenant[];
  owners?: Owner[];
  properties?: Property[];
  buildings?: Building[];
  units?: Unit[];
  contracts?: LeaseContract[];
  payments?: Payment[];
  disbursements?: OwnerDisbursement[];
  inspections?: Inspection[];
  maintenance?: MaintenanceTicket[];
  invoices?: Invoice[];
  bulletins?: BulletinVersement[];
}

type ArchiveTab =
  | 'all'
  | 'tenants'
  | 'owners'
  | 'properties'
  | 'buildings'
  | 'units'
  | 'contracts'
  | 'payments'
  | 'disbursements'
  | 'inspections'
  | 'bulletins';

interface UnifiedRecord {
  id: string;
  tab: ArchiveTab;
  type: string;
  ref: string;
  nom: string;
  montant?: number;
  date: string;
  statut: string;
  raw: any;
}

const TAB_CONFIG: Record<ArchiveTab, { label: string; icon: any; color: string }> = {
  all: { label: 'Tout', icon: Archive, color: 'text-[#C9A96E]' },
  tenants: { label: 'Locataires', icon: User, color: 'text-purple-400' },
  owners: { label: 'Propriétaires', icon: Users, color: 'text-blue-400' },
  properties: { label: 'Biens', icon: Building2, color: 'text-emerald-400' },
  buildings: { label: 'Immeubles', icon: Home, color: 'text-cyan-400' },
  units: { label: 'Espaces', icon: Layers, color: 'text-teal-400' },
  contracts: { label: 'Contrats', icon: FileSignature, color: 'text-amber-400' },
  payments: { label: 'Paiements', icon: WalletCards, color: 'text-[#C9A96E]' },
  disbursements: { label: 'Décaissements', icon: TrendingUp, color: 'text-sky-400' },
  inspections: { label: 'États des Lieux', icon: ClipboardList, color: 'text-orange-400' },
  bulletins: { label: 'Bulletins', icon: FileText, color: 'text-sky-400' },
};

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  currentUser,
  tenants = [],
  owners = [],
  properties = [],
  buildings = [],
  units = [],
  contracts = [],
  payments = [],
  disbursements = [],
  inspections = [],
  maintenance = [],
  invoices = [],
  bulletins = [],
}) => {
  const [activeTab, setActiveTab] = useState<ArchiveTab>('all');
  const [search, setSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<UnifiedRecord | null>(null);

  // ============================================================
  // UNIFICATION : TOUT dans une seule liste
  // ============================================================
  const allRecords: UnifiedRecord[] = useMemo(() => {
    const records: UnifiedRecord[] = [];

    tenants.forEach((t) => records.push({
      id: t.id, tab: 'tenants', type: 'Locataire',
      ref: t.ref || t.id.slice(0, 8),
      nom: `${t.prenom} ${t.nom}`,
      montant: t.loyerMensuel,
      date: t.dateEntree,
      statut: t.dateSortie ? 'Sorti' : t.statut,
      raw: t,
    }));

    owners.forEach((o) => records.push({
      id: o.id, tab: 'owners', type: 'Propriétaire',
      ref: o.ref || o.id.slice(0, 8),
      nom: `${o.prenom} ${o.nom}`,
      montant: o.totalLoyersMensuels,
      date: o.dateMandat || '',
      statut: o.statut || 'Actif',
      raw: o,
    }));

    properties.forEach((p) => records.push({
      id: p.id, tab: 'properties', type: 'Bien',
      ref: p.ref, nom: p.nom,
      montant: p.loyerBase,
      date: p.dateCreation || '',
      statut: p.statut,
      raw: p,
    }));

    buildings.forEach((b) => records.push({
      id: b.id, tab: 'buildings', type: 'Immeuble',
      ref: b.id.slice(0, 8), nom: b.nom,
      montant: b.loyerTotalMensuel,
      date: b.dateCreation || '',
      statut: b.statut,
      raw: b,
    }));

    units.forEach((u) => records.push({
      id: u.id, tab: 'units', type: 'Espace',
      ref: u.id.slice(0, 8), nom: u.nom,
      montant: u.loyerBase,
      date: u.dateCreation || '',
      statut: u.statut,
      raw: u,
    }));

    contracts.forEach((c) => records.push({
      id: c.id, tab: 'contracts', type: 'Contrat',
      ref: c.ref, nom: `${c.locataireNom} — ${c.bienNom}`,
      montant: c.loyerBase,
      date: c.dateDebut,
      statut: c.statut,
      raw: c,
    }));

    payments.forEach((p) => records.push({
      id: p.id, tab: 'payments', type: 'Paiement',
      ref: p.quittanceNumero, nom: p.locataireNom,
      montant: p.montantPaye,
      date: p.datePaiement,
      statut: p.statut,
      raw: p,
    }));

    disbursements.forEach((d) => records.push({
      id: d.id, tab: 'disbursements', type: 'Décaissement',
      ref: d.ref, nom: d.proprietaireNom,
      montant: d.montantNetPaye,
      date: d.dateReglement || '',
      statut: d.statut,
      raw: d,
    }));

    inspections.forEach((i) => records.push({
      id: i.id, tab: 'inspections', type: 'État des Lieux',
      ref: i.ref || i.id.slice(0, 8),
      nom: `${i.locataireNom} — ${i.bienNom}`,
      date: i.date,
      statut: i.statut,
      raw: i,
    }));

    bulletins.forEach((b) => records.push({
      id: b.id, tab: 'bulletins', type: 'Bulletin',
      ref: b.reference, nom: b.proprietaireNom || '',
      montant: b.netAReverser,
      date: b.createdAt || '',
      statut: b.statut,
      raw: b,
    }));

    return records;
  }, [tenants, owners, properties, buildings, units, contracts, payments, disbursements, inspections, bulletins]);

  // Filtres
  const filtered = useMemo(() => {
    let list = allRecords;
    if (activeTab !== 'all') list = list.filter((r) => r.tab === activeTab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.nom.toLowerCase().includes(q) ||
        r.ref.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [allRecords, activeTab, search]);

  // Compteurs par onglet
  const counts: Record<ArchiveTab, number> = useMemo(() => {
    const c: any = { all: allRecords.length };
    (Object.keys(TAB_CONFIG) as ArchiveTab[]).forEach((t) => {
      c[t] = t === 'all' ? allRecords.length : allRecords.filter((r) => r.tab === t).length;
    });
    return c;
  }, [allRecords]);

  const handleExportCSV = () => {
    const headers = ['Type', 'Référence', 'Nom', 'Montant', 'Date', 'Statut'];
    const rows = filtered.map((r) => [r.type, r.ref, r.nom, r.montant || 0, r.date, r.statut]);
    exportToCSV(`Archives_${activeTab}_${Date.now()}`, rows, headers);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#C9A96E]/15 text-[#C9A96E] flex items-center justify-center">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <div className="text-base font-bold text-white">Archives & Historique Complet</div>
            <div className="text-xs text-[#A8B4C4] mt-0.5">
              {allRecords.length} élément(s) · Toutes les données de l'agence
            </div>
          </div>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-3.5 py-2 rounded-xl bg-[#1E2E45] hover:bg-[#2A3F5C] border border-[#C9A96E]/30 text-xs font-semibold text-[#E8D5B0] transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exporter CSV</span>
        </button>
      </div>

      {/* Onglets */}
      <div className="flex items-center gap-2 flex-wrap p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/15">
        {(Object.keys(TAB_CONFIG) as ArchiveTab[]).map((t) => {
          const cfg = TAB_CONFIG[t];
          const Icon = cfg.icon;
          return (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === t
                  ? 'bg-[#C9A96E] text-[#0F1B2D] font-bold'
                  : 'bg-[#1E2E45] text-[#A8B4C4] hover:text-white'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{cfg.label} ({counts[t] || 0})</span>
            </button>
          );
        })}
      </div>

      {/* Recherche */}
      <div className="p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/15">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#6B7C94] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par nom, référence, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 text-xs text-white focus:outline-none focus:border-[#C9A96E]"
          />
        </div>
      </div>

      {/* Tableau */}
      <div className="rounded-2xl bg-[#162133] border border-[#C9A96E]/20 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-[#1E2E45]/80 text-[#A8B4C4] font-semibold uppercase tracking-wider text-[10px] border-b border-[#C9A96E]/20">
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-3">Référence</th>
                <th className="py-3 px-3">Nom / Description</th>
                <th className="py-3 px-3 text-right">Montant</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3 text-center">Statut</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9A96E]/10">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B7C94]">
                    <Archive className="w-8 h-8 mx-auto text-[#6B7C94]/50 mb-2" />
                    <p className="text-xs font-semibold text-white">Aucun élément</p>
                    <p className="text-[11px] text-[#6B7C94] mt-1">Modifiez vos filtres.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const cfg = TAB_CONFIG[r.tab];
                  return (
                    <tr key={`${r.tab}-${r.id}`} className="hover:bg-[#1E2E45]/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${cfg.color}`}>
                          {r.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[#C9A96E] text-[11px]">{r.ref || '—'}</td>
                      <td className="py-3 px-3 font-bold text-white truncate max-w-[250px]">{r.nom}</td>
                      <td className="py-3 px-3 text-right font-mono text-[#E8D5B0]">
                        {r.montant ? `${formatNumber(r.montant)} F` : '—'}
                      </td>
                      <td className="py-3 px-3 text-[#A8B4C4]">
                        {r.date ? formatDate(r.date) : '—'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1E2E45] text-[#A8B4C4] font-semibold">
                          {r.statut || '—'}
                        </span>
                      </td>
                                            <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedRecord(r)}
                            className="px-2.5 py-1 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-[#C9A96E] font-medium text-[11px] border border-[#C9A96E]/20 transition-all flex items-center gap-1 cursor-pointer"
                            title="Voir les détails"
                          >
                            <Eye className="w-3 h-3" /> Voir
                          </button>
                          <button
                            onClick={() => {
                              const dataStr = JSON.stringify(r.raw, null, 2);
                              const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${r.type}-${r.ref || r.id}-${new Date().toISOString().split('T')[0]}.json`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#1E2E45] hover:bg-emerald-500/20 text-emerald-400 font-medium text-[11px] border border-emerald-500/20 transition-all flex items-center gap-1 cursor-pointer"
                            title="Télécharger (JSON)"
                          >
                            <Download className="w-3 h-3" /> Télécharger
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Modal détail */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
                    <div className="bg-[#162133] border border-[#C9A96E]/40 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col print-container">
            <div className="p-4 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80 sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                {(() => {
                  const cfg = TAB_CONFIG[selectedRecord.tab];
                  const Icon = cfg.icon;
                  return <Icon className={`w-5 h-5 ${cfg.color}`} />;
                })()}
                <div>
                  <h3 className="font-bold text-white text-sm">{selectedRecord.type}</h3>
                  <p className="text-[10px] text-[#A8B4C4] font-mono">
                    {selectedRecord.ref} · {selectedRecord.statut}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-lg text-[#A8B4C4] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                <div className="p-3 bg-[#1E2E45]/40 rounded-xl border border-[#C9A96E]/10">
                  <div className="text-[10px] text-[#6B7C94] uppercase font-bold">Nom / Description</div>
                  <div className="text-white font-bold mt-0.5">{selectedRecord.nom}</div>
                </div>
                <div className="p-3 bg-[#1E2E45]/40 rounded-xl border border-[#C9A96E]/10">
                  <div className="text-[10px] text-[#6B7C94] uppercase font-bold">Date</div>
                  <div className="text-white font-bold mt-0.5">
                    {selectedRecord.date ? formatDate(selectedRecord.date) : '—'}
                  </div>
                </div>
                {selectedRecord.montant !== undefined && selectedRecord.montant > 0 && (
                  <div className="p-3 bg-[#C9A96E]/10 rounded-xl border border-[#C9A96E]/30 col-span-2">
                    <div className="text-[10px] text-[#C9A96E] uppercase font-bold">Montant</div>
                    <div className="text-[#E8D5B0] font-bold font-mono text-lg mt-0.5">
                      {formatCurrency(selectedRecord.montant)}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#C9A96E]" />
                  Données complètes
                </div>
                <div className="p-4 bg-[#0F1B2D] rounded-xl border border-white/5 space-y-1.5 text-xs max-h-[400px] overflow-y-auto">
                  {Object.entries(selectedRecord.raw || {})
                    .filter(([_, v]) => v !== null && v !== undefined && v !== '')
                    .map(([k, v]) => {
                      let displayVal: string;
                      if (typeof v === 'object') displayVal = JSON.stringify(v);
                      else if (typeof v === 'boolean') displayVal = v ? 'Oui' : 'Non';
                      else displayVal = String(v);

                      return (
                        <div key={k} className="flex justify-between items-start gap-4 py-1.5 border-b border-white/5">
                          <span className="text-[#6B7C94] font-mono text-[10px] uppercase flex-shrink-0">
                            {k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                          </span>
                          <span className="text-white text-right truncate max-w-[320px]" title={displayVal}>
                            {displayVal}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

                       <div className="p-4 border-t border-[#C9A96E]/20 bg-[#1E2E45]/40 flex justify-end gap-2 no-print">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 rounded-xl bg-[#0F1B2D] text-[#A8B4C4] hover:text-white text-xs font-semibold cursor-pointer"
              >
                Fermer
              </button>
                            <button
                onClick={() => {
                  if (!selectedRecord) return;
                  const w = window.open('', '_blank');
                  if (!w) return;
                  const html = `
                    <html>
                      <head>
                        <title>Archive ${selectedRecord.ref}</title>
                        <style>
                          body { font-family: Arial, sans-serif; padding: 40px; color: #000; }
                          h1 { color: #0F1B2D; border-bottom: 2px solid #C9A96E; padding-bottom: 10px; }
                          .field { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                          .field .label { color: #666; font-size: 12px; text-transform: uppercase; }
                          .field .value { color: #000; font-weight: 600; text-align: right; max-width: 60%; word-break: break-word; }
                          .header { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; color: #666; }
                        </style>
                      </head>
                      <body>
                        <div class="header">
                          <span>FITAL-IMMO · Archives & Historique</span>
                          <span>${new Date().toLocaleDateString('fr-FR')}</span>
                        </div>
                        <h1>${selectedRecord.type} · ${selectedRecord.ref || ''}</h1>
                        <div class="field"><span class="label">Nom</span><span class="value">${selectedRecord.nom || '—'}</span></div>
                        <div class="field"><span class="label">Statut</span><span class="value">${selectedRecord.statut || '—'}</span></div>
                        <div class="field"><span class="label">Date</span><span class="value">${selectedRecord.date || '—'}</span></div>
                        ${selectedRecord.montant ? `<div class="field"><span class="label">Montant</span><span class="value">${selectedRecord.montant.toLocaleString('fr-FR')} FCFA</span></div>` : ''}
                        <h2 style="margin-top: 30px; color: #0F1B2D;">Données complètes</h2>
                                               ${Object.entries(selectedRecord.raw || {})
                          .filter(([_, v]) => v !== null && v !== undefined && v !== '')
                          .filter(([k]) => {
                            // Exclure les champs techniques/UUIDs
                            const excluded = [
                              'id', 'agencyId', 'locataireId', 'proprietaireId', 'bienId',
                              'createdById', 'createdByRole', 'auteurId', 'caissierId',
                              'validatedBy', 'valideParId', 'referencePaiementInitial',
                              'montantInitialDu', 'dateHeurePaiement', 'createdAt',
                              'updatedAt', 'metadata', 'proof_url', 'justificatifUrl',
                            ];
                            if (excluded.includes(k)) return false;
                            // Exclure les champs dont la valeur est un UUID
                            const v = (selectedRecord.raw || {})[k];
                            if (typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) return false;
                            return true;
                          })
                          .map(([k, v]) => {
                            const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
                            const label = k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
                            return `<div class="field"><span class="label">${label}</span><span class="value">${val}</span></div>`;
                          })
                          .join('')}
                        <p style="margin-top: 40px; font-size: 11px; color: #999; text-align: center;">
                          Document généré automatiquement par FITAL-IMMO le ${new Date().toLocaleString('fr-FR')}
                        </p>
                        <script>
                          window.onload = () => { window.print(); };
                        </script>
                      </body>
                    </html>
                  `;
                  w.document.write(html);
                  w.document.close();
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer / PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};