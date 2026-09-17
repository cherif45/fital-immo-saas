/**
 * Module de calculs financiers stricts pour la gestion immobilière FITAL-IMMO
 * Devise de référence : FCFA
 */

export interface RentCalculationInput {
  loyerBase: number;
  charges?: number;
  taxes?: number;
  penalites?: number;
}

export interface RentCalculationResult {
  loyerBase: number;
  charges: number;
  taxes: number;
  penalites: number;
  totalDu: number;
}

/**
 * Calcul du montant total dû pour une échéance de loyer
 * TOTAL_DU = LOYER + CHARGES + TAXES + PENALITES
 */
export function calculateRent(input: RentCalculationInput): RentCalculationResult {
  const loyerBase = Math.max(0, Number(input.loyerBase) || 0);
  const charges = Math.max(0, Number(input.charges) || 0);
  const taxes = Math.max(0, Number(input.taxes) || 0);
  const penalites = Math.max(0, Number(input.penalites) || 0);

  const totalDu = loyerBase + charges + taxes + penalites;

  return {
    loyerBase,
    charges,
    taxes,
    penalites,
    totalDu,
  };
}

/**
 * Calcul des pénalités de retard
 * @param montantDu Montant principal en souffrance
 * @param joursRetard Nombre de jours de retard constatés
 * @param mode 'pourcentage' | 'fixe'
 * @param valeur Taux en % (ex: 10) ou montant forfaitaire (ex: 5000)
 */
export function calculatePenalty(
  montantDu: number,
  joursRetard: number,
  mode: 'pourcentage' | 'fixe' = 'pourcentage',
  valeur: number = 10
): number {
  if (joursRetard <= 5) return 0; // Période de grâce légale de 5 jours

  const principal = Math.max(0, Number(montantDu) || 0);
  if (principal === 0) return 0;

  if (mode === 'pourcentage') {
    const taux = Math.max(0, Number(valeur) || 0) / 100;
    return Math.round(principal * taux);
  } else {
    return Math.max(0, Number(valeur) || 0);
  }
}

/**
 * Calcul du reste à payer et détermination du statut de l'échéance
 */
export function calculateRemaining(
  totalDu: number,
  totalPaye: number,
  dateEcheanceStr?: string
): {
  totalDu: number;
  totalPaye: number;
  reste: number;
  statut: 'paye' | 'partiellement_paye' | 'en_retard' | 'a_payer';
} {
  const du = Math.max(0, Number(totalDu) || 0);
  const paye = Math.max(0, Number(totalPaye) || 0);
  const reste = Math.max(0, du - paye);

  let statut: 'paye' | 'partiellement_paye' | 'en_retard' | 'a_payer' = 'a_payer';

  if (reste === 0 && du > 0) {
    statut = 'paye';
  } else if (paye > 0 && reste > 0) {
    statut = 'partiellement_paye';
  } else {
    if (dateEcheanceStr) {
      const echeance = new Date(dateEcheanceStr);
      const today = new Date();
      if (today > echeance && reste > 0) {
        statut = 'en_retard';
      } else {
        statut = 'a_payer';
      }
    } else {
      statut = 'a_payer';
    }
  }

  return {
    totalDu: du,
    totalPaye: paye,
    reste,
    statut,
  };
}

/**
 * Calcul de la commission de gérance de l'agence
 * commission = loyers_encaisses * taux / 100
 */
export function calculateManagementFee(
  loyersEncaisses: number,
  tauxGerance: number = 10,
  tvaTaux: number = 18 // Taux standard TVA 18%
): {
  commissionHT: number;
  tvaCommission: number;
  commissionTTC: number;
} {
  const encaisse = Math.max(0, Number(loyersEncaisses) || 0);
  const taux = Math.max(0, Number(tauxGerance) || 0) / 100;
  const commissionHT = Math.round(encaisse * taux);
  const tvaCommission = Math.round(commissionHT * (tvaTaux / 100));
  const commissionTTC = commissionHT + tvaCommission;

  return {
    commissionHT,
    tvaCommission,
    commissionTTC,
  };
}

/**
 * Calcul du montant net à reverser au propriétaire
 * NET_A_REVERSER = LOYERS ENCAISSÉS + AUTRES RECETTES - COMMISSION - TRAVAUX - DÉPENSES
 */
