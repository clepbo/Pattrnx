import type { HealthResult, HealthState } from "@/server/engines/progress/health";

import type { Tone } from "./feasibility-copy";

/** Goal health labels and explanations (PRD BR-6, BR-11: describe the plan, not the person). */

export const HEALTH_LABELS: Record<HealthState, { label: string; tone: Tone }> = {
  on_track: { label: "On track", tone: "positive" },
  at_risk: { label: "At risk", tone: "caution" },
  stalled: { label: "Stalled", tone: "caution" },
  uncertain: { label: "Uncertain", tone: "neutral" },
  needs_recalibration: { label: "Needs recalibration", tone: "negative" },
};

export function describeHealth(health: HealthResult): string[] {
  const execution = health.execution
    ? `${health.execution.done} of ${health.execution.due} planned tasks were done in the last 4 weeks.`
    : null;

  switch (health.reason) {
    case "no_recent_activity":
      return [
        health.daysSinceEvidence === null
          ? "Nothing has been logged towards this goal since it started."
          : `Nothing has been logged towards this goal for ${health.daysSinceEvidence} days.`,
        "If it's still a priority, a small scheduled action can restart it. If not, pausing it is a fine choice.",
      ];
    case "pace_unrealistic":
      return ["At the current pace, the target won't be reached by the deadline.", "Adjusting the pace, deadline or target keeps the plan honest."];
    case "deadline_passed":
      return ["The deadline has passed. Set a new one, or mark the goal complete."];
    case "pace_at_risk":
      return ["The current pace is below what the deadline needs.", ...(execution ? [execution] : [])];
    case "low_execution":
      return [execution ?? "", "A smaller plan that actually happens usually beats a bigger one that doesn't."].filter(Boolean);
    case "insufficient_data":
      return ["There isn't enough information to judge the pace yet.", ...(execution ? [execution] : [])];
    case "target_reached":
      return ["The target has been reached."];
    case "on_pace":
      return ["The pace covers what the deadline needs.", ...(execution ? [execution] : [])];
  }
}
