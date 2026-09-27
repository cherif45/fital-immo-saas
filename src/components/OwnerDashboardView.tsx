import React, { useState } from 'react';
import { 
  Owner, 
  Property, 
  Tenant, 
  Payment, 
  MaintenanceTicket, 
  OwnerDisbursement,
  CashVoucher,
  UserAccount
} from '../types';
import { formatCurrencyFCFA } from '../lib/calculations/financial';
import { 
  Building2, 
  Home, 
  Users, 
  Receipt, 
  Wrench, 
  CheckCircle, 
  AlertTriangle, 
  ArrowUpRight, 
  FileText, 
  Download, 
  ShieldCheck, 
  Phone, 
  Mail, 
  DollarSign, 
  Clock, 
  Calendar,
  Lock,
  Printer
} from 'lucide-react';
import { OwnerMandateModal } from './OwnerMandateModal';

interface OwnerDashboardViewProps {
  currentUser: UserAccount;
  owner: Owner;
  properties: Property[];
  tenants: Tenant[];
  payments: Payment[];
  maintenance: MaintenanceTicket[];
  disbursements: OwnerDisbursement[];
  cashVouchers: CashVoucher[];
  onOpenReceipt: (payment: Payment) => void;
  onOpenOwnerSlip: (owner: Owner) => void;
}

