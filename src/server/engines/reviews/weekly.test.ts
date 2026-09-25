import { describe, expect, it } from "vitest";

import { addDays, assertLocalDate as d, eachDay } from "@/lib/dates";

import { buildWeeklyReview, type ReviewInput } from "./weekly";

type Task = ReviewInput["tasks"][number];

function week(start: string, routineId: string | null, pattern: boolean[]): Task[] {
  return eachDay(d(start), addDays(d(start), 6))
    .slice(0, pattern.length)
    .map((date, i) => ({ routineId, scheduledDate: date, status: pattern[i] ? "done" : "skipped" }));
}

const base: ReviewInput = {
  periodStart: d("2026-09-14"),
  tasks: [],
  routines: [
    { id: "r1", name: "Design practice" },
    { id: "r2", name: "Gym" },
  ],
  goals: [],
  patterns: [],
  suggestion: null,
  experiments: [],
};

describe("buildWeeklyReview", () => {
  it("summarizes execution for the week and the week before", () => {
    const review = buildWeeklyReview({
      ...base,
      tasks: [...week("2026-09-07", "r1", [true, false, false, false]), ...week("2026-09-14", "r1", [true, true, true, false])],
    });
    expect(review.periodEnd).toBe("2026-09-20");
    expect(review.execution).toEqual({ done: 3, planned: 4, rate: 0.75, previousRate: 0.25 });
  });

  it("calls out the biggest week-over-week improvement and drop", () => {
    const review = buildWeeklyReview({
      ...base,
      tasks: [
        ...week("2026-09-07", "r1", [false, false, true, false]),
        ...week("2026-09-14", "r1", [true, true, true, false]),
        ...week("2026-09-07", "r2", [true, true, true]),
        ...week("2026-09-14", "r2", [true, false, false]),
      ],
    });
    expect(review.improvement).toEqual({ routine: "Design practice", previousRate: 0.25, rate: 0.75 });
    expect(review.concern).toEqual({ kind: "routine", routine: "Gym", previousRate: 1, rate: 1 / 3 });
  });

  it("prefers a goal that needs attention as the main concern", () => {
    const review = buildWeeklyReview({
      ...base,
      goals: [
        { id: "g1", title: "Portfolio", health: "at_risk", reason: "low_execution" },
        { id: "g2", title: "Savings", health: "needs_recalibration", reason: "pace_unrealistic" },
        { id: "g3", title: "Run", health: "on_track", reason: "on_pace" },
      ],
    });
    expect(review.concern).toMatchObject({ kind: "goal", goalId: "g2" });
  });

  it("ignores routines with too few tasks to compare, and small changes", () => {
    const review = buildWeeklyReview({
      ...base,
      tasks: [...week("2026-09-07", "r1", [true]), ...week("2026-09-14", "r1", [false]), ...week("2026-09-07", "r2", [true, true, false]), ...week("2026-09-14", "r2", [true, true, true])],
    });
    // r2 went 67% → 100% (+33 pp) and counts; r1 has one task per week and doesn't.
    expect(review.improvement?.routine).toBe("Gym");
    expect(review.concern).toBeNull();
  });

  it("lists experiments running through and ending in the week, and caps patterns at 3", () => {
    const review = buildWeeklyReview({
      ...base,
      patterns: [1, 2, 3, 4].map((i) => ({ id: `p${i}`, summary: `s${i}`, confidence: "high" })),
      experiments: [
        { id: "e1", title: "Shorter sessions", startDate: d("2026-09-01"), endDate: d("2026-09-16"), status: "active" },
        { id: "e2", title: "Move gym", startDate: d("2026-09-10"), endDate: d("2026-09-30"), status: "active" },
        { id: "e3", title: "Old", startDate: d("2026-08-01"), endDate: d("2026-08-20"), status: "completed" },
      ],
    });
    expect(review.patterns).toHaveLength(3);
    expect(review.experiments).toEqual({ running: [{ id: "e2", title: "Move gym" }], ended: [{ id: "e1", title: "Shorter sessions" }] });
  });

  it("has no execution rate for an empty week", () => {
    expect(buildWeeklyReview(base).execution).toEqual({ done: 0, planned: 0, rate: null, previousRate: null });
  });
});
