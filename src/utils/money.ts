export function currencyFractionDigits(currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
}

export function formatMoney(amountMinor: number, currency: string) {
  const digits = currencyFractionDigits(currency);
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: digits }).format(amountMinor / (10 ** digits));
}

export function amountToMinorUnits(value: string, currency: string) {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return null;
  const parts = normalized.split(".");
  if (parts.length > 2 || !parts[0] || !/^[0-9]+$/.test(parts[0])) return null;
  const fraction = parts[1] ?? "";
  if (fraction && !/^[0-9]+$/.test(fraction)) return null;
  const digits = currencyFractionDigits(currency);
  if (fraction.length > digits && /[1-9]/.test(fraction.slice(digits))) return null;
  const factor = 10n ** BigInt(digits);
  const whole = BigInt(parts[0]);
  const fractional = BigInt((fraction.slice(0, digits) + "0".repeat(digits)).slice(0, digits) || "0");
  const minor = whole * factor + fractional;
  if (minor <= 0n || minor > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(minor);
}
