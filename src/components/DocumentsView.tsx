import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  Receipt,
  FileSignature,
  ClipboardCheck,
  ShieldAlert,
  Users,
  Eye,
  CheckCircle2,
  FileCheck,
  X
} from 'lucide-react';
import {Payment, Owner, Tenant, LeaseContract, Property, UserAccount, AgencySettings } from '../types';
import { LeaseContractModal } from './LeaseContractModal';
import { OwnerMandateModal } from './OwnerMandateModal';
import { InspectionPrintModal } from './InspectionPrintModal';

interface DocumentsViewProps {
  payments: Payment[];
  owners: Owner[];
  tenants: Tenant[];
  contracts: LeaseContract[];
  properties: Property[];
  currentUser?: UserAccount;
  onOpenReceipt: (payment: Payment) => void;
  onOpenOwnerSlip: (owner: Owner) => void;
  settings?: AgencySettings;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  payments,
  owners,
  tenants,
  contracts,
  properties,
  currentUser,
  onOpenReceipt,
  onOpenOwnerSlip,
  settings
}) => {
  const role = currentUser?.role || 'ADMIN';
  const isProprietaire = role === 'PROPRIETAIRE';
  const isLocataire = role === 'LOCATAIRE';
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [dataNotice, setDataNotice] = useState<string | null>(null);

  const requireContract = () => {
    if (contracts.length === 0) {
      setDataNotice('Aucun contrat enregistré. Créez d\'abord un bail dans le module Contrats.');
      return false;
    }
    return true;
  };

  const requireOwner = () => {
    if (owners.length === 0) {
      setDataNotice('Aucun propriétaire enregistré. Ajoutez un bailleur dans le module Propriétaires.');
      return false;
    }
    return true;
  };
    const allDocumentTemplates = [
    {
      id: 'quittance',
      title: 'Quittance de Loyer & Reçu Officiel',
      category: 'Finances & Recouvrement',
      description: 'Document officiel avec décomposition des charges, taxes (TOM/TVA) et montant en lettres.',
      icon: Receipt,
      color: 'text-[#C9A96E]',
      action: () => {
        if (payments.length === 0) {
          setDataNotice('Aucun paiement enregistré. Encaissez un loyer pour générer une quittance.');
          return;
        }
        onOpenReceipt(payments[0]);
      }
    },
    {
      id: 'bulletin',
      title: 'Bulletin de Versement Propriétaire (P.18)',
      category: 'Gérance & Propriétaires',
      description: 'Décompte mensuel récapitulant les loyers recouvrés par bien, commission agence et net reversé.',
      icon: FileText,
      color: 'text-sky-400',
      action: () => {
        if (!requireOwner()) return;
        onOpenOwnerSlip(owners[0]);
      }
    },
    {
      id: 'mandat',
      title: 'Mandat Exclusif de Gérance (P.10-12)',
      category: 'Gérance & Mandats',
      description: 'Contrat officiel liant le propriétaire bailleur à l’agence FITAL-IMMO (pouvoirs, reddition, honoraires).',
      icon: FileCheck,
      color: 'text-[#C9A96E]',
      action: () => {
        if (!requireOwner()) return;
        setSelectedDoc('mandat');
      }
    },
    {
      id: 'bail',
      title: "Contrat de Bail d'Habitation Type (P.5 & 15)",
      category: 'Juridique & Baux',
      description: 'Modèle conforme droit OHADA / Code des Obligations sénégalais avec clause résolutoire et caution.',
      icon: FileSignature,
      color: 'text-emerald-400',
      action: () => {
        if (!requireContract()) return;
        setSelectedDoc('bail');
      }
    },
    {
      id: 'etat_lieux',
      title: "Procès-Verbal d'État des Lieux (P.6)",
      category: 'Technique & Inventaire',
      description: "Grille d'évaluation contradictoire entrée/sortie, chiffrage des dégradations et retenues sur caution.",
      icon: ClipboardCheck,
      color: 'text-purple-400',
      action: () => {
        if (tenants.length === 0) {
          setDataNotice('Aucun locataire enregistré. Créez un état des lieux depuis le module Inspections.');
          return;
        }
        setSelectedDoc('etat_lieux');
      }
    },
    {
      id: 'mise_demeure',
      title: 'Lettre de Mise en Demeure Juridique',
      category: 'Contentieux & Recouvrement',
      description: 'Sommation formelle de payer sous 8 jours francs avant saisine d’huissier et résiliation de bail.',
      icon: ShieldAlert,
      color: 'text-rose-400',
      action: () => setSelectedDoc('mise_demeure')
    },
       {
      id: 'fiche',
      title: 'Fiche de Renseignements Locataire (P.14)',
      category: 'Gestion Locative',
      description: 'Dossier de candidature et informations complètes: identité, employeur, garant et conjoint.',
      icon: Users,
      color: 'text-amber-400',
      action: () => setSelectedDoc('fiche')
    },
  ];

  // Filtrage par rôle
  const documentTemplates = (() => {
    if (isProprietaire) {
      // Propriétaire : mandat + bulletin + contrat + état des lieux + fiche
      return allDocumentTemplates.filter((d) =>
        ['mandat', 'bulletin', 'bail', 'etat_lieux', 'fiche'].includes(d.id)
      );
    }
    if (isLocataire) {
      // Locataire : quittance + état des lieux
      return allDocumentTemplates.filter((d) => ['quittance', 'etat_lieux'].includes(d.id));
    }
    return allDocumentTemplates; // Admin, Caissier, Gestionnaire, Agent voient tout
  })();

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#162133] border border-[#C9A96E]/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/15 text-[#C9A96E] flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Centre des Documents & Modèles Réglementaires</div>
            <div className="text-xs text-[#A8B4C4]">
              Modèles officiels d'actes immobiliers FITAL-IMMO conformes à la législation sénégalaise
            </div>
          </div>
        </div>
      </div>

      {dataNotice && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm flex items-start justify-between gap-3">
          <span>{dataNotice}</span>
          <button onClick={() => setDataNotice(null)} className="text-amber-400 hover:text-white shrink-0">✕</button>
        </div>
      )}

      {/* Grid of Document Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {documentTemplates.map((doc) => {
          const Icon = doc.icon;
          return (
            <div
              key={doc.id}
              className="p-5 rounded-2xl bg-[#162133] border border-[#C9A96E]/20 hover:border-[#C9A96E]/50 transition-all shadow-xl flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1E2E45] border border-[#C9A96E]/20 flex items-center justify-center">
                    <Icon className={`w-5 h-5 ${doc.color}`} />
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1E2E45] text-[#A8B4C4] font-medium border border-[#C9A96E]/10">
                    {doc.category}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mb-1 group-hover:text-[#C9A96E] transition-colors">
                  {doc.title}
                </h3>
                <p className="text-xs text-[#A8B4C4] leading-relaxed mb-4">
                  {doc.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[#C9A96E]/15 flex items-center justify-between">
                <span className="text-[11px] text-[#6B7C94] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Modèle légal
                </span>
                <button
                  onClick={doc.action}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Aperçu & Imprimer</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Contrat de Bail Type */}
      {selectedDoc === 'bail' && contracts[0] && (
        <LeaseContractModal
          contract={contracts[0]}
          settings={settings}
          onClose={() => setSelectedDoc(null)}
        />
      )}

      {/* Modal: Mandat de Gérance Type */}
      {selectedDoc === 'mandat' && owners[0] && (
        <OwnerMandateModal
          owner={owners[0]}
          agencySettings={settings}
          onClose={() => setSelectedDoc(null)}
        />
      )}

      {/* Modal: État des Lieux Type */}
      {selectedDoc === 'etat_lieux' && tenants[0] && (
        <InspectionPrintModal
          agencySettings={settings}
          inspection={{
            id: `edl-${tenants[0].id}`,
            ref: `EDL-${tenants[0].ref}`,
            bienId: tenants[0].bienId,
            bienNom: tenants[0].bienNom,
            locataireId: tenants[0].id,
            locataireNom: `${tenants[0].prenom} ${tenants[0].nom}`,
            type: 'Entrée',
            date: tenants[0].dateEntree,
            agentNom: 'Agent FITAL-IMMO',
            inspecteurNom: 'Agent FITAL-IMMO',
            etatGeneral: 'Bon état',
            remarques: '',
            statut: 'Validé',
            signe: true
          }}
          onClose={() => setSelectedDoc(null)}
        />
      )}

      {/* Modal: Fiche de Renseignements Locataire */}
      {selectedDoc === 'fiche' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-2xl my-8 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80 no-print">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Users className="w-5 h-5 text-[#C9A96E]" />
                <span>Fiche de Renseignements Candidat Locataire</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9A96E] to-[#A07840] text-[#0F1B2D] font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer / PDF</span>
                </button>
                <button onClick={() => setSelectedDoc(null)} className="p-1.5 rounded-lg text-[#A8B4C4] hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 bg-white text-neutral-900 rounded-b-3xl font-sans text-xs print-container leading-relaxed space-y-4">
              <div className="text-center border-b-2 border-neutral-900 pb-3">
                <div className="text-xs font-bold uppercase tracking-widest text-neutral-700">FITAL-IMMO SERVICES SARL</div>
                <h2 className="text-xl font-black uppercase text-neutral-900 mt-1">
                  FICHE DE RENSEIGNEMENTS LOCATAIRE
                </h2>
                <div className="text-[10px] text-neutral-500 font-semibold uppercase">
                  DOSSIER D'INSTRUCTION ET ATTESTATION DE SOLVABILITÉ
                </div>
              </div>

              <div className="space-y-3">
                <div className="font-bold uppercase text-[11px] text-neutral-900 border-b border-neutral-200 pb-1">
                  1. ÉTAT CIVIL DU CANDIDAT LOCATAIRE
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><strong>Nom & Prénoms :</strong> ................................................................</div>
                  <div><strong>Date & Lieu de naissance :</strong> ..................................................</div>
                  <div><strong>Numéro CNI / Passeport :</strong> ................................................</div>
                  <div><strong>Téléphone principal :</strong> .........................................................</div>
                  <div><strong>Adresse email :</strong> ................................................................</div>
                  <div><strong>Situation matrimoniale :</strong> Célibataire / Marié(e)</div>
                </div>

                <div className="font-bold uppercase text-[11px] text-neutral-900 border-b border-neutral-200 pb-1 pt-2">
                  2. SITUATION PROFESSIONNELLE & REVENUS
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><strong>Employeur / Entreprise :</strong> .................................................</div>
                  <div><strong>Poste / Profession :</strong> ........................................................</div>
                  <div><strong>Type de contrat (CDI / Indépendant) :</strong> ................................</div>
                  <div><strong>Revenu net mensuel moyen :</strong> ........................................... FCFA</div>
                </div>

                <div className="font-bold uppercase text-[11px] text-neutral-900 border-b border-neutral-200 pb-1 pt-2">
                  3. LOGEMENT SOUHAITÉ & GARANTIES
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><strong>Type de bien souhaité :</strong> Appartement / Villa / Studio</div>
                  <div><strong>Budget loyer maximum :</strong> ................................................. FCFA</div>
                  <div><strong>Caution disponible (2 mois) :</strong> Oui / Non</div>
                  <div><strong>Date d'entrée souhaitée :</strong> .................................................</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-8 mt-6 border-t-2 border-neutral-900">
                <div>
                  <div className="font-bold text-neutral-800">Signature du Candidat :</div>
                  <div className="h-16 border border-dashed border-neutral-400 rounded-lg mt-2 p-1">
                    <span className="text-[10px] text-neutral-400 italic">"Je certifie sur l'honneur l'exactitude des informations fournies"</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-neutral-800">Visa FITAL-IMMO :</div>
                  <div className="h-16 border border-dashed border-neutral-400 rounded-lg mt-2 p-1 flex items-center justify-center">
                    <span className="text-[10px] font-black text-amber-800 uppercase">★ DOSSIER REÇU & EN COURS D'ÉTUDE ★</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Mise en Demeure Juridique Spécifique */}
      {selectedDoc === 'mise_demeure' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-[#162133] border border-[#C9A96E]/30 rounded-3xl w-full max-w-2xl my-8 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#C9A96E]/20 flex items-center justify-between bg-[#1E2E45]/80 no-print">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <span>Lettre de Mise en Demeure Formelle (Avant Poursuites)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer / PDF</span>
                </button>
                <button onClick={() => setSelectedDoc(null)} className="p-1.5 rounded-lg text-[#A8B4C4] hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 bg-white text-neutral-900 rounded-b-3xl font-sans text-xs print-container leading-relaxed space-y-4">
              <div className="flex justify-between items-start border-b-2 border-neutral-900 pb-3">
                <div>
                  <h3 className="font-black text-sm uppercase">FITAL-IMMO SERVICES SARL</h3>
                  <div className="text-[10px] text-neutral-600">Cabinet de Gérance Immobilière Agréée</div>
                  <div className="text-[10px] text-neutral-600">Dakar — Sénégal</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-rose-800 uppercase tracking-wider text-xs">
                    LETTRE RECOMMANDÉE AVEC A.R.
                  </div>
                  <div className="text-[10px] text-neutral-500">Dakar, le 15 Mai 2026</div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-300">
                <p><strong>Destinataire :</strong> Monsieur Mamadou DIOP</p>
                <p><strong>Local loué :</strong> Résidence Les Almadies, Apt 2B, Dakar</p>
                <p className="text-rose-800 font-bold mt-1">
                  <strong>Objet :</strong> MISE EN DEMEURE DE PAYER SOUS 8 JOURS FRANCS
                </p>
              </div>

              <div className="space-y-2">
                <p>Monsieur,</p>
                <p>
                  Sauf erreur ou omission de notre part, nous constatons qu’à ce jour votre compte locatif présente un
                  arriéré impayé d’un montant de <strong>375 000 FCFA</strong> au titre du loyer échu du mois en cours.
                </p>
                <p>
                  Malgré nos précédents rappels amiables, nous n’avons pas enregistré votre règlement.
                </p>
                <p className="font-bold">
                  Par la présente, nous vous METTONS EN DEMEURE formelle de procéder au règlement intégral de ladite somme
                  dans un délai impératif de HUIT (8) JOURS à compter de la réception de la présente.
                </p>
                <p>
                  À défaut de régularisation dans ce délai légal, nous nous verrons contraints de transmettre votre dossier à
                  notre Huissier de Justice pour saisine des juridictions compétentes, résiliation judiciaire du bail et
                  expulsion avec application des pénalités contractuelles.
                </p>
                <p>
                  Nous comptons sur votre prompte diligence pour clore ce dossier à l'amiable.
                </p>
              </div>

              <div className="pt-6 border-t border-neutral-300 text-right">
                <div className="font-bold text-neutral-800">Le Département Contentieux & Recouvrement</div>
                <div className="font-semibold text-neutral-600">FITAL-IMMO SERVICES SARL</div>
                <div className="h-12 flex items-center justify-end">
                  <span className="text-[10px] font-bold text-rose-800 uppercase border border-rose-800 px-3 py-1 rounded">
                    ★ POUR NOTIFICATION FORMELLE ★
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
