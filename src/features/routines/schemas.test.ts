import { describe, expect, it } from "vitest";

import { routineSchema } from "./schemas";

const TYPE = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const base = {
  name: "Morning design practice",
  goalId: "",
  activityTypeId: TYPE,
  daysOfWeek: ["1", "3", "5", "3"],
  preferredTime: "07:40",
  normalMinutes: "60",
  minimumMinutes: "15",
  fallbackDescription: "",
  steps: "Open Figma\n\nOne exercise",
};

describe("routineSchema", () => {
  it("parses a routine with a minimum version", () => {
    expect(routineSchema.parse(base)).toEqual({
      name: "Morning design practice",
      goalId: null,
      activityTypeId: TYPE,
      daysOfWeek: [1, 3, 5],
      preferredTime: "07:40",
      normalMinutes: 60,
      minimumMinutes: 15,
      fallbackDescription: null,
      steps: ["Open Figma", "One exercise"],
    });
  });

  it("requires days and a usual length", () => {
    const errors = routineSchema.safeParse({ ...base, daysOfWeek: [], normalMinutes: "" }).error?.flatten().fieldErrors;
    expect(errors?.daysOfWeek).toEqual(["Choose at least one day."]);
    expect(errors?.normalMinutes).toEqual(["How long does it usually take?"]);
  });

  it("rejects a minimum longer than the usual length", () => {
    const errors = routineSchema.safeParse({ ...base, minimumMinutes: "90" }).error?.flatten().fieldErrors;
    expect(errors?.minimumMinutes).toEqual(["The minimum can't be longer than the usual length."]);
  });

  it("validates the time format", () => {
    expect(routineSchema.safeParse({ ...base, preferredTime: "7.40am" }).success).toBe(false);
    expect(routineSchema.parse({ ...base, preferredTime: "" }).preferredTime).toBeNull();
  });
});
