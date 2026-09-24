import { describe, expect, it } from "vitest";

import { assertLocalDate as d, type LocalDate } from "@/lib/dates";

import type { FeasibilityResult, FeasibilityState } from "../feasibility";
import { assessHealth, executionConsistency, planVsReality, type TaskOutcome } from "./health";

function feasibility(state: FeasibilityState): FeasibilityResult {
  return {
    state,
    insufficientReason: state === "insufficient_data" ? "no_pace" : null,
    period: "month",
    current: null,
    remaining: null,
    daysLeft: null,
    requiredPace: null,
    paceUsed: null,
    paceSource: null,
    gap: null,
    ratio: null,
    adjustments: [],
  };
}

const today = d("2026-09-24");
const task = (date: string, status: TaskOutcome["status"]): TaskOutcome => ({ scheduledDate: d(date), status });

function health(overrides: Partial<Parameters<typeof assessHealth>[0]> & { state?: FeasibilityState } = {}) {
  const { state = "appears_feasible", ...rest } = overrides;
  return assessHealth({
    today,
    startDate: d("2026-08-01"),
    feasibility: feasibility(state),
    tasks: [],
    lastEvidenceDate: d("2026-09-23"),
    ...rest,
  });
}

describe("assessHealth (BR-6 order)", () => {
  it("is on track when feasible and active", () => {
    expect(health()).toMatchObject({ state: "on_track", reason: "on_pace" });
  });

  it("is stalled after 14 days without linked activity or outcomes", () => {
    expect(health({ lastEvidenceDate: d("2026-09-10") })).toMatchObject({ state: "stalled", reason: "no_recent_activity" });
    expect(health({ lastEvidenceDate: d("2026-09-11") }).state).toBe("on_track");
  });

  it("counts from the start date for new goals with no evidence yet", () => {
    expect(health({ startDate: d("2026-09-20"), lastEvidenceDate: null }).state).toBe("on_track");
    expect(health({ startDate: d("2026-09-01"), lastEvidenceDate: null }).state).toBe("stalled");
  });

  it("stalled wins over an unrealistic pace", () => {
    expect(health({ state: "currently_unrealistic", lastEvidenceDate: null }).state).toBe("stalled");
  });

  it("needs recalibration when the pace is unrealistic or the deadline passed", () => {
    expect(health({ state: "currently_unrealistic" })).toMatchObject({ state: "needs_recalibration", reason: "pace_unrealistic" });
    expect(health({ state: "deadline_passed" })).toMatchObject({ state: "needs_recalibration", reason: "deadline_passed" });
  });

  it("is at risk on an at-risk pace or low execution", () => {
    expect(health({ state: "at_risk" })).toMatchObject({ state: "at_risk", reason: "pace_at_risk" });
    const tasks = [task("2026-09-20", "done"), task("2026-09-21", "skipped"), task("2026-09-22", "planned"), task("2026-09-23", "planned")];
    expect(health({ tasks })).toMatchObject({ state: "at_risk", reason: "low_execution" });
  });

  it("ignores execution with too few tasks", () => {
    expect(health({ tasks: [task("2026-09-22", "skipped")] }).state).toBe("on_track");
  });

  it("is uncertain with insufficient data", () => {
    expect(health({ state: "insufficient_data" })).toMatchObject({ state: "uncertain", reason: "insufficient_data" });
  });

  it("treats a reached target as on track even without recent activity", () => {
    expect(health({ state: "target_reached", lastEvidenceDate: null })).toMatchObject({ state: "on_track", reason: "target_reached" });
  });
});

describe("executionConsistency", () => {
  it("counts minimum versions as done and excludes today's unfinished tasks", () => {
    const tasks = [
      task("2026-09-22", "done_minimum"),
      task("2026-09-23", "skipped"),
      task("2026-09-24", "planned"),
      task("2026-09-24", "done"),
      task("2026-09-25", "planned"),
      task("2026-08-01", "done"),
    ];
    expect(executionConsistency(tasks, today)).toEqual({ rate: 2 / 3, done: 2, due: 3 });
  });

  it("is null with nothing due", () => {
    expect(executionConsistency([task("2026-09-24", "planned")], today)).toBeNull();
  });
});

describe("planVsReality", () => {
  it("buckets due tasks by the user's week, oldest first", () => {
    const tasks = [
      task("2026-09-01", "done"),
      task("2026-09-02", "skipped"),
      task("2026-09-21", "done"),
      task("2026-09-24", "planned"),
      task("2026-09-26", "planned"),
    ];
    const weeks = planVsReality(tasks, today, 1);
    expect(weeks.map((w) => [w.weekStart, w.planned, w.done])).toEqual([
      ["2026-08-31", 2, 1],
      ["2026-09-07", 0, 0],
      ["2026-09-14", 0, 0],
      ["2026-09-21", 1, 1],
    ] satisfies [LocalDate | string, number, number][]);
  });
});