export function OwnerDashboardView({
  currentUser,
  owner,
  properties,
  tenants,
  payments,
  maintenance,
  disbursements,
  cashVouchers,
  onOpenReceipt,
  onOpenOwnerSlip,
}: OwnerDashboardViewProps) {
  const [isMandateModalOpen, setIsMandateModalOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<
    'overview' | 'properties' | 'tenants' | 'rents' | 'repairs' | 'disbursements' | 'documents'
  >('overview');

  // STRICT FILTERING: Only items belonging to THIS owner
  const myProperties = properties.filter((p) => p.proprietaireId === owner.id);
  const myPropertyIds = myProperties.map((p) => p.id);
    const myTenants = tenants.filter((t) => 
    (myPropertyIds.includes(t.bienId) || t.proprietaireId === owner.id) 
    && !t.dateSortie
  );
  const myPayments = payments.filter((p) => p.proprietaireId === owner.id || myPropertyIds.includes(p.bienId));
  const myMaintenance = maintenance.filter((m) => myPropertyIds.includes(m.bienId));
  const myDisbursements = disbursements.filter((d) => d.proprietaireId === owner.id);
  const myCashVouchers = cashVouchers.filter((v) => v.proprietaireId === owner.id);

  // Financial calculations for this owner
  const totalBiensCount = myProperties.length;
  const occupiedBiensCount = myProperties.filter((p) => p.statut === 'Occupé').length;
  const vacantBiensCount = myProperties.filter((p) => p.statut === 'Vacant').length;
  const occupancyRate = totalBiensCount > 0 ? Math.round((occupiedBiensCount / totalBiensCount) * 100) : 0;

  const loyersEncaisses = myPayments
    .filter((p) => p.statut === 'Payé' || p.statut === 'Partiel')
    .reduce((sum, p) => sum + p.montantPaye, 0);

  const loyersImpayes = myTenants.reduce((sum, t) => sum + (t.arrieresCumules || 0), 0);

  const commissionTaux = owner.tauxCommission || 10;
  const commissionsDeduites = Math.round(loyersEncaisses * (commissionTaux / 100));

  const totalTravauxDeduits = myMaintenance
    .filter((m) => m.statut === 'Terminé' || m.statut === 'En cours')
    .reduce((sum, m) => sum + (m.coutEstime || 0), 0);

  const totalDepenses = myDisbursements.reduce((sum, d) => sum + (d.montant || 0), 0);

  const montantNetReversable = Math.max(0, loyersEncaisses - commissionsDeduites - totalTravauxDeduits);

  return (
    <div className="space-y-6">
      {/* Security Banner & Owner Profile Card */}
      <div className="bg-gradient-to-r from-[#111C2E] via-[#16243A] to-[#111C2E] p-6 rounded-2xl border border-blue-500/20 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={currentUser.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'}
            alt={owner.nom}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-[#C9A96E]/40 shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Espace Bailleur Exclusif
              </span>
              <span className="text-xs text-slate-400 font-mono">Mandat : {owner.mandatGerance || 'MANDAT-FITAL'}</span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">
              Bienvenue, {owner.prenom} {owner.nom}
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-3 mt-1">
              <span>Banque : <strong className="text-slate-200">{owner.banque}</strong></span>
              <span>•</span>
              <span>Compte : <strong className="text-slate-200 font-mono">{owner.compteBancaire}</strong></span>
              <span>•</span>
              <span>Commission Agence : <strong className="text-[#E8D5B0]">{commissionTaux}%</strong></span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsMandateModalOpen(true)}
            className="px-3.5 py-2.5 bg-[#1E2E45] hover:bg-[#2A3F5C] border border-[#C9A96E]/30 text-[#E8D5B0] font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-[#C9A96E]" />
            <span>Mon Mandat (PDF)</span>
          </button>
          <button
            onClick={() => onOpenOwnerSlip(owner)}
            className="px-4 py-2.5 bg-[#C9A96E] hover:bg-[#D8BA80] text-[#0A111D] font-bold rounded-xl text-xs transition-all shadow-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Bulletin de Versement (PDF)</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap border-b border-white/10 gap-2 sm:gap-6">
        {[
          { id: 'overview', label: 'Vue d’Ensemble', icon: Building2 },
          { id: 'properties', label: `Mes Biens (${myProperties.length})`, icon: Home },
          { id: 'tenants', label: `Mes Locataires (${myTenants.length})`, icon: Users },
          { id: 'rents', label: 'Loyers & Encaissements', icon: Receipt },
          { id: 'repairs', label: `Travaux & Dépenses (${myMaintenance.length})`, icon: Wrench },
          { id: 'disbursements', label: 'Mes Reversements', icon: DollarSign },
          { id: 'documents', label: 'Mes Documents & Mandat', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`pb-3 px-1 text-sm font-semibold transition-all relative flex items-center gap-2 cursor-pointer ${
                isActive ? 'text-[#C9A96E]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C9A96E] rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* VIEW: Overview */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Financial KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Montant Net Reversé */}
            <div className="bg-[#111C2E] p-5 rounded-2xl border border-emerald-500/20 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Montant Net Reversable</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-white">{formatCurrencyFCFA(montantNetReversable)}</div>
                <div className="text-xs text-slate-400 mt-1">Après déduction des 10% de gérance</div>
              </div>
            </div>

            {/* Loyers Encaissés */}
            <div className="bg-[#111C2E] p-5 rounded-2xl border border-[#C9A96E]/20 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#E8D5B0] uppercase tracking-wider">Loyers Bruts Encaissés</span>
                <div className="w-8 h-8 rounded-lg bg-[#C9A96E]/10 text-[#C9A96E] flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-white">{formatCurrencyFCFA(loyersEncaisses)}</div>
                <div className="text-xs text-slate-400 mt-1">Total recouvré pour votre compte</div>
              </div>
            </div>

            {/* Impayés */}
            <div className="bg-[#111C2E] p-5 rounded-2xl border border-rose-500/20 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Arriérés / Retards</span>
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-rose-300">{formatCurrencyFCFA(loyersImpayes)}</div>
                <div className="text-xs text-slate-400 mt-1">Procédure de recouvrement engagée</div>
              </div>
            </div>

            {/* Occupation du Parc */}
            <div className="bg-[#111C2E] p-5 rounded-2xl border border-blue-500/20 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Taux d’Occupation</span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Home className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-white">{occupancyRate}%</div>
                <div className="text-xs text-slate-400 mt-1">
                  {occupiedBiensCount} occupés / {vacantBiensCount} vacants sur {totalBiensCount} biens
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown of deductions (Commissions & Works) */}
          <div className="bg-[#111C2E] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-white">Décompte Financier & Déductions Justifiées</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-xs space-y-1">
                <span className="text-slate-400">Commissions de gérance ({commissionTaux}%) :</span>
                <div className="text-lg font-bold text-slate-200">{formatCurrencyFCFA(commissionsDeduites)}</div>
                <p className="text-[11px] text-slate-500">Honoraires contractuels de gestion FITAL-IMMO</p>
              </div>

              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-xs space-y-1">
                <span className="text-slate-400">Travaux & Dépenses Déduites :</span>
                <div className="text-lg font-bold text-amber-400">{formatCurrencyFCFA(totalTravauxDeduits)}</div>
                <p className="text-[11px] text-slate-500">Factures artisans et réparations validées</p>
              </div>

              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs space-y-1">
                <span className="text-emerald-400 font-semibold">Net Viré sur Votre Compte :</span>
                <div className="text-lg font-bold text-emerald-300">{formatCurrencyFCFA(montantNetReversable)}</div>
                <p className="text-[11px] text-emerald-400/80">Reversé par Virement / Bon de caisse</p>
              </div>
            </div>
          </div>

          {/* Quick List of Properties */}
          <div className="bg-[#111C2E] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Vos Propriétés & Statut d'Occupation</h2>
              <button onClick={() => setActiveSubTab('properties')} className="text-xs text-[#C9A96E] hover:underline">
                Voir toutes les fiches ({myProperties.length}) →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myProperties.length === 0 ? (
                <div className="col-span-full py-10 text-center text-slate-500 text-xs">
                  <Building2 className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p className="text-white font-medium">Aucun bien immobilier sous mandat</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Vos biens gérés par FITAL-IMMO apparaîtront ici dès leur enregistrement.</p>
                </div>
              ) : (
                myProperties.map((prop) => {
                                  const tenant = myTenants.find((t) => t.bienId === prop.id && !t.dateSortie);
                return (
                  <div key={prop.id} className="p-4 bg-[#0A111D] border border-white/5 rounded-xl space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-white text-sm">{prop.nom}</h4>
                        <p className="text-xs text-slate-400">{prop.quartier}, {prop.ville}</p>
                      </div>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                          prop.statut === 'Occupé'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {prop.statut}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-white/5 text-xs flex justify-between text-slate-300">
                      <span>Loyer mensuel :</span>
                      <strong className="text-[#E8D5B0]">{formatCurrencyFCFA(prop.loyerBase + prop.charges)}</strong>
                    </div>

                    {tenant && (
                      <div className="p-2 bg-white/5 rounded-lg text-[11px] text-slate-300">
                        Locataire : <strong className="text-white">{tenant.prenom} {tenant.nom}</strong>
                        <span className={`ml-2 font-bold ${tenant.statut === 'À jour' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ({tenant.statut})
                        </span>
                      </div>
                    )}
                  </div>
                );
              }))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: Properties */}
      {activeSubTab === 'properties' && (
        myProperties.length === 0 ? (
          <div className="bg-[#111C2E] rounded-2xl border border-white/5 p-12 text-center text-slate-500 text-xs">
            <Building2 className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="text-white font-medium text-sm">Aucun bien immobilier sous mandat</p>
            <p className="text-xs text-slate-400 mt-1">Vos biens gérés par l'agence FITAL-IMMO s'afficheront ici.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {myProperties.map((prop) => (
              <div key={prop.id} className="bg-[#111C2E] rounded-2xl border border-white/5 p-5 space-y-4">
                <img
                  src={prop.avatar || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80'}
                  alt={prop.nom}
                  className="w-full h-40 object-cover rounded-xl border border-white/10"
                />
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[#C9A96E]">{prop.ref}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      prop.statut === 'Occupé' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {prop.statut}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">{prop.nom}</h3>
                  <p className="text-xs text-slate-400">{prop.adresse}, {prop.quartier}</p>
                </div>

                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Type de bien :</span>
                    <span className="text-white font-medium">{prop.type} ({prop.superficie} m²)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Loyer de base :</span>
                    <span className="text-white font-medium">{formatCurrencyFCFA(prop.loyerBase)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Charges locatives :</span>
                    <span className="text-white font-medium">{formatCurrencyFCFA(prop.charges)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* VIEW: Tenants */}
      {activeSubTab === 'tenants' && (
        <div className="bg-[#111C2E] rounded-2xl border border-white/5 p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-white">Locataires de vos Biens</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="py-3 px-3">Locataire</th>
                  <th className="py-3 px-3">Bien Loué</th>
                  <th className="py-3 px-3">Loyer Mensuel</th>
                  <th className="py-3 px-3">Statut Loyer</th>
                  <th className="py-3 px-3">Arriérés</th>
                  <th className="py-3 px-3">Entrée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {myTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3 font-bold text-white">
                      {t.prenom} {t.nom}
                      <div className="text-[11px] text-slate-400 font-normal">{t.telephone}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{t.bienNom}</td>
                    <td className="py-3 px-3 font-bold text-[#E8D5B0]">{formatCurrencyFCFA(t.loyerMensuel)}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        t.statut === 'À jour' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {t.statut}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-rose-400">
                      {t.arrieresCumules > 0 ? formatCurrencyFCFA(t.arrieresCumules) : '0 FCFA'}
                    </td>
                    <td className="py-3 px-3 text-slate-400">{t.dateEntree}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: Rents */}
      {activeSubTab === 'rents' && (
        <div className="bg-[#111C2E] rounded-2xl border border-white/5 p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-white">Historique des Loyers Encaissés pour votre Compte</h2>
          <div className="divide-y divide-white/5">
            {myPayments.map((pay) => (
              <div key={pay.id} className="py-3.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white text-sm">{pay.locataireNom} — {pay.bienNom}</div>
                  <div className="text-slate-400 text-xs mt-0.5">
                    Période : <strong className="text-slate-200">{pay.periode}</strong> • Quittance : <strong className="font-mono text-[#C9A96E]">{pay.quittanceNumero}</strong>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <div className="font-bold text-white text-sm">{formatCurrencyFCFA(pay.montantPaye)}</div>
                    <span className="text-[10px] text-emerald-400 font-semibold">{pay.modePaiement}</span>
                  </div>
                  <button
                    onClick={() => onOpenReceipt(pay)}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Voir Quittance
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: Disbursements / Reversements */}
      {activeSubTab === 'disbursements' && (
        <div className="bg-[#111C2E] rounded-2xl border border-white/5 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Bons de Caisse & Bulletins de Versement</h2>
            <button
              onClick={() => onOpenOwnerSlip(owner)}
              className="px-3 py-1.5 bg-[#C9A96E] text-[#0A111D] font-bold rounded-lg text-xs"
            >
              Générer Décompte PDF
            </button>
          </div>

          <div className="space-y-3">
            {myCashVouchers.map((v) => (
              <div key={v.id} className="p-4 bg-[#0A111D] border border-white/5 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white text-sm">{v.numero} — Période {v.periode}</div>
                  <div className="text-slate-400 text-xs mt-1">
                    Loyers bruts : {formatCurrencyFCFA(v.loyersEncaisses)} | Commission : -{formatCurrencyFCFA(v.commissions)} | Travaux : -{formatCurrencyFCFA(v.travaux)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-emerald-400">{formatCurrencyFCFA(v.montantNet)}</div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">{v.statut}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: Documents & Mandat */}
      {activeSubTab === 'documents' && (
        <div className="bg-[#111C2E] rounded-2xl border border-white/5 p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-white">Documents Juridiques & Mandat de Gérance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#C9A96E]/20 text-[#E8D5B0] flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Mandat de Gérance Immobilière</h4>
                  <p className="text-xs text-slate-400">Réf : {owner.mandatGerance || 'MANDAT-FITAL-2024'}</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 pt-2">
                Contrat exclusif de gérance, taux de commission fixé à {commissionTaux}%, clause d'audit et reddition des comptes mensuelle.
              </p>
              <button
                onClick={() => setIsMandateModalOpen(true)}
                className="text-xs text-[#C9A96E] hover:underline font-semibold flex items-center gap-1 mt-2 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Télécharger / Imprimer le Mandat de Gérance (PDF)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Mandat de Gérance Exclusif */}
      {isMandateModalOpen && (
        <OwnerMandateModal
          owner={owner}
          properties={properties}
          onClose={() => setIsMandateModalOpen(false)}
        />
      )}
    </div>
  );
}
