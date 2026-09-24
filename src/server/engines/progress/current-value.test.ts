import { describe, expect, it } from "vitest";

import { assertLocalDate as d } from "@/lib/dates";
import type { GoalInput } from "@/types/engine";

import { currentValue, goalDirection, milestoneProgress, outcomeProgress } from "./current-value";

const base: GoalInput = {
  measurementType: "cumulative",
  baselineValue: 100,
  targetValue: 200,
  startDate: d("2026-09-01"),
  deadline: null,
  plannedPace: null,
  outcomes: [],
  milestones: [],
};

describe("currentValue", () => {
  it("adds contributions to the baseline for cumulative goals", () => {
    expect(
      currentValue({ ...base, outcomes: [{ localDate: d("2026-09-02"), value: 30 }, { localDate: d("2026-09-03"), value: null }] }),
    ).toBe(130);
  });

  it("uses the latest reading for level goals, else the baseline", () => {
    const level = { ...base, measurementType: "level" as const };
    expect(currentValue(level)).toBe(100);
    expect(
      currentValue({ ...level, outcomes: [{ localDate: d("2026-09-02"), value: 150 }, { localDate: d("2026-09-03"), value: 140 }] }),
    ).toBe(140);
  });

  it("is null for milestone goals", () => {
    expect(currentValue({ ...base, measurementType: "milestone" })).toBeNull();
  });
});

describe("outcomeProgress", () => {
  it("is the share of baseline → target covered, clamped to 0–1", () => {
    expect(outcomeProgress({ ...base, outcomes: [{ localDate: d("2026-09-02"), value: 50 }] })).toBe(0.5);
    expect(outcomeProgress({ ...base, outcomes: [{ localDate: d("2026-09-02"), value: 500 }] })).toBe(1);
    expect(outcomeProgress({ ...base, outcomes: [{ localDate: d("2026-09-02"), value: -50 }] })).toBe(0);
  });

  it("works for decreasing targets", () => {
    const loss = { ...base, measurementType: "level" as const, baselineValue: 90, targetValue: 80 };
    expect(goalDirection(loss)).toBe(-1);
    expect(outcomeProgress({ ...loss, outcomes: [{ localDate: d("2026-09-02"), value: 85 }] })).toBe(0.5);
  });

  it("is null for milestone goals", () => {
    expect(outcomeProgress({ ...base, measurementType: "milestone" })).toBeNull();
  });
});

describe("milestoneProgress", () => {
  it("ignores dropped milestones", () => {
    expect(milestoneProgress({ milestones: [{ status: "done" }, { status: "pending" }, { status: "dropped" }] })).toBe(0.5);
  });

  it("is null with no counted milestones", () => {
    expect(milestoneProgress({ milestones: [{ status: "dropped" }] })).toBeNull();
    expect(milestoneProgress({ milestones: [] })).toBeNull();
  });
});
