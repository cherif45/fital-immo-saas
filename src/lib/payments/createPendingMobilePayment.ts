import type {
  AgencySettings,
  Owner,
  Payment,
  PaymentMethodCode,
  Property,
  Tenant,
  UserAccount,
} from '../../types';
import { createDocumentNumber } from '../documentNumber';
import { getLocalDateString } from '../utils';
import { getPeriodDueDate } from './dueDate';

interface CreatePendingMobilePaymentInput {
  tenant: Tenant;
  property: Property;
  owner?: Owner;
  amount: number;
  method: PaymentMethodCode;
  transactionId: string;
  period: string;
  settings?: AgencySettings;
  currentUser?: UserAccount;
  dueDay?: number;
}

export function createPendingMobilePayment({
  tenant,
  property,
  owner,
  amount,
  method,
  transactionId,
  period,
  settings,
  currentUser,
  dueDay = 5,
}: CreatePendingMobilePaymentInput): Payment {
  const now = new Date();
  const today = getLocalDateString(now);
  const dueDate = getPeriodDueDate(period, dueDay);

  return {
    id: crypto.randomUUID(),
    ref: createDocumentNumber(settings?.prefixPaiement, 'PAY-'),
    quittanceNumero: createDocumentNumber(settings?.prefixQuittance, 'QUI-'),
    locataireId: tenant.id,
    locataireNom: `${tenant.prenom} ${tenant.nom}`,
    bienId: property.id,
    bienNom: property.nom,
    proprietaireId: owner?.id || property.proprietaireId,
    proprietaireNom: owner ? `${owner.prenom} ${owner.nom}` : 'Propriétaire',
    periode: period,
    loyerBase: amount,
    charges: 0,
    tva: 0,
    tom: 0,
    penalites: 0,
    montantTotal: amount,
    montantPaye: amount,
    montantRestant: 0,
    modePaiement: 'Mobile Money',
    moyenPaiementCode: method,
    verificationStatut: 'en_attente',
    numeroTransaction: transactionId,
    referenceTransaction: transactionId,
    datePaiement: today,
    dateEcheance: dueDate,
    statut: 'En attente',
    observation: `Règlement mobile en attente de validation (Tx: ${transactionId})`,
    auteurId: currentUser?.id,
    auteurNom: currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Système',
    dateHeurePaiement: now.toISOString().replace('T', ' ').substring(0, 16),
    typeRecu: 'QUITTANCE',
  };
}
