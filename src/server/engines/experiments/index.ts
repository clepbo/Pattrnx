import { diffDays, eachDay, type LocalDate } from "@/lib/dates";

/**
 * Experiment metrics and outcomes (ARCHITECTURE.md §8.7, PRD F14, BR-8).
 * One function measures both the baseline and the result, so they're comparable.
 */

export const EXPERIMENT_ENGINE_VERSION = 1;

export const EXPERIMENT_THRESHOLDS = {
  minDays: 7,
  maxDays: 42,
  /** BR-8: fewer observed days than this in either window → inconclusive. */
  minObservedDays: 5,
  /** Relative change in the desired direction that counts as improved/worsened. */
  meaningfulChange: 0.15,
} as const;

export type ExperimentMetric = "task_completion_rate" | "active_days" | "activity_minutes" | "activity_quantity";
export type MetricDirection = "increase" | "decrease";
export type ExperimentOutcome = "improved" | "no_change" | "worsened" | "inconclusive";

/** What the metric is about. Empty means "all tasks" for completion rate. */
export interface MetricSubject {
  routineId?: string;
  goalId?: string;
  activityTypeId?: string;
}

export interface MetricData {
  tasks: { routineId: string | null; goalId: string | null; scheduledDate: LocalDate; status: "planned" | "done" | "done_minimum" | "skipped" }[];
  activities: { typeId: string; localDate: LocalDate; durationMinutes: number | null; quantity: number | null }[];
}

export interface MetricValue {
  value: number | null;
  /** Days with any task or activity in the range: evidence the user was tracking. */
  observedDays: number;
}

const isDone = (status: string) => status === "done" || status === "done_minimum";

function matchesTask(task: MetricData["tasks"][number], subject: MetricSubject): boolean {
  if (subject.routineId) return task.routineId === subject.routineId;
  if (subject.goalId) return task.goalId === subject.goalId;
  return true;
}

/**
 * The metric over [from, to] (inclusive). Activity metrics are per-day rates so
 * windows of different lengths compare fairly. Tasks on or after `today` that are
 * still planned aren't counted as missed.
 */
export function metricValue(
  data: MetricData,
  metric: ExperimentMetric,
  subject: MetricSubject,
  from: LocalDate,
  to: LocalDate,
  today: LocalDate,
): MetricValue {
  const inRange = (date: LocalDate) => date >= from && date <= to;
  const days = eachDay(from, to < today ? to : today);
  const observed = new Set<string>([
    ...data.tasks.filter((t) => inRange(t.scheduledDate)).map((t) => t.scheduledDate),
    ...data.activities.filter((a) => inRange(a.localDate)).map((a) => a.localDate),
  ]);
  const observedDays = days.filter((d) => observed.has(d)).length;
  if (days.length === 0) return { value: null, observedDays: 0 };

  if (metric === "task_completion_rate") {
    const due = data.tasks.filter(
      (t) => inRange(t.scheduledDate) && matchesTask(t, subject) && (t.scheduledDate < today || isDone(t.status) || t.status === "skipped"),
    );
    return { value: due.length === 0 ? null : due.filter((t) => isDone(t.status)).length / due.length, observedDays };
  }

  const entries = data.activities.filter((a) => inRange(a.localDate) && a.typeId === subject.activityTypeId);
  if (metric === "active_days") {
    return { value: new Set(entries.map((a) => a.localDate)).size / days.length, observedDays };
  }
  const key = metric === "activity_minutes" ? "durationMinutes" : "quantity";
  return { value: entries.reduce((sum, a) => sum + (a[key] ?? 0), 0) / days.length, observedDays };
}

export function durationDays(start: LocalDate, end: LocalDate): number {
  return diffDays(start, end) + 1;
}

/**
 * Suggested outcome from baseline vs result (the user confirms it). The copy that
 * goes with it stays descriptive ("was higher during the experiment"), never causal.
 */
export function suggestOutcome(
  baseline: MetricValue,
  result: MetricValue,
  direction: MetricDirection,
): { outcome: ExperimentOutcome; change: number | null } {
  const { minObservedDays, meaningfulChange } = EXPERIMENT_THRESHOLDS;
  if (baseline.observedDays < minObservedDays || result.observedDays < minObservedDays) return { outcome: "inconclusive", change: null };
  if (baseline.value === null || result.value === null) return { outcome: "inconclusive", change: null };

  const signed = direction === "increase" ? 1 : -1;
  // From a zero baseline any movement is a full change in that direction.
  const change = baseline.value === 0 ? (result.value === 0 ? 0 : Math.sign(result.value)) : (result.value - baseline.value) / Math.abs(baseline.value);
  const towardGoal = change * signed;
  if (towardGoal >= meaningfulChange) return { outcome: "improved", change };
  if (towardGoal <= -meaningfulChange) return { outcome: "worsened", change };
  return { outcome: "no_change", change };
}
