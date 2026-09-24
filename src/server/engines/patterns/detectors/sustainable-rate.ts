import { addDays } from "@/lib/dates";

import { dueTasks, isDone } from "../snapshot";
import { median, rate } from "../stats";
import { PATTERN_THRESHOLDS } from "../thresholds";
import type { Candidate, Detector, PatternSnapshot } from "../types";

const T = PATTERN_THRESHOLDS.sustainableRate;

/**
 * Goal Reality Model (blueprint §22): how often a routine is planned vs done per week.
 * Uses 7-day blocks counting back from yesterday, only while the routine existed,
 * and the pooled completion rate (medians of small weekly counts are too jumpy).
 */
function measure(snapshot: PatternSnapshot, routineId: string, createdDate: string) {
  const tasks = dueTasks(snapshot).filter((t) => t.routineId === routineId);
  const blocks: { start: string; planned: number; done: number }[] = [];
  for (let i = 0; ; i++) {
    const end = addDays(snapshot.today, -1 - 7 * i);
    const start = addDays(end, -6);
    if (start < snapshot.windowStart || start < createdDate) break;
    const inBlock = tasks.filter((t) => t.scheduledDate >= start && t.scheduledDate <= end);
    blocks.push({ start, planned: inBlock.length, done: inBlock.filter(isDone).length });
  }
  if (blocks.length === 0) return null;
  const planned = blocks.reduce((s, b) => s + b.planned, 0);
  const done = blocks.reduce((s, b) => s + b.done, 0);
  const completion = rate(done, planned);
  const plannedPerWeek = median(blocks.map((b) => b.planned));
  return {
    blocks: blocks.reverse(),
    total: planned,
    completion,
    plannedPerWeek,
    donePerWeek: Math.round(completion * plannedPerWeek * 2) / 2,
    effect: 1 - completion,
  };
}

export const sustainableRateDetector: Detector = {
  key: "frequency.sustainable_rate",
  kind: "frequency",
  version: 2,
  minEffect: 1 - T.maxRatio,

  detect(snapshot) {
    return snapshot.routines.flatMap((routine): Candidate[] => {
      const m = measure(snapshot, routine.id, routine.createdDate);
      if (!m || m.blocks.length < T.minWeeks || m.plannedPerWeek < T.minPlannedPerWeek || m.completion > T.maxRatio) return [];
      return [
        {
          detectorKey: this.key,
          kind: this.kind,
          fingerprint: `${this.key}:${routine.id}`,
          subject: { routineId: routine.id },
          observations: m.total,
          effectSize: m.effect,
          z: null,
          comparisons: 1,
          evidence: { weeks: m.blocks, plannedPerWeek: m.plannedPerWeek, donePerWeek: m.donePerWeek, completion: m.completion },
          vars: { routine: routine.name, planned: m.plannedPerWeek, done: m.donePerWeek, weeks: m.blocks.length },
        },
      ];
    });
  },

  effectFor(snapshot, candidate) {
    const routine = snapshot.routines.find((r) => r.id === candidate.subject.routineId);
    if (!routine) return null;
    const m = measure(snapshot, routine.id, routine.createdDate);
    return m && m.total > 0 ? m.effect : null;
  },
};
