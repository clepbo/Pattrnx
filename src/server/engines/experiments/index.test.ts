import { describe, expect, it } from "vitest";

import { assertLocalDate as d, eachDay } from "@/lib/dates";

import { type MetricData, metricValue, suggestOutcome } from ".";

const today = d("2026-09-24");

function tasks(from: string, to: string, done: (i: number) => boolean, routineId = "r1"): MetricData["tasks"] {
  return eachDay(d(from), d(to)).map((date, i) => ({ routineId, goalId: "g1", scheduledDate: date, status: done(i) ? "done" : "skipped" }));
}

describe("metricValue", () => {
  it("task completion rate for a routine, ignoring other routines", () => {
    const data: MetricData = {
      tasks: [...tasks("2026-09-01", "2026-09-10", (i) => i % 2 === 0), ...tasks("2026-09-01", "2026-09-10", () => true, "other")],
      activities: [],
    };
    expect(metricValue(data, "task_completion_rate", { routineId: "r1" }, d("2026-09-01"), d("2026-09-10"), today)).toEqual({
      value: 0.5,
      observedDays: 10,
    });
    expect(metricValue(data, "task_completion_rate", {}, d("2026-09-01"), d("2026-09-10"), today).value).toBe(0.75);
  });

  it("doesn't count today's still-planned tasks as missed", () => {
    const data: MetricData = {
      tasks: [
        { routineId: "r1", goalId: null, scheduledDate: d("2026-09-23"), status: "done" },
        { routineId: "r1", goalId: null, scheduledDate: today, status: "planned" },
      ],
      activities: [],
    };
    expect(metricValue(data, "task_completion_rate", { routineId: "r1" }, d("2026-09-20"), d("2026-09-30"), today).value).toBe(1);
  });

  it("activity metrics are per-day rates over elapsed days", () => {
    const data: MetricData = {
      tasks: [],
      activities: [
        { typeId: "t", localDate: d("2026-09-01"), durationMinutes: 30, quantity: 2000 },
        { typeId: "t", localDate: d("2026-09-01"), durationMinutes: 15, quantity: 1000 },
        { typeId: "t", localDate: d("2026-09-03"), durationMinutes: 45, quantity: null },
        { typeId: "other", localDate: d("2026-09-02"), durationMinutes: 99, quantity: 99 },
      ],
    };
    const range = [d("2026-09-01"), d("2026-09-10"), today] as const;
    expect(metricValue(data, "active_days", { activityTypeId: "t" }, ...range).value).toBe(0.2);
    expect(metricValue(data, "activity_minutes", { activityTypeId: "t" }, ...range).value).toBe(9);
    expect(metricValue(data, "activity_quantity", { activityTypeId: "t" }, ...range).value).toBe(300);
    expect(metricValue(data, "active_days", { activityTypeId: "t" }, ...range).observedDays).toBe(3);
  });

  it("an ongoing experiment only counts elapsed days", () => {
    const data: MetricData = { tasks: [], activities: [{ typeId: "t", localDate: d("2026-09-23"), durationMinutes: null, quantity: null }] };
    expect(metricValue(data, "active_days", { activityTypeId: "t" }, d("2026-09-20"), d("2026-10-03"), today).value).toBe(1 / 5);
  });

  it("is null with no tasks", () => {
    expect(metricValue({ tasks: [], activities: [] }, "task_completion_rate", {}, d("2026-09-01"), d("2026-09-07"), today).value).toBeNull();
  });
});

describe("suggestOutcome", () => {
  const seen = (value: number | null, observedDays = 10) => ({ value, observedDays });

  it("improved / worsened / no change relative to the baseline, in the desired direction", () => {
    expect(suggestOutcome(seen(0.5), seen(0.6), "increase").outcome).toBe("improved");
    expect(suggestOutcome(seen(0.5), seen(0.55), "increase").outcome).toBe("no_change");
    expect(suggestOutcome(seen(0.5), seen(0.4), "increase").outcome).toBe("worsened");
    expect(suggestOutcome(seen(4), seen(3), "decrease")).toEqual({ outcome: "improved", change: -0.25 });
  });

  it("BR-8: inconclusive with fewer than 5 observed days in either window", () => {
    expect(suggestOutcome(seen(0.2, 4), seen(0.9), "increase").outcome).toBe("inconclusive");
    expect(suggestOutcome(seen(0.2), seen(0.9, 4), "increase").outcome).toBe("inconclusive");
  });

  it("handles a zero baseline", () => {
    expect(suggestOutcome(seen(0), seen(0.3), "increase").outcome).toBe("improved");
    expect(suggestOutcome(seen(0), seen(0), "increase").outcome).toBe("no_change");
    expect(suggestOutcome(seen(0), seen(2), "decrease").outcome).toBe("worsened");
  });

  it("is inconclusive when a window has no value", () => {
    expect(suggestOutcome(seen(null), seen(0.5), "increase").outcome).toBe("inconclusive");
  });
});

