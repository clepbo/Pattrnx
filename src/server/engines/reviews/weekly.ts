import { addDays, type LocalDate } from "@/lib/dates";

import type { HealthReason, HealthState } from "../progress/health";

/**
 * Weekly review content (PRD F13, blueprint §32): what happened, what repeated,
 * what changed, what to adjust. Pure: the service gathers inputs and stores the
 * result as an immutable snapshot.
 */

export const REVIEW_ENGINE_VERSION = 1;

export const REVIEW_THRESHOLDS = {
  /** A routine needs this many due tasks in each week to compare weeks. */
  minTasksPerWeek: 2,
  /** Week-over-week change in a routine's completion that's worth calling out. */
  minChange: 0.2,
} as const;

type TaskStatus = "planned" | "done" | "done_minimum" | "skipped";

export interface ReviewInput {
  periodStart: LocalDate;
  /** Tasks from the week before the period through the period's end. */
  tasks: { routineId: string | null; scheduledDate: LocalDate; status: TaskStatus }[];
  routines: { id: string; name: string }[];
  goals: { id: string; title: string; health: HealthState; reason: HealthReason }[];
  patterns: { id: string; summary: string; confidence: string }[];
  suggestion: { patternId: string; title: string; description: string } | null;
  experiments: { id: string; title: string; startDate: LocalDate; endDate: LocalDate; status: string }[];
}

export interface WeekExecution {
  done: number;
  planned: number;
  rate: number | null;
}

export interface ReviewContent {
  version: 1;
  periodStart: LocalDate;
  periodEnd: LocalDate;
  execution: WeekExecution & { previousRate: number | null };
  goals: ReviewInput["goals"];
  patterns: ReviewInput["patterns"];
  suggestion: ReviewInput["suggestion"];
  experiments: { running: { id: string; title: string }[]; ended: { id: string; title: string }[] };
  improvement: { routine: string; previousRate: number; rate: number } | null;
  concern:
    | { kind: "goal"; goalId: string; title: string; health: HealthState; reason: HealthReason }
    | { kind: "routine"; routine: string; previousRate: number; rate: number }
    | null;
}

const isDone = (s: TaskStatus) => s === "done" || s === "done_minimum";

function execution(tasks: ReviewInput["tasks"]): WeekExecution {
  // The period is over, so every task in it is due (still-planned ones were missed, BR-4).
  const done = tasks.filter((t) => isDone(t.status)).length;
  return { done, planned: tasks.length, rate: tasks.length === 0 ? null : done / tasks.length };
}

const HEALTH_SEVERITY: Record<HealthState, number> = { needs_recalibration: 3, stalled: 2, at_risk: 1, uncertain: 0, on_track: 0 };

export function buildWeeklyReview(input: ReviewInput): ReviewContent {
  const periodEnd = addDays(input.periodStart, 6);
  const previousStart = addDays(input.periodStart, -7);
  const inWeek = (from: LocalDate, to: LocalDate) => (t: ReviewInput["tasks"][number]) => t.scheduledDate >= from && t.scheduledDate <= to;
  const thisWeek = input.tasks.filter(inWeek(input.periodStart, periodEnd));
  const lastWeek = input.tasks.filter(inWeek(previousStart, addDays(input.periodStart, -1)));

  // Per-routine week-over-week change.
  const changes = input.routines.flatMap((routine) => {
    const now = execution(thisWeek.filter((t) => t.routineId === routine.id));
    const before = execution(lastWeek.filter((t) => t.routineId === routine.id));
    if (now.planned < REVIEW_THRESHOLDS.minTasksPerWeek || before.planned < REVIEW_THRESHOLDS.minTasksPerWeek) return [];
    return [{ routine: routine.name, previousRate: before.rate as number, rate: now.rate as number, delta: (now.rate as number) - (before.rate as number) }];
  });
  const best = [...changes].sort((a, b) => b.delta - a.delta)[0];
  const worst = [...changes].sort((a, b) => a.delta - b.delta)[0];

  const worstGoal = [...input.goals]
    .filter((g) => HEALTH_SEVERITY[g.health] > 0)
    .sort((a, b) => HEALTH_SEVERITY[b.health] - HEALTH_SEVERITY[a.health])[0];

  const overlaps = (e: ReviewInput["experiments"][number]) => e.startDate <= periodEnd && e.endDate >= input.periodStart;

  return {
    version: 1,
    periodStart: input.periodStart,
    periodEnd,
    execution: { ...execution(thisWeek), previousRate: execution(lastWeek).rate },
    goals: input.goals,
    patterns: input.patterns.slice(0, 3),
    suggestion: input.suggestion,
    experiments: {
      running: input.experiments.filter((e) => overlaps(e) && e.endDate > periodEnd).map(({ id, title }) => ({ id, title })),
      ended: input.experiments.filter((e) => e.endDate >= input.periodStart && e.endDate <= periodEnd).map(({ id, title }) => ({ id, title })),
    },
    improvement: best && best.delta >= REVIEW_THRESHOLDS.minChange ? { routine: best.routine, previousRate: best.previousRate, rate: best.rate } : null,
    concern: worstGoal
      ? { kind: "goal", goalId: worstGoal.id, title: worstGoal.title, health: worstGoal.health, reason: worstGoal.reason }
      : worst && worst.delta <= -REVIEW_THRESHOLDS.minChange
        ? { kind: "routine", routine: worst.routine, previousRate: worst.previousRate, rate: worst.rate }
        : null,
  };
}
