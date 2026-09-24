import { addDays, diffDays, type LocalDate, monthsBetween } from "@/lib/dates";
import type { GoalInput, PacePeriod } from "@/types/engine";

import { currentValue, goalDirection, milestoneProgress, outcomesWithValues } from "../progress/current-value";

/**
 * Goal feasibility (ARCHITECTURE.md §8.1, PRD BR-5).
 * Compares the pace the goal needs with the pace it's getting: historical if there
 * is enough evidence, otherwise the user's planned pace.
 */

export const FEASIBILITY_ENGINE_VERSION = 1;

export const FEASIBILITY_THRESHOLDS = {
  feasible: 1,
  withAdjustments: 0.75,
  atRisk: 0.4,
  /** Historical pace needs this many days since the goal started… */
  minHistoryDays: 14,
  /** …and this many readings. */
  minOutcomes: 3,
  /** Historical pace is measured over at most this many recent days. */
  historyWindowDays: 60,
  /** Milestone goals: need this share of the timeline elapsed before judging. */
  milestoneMinElapsed: 0.25,
  milestoneMinCount: 2,
} as const;

export type FeasibilityState =
  | "appears_feasible"
  | "feasible_with_adjustments"
  | "at_risk"
  | "currently_unrealistic"
  | "insufficient_data"
  | "deadline_passed"
  | "target_reached";

export type InsufficientReason = "no_deadline" | "no_pace" | "not_enough_milestones" | "too_early";

export type Adjustment =
  | { kind: "extend_deadline"; deadline: LocalDate }
  | { kind: "lower_target"; target: number }
  | { kind: "increase_pace"; pace: number };

export interface FeasibilityResult {
  state: FeasibilityState;
  insufficientReason: InsufficientReason | null;
  /** Unit of time for every pace below. */
  period: PacePeriod;
  current: number | null;
  /** Distance left to the target, always ≥ 0. */
  remaining: number | null;
  daysLeft: number | null;
  requiredPace: number | null;
  paceUsed: number | null;
  paceSource: "historical" | "planned" | null;
  /** requiredPace − paceUsed; positive means behind. */
  gap: number | null;
  /** paceUsed ÷ requiredPace (milestone goals: milestone progress ÷ time elapsed). */
  ratio: number | null;
  adjustments: Adjustment[];
}

const AVERAGE_DAYS: Record<PacePeriod, number> = { day: 1, week: 7, month: 365.25 / 12 };

function periodsBetween(from: LocalDate, to: LocalDate, period: PacePeriod): number {
  if (period === "month") return monthsBetween(from, to);
  return diffDays(from, to) / AVERAGE_DAYS[period];
}

export function stateForRatio(ratio: number): FeasibilityState {
  if (ratio >= FEASIBILITY_THRESHOLDS.feasible) return "appears_feasible";
  if (ratio >= FEASIBILITY_THRESHOLDS.withAdjustments) return "feasible_with_adjustments";
  if (ratio >= FEASIBILITY_THRESHOLDS.atRisk) return "at_risk";
  return "currently_unrealistic";
}

function emptyResult(period: PacePeriod, partial: Partial<FeasibilityResult>): FeasibilityResult {
  return {
    state: "insufficient_data",
    insufficientReason: null,
    period,
    current: null,
    remaining: null,
    daysLeft: null,
    requiredPace: null,
    paceUsed: null,
    paceSource: null,
    gap: null,
    ratio: null,
    adjustments: [],
    ...partial,
  };
}

/** Direction-adjusted progress per day over the recent window, or null without enough evidence. */
export function historicalPacePerDay(goal: GoalInput, today: LocalDate): number | null {
  const { minHistoryDays, minOutcomes, historyWindowDays } = FEASIBILITY_THRESHOLDS;
  const daysSinceStart = diffDays(goal.startDate, today);
  const readings = outcomesWithValues(goal.outcomes).filter((o) => o.localDate <= today);
  if (daysSinceStart < minHistoryDays || readings.length < minOutcomes || goal.baselineValue === null) return null;

  const windowDays = Math.min(historyWindowDays, daysSinceStart);
  const windowStart = addDays(today, -windowDays);
  const direction = goalDirection(goal);

  if (goal.measurementType === "cumulative") {
    const added = readings.filter((o) => o.localDate > windowStart).reduce((sum, o) => sum + o.value, 0);
    return (added * direction) / windowDays;
  }

  // Level goals: change from the last reading at or before the window start (else baseline) to the latest.
  const before = readings.filter((o) => o.localDate <= windowStart);
  const startValue = before.length > 0 ? before[before.length - 1].value : goal.baselineValue;
  const latest = readings[readings.length - 1].value;
  return ((latest - startValue) * direction) / windowDays;
}

