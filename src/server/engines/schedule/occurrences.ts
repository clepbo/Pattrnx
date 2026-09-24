import { addDays, eachDay, type LocalDate, weekdayOf, type Weekday } from "@/lib/dates";

/**
 * Which days a routine puts on the plan (FR-3).
 *
 * Routine tasks are materialized lazily, so a user who doesn't open the app for a
 * few days still gets those days' tasks (they then count as missed, BR-4). Backfill
 * is capped at BACKFILL_DAYS. Pausing deletes future planned tasks and resuming moves
 * `activeFrom` to the resume day, so paused days are never backfilled.
 */

export const BACKFILL_DAYS = 30;
export const LOOKAHEAD_DAYS = 7;

export interface RoutineSchedule {
  daysOfWeek: readonly number[];
  activeFrom: LocalDate;
  paused: boolean;
  archived: boolean;
}

export function generationWindow(today: LocalDate): { from: LocalDate; to: LocalDate } {
  return { from: addDays(today, -BACKFILL_DAYS), to: addDays(today, LOOKAHEAD_DAYS) };
}

export function routineOccurrences(routine: RoutineSchedule, from: LocalDate, to: LocalDate): LocalDate[] {
  if (routine.paused || routine.archived) return [];
  const days = new Set(routine.daysOfWeek);
  const start = routine.activeFrom > from ? routine.activeFrom : from;
  return eachDay(start, to).filter((date) => days.has(weekdayOf(date) as Weekday));
}
