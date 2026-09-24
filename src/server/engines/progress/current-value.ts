import type { GoalInput, OutcomeInput } from "@/types/engine";

/** +1 when the goal is to increase the number, −1 when it's to decrease it. */
export function goalDirection(goal: Pick<GoalInput, "baselineValue" | "targetValue">): 1 | -1 {
  return (goal.targetValue ?? 0) >= (goal.baselineValue ?? 0) ? 1 : -1;
}

export function outcomesWithValues(outcomes: OutcomeInput[]): (OutcomeInput & { value: number })[] {
  return outcomes.filter((o): o is OutcomeInput & { value: number } => o.value !== null);
}

/**
 * The goal's current number: baseline plus all contributions (cumulative) or the
 * latest reading (level). Null for milestone goals, which have no number.
 */
export function currentValue(goal: GoalInput): number | null {
  if (goal.measurementType === "milestone" || goal.baselineValue === null) return null;
  const readings = outcomesWithValues(goal.outcomes);
  if (goal.measurementType === "cumulative") {
    return readings.reduce((sum, o) => sum + o.value, goal.baselineValue);
  }
  return readings.length > 0 ? readings[readings.length - 1].value : goal.baselineValue;
}

/** Share of baseline → target covered, clamped to 0–1. Null for milestone goals. */
export function outcomeProgress(goal: GoalInput): number | null {
  const current = currentValue(goal);
  if (current === null || goal.targetValue === null || goal.baselineValue === null) return null;
  const span = goal.targetValue - goal.baselineValue;
  return Math.min(1, Math.max(0, (current - goal.baselineValue) / span));
}

/** Done ÷ non-dropped milestones, or null when there are none. */
export function milestoneProgress(goal: Pick<GoalInput, "milestones">): number | null {
  const counted = goal.milestones.filter((m) => m.status !== "dropped");
  if (counted.length === 0) return null;
  return counted.filter((m) => m.status === "done").length / counted.length;
}
