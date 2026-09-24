import type { LocalDate } from "./dates";

const CURRENCY_CODE = /^[A-Z]{3}$/;

/**
 * Formats a goal/activity amount with its unit. Three-letter upper-case units are
 * treated as ISO currencies (₦2,000,000); anything else is appended ("45 min", "81.5 kg").
 */
export function formatAmount(value: number, unit: string | null | undefined, locale = "en-NG"): string {
  const maximumFractionDigits = Math.abs(value) >= 100 ? 0 : 2;
  if (unit && CURRENCY_CODE.test(unit)) {
    try {
      return new Intl.NumberFormat(locale, { style: "currency", currency: unit, maximumFractionDigits }).format(value);
    } catch {
      // Unknown currency code: fall through to plain formatting.
    }
  }
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
  return unit ? `${number} ${unit}` : number;
}

/** Parses user-typed numbers such as "1,600,000", " 81.5 ", "₦80,000". Returns null when not a number. */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[\s,_]/g, "").replace(/^[^\d.-]+/, "");
  if (cleaned === "" || !/^-?\d*\.?\d+$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** "Tue 22 Sep 2026" for a local calendar date (no timezone shift). */
export function formatLocalDate(date: LocalDate, options: Intl.DateTimeFormatOptions = {}): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}
