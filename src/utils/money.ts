export function currencyFractionDigits(currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
}
export function formatMoney(amountMinor: number, currency: string) {
  const digits = currencyFractionDigits(currency);
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: digits }).format(amountMinor / (10 ** digits));
}
export function amountToMinorUnits(value: string, currency: string) {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  const amount = Number(normalized);
  if (!normalized || !Number.isFinite(amount) || amount <= 0) return null;
  const factor = 10 ** currencyFractionDigits(currency);
  const minor = Math.round(amount * factor);
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}