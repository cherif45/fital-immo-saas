const frenchMonths = [
  'janvier',
  'fevrier',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'aout',
  'septembre',
  'octobre',
  'novembre',
  'decembre',
];

function formatDate(year: number, monthIndex: number, day: number): string {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const clampedDay = Math.min(day, lastDay);

  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

function parsePeriod(period: string): { year: number; monthIndex: number } {
  const trimmedPeriod = period.trim();
  const isoPeriod = trimmedPeriod.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/);

  if (isoPeriod) {
    const year = Number(isoPeriod[1]);
    const month = Number(isoPeriod[2]);
    if (month >= 1 && month <= 12) return { year, monthIndex: month - 1 };
  }

  const normalizedPeriod = trimmedPeriod
    .toLocaleLowerCase('fr-FR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\./g, '');
  const frenchPeriod = normalizedPeriod.match(/^([a-z]+)\s+(\d{4})$/);
  const monthIndex = frenchPeriod ? frenchMonths.indexOf(frenchPeriod[1]) : -1;

  if (frenchPeriod && monthIndex !== -1) {
    return { year: Number(frenchPeriod[2]), monthIndex };
  }

  throw new Error(`Période de paiement invalide : ${period}`);
}

function validateDueDay(dueDay: number): void {
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
    throw new RangeError(`Jour d’échéance invalide : ${dueDay}`);
  }
}

export function getPeriodDueDate(period: string, dueDay = 5): string {
  validateDueDay(dueDay);
  const { year, monthIndex } = parsePeriod(period);
  return formatDate(year, monthIndex, dueDay);
}

export function getNextDueDate(dueDay = 5, now = new Date()): string {
  validateDueDay(dueDay);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let year = today.getFullYear();
  let monthIndex = today.getMonth();
  let dueDate = new Date(`${formatDate(year, monthIndex, dueDay)}T00:00:00`);

  if (dueDate < today) {
    monthIndex += 1;
    if (monthIndex > 11) {
      year += 1;
      monthIndex = 0;
    }
    dueDate = new Date(`${formatDate(year, monthIndex, dueDay)}T00:00:00`);
  }

  return `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;
}
