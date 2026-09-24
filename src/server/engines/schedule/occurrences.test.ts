import { describe, expect, it } from "vitest";

import { assertLocalDate as d } from "@/lib/dates";

import { generationWindow, routineOccurrences } from "./occurrences";

const weekdays = { daysOfWeek: [1, 2, 3, 4, 5], activeFrom: d("2026-09-01"), paused: false, archived: false };

describe("routineOccurrences", () => {
  it("returns the matching weekdays in range", () => {
    // 2026-09-19 is a Saturday.
    expect(routineOccurrences(weekdays, d("2026-09-19"), d("2026-09-25"))).toEqual([
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
    ]);
  });

  it("never schedules before the routine became active", () => {
    const fresh = { ...weekdays, activeFrom: d("2026-09-24") };
    expect(routineOccurrences(fresh, d("2026-09-19"), d("2026-09-25"))).toEqual(["2026-09-24", "2026-09-25"]);
  });

  it("schedules nothing while paused or archived", () => {
    expect(routineOccurrences({ ...weekdays, paused: true }, d("2026-09-19"), d("2026-09-25"))).toEqual([]);
    expect(routineOccurrences({ ...weekdays, archived: true }, d("2026-09-19"), d("2026-09-25"))).toEqual([]);
  });

  it("handles weekend-only routines across a month boundary", () => {
    expect(
      routineOccurrences({ ...weekdays, daysOfWeek: [0, 6] }, d("2026-09-26"), d("2026-10-04")),
    ).toEqual(["2026-09-26", "2026-09-27", "2026-10-03", "2026-10-04"]);
  });
});

describe("generationWindow", () => {
  it("backfills 30 days and looks ahead 7", () => {
    expect(generationWindow(d("2026-09-24"))).toEqual({ from: "2026-08-25", to: "2026-10-01" });
  });
});
