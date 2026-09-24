import { describe, expect, it } from "vitest";

import type { HealthReason, HealthResult } from "@/server/engines/progress/health";

import { describeHealth } from "./health-copy";

const reasons: HealthReason[] = [
  "no_recent_activity",
  "pace_unrealistic",
  "deadline_passed",
  "pace_at_risk",
  "low_execution",
  "insufficient_data",
  "target_reached",
  "on_pace",
];

describe("describeHealth", () => {
  it.each(reasons)("%s has an explanation that describes the plan, not the person", (reason) => {
    const sentences = describeHealth({ state: "at_risk", reason, execution: { rate: 0.25, done: 1, due: 4 }, daysSinceEvidence: 20 } satisfies HealthResult);
    expect(sentences.length).toBeGreaterThan(0);
    expect(sentences.join(" ")).not.toMatch(/\b(fail|failure|lazy|you are|you're not|because)\b/i);
  });

  it("includes execution counts when relevant", () => {
    expect(
      describeHealth({ state: "at_risk", reason: "low_execution", execution: { rate: 0.25, done: 1, due: 4 }, daysSinceEvidence: 1 }),
    ).toContain("1 of 4 planned tasks were done in the last 4 weeks.");
  });
});
