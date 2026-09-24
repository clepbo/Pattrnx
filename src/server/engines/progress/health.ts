import { addDays, diffDays, eachDay, type LocalDate, startOfWeek, type Weekday } from "@/lib/dates";

import type { FeasibilityResult } from "../feasibility";

/**
 * Goal health (PRD BR-6, ARCHITECTURE.md §8.2). Describes the plan's state, not
 * the person, and always carries the reason it was chosen.
 */

export const HEALTH_ENGINE_VERSION = 1;

export const HEALTH_THRESHOLDS = {
  /** No linked activity or outcome for this many days → stalled. */
  stalledDays: 14,
  executionWindowDays: 28,
  /** Below this execution rate the goal is at risk… */
  lowExecution: 0.5,
  /** …but only once this many tasks were due. */
  minTasksForExecution: 4,
} as const;

export type HealthState = "on_track" | "at_risk" | "stalled" | "uncertain" | "needs_recalibration";

export type HealthReason =
  | "no_recent_activity"
  | "pace_unrealistic"
  | "deadline_passed"
  | "pace_at_risk"
  | "low_execution"
  | "insufficient_data"
  | "target_reached"
  | "on_pace";

export interface TaskOutcome {
  scheduledDate: LocalDate;
  status: "planned" | "done" | "done_minimum" | "skipped";
}

export interface HealthInput {
  today: LocalDate;
  startDate: LocalDate;
  feasibility: FeasibilityResult;
  /** The goal's tasks (any range; the engine picks its window). */
  tasks: TaskOutcome[];
  /** Latest local date of any activity or outcome linked to the goal. */
  lastEvidenceDate: LocalDate | null;
}

export interface HealthResult {
  state: HealthState;
  reason: HealthReason;
  /** Done (incl. minimum) ÷ due tasks over the window; null with no due tasks. */
  execution: { rate: number; done: number; due: number } | null;
  daysSinceEvidence: number | null;
}

const isDone = (t: TaskOutcome) => t.status === "done" || t.status === "done_minimum";

/**
 * Tasks count once they're due: any earlier day, or today if already finished
 * (today's still-planned tasks aren't missed yet).
 */
function isDue(task: TaskOutcome, today: LocalDate): boolean {
  return task.scheduledDate < today || (task.scheduledDate === today && task.status !== "planned");
}

export function executionConsistency(tasks: TaskOutcome[], today: LocalDate, windowDays: number = HEALTH_THRESHOLDS.executionWindowDays) {
  const from = addDays(today, -(windowDays - 1));
  const due = tasks.filter((t) => t.scheduledDate >= from && isDue(t, today));
  if (due.length === 0) return null;
  const done = due.filter(isDone).length;
  return { rate: done / due.length, done, due: due.length };
}

export function assessHealth(input: HealthInput): HealthResult {
  const { today, feasibility } = input;
  const execution = executionConsistency(input.tasks, today);
  const lastSign = input.lastEvidenceDate && input.lastEvidenceDate > input.startDate ? input.lastEvidenceDate : input.startDate;
  const daysSinceEvidence = diffDays(lastSign, today);
  const result = (state: HealthState, reason: HealthReason): HealthResult => ({
    state,
    reason,
    execution,
    daysSinceEvidence: input.lastEvidenceDate ? diffDays(input.lastEvidenceDate, today) : null,
  });

  if (feasibility.state === "target_reached") return result("on_track", "target_reached");
  if (daysSinceEvidence >= HEALTH_THRESHOLDS.stalledDays) return result("stalled", "no_recent_activity");
  if (feasibility.state === "deadline_passed") return result("needs_recalibration", "deadline_passed");
  if (feasibility.state === "currently_unrealistic") return result("needs_recalibration", "pace_unrealistic");
  if (feasibility.state === "at_risk") return result("at_risk", "pace_at_risk");
  if (execution && execution.due >= HEALTH_THRESHOLDS.minTasksForExecution && execution.rate < HEALTH_THRESHOLDS.lowExecution) {
    return result("at_risk", "low_execution");
  }
  if (feasibility.state === "insufficient_data") return result("uncertain", "insufficient_data");
  return result("on_track", "on_pace");
}

export interface WeekCount {
  weekStart: LocalDate;
  planned: number;
  done: number;
}

/**
 * Planned vs done per week for the last `weeks` weeks, oldest first (the
 * plan-vs-reality strip, PRD F9). Only due tasks count as planned.
 */
export function planVsReality(tasks: TaskOutcome[], today: LocalDate, weekStartsOn: Weekday, weeks = 4): WeekCount[] {
  const currentWeek = startOfWeek(today, weekStartsOn);
  const starts = Array.from({ length: weeks }, (_, i) => addDays(currentWeek, -7 * (weeks - 1 - i)));
  return starts.map((weekStart) => {
    const days = new Set<string>(eachDay(weekStart, addDays(weekStart, 6)));
    const due = tasks.filter((t) => days.has(t.scheduledDate) && isDue(t, today));
    return { weekStart, planned: due.length, done: due.filter(isDone).length };
  });
}
