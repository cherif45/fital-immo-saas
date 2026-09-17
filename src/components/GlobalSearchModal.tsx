import React, { useState, useEffect } from 'react';
import {
  Search,
  Building2,
  Users,
  UserCheck,
  CreditCard,
  FileCheck2,
  Receipt,
  Wrench,
  ArrowRight,
  X
} from 'lucide-react';
import {
  ActiveTab,
  Property,
  Owner,
  Tenant,
  LeaseContract,
  Payment,
  Invoice,
  MaintenanceTicket
} from '../types';
import { formatCurrency } from '../lib/utils';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  owners: Owner[];
  tenants: Tenant[];
  contracts: LeaseContract[];
  payments: Payment[];
  invoices: Invoice[];
  maintenance: MaintenanceTicket[];
  onNavigate: (tab: ActiveTab, entityId?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  properties,
  owners,
  tenants,
  contracts,
  payments,
  invoices,
  maintenance,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const matchedTenants = q
    ? tenants.filter(
        (t) =>
          t.nom.toLowerCase().includes(q) ||
          t.prenom.toLowerCase().includes(q) ||
          t.telephone.includes(q) ||
          t.email.toLowerCase().includes(q) ||
          t.bienNom.toLowerCase().includes(q)
      )
    : [];

  const matchedProperties = q
    ? properties.filter(
        (p) =>
          p.nom.toLowerCase().includes(q) ||
          p.ref.toLowerCase().includes(q) ||
          p.adresse.toLowerCase().includes(q) ||
          p.quartier.toLowerCase().includes(q) ||
          p.proprietaireNom.toLowerCase().includes(q)
      )
    : [];

  const matchedOwners = q
    ? owners.filter(
        (o) =>
          o.nom.toLowerCase().includes(q) ||
          o.prenom.toLowerCase().includes(q) ||
          o.telephone.includes(q) ||
          o.email.toLowerCase().includes(q) ||
          o.mandatGerance.toLowerCase().includes(q)
      )
    : [];

  const matchedPayments = q
    ? payments.filter(
        (p) =>
          p.quittanceNumero.toLowerCase().includes(q) ||
          p.ref.toLowerCase().includes(q) ||
          p.locataireNom.toLowerCase().includes(q) ||
          p.bienNom.toLowerCase().includes(q) ||
          p.periode.toLowerCase().includes(q)
      )
    : [];

  const matchedContracts = q
    ? contracts.filter(
        (c) =>
          c.ref.toLowerCase().includes(q) ||
          c.locataireNom.toLowerCase().includes(q) ||
          c.bienNom.toLowerCase().includes(q)
      )
    : [];

  const totalMatches =
    matchedTenants.length +
    matchedProperties.length +
    matchedOwners.length +
    matchedPayments.length +
    matchedContracts.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-8 sm:pt-20 p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#162133] border border-[#C9A96E]/40 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Search Input Box */}
        <div className="p-4 border-b border-[#C9A96E]/20 flex items-center gap-3 bg-[#1E2E45]/80">
          <Search className="w-5 h-5 text-[#C9A96E]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Recherche globale : locataire, bien, propriétaire, quittance, contrat..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] bg-[#162133] px-2 py-1 rounded text-slate-400 font-mono border border-white/5">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!query ? (
            <div className="py-12 text-center text-xs text-[#A8B4C4] space-y-2">
              <p>Tapez un mot-clé pour lancer la recherche multi-tables instantanée.</p>
              <div className="flex items-center justify-center gap-2 text-[11px] text-[#6B7C94]">
                <span>Ex : "Almadies"</span>
                <span>•</span>
                <span>"Mamadou"</span>
                <span>•</span>
                <span>"QUI-2026"</span>
                <span>•</span>
                <span>"BAIL-"</span>
              </div>
            </div>
          ) : totalMatches === 0 ? (
            <div className="py-12 text-center text-xs text-[#A8B4C4]">
              Aucun résultat trouvé pour "{query}".
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              {/* Tenants */}
              {matchedTenants.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-[#C9A96E] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Locataires ({matchedTenants.length})</span>
                  </div>
                  <div className="space-y-1">
                    {matchedTenants.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          onNavigate('tenants', t.id);
                          onClose();
                        }}
                        className="p-2.5 rounded-xl bg-[#1E2E45]/50 hover:bg-[#1E2E45] border border-[#C9A96E]/10 hover:border-[#C9A96E]/40 flex items-center justify-between cursor-pointer transition-all"
                      >
                        <div>
                          <div className="font-bold text-white">
                            {t.prenom} {t.nom}
                          </div>
                          <div className="text-[11px] text-[#A8B4C4]">
                            {t.bienNom} · Loyer : {formatCurrency(t.loyerMensuel)}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#6B7C94]" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Properties */}
              {matchedProperties.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-[#C9A96E] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Biens Immobiliers ({matchedProperties.length})</span>
                  </div>
                  <div className="space-y-1">
                    {matchedProperties.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          onNavigate('properties', p.id);
                          onClose();
                        }}
                        className="p-2.5 rounded-xl bg-[#1E2E45]/50 hover:bg-[#1E2E45] border border-[#C9A96E]/10 hover:border-[#C9A96E]/40 flex items-center justify-between cursor-pointer transition-all"
                      >
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{p.nom}</span>
                            <span className="text-[10px] text-[#C9A96E] font-mono">{p.ref}</span>
                          </div>
                          <div className="text-[11px] text-[#A8B4C4]">
                            {p.adresse}, {p.quartier} · Bailleur : {p.proprietaireNom}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#6B7C94]" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Owners */}
              {matchedOwners.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-[#C9A96E] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Propriétaires Bailleurs ({matchedOwners.length})</span>
                  </div>
                  <div className="space-y-1">
                    {matchedOwners.map((o) => (
                      <div
                        key={o.id}
                        onClick={() => {
                          onNavigate('owners', o.id);
                          onClose();
                        }}
                        className="p-2.5 rounded-xl bg-[#1E2E45]/50 hover:bg-[#1E2E45] border border-[#C9A96E]/10 hover:border-[#C9A96E]/40 flex items-center justify-between cursor-pointer transition-all"
                      >
                        <div>
                          <div className="font-bold text-white">
                            {o.prenom} {o.nom}
                          </div>
                          <div className="text-[11px] text-[#A8B4C4]">
                            {o.mandatGerance} · Tél : {o.telephone}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#6B7C94]" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payments */}
              {matchedPayments.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-[#C9A96E] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Paiements & Quittances ({matchedPayments.length})</span>
                  </div>
                  <div className="space-y-1">
                    {matchedPayments.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          onNavigate('payments', p.id);
                          onClose();
                        }}
                        className="p-2.5 rounded-xl bg-[#1E2E45]/50 hover:bg-[#1E2E45] border border-[#C9A96E]/10 hover:border-[#C9A96E]/40 flex items-center justify-between cursor-pointer transition-all"
                      >
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{p.quittanceNumero}</span>
                            <span className="text-[10px] text-emerald-400 font-mono">
                              {formatCurrency(p.montantPaye)}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#A8B4C4]">
                            {p.locataireNom} · {p.periode} ({p.bienNom})
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#6B7C94]" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contracts */}
              {matchedContracts.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-[#C9A96E] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>Contrats de Bail ({matchedContracts.length})</span>
                  </div>
                  <div className="space-y-1">
                    {matchedContracts.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          onNavigate('contracts', c.id);
                          onClose();
                        }}
                        className="p-2.5 rounded-xl bg-[#1E2E45]/50 hover:bg-[#1E2E45] border border-[#C9A96E]/10 hover:border-[#C9A96E]/40 flex items-center justify-between cursor-pointer transition-all"
                      >
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{c.ref}</span>
                            <span className="text-[10px] text-[#C9A96E]">{c.statut}</span>
                          </div>
                          <div className="text-[11px] text-[#A8B4C4]">
                            {c.locataireNom} — {c.bienNom}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#6B7C94]" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
