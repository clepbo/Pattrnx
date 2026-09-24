import { describe, expect, it } from "vitest";

import { personas } from "../../../../tests/fixtures/behavior";
import { EXPERIMENT_THRESHOLDS } from "../experiments";
import { DETECTORS, detectPatterns } from "../patterns";
import { hasIntervention, suggestExperiment } from "./catalog";

describe("interventions catalog", () => {
  it("has an intervention for every detector", () => {
    for (const d of DETECTORS) expect(hasIntervention(d.key), d.key).toBe(true);
  });

  it("turns every planted pattern into a valid, guarded experiment draft", () => {
    const patterns = [
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

    for (const p of patterns) {
      const draft = suggestExperiment(p);
      expect(draft, p.detectorKey).not.toBeNull();
      expect(draft!.durationDays).toBeGreaterThanOrEqual(EXPERIMENT_THRESHOLDS.minDays);
      expect(draft!.durationDays).toBeLessThanOrEqual(EXPERIMENT_THRESHOLDS.maxDays);
      if (draft!.metric !== "task_completion_rate") expect(draft!.subject.activityTypeId).toBeTruthy();
    }
  });

  it("uses the pattern's own numbers", () => {
    const draft = suggestExperiment({
      detectorKey: "frequency.sustainable_rate",
      subject: { routineId: "r1" },
      vars: { routine: "Gym", planned: 5, done: 2.5, weeks: 6 },
    });
    expect(draft).toMatchObject({ title: "Plan Gym 3 times a week", subject: { routineId: "r1" }, metric: "task_completion_rate" });
  });

  it("returns null for unknown detectors", () => {
    expect(suggestExperiment({ detectorKey: "nope", subject: {}, vars: {} })).toBeNull();
  });
});
