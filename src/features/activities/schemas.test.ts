import { describe, expect, it } from "vitest";

import { checkinSchema, logActivitySchema } from "./schemas";

const ID = "0b8f2a3e-6c1d-4e5f-9a7b-8c9d0e1f2a3b";
const TYPE = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

describe("logActivitySchema", () => {
  it("treats empty date and time as now", () => {
    expect(
      logActivitySchema.parse({ id: ID, activityTypeId: TYPE, date: "", time: "", durationMinutes: "", quantity: "", note: " ", goalId: "", unit: "" }),
    ).toEqual({ id: ID, activityTypeId: TYPE, date: null, time: null, durationMinutes: null, quantity: null, note: null, goalId: null, unit: null });
  });

  it("parses amounts with separators and rejects negatives", () => {
    const base = { id: ID, activityTypeId: TYPE, date: "2026-09-21", time: "19:30", durationMinutes: "45", note: "", goalId: "", unit: "NGN" };
    expect(logActivitySchema.parse({ ...base, quantity: "20,000" }).quantity).toBe(20_000);
    expect(logActivitySchema.safeParse({ ...base, quantity: "-5" }).success).toBe(false);
  });
});

describe("checkinSchema", () => {
  it("accepts partial check-ins and rounds sleep to tenths", () => {
    expect(
      checkinSchema.parse({ date: "2026-09-21", sleepHours: "6.25", energy: "", mood: "4", stress: "", workload: "5", note: "" }),
    ).toEqual({ date: "2026-09-21", sleepHours: 6.3, energy: null, mood: 4, stress: null, workload: 5, note: null });
  });

  it("rejects out-of-range values", () => {
    const errors = checkinSchema
      .safeParse({ date: "2026-09-21", sleepHours: "25", energy: "6", mood: "", stress: "", workload: "", note: "" })
      .error?.flatten().fieldErrors;
    expect(errors?.sleepHours).toBeDefined();
    expect(errors?.energy).toBeDefined();
  });
});
