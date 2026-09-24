import { describe, expect, it } from "vitest";

import { assertLocalDate as d } from "@/lib/dates";
import type { GoalInput } from "@/types/engine";

import { assessFeasibility, historicalPacePerDay, stateForRatio } from ".";

function goal(overrides: Partial<GoalInput> = {}): GoalInput {
  return {
    measurementType: "cumulative",
    baselineValue: 400_000,
    targetValue: 2_000_000,
    startDate: d("2026-09-01"),
    deadline: d("2027-03-01"),
    plannedPace: null,
    outcomes: [],
    milestones: [],
    ...overrides,
  };
}

describe("stateForRatio (BR-5 bands)", () => {
  it.each([
    [1.2, "appears_feasible"],
    [1, "appears_feasible"],
    [0.99, "feasible_with_adjustments"],
    [0.75, "feasible_with_adjustments"],
    [0.74, "at_risk"],
    [0.4, "at_risk"],
    [0.39, "currently_unrealistic"],
    [0, "currently_unrealistic"],
  ] as const)("ratio %s → %s", (ratio, state) => {
    expect(stateForRatio(ratio)).toBe(state);
  });
});

describe("blueprint example: ₦400k → ₦2M in 6 months (PRD F3)", () => {
  const result = assessFeasibility(
    goal({ plannedPace: { amount: 80_000, period: "month" } }),
    d("2026-09-01"),
  );

  it("needs ₦266,667/month against ₦80,000/month, a ₦186,667 gap", () => {
    expect(result.requiredPace).toBeCloseTo(266_666.67, 1);
    expect(result.paceUsed).toBe(80_000);
    expect(result.gap).toBeCloseTo(186_666.67, 1);
    expect(result.period).toBe("month");
    expect(result.paceSource).toBe("planned");
  });

  it("is currently unrealistic", () => {
    expect(result.state).toBe("currently_unrealistic");
    expect(result.ratio).toBeCloseTo(0.3, 1);
  });

  it("offers concrete adjustments: more pace, a later deadline, or a lower target", () => {
    const kinds = result.adjustments.map((a) => a.kind);
    expect(kinds).toEqual(["increase_pace", "extend_deadline", "lower_target"]);
    const extend = result.adjustments.find((a) => a.kind === "extend_deadline");
    // 1.6M at ~₦2,630/day ≈ 609 days ≈ 20 months.
    expect(extend && extend.kind === "extend_deadline" && extend.deadline).toBe("2028-05-02");
    const lower = result.adjustments.find((a) => a.kind === "lower_target");
    expect(lower && lower.kind === "lower_target" && lower.target).toBeCloseTo(400_000 + (80_000 / 30.4375) * 181, 0);
  });
});

describe("pace sources", () => {
  const today = d("2026-11-01"); // 61 days after start
  const saving = goal({
    plannedPace: { amount: 300_000, period: "month" },
    outcomes: [
      { localDate: d("2026-09-10"), value: 50_000 },
      { localDate: d("2026-10-01"), value: 50_000 },
      { localDate: d("2026-10-20"), value: 60_000 },
    ],
  });

  it("prefers historical pace once there is enough evidence", () => {
    const result = assessFeasibility(saving, today);
    expect(result.paceSource).toBe("historical");
    expect(result.current).toBe(560_000);
    // 160k over the last 60 days.
    expect(result.paceUsed).toBeCloseTo((160_000 / 60) * 30.4375, 0);
    expect(result.state).toBe("currently_unrealistic");
  });

  it("falls back to the planned pace with fewer than 3 readings", () => {
    const result = assessFeasibility({ ...saving, outcomes: saving.outcomes.slice(0, 2) }, today);
    expect(result.paceSource).toBe("planned");
    expect(result.paceUsed).toBe(300_000);
  });

  it("ignores history in the first 14 days", () => {
    expect(historicalPacePerDay(saving, d("2026-09-14"))).toBeNull();
  });

  it("reports insufficient data when there is neither history nor a plan", () => {
    const result = assessFeasibility(goal(), d("2026-09-01"));
    expect(result).toMatchObject({ state: "insufficient_data", insufficientReason: "no_pace" });
    expect(result.requiredPace).toBeCloseTo(266_666.67, 1);
  });

  it("uses the planned pace period for all figures", () => {
    const result = assessFeasibility(goal({ plannedPace: { amount: 70_000, period: "week" } }), d("2026-09-01"));
    expect(result.period).toBe("week");
    expect(result.paceUsed).toBe(70_000);
    expect(result.requiredPace).toBeCloseTo(1_600_000 / (181 / 7), 0);
    expect(result.state).toBe("appears_feasible");
    expect(result.adjustments).toEqual([]);
  });
});

