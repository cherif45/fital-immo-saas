const MONTHS = [
  "janvier",
  "fevrier",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "aout",
  "septembre",
  "octobre",
  "novembre",
  "decembre",
];

export function normalizePaymentPeriod(period: string | undefined): string {
  const value = (period || "")
    .trim()
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,/_-]+/g, " ")
    .replace(/\s+/g, " ");

  const yearFirst = value.match(/\b(20\d{2})\s+(\d{1,2})\b/);
  if (yearFirst && Number(yearFirst[2]) >= 1 && Number(yearFirst[2]) <= 12) {
    return `${yearFirst[1]}-${yearFirst[2].padStart(2, "0")}`;
  }

  const monthFirstNumeric = value.match(/\b(\d{1,2})\s+(20\d{2})\b/);
  if (
    monthFirstNumeric &&
    Number(monthFirstNumeric[1]) >= 1 &&
    Number(monthFirstNumeric[1]) <= 12
  ) {
    return `${monthFirstNumeric[2]}-${monthFirstNumeric[1].padStart(2, "0")}`;
  }

  const year = value.match(/\b(20\d{2})\b/)?.[1];
  const month = MONTHS.findIndex((name) => {
    const token = value.split(" ").find((part) => part.length >= 3);
    return !!token && (name.startsWith(token) || token.startsWith(name.slice(0, 3)));
  });
  return year && month >= 0 ? `${year}-${String(month + 1).padStart(2, "0")}` : value;
}
