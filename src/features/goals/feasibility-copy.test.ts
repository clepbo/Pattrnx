import { describe, expect, it } from "vitest";

import { assertLocalDate as d } from "@/lib/dates";
import { assessFeasibility } from "@/server/engines/feasibility";

import { describeFeasibility } from "./feasibility-copy";

describe("describeFeasibility", () => {
  it("explains the blueprint savings example with its arithmetic", () => {
    const result = assessFeasibility(
      {
        measurementType: "cumulative",
        baselineValue: 400_000,
        targetValue: 2_000_000,
        startDate: d("2026-09-01"),
        deadline: d("2027-03-01"),
        plannedPace: { amount: 80_000, period: "month" },
        outcomes: [],
        milestones: [],
      },
      d("2026-09-01"),
    );
    const copy = describeFeasibility(result, { unit: "NGN", targetValue: 2_000_000, deadline: d("2027-03-01") });

    expect(copy.label).toBe("Currently unrealistic");
    expect(copy.sentences).toEqual([
      "To get from ₦400,000 to ₦2,000,000 by Mon, 1 Mar 2027, this goal needs about ₦266,667 per month.",
      "Your planned pace is ₦80,000 per month.",
      "That's ₦186,667 per month short of what's needed.",
    ]);
    expect(copy.adjustments[0]).toBe("Raise your pace to about ₦266,667 per month.");
    expect(copy.adjustments).toHaveLength(3);
  });

  it("never describes the person, only the plan (BR-11)", () => {
    const states = ["appears_feasible", "at_risk", "currently_unrealistic", "insufficient_data"] as const;
    for (const state of states) {
      const copy = describeFeasibility(
        {
          state,
          insufficientReason: state === "insufficient_data" ? "no_deadline" : null,
          period: "week",
          current: 1,
          remaining: 1,
          daysLeft: 10,
          requiredPace: 2,
          paceUsed: 1,
          paceSource: "planned",
          gap: 1,
          ratio: 0.5,
          adjustments: [],
        },
        { unit: "pages", targetValue: 2, deadline: d("2026-10-01") },
      );
      const text = [copy.label, ...copy.sentences].join(" ");
      expect(text).not.toMatch(/\b(fail|failure|lazy|you are|you're not)\b/i);
    }
  });
});