describe("level goals and direction", () => {
  const weightLoss = goal({
    measurementType: "level",
    baselineValue: 90,
    targetValue: 80,
    unit: undefined,
    startDate: d("2026-09-01"),
    deadline: d("2026-12-30"),
    outcomes: [
      { localDate: d("2026-09-15"), value: 89 },
      { localDate: d("2026-10-01"), value: 88 },
      { localDate: d("2026-10-31"), value: 86 },
    ],
  } as Partial<GoalInput>);

  it("treats a falling number as progress when the target is lower", () => {
    const result = assessFeasibility(weightLoss, d("2026-10-31"));
    expect(result.current).toBe(86);
    expect(result.remaining).toBe(6);
    // 4 kg over 60 days vs 6 kg in 60 days.
    expect(result.ratio).toBeCloseTo(4 / 6, 2);
    expect(result.state).toBe("at_risk");
    const lower = result.adjustments.find((a) => a.kind === "lower_target");
    expect(lower && lower.kind === "lower_target" && lower.target).toBeCloseTo(82, 5);
  });

  it("gives a ratio of 0 (not negative) when moving the wrong way", () => {
    const result = assessFeasibility(
      { ...weightLoss, outcomes: [...weightLoss.outcomes, { localDate: d("2026-10-31"), value: 92 }] },
      d("2026-10-31"),
    );
    expect(result.ratio).toBe(0);
    expect(result.state).toBe("currently_unrealistic");
    expect(result.adjustments.map((a) => a.kind)).toEqual(["increase_pace"]);
  });
});

describe("edge states", () => {
  it("target reached", () => {
    expect(assessFeasibility(goal({ outcomes: [{ localDate: d("2026-09-02"), value: 1_600_000 }] }), d("2026-09-03")).state).toBe(
      "target_reached",
    );
  });

  it("deadline passed", () => {
    expect(assessFeasibility(goal(), d("2027-03-01")).state).toBe("deadline_passed");
  });

  it("no deadline", () => {
    expect(assessFeasibility(goal({ deadline: null }), d("2026-09-01"))).toMatchObject({
      state: "insufficient_data",
      insufficientReason: "no_deadline",
    });
  });

  it("outcomes without values don't count as readings", () => {
    const g = goal({
      plannedPace: { amount: 1, period: "day" },
      outcomes: [1, 2, 3].map((i) => ({ localDate: d(`2026-09-0${i}`), value: null })),
    });
    expect(assessFeasibility(g, d("2026-10-15")).paceSource).toBe("planned");
  });
});

describe("milestone goals", () => {
  const designer = goal({
    measurementType: "milestone",
    baselineValue: null,
    targetValue: null,
    startDate: d("2026-01-01"),
    deadline: d("2026-12-31"),
    milestones: [{ status: "done" }, { status: "done" }, { status: "pending" }, { status: "dropped" }],
  });

  it("compares milestone progress with time elapsed", () => {
    // 2 of 3 counted milestones done, ~50% of the year gone.
    const result = assessFeasibility(designer, d("2026-07-02"));
    expect(result.ratio).toBeCloseTo((2 / 3) / (182 / 364), 2);
    expect(result.state).toBe("appears_feasible");
  });

  it("is too early to judge in the first quarter", () => {
    expect(assessFeasibility(designer, d("2026-03-01")).insufficientReason).toBe("too_early");
  });

  it("needs at least two milestones", () => {
    const result = assessFeasibility({ ...designer, milestones: [{ status: "pending" }] }, d("2026-07-02"));
    expect(result.insufficientReason).toBe("not_enough_milestones");
  });

  it("suggests the deadline implied by the current rate when behind", () => {
    const behind = { ...designer, milestones: [{ status: "done" as const }, ...Array(3).fill({ status: "pending" })] };
    const result = assessFeasibility(behind, d("2026-09-01"));
    // 25% done with 67% of the time gone: ratio 0.375.
    expect(result.state).toBe("currently_unrealistic");
    // 1/4 done in 243 days → all done after 972 days.
    expect(result.adjustments).toEqual([{ kind: "extend_deadline", deadline: "2028-08-30" }]);
  });

  it("is reached when every milestone is done", () => {
    expect(assessFeasibility({ ...designer, milestones: [{ status: "done" }, { status: "done" }] }, d("2026-02-01")).state).toBe(
      "target_reached",
    );
  });
});
