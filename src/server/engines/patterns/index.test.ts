import { describe, expect, it } from "vitest";

import { personas } from "../../../../tests/fixtures/behavior";
import { wordingViolations } from "../language/guard";
import { DETECTORS, detectPatterns, isVisible, selectVisible } from ".";
import type { DetectedPattern, PatternSnapshot } from "./types";

function visible(snapshot: PatternSnapshot): DetectedPattern[] {
  const result = detectPatterns(snapshot);
  return result.status === "ready" ? result.patterns.filter((p) => isVisible(p.confidence)) : [];
}

function only(snapshot: PatternSnapshot, detectorKey: string): DetectedPattern {
  const found = visible(snapshot).filter((p) => p.detectorKey === detectorKey);
  expect(found, `${detectorKey} in ${JSON.stringify(visible(snapshot).map((p) => p.fingerprint))}`).toHaveLength(1);
  return found[0];
}

describe("planted patterns are found at moderate+ confidence", () => {
  it("weekday drop-off: Wednesday", () => {
    const p = only(personas.weekdayDropoff(), "timing.weekday");
    expect(p.subject).toEqual({ routineId: "r-design", weekday: "3" });
    expect(p.summary).toMatch(/Design practice gets done \d+% of the time on Wednesdays/);
  });

  it("breaking point: after about three sessions", () => {
    const p = only(personas.breakingPoint(), "breaking_point.run_end");
    expect(p.evidence.typicalLength).toBe(3);
    expect(p.confidence).toMatch(/high|very_high/);
  });

  it("overplanning: heavy days get less done", () => {
    const p = only(personas.overplanner(), "deviation.overplanning");
    expect(p.effectSize).toBeGreaterThan(0.3);
  });

  it("check-in conditioned: fewer tasks after high-workload days", () => {
    const p = only(personas.workloadSensitive(), "sequence.checkin_conditioned");
    expect(p.subject.condition).toBe("high_workload");
    expect(p.summary).toContain("On days after high-workload days");
  });

  it("activity follows: spending after difficult meetings", () => {
    const p = only(personas.spendingAfterMeetings(), "sequence.activity_follows");
    expect(p.subject).toEqual({ activityTypeId: "t-meeting", followedById: "t-spend" });
  });

  it("sustainable rate: planned 5, done about 3", () => {
    const p = only(personas.unsustainable(), "frequency.sustainable_rate");
    expect(p.evidence.plannedPerWeek).toBe(5);
    expect(p.evidence.donePerWeek).toBeLessThanOrEqual(3.5);
  });

  it("hour band: evening portfolio work", () => {
    const p = only(personas.eveningWorker(), "timing.hour_band");
    expect(p.subject.band).toBe("evening");
  });

  it("loop: plan → abandon → re-plan, twice in Career, not in Finance", () => {
    const p = only(personas.replanner(), "loop.plan_abandon_replan");
    expect(p.subject.lifeAreaId).toBe("area-career");
    expect(p.observations).toBe(2);
    expect(p.confidence).toBe("moderate");
  });
});

describe("no structure, no patterns", () => {
  it.each(Array.from({ length: 10 }, (_, i) => i + 1))("noise user (seed %i) has no visible patterns", (seed) => {
    expect(visible(personas.noise(seed)).map((p) => `${p.fingerprint} (${p.confidence}, z=${p.z?.toFixed(2)})`)).toEqual([]);
  });

  it("personas don't trip each other's detectors", () => {
    expect(visible(personas.weekdayDropoff()).map((p) => p.detectorKey)).toEqual(["timing.weekday"]);
    expect(visible(personas.eveningWorker()).map((p) => p.detectorKey)).toEqual(["timing.hour_band"]);
  });
});

describe("history gate (BR-2)", () => {
  it("computes nothing with under 21 days of history", () => {
    expect(detectPatterns(personas.newUser())).toEqual({ status: "learning", daysOfHistory: 10, daysRemaining: 11, patterns: [] });
  });
});

describe("selectVisible", () => {
  const base = { effectSize: 0.5 };
  const patterns = [
    { ...base, fingerprint: "a", confidence: "moderate" as const },
    { ...base, fingerprint: "b", confidence: "very_high" as const },
    { ...base, fingerprint: "c", confidence: "low" as const },
    { ...base, fingerprint: "d", confidence: "high" as const },
    { ...base, fingerprint: "e", confidence: "high" as const, effectSize: 0.9 },
  ];

  it("drops low confidence, ranks by confidence × effect, and caps the count", () => {
    expect(selectVisible(patterns).map((p) => p.fingerprint)).toEqual(["e", "b", "d"]);
    expect(selectVisible(patterns, { limit: 1 }).map((p) => p.fingerprint)).toEqual(["e"]);
  });

  it("never returns an excluded (dismissed or suppressed) fingerprint", () => {
    expect(selectVisible(patterns, { exclude: new Set(["e", "b"]) }).map((p) => p.fingerprint)).toEqual(["d", "a"]);
  });
});

describe("language (BR-1)", () => {
  it("every detector has a template, and all planted summaries pass the wording guard", () => {
    const all = [
      personas.weekdayDropoff(),
      personas.breakingPoint(),
      personas.overplanner(),
      personas.workloadSensitive(),
      personas.spendingAfterMeetings(),
      personas.unsustainable(),
      personas.eveningWorker(),
      personas.replanner(),
    ].flatMap((s) => {
      const r = detectPatterns(s);
      return r.status === "ready" ? r.patterns : [];
    });
    expect(new Set(all.map((p) => p.detectorKey))).toEqual(new Set(DETECTORS.map((d) => d.key)));
    for (const p of all) expect(wordingViolations(p.summary), p.summary).toEqual([]);
  });

  it("the guard catches causal and character language", () => {
    expect(wordingViolations("You skip workouts because you are tired")).toHaveLength(2);
    expect(wordingViolations("Spending causes stress")).toHaveLength(1);
    expect(wordingViolations("You always fail on Mondays")).toHaveLength(2);
  });
});
