export function createDocumentNumber(
  configuredPrefix: string | undefined,
  fallbackPrefix: string,
  date = new Date(),
): string {
  const prefix = configuredPrefix?.trim() || fallbackPrefix;
  const year = String(date.getFullYear());
  const yearPattern = /(?:19|20)\d{2}(?=[-/]?$)/;
  const normalizedPrefix = yearPattern.test(prefix)
    ? prefix.replace(yearPattern, year)
    : `${prefix.replace(/[-/]?$/, '-')}${year}-`;

  return `${normalizedPrefix}${crypto.randomUUID().slice(0, 16).toUpperCase()}`;
}
