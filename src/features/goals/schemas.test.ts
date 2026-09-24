import { describe, expect, it } from "vitest";

import { actionSchema, createGoalSchema, outcomeSchema } from "./schemas";

const AREA = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

function base(overrides: Record<string, string> = {}) {
  return {
    title: "Emergency fund",
    lifeAreaId: AREA,
    measurementType: "cumulative",
    unit: "NGN",
    baselineValue: "400,000",
    targetValue: "2,000,000",
    deadline: "2027-03-01",
    plannedPaceAmount: "80000",
    plannedPacePeriod: "month",
    motivation: "",
    priority: "1",
    strategy: "Save monthly\n\n  Cut discretionary spending \nMore freelance work",
    ...overrides,
  };
}

describe("createGoalSchema", () => {
  it("parses amounts, dates and strategy lines", () => {
    expect(createGoalSchema.parse(base())).toMatchObject({
      baselineValue: 400_000,
      targetValue: 2_000_000,
      deadline: "2027-03-01",
      plannedPaceAmount: 80_000,
      plannedPacePeriod: "month",
      motivation: null,
      priority: 1,
      strategy: ["Save monthly", "Cut discretionary spending", "More freelance work"],
    });
  });

  it("requires unit, baseline and target for numeric goals", () => {
    const result = createGoalSchema.safeParse(base({ unit: "", baselineValue: "", targetValue: "" }));
    expect(Object.keys(result.error?.flatten().fieldErrors ?? {}).sort()).toEqual(["baselineValue", "targetValue", "unit"]);
  });

  it("lets milestone goals skip the numbers", () => {
    const result = createGoalSchema.safeParse(
      base({ measurementType: "milestone", unit: "", baselineValue: "", targetValue: "", plannedPaceAmount: "", plannedPacePeriod: "" }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects a target equal to the baseline", () => {
    const result = createGoalSchema.safeParse(base({ targetValue: "400000" }));
    expect(result.error?.flatten().fieldErrors.targetValue).toBeDefined();
  });

  it("needs a period when a pace is given", () => {
    const result = createGoalSchema.safeParse(base({ plannedPacePeriod: "" }));
    expect(result.error?.flatten().fieldErrors.plannedPacePeriod).toEqual(["Per day, week or month?"]);
  });

  it("rejects malformed numbers and dates", () => {
    const result = createGoalSchema.safeParse(base({ targetValue: "lots", deadline: "2027-02-30" }));
    const errors = result.error?.flatten().fieldErrors;
    expect(errors?.targetValue).toEqual(["Enter a number."]);
    expect(errors?.deadline).toEqual(["Enter a valid date."]);
  });
});

describe("outcomeSchema", () => {
  it("needs a value or a note", () => {
    expect(outcomeSchema.safeParse({ value: "", date: "2026-09-21", description: "" }).success).toBe(false);
    expect(outcomeSchema.parse({ value: "", date: "2026-09-21", description: "Finished case study" }).value).toBeNull();
  });
});

describe("actionSchema", () => {
  it("treats empty selects as null", () => {
    expect(actionSchema.parse({ title: "Draft", milestoneId: "", activityTypeId: "", estimatedMinutes: "" })).toEqual({
      title: "Draft",
      milestoneId: null,
      activityTypeId: null,
      estimatedMinutes: null,
    });
  });
});