export function calculateOwnerNet(input: {
  loyersEncaisses: number;
  autresRecettes?: number;
  commissionAgence: number;
  tvaCommission?: number;
  travaux?: number;
  depenses?: number;
  autresFrais?: number;
}): {
  totalRecettes: number;
  totalDeductions: number;
  netAReverser: number;
} {
  const loyers = Math.max(0, Number(input.loyersEncaisses) || 0);
  const autresRecettes = Math.max(0, Number(input.autresRecettes) || 0);
  const commission = Math.max(0, Number(input.commissionAgence) || 0);
  const tvaComm = Math.max(0, Number(input.tvaCommission) || 0);
  const travaux = Math.max(0, Number(input.travaux) || 0);
  const depenses = Math.max(0, Number(input.depenses) || 0);
  const autresFrais = Math.max(0, Number(input.autresFrais) || 0);

  const totalRecettes = loyers + autresRecettes;
  const totalDeductions = commission + tvaComm + travaux + depenses + autresFrais;
  const netAReverser = Math.max(0, totalRecettes - totalDeductions);

  return {
    totalRecettes,
    totalDeductions,
    netAReverser,
  };
}

/**
 * Calcul du taux de recouvrement global ou par bien
 * taux_recouvrement = (montant_encaisse / montant_total_du) * 100
 */
export function calculateCollectionRate(
  montantEncaisse: number,
  montantTotalDu: number
): number {
  const encaisse = Math.max(0, Number(montantEncaisse) || 0);
  const du = Math.max(0, Number(montantTotalDu) || 0);

  if (du === 0) return 100;
  const rate = (encaisse / du) * 100;
  return Math.min(100, Math.round(rate * 10) / 10);
}

/**
 * Formatage standard des montants en FCFA
 */
export function formatCurrencyFCFA(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 FCFA';
  return `${Math.round(amount).toLocaleString('fr-FR')} FCFA`;
}

/**
 * Conversion d'un nombre en lettres (Français) pour les quittances et reçus officiels
 */
export function numberToWordsFrench(num: number): string {
  const n = Math.floor(Math.abs(num));
  if (n === 0) return 'zéro franc CFA';

  const unites = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const dix_a_dix_neuf = [
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
    'dix-sept', 'dix-huit', 'dix-neuf'
  ];
  const dizaines = [
    '', 'dix', 'vingt', 'trente', 'quarante', 'cinquante',
    'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'
  ];

  function convertGroup(val: number): string {
    let res = '';
    const c = Math.floor(val / 100);
    const d = Math.floor((val % 100) / 10);
    const u = val % 10;

    if (c > 0) {
      if (c === 1) res += 'cent';
      else res += unites[c] + ' cent' + (d === 0 && u === 0 ? 's' : '');
    }

    const reste = val % 100;
    if (reste > 0) {
      if (c > 0) res += ' ';
      if (reste < 10) {
        res += unites[reste];
      } else if (reste >= 10 && reste < 20) {
        res += dix_a_dix_neuf[reste - 10];
      } else {
        if (d === 7) {
          res += 'soixante-' + (u === 1 ? 'et-onze' : dix_a_dix_neuf[u]);
        } else if (d === 9) {
          res += 'quatre-vingt-' + dix_a_dix_neuf[u];
        } else {
          if (u === 1 && d !== 8) {
            res += dizaines[d] + ' et un';
          } else if (u === 0 && d === 8) {
            res += 'quatre-vingts';
          } else if (u > 0) {
            res += dizaines[d] + '-' + unites[u];
          } else {
            res += dizaines[d];
          }
        }
      }
    }
    return res;
  }

  let result = '';
  const millions = Math.floor(n / 1000000);
  const milliers = Math.floor((n % 1000000) / 1000);
  const unitesRestantes = n % 1000;

  if (millions > 0) {
    result += convertGroup(millions) + (millions > 1 ? ' millions ' : ' million ');
  }
  if (milliers > 0) {
    if (milliers === 1) {
      result += 'mille ';
    } else {
      result += convertGroup(milliers) + ' mille ';
    }
  }
  if (unitesRestantes > 0) {
    result += convertGroup(unitesRestantes);
  }

  const finalString = result.trim();
  return (finalString.charAt(0).toUpperCase() + finalString.slice(1) + ' francs CFA');
}
