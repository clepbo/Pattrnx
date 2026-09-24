import { TZDate } from "@date-fns/tz";

/**
 * User-facing day logic always works on local calendar dates in the user's
 * timezone (ARCHITECTURE.md §4.1, TD-11). Never use `Date#getDay()` or
 * `Date#getDate()` for that; they read the *server's* timezone.
 */

/** A calendar date in `YYYY-MM-DD` form, with no time or timezone. */
export type LocalDate = string & { readonly __brand: "LocalDate" };

/** 0 = Sunday … 6 = Saturday (matches Postgres `extract(dow)` and `profiles.week_starts_on`). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MS_PER_DAY = 86_400_000;

/** Returns the canonical IANA name (e.g. `africa/lagos` → `Africa/Lagos`), or null if unknown. */
export function normalizeTimeZone(timeZone: string): string | null {
  if (!timeZone) return null;
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

export function isValidTimeZone(timeZone: string): boolean {
  return normalizeTimeZone(timeZone) !== null;
}

export function parseLocalDate(value: string): LocalDate | null {
  const match = LOCAL_DATE_PATTERN.exec(value);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  if (utc.getUTCFullYear() !== y || utc.getUTCMonth() !== m - 1 || utc.getUTCDate() !== d) return null;
  return value as LocalDate;
}

export function assertLocalDate(value: string): LocalDate {
  const date = parseLocalDate(value);
  if (!date) throw new Error(`Invalid local date: ${value}`);
  return date;
}

function zonedParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return { year: get("year"), month: get("month"), day: get("day"), hour: Number(get("hour")) };
}

/** The calendar date an instant falls on in `timeZone`. Mirrors the DB trigger on `activities`. */
export function localDateOf(instant: Date, timeZone: string): LocalDate {
  const { year, month, day } = zonedParts(instant, timeZone);
  return `${year}-${month}-${day}` as LocalDate;
}

/** The hour (0–23) an instant falls on in `timeZone`. */
export function localHourOf(instant: Date, timeZone: string): number {
  return zonedParts(instant, timeZone).hour;
}

export function todayIn(timeZone: string, now: Date = new Date()): LocalDate {
  return localDateOf(now, timeZone);
}

/**
 * The instant for a wall-clock time on a local date in `timeZone`.
 * Times inside a DST gap resolve forward (e.g. 02:30 → 03:30 on spring-forward day).
 */
export function zonedDateTimeToInstant(date: LocalDate, time: string, timeZone: string): Date {
  const timeMatch = TIME_PATTERN.exec(time);
  if (!timeMatch) throw new Error(`Invalid time: ${time}`);
  const [y, m, d] = date.split("-").map(Number);
  const zoned = new TZDate(y, m - 1, d, Number(timeMatch[1]), Number(timeMatch[2]), timeZone);
  return new Date(zoned.getTime());
}

function toUtcMs(date: LocalDate): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): LocalDate {
  return new Date(ms).toISOString().slice(0, 10) as LocalDate;
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return fromUtcMs(toUtcMs(date) + days * MS_PER_DAY);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function diffDays(from: LocalDate, to: LocalDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

export function weekdayOf(date: LocalDate): Weekday {
  return new Date(toUtcMs(date)).getUTCDay() as Weekday;
}

export function startOfWeek(date: LocalDate, weekStartsOn: Weekday): LocalDate {
  const offset = (weekdayOf(date) - weekStartsOn + 7) % 7;
  return addDays(date, -offset);
}

/** Every date from `from` to `to`, inclusive. Empty when `to` is before `from`. */
export function eachDay(from: LocalDate, to: LocalDate): LocalDate[] {
  const days: LocalDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Calendar month arithmetic; the day clamps to the target month's length (Jan 31 + 1 → Feb 28/29). */
export function addMonths(date: LocalDate, months: number): LocalDate {
  const [y, m, d] = date.split("-").map(Number);
  const index = y * 12 + (m - 1) + months;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  const day = Math.min(d, daysInMonth(year, month));
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` as LocalDate;
}

/**
 * Calendar months from `from` to `to`, with the partial month as a fraction of that month's length.
 * 2026-09-01 → 2027-03-01 is exactly 6. Negative when `to` is earlier.
 */
export function monthsBetween(from: LocalDate, to: LocalDate): number {
  if (to < from) return -monthsBetween(to, from);
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  let whole = (ty - fy) * 12 + (tm - fm);
  if (addMonths(from, whole) > to) whole -= 1;
  const anchor = addMonths(from, whole);
  const next = addMonths(from, whole + 1);
  return whole + diffDays(anchor, to) / diffDays(anchor, next);
}

export function compareLocalDates(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