export function assessFeasibility(goal: GoalInput, today: LocalDate): FeasibilityResult {
  const period: PacePeriod = goal.plannedPace?.period ?? (goal.measurementType === "milestone" ? "week" : "month");
  if (goal.measurementType === "milestone") return assessMilestoneGoal(goal, today, period);

  const current = currentValue(goal);
  if (current === null || goal.targetValue === null) return emptyResult(period, {});

  const direction = goalDirection(goal);
  const remaining = Math.max(0, (goal.targetValue - current) * direction);
  if (remaining === 0) return emptyResult(period, { state: "target_reached", current, remaining });
  if (!goal.deadline) return emptyResult(period, { current, remaining, insufficientReason: "no_deadline" });

  const daysLeft = diffDays(today, goal.deadline);
  if (daysLeft <= 0) return emptyResult(period, { state: "deadline_passed", current, remaining, daysLeft });

  const requiredPerDay = remaining / daysLeft;
  const requiredPace = remaining / periodsBetween(today, goal.deadline, period);

  const historical = historicalPacePerDay(goal, today);
  const planned = goal.plannedPace ? goal.plannedPace.amount / AVERAGE_DAYS[goal.plannedPace.period] : null;
  const pacePerDay = historical ?? planned;
  const paceSource = historical !== null ? "historical" : planned !== null ? "planned" : null;

  if (pacePerDay === null) {
    return emptyResult(period, { current, remaining, daysLeft, requiredPace, insufficientReason: "no_pace" });
  }

  // A stated plan converts exactly; history converts at the average period length.
  const paceUsed =
    paceSource === "planned" && goal.plannedPace?.period === period
      ? goal.plannedPace.amount
      : pacePerDay * AVERAGE_DAYS[period];
  const ratio = Math.max(0, pacePerDay / requiredPerDay);
  const state = stateForRatio(ratio);

  const adjustments: Adjustment[] = [];
  if (state !== "appears_feasible") {
    adjustments.push({ kind: "increase_pace", pace: requiredPace });
    if (pacePerDay > 0) {
      adjustments.push({ kind: "extend_deadline", deadline: addDays(today, Math.ceil(remaining / pacePerDay)) });
      adjustments.push({ kind: "lower_target", target: current + direction * pacePerDay * daysLeft });
    }
  }

  return {
    state,
    insufficientReason: null,
    period,
    current,
    remaining,
    daysLeft,
    requiredPace,
    paceUsed,
    paceSource,
    gap: requiredPace - paceUsed,
    ratio,
    adjustments,
  };
}

function assessMilestoneGoal(goal: GoalInput, today: LocalDate, period: PacePeriod): FeasibilityResult {
  const progress = milestoneProgress(goal);
  const counted = goal.milestones.filter((m) => m.status !== "dropped").length;
  if (progress === 1) return emptyResult(period, { state: "target_reached" });
  if (!goal.deadline) return emptyResult(period, { insufficientReason: "no_deadline" });

  const daysLeft = diffDays(today, goal.deadline);
  if (daysLeft <= 0) return emptyResult(period, { state: "deadline_passed", daysLeft });
  if (progress === null || counted < FEASIBILITY_THRESHOLDS.milestoneMinCount) {
    return emptyResult(period, { daysLeft, insufficientReason: "not_enough_milestones" });
  }

  const totalDays = diffDays(goal.startDate, goal.deadline);
  const elapsed = diffDays(goal.startDate, today) / totalDays;
  if (elapsed < FEASIBILITY_THRESHOLDS.milestoneMinElapsed) {
    return emptyResult(period, { daysLeft, insufficientReason: "too_early" });
  }

  const ratio = progress / elapsed;
  const state = stateForRatio(ratio);
  const adjustments: Adjustment[] = [];
  if (state !== "appears_feasible" && progress > 0) {
    // At the current rate of milestone completion, all milestones would be done by:
    adjustments.push({
      kind: "extend_deadline",
      deadline: addDays(goal.startDate, Math.ceil(diffDays(goal.startDate, today) / progress)),
    });
  }
  return emptyResult(period, { state, daysLeft, ratio, adjustments });
}
