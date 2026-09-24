import { describe, expect, it } from "vitest";

import { personas } from "../../../../tests/fixtures/behavior";
import { detectPatterns, isVisible } from ".";
import type { PatternSnapshot } from "./types";

/**
 * Statistical calibration of the whole engine across many synthetic users
 * (ARCHITECTURE.md §12.2). Slow-ish, so opt-in: `pnpm test:robustness`.
 * Re-run whenever thresholds or detectors change.
 */
const visible = (s: PatternSnapshot) => {
  const r = detectPatterns(s);
  return r.status === "ready" ? r.patterns.filter((p) => isVisible(p.confidence)) : [];
};

describe.skipIf(!process.env.PATTERN_ROBUSTNESS)("pattern engine calibration", () => {
  it("shows a pattern to at most 3% of structureless users", { timeout: 300_000 }, () => {
    let withPattern = 0;
    for (let seed = 1; seed <= 300; seed++) if (visible(personas.noise(seed)).length > 0) withPattern++;
    expect(withPattern / 300).toBeLessThanOrEqual(0.03);
  });

  it.each([
    ["weekdayDropoff", "timing.weekday"],
    ["breakingPoint", "breaking_point.run_end"],
    ["overplanner", "deviation.overplanning"],
    ["workloadSensitive", "sequence.checkin_conditioned"],
    ["spendingAfterMeetings", "sequence.activity_follows"],
    ["unsustainable", "frequency.sustainable_rate"],
    ["eveningWorker", "timing.hour_band"],
  ] as const)("finds the planted %s pattern in at least 90% of seeds", (persona, key) => {
    const build = personas[persona] as (seed: number) => PatternSnapshot;
    let found = 0;
    for (let seed = 1; seed <= 30; seed++) if (visible(build(seed * 17)).some((p) => p.detectorKey === key)) found++;
    expect(found / 30).toBeGreaterThanOrEqual(0.9);
  });
});
