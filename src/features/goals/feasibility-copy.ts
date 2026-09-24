import type { LocalDate } from "@/lib/dates";
import { formatAmount, formatLocalDate } from "@/lib/format";
import type { FeasibilityResult, FeasibilityState } from "@/server/engines/feasibility";

/**
 * Plain-language feasibility explanations. States describe the plan, never the
 * person (PRD BR-11), and every claim shows its arithmetic (PRD F9).
 */

export type Tone = "positive" | "caution" | "negative" | "neutral";

export const FEASIBILITY_LABELS: Record<FeasibilityState, { label: string; tone: Tone }> = {
  appears_feasible: { label: "Appears feasible", tone: "positive" },
  feasible_with_adjustments: { label: "Feasible with adjustments", tone: "caution" },
  at_risk: { label: "At risk", tone: "caution" },
  currently_unrealistic: { label: "Currently unrealistic", tone: "negative" },
  insufficient_data: { label: "Not enough data yet", tone: "neutral" },
  deadline_passed: { label: "Deadline passed", tone: "neutral" },
  target_reached: { label: "Target reached", tone: "positive" },
};

export interface GoalContext {
  unit: string | null;
  targetValue: number | null;
  deadline: LocalDate | null;
  /** Milestone goals only. */
  milestones?: { done: number; total: number; elapsed: number };
}

export interface FeasibilityCopy {
  label: string;
  tone: Tone;
  sentences: string[];
  adjustments: string[];
}

export function describeFeasibility(result: FeasibilityResult, goal: GoalContext): FeasibilityCopy {
  const { label, tone } = FEASIBILITY_LABELS[result.state];
  const amount = (value: number) => formatAmount(value, goal.unit);
  const per = `per ${result.period}`;
  const sentences: string[] = [];

  switch (result.state) {
    case "target_reached":
      sentences.push("You've reached the target. You can mark this goal complete, or raise the target.");
      break;
    case "deadline_passed":
      sentences.push("The deadline has passed. Set a new deadline, or mark the goal complete or abandoned.");
      break;
    case "insufficient_data":
      if (result.insufficientReason === "no_deadline") sentences.push("Add a deadline to check whether this goal is on pace.");
      if (result.insufficientReason === "no_pace" && result.requiredPace !== null) {
        sentences.push(
          `This goal needs about ${amount(result.requiredPace)} ${per}.`,
          "Add a planned pace, or log progress for two weeks, to compare it with what you're doing.",
        );
      }
      if (result.insufficientReason === "not_enough_milestones") sentences.push("Add at least two milestones to track this goal's pace.");
      if (result.insufficientReason === "too_early") {
        sentences.push("It's early. The pace check starts once a quarter of the time to the deadline has passed.");
      }
      break;
    default:
      if (goal.milestones) {
        const { done, total, elapsed } = goal.milestones;
        sentences.push(`${done} of ${total} milestones done, with ${Math.round(elapsed * 100)}% of the time to the deadline gone.`);
      } else if (result.requiredPace !== null && result.paceUsed !== null && result.current !== null) {
        const to = goal.targetValue !== null ? amount(goal.targetValue) : "the target";
        const by = goal.deadline ? formatLocalDate(goal.deadline) : "the deadline";
        sentences.push(`To get from ${amount(result.current)} to ${to} by ${by}, this goal needs about ${amount(result.requiredPace)} ${per}.`);
        sentences.push(
          result.paceSource === "historical"
            ? `Based on the progress you've logged recently, you're averaging ${amount(result.paceUsed)} ${per}.`
            : `Your planned pace is ${amount(result.paceUsed)} ${per}.`,
        );
        if (result.gap !== null && result.gap > 0) sentences.push(`That's ${amount(result.gap)} ${per} short of what's needed.`);
        else sentences.push("That covers what's needed.");
      }
  }

  const adjustments = result.adjustments.map((adjustment) => {
    switch (adjustment.kind) {
      case "increase_pace":
        return `Raise your pace to about ${amount(adjustment.pace)} ${per}.`;
      case "extend_deadline":
        return `Move the deadline to around ${formatLocalDate(adjustment.deadline)}.`;
      case "lower_target":
        return `Aim for about ${amount(adjustment.target)} by the current deadline.`;
    }
  });

  return { label, tone, sentences, adjustments };
}
