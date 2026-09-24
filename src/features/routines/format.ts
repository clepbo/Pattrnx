const NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Weekdays", "Every day", or "Mon, Wed, Fri" (Monday first). */
export function describeDays(days: readonly number[]): string {
  const set = new Set(days);
  if (set.size === 7) return "Every day";
  if (set.size === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) return "Weekdays";
  if (set.size === 2 && set.has(0) && set.has(6)) return "Weekends";
  return [1, 2, 3, 4, 5, 6, 0].filter((d) => set.has(d)).map((d) => NAMES[d]).join(", ");
}
