import { dueTasks, groupBy, isDone } from "../snapshot";
import { percent, rate, twoProportionZ } from "../stats";
import { PATTERN_THRESHOLDS } from "../thresholds";
import type { Candidate, Detector, PatternSnapshot } from "../types";

const T = PATTERN_THRESHOLDS.overplanning;

/**
 * The planned-minutes cut that splits days most evenly into heavier and lighter.
 * (A plain median fails when many days tie, e.g. most days planned at exactly 5 hours.)
 */
export function balancedCut(minutes: number[]): number {
  const values = [...new Set(minutes)].sort((a, b) => a - b);
  let best = values[0] ?? 0;
  let bestSmaller = -1;
  for (const cut of values.slice(0, -1)) {
    const smaller = Math.min(minutes.filter((m) => m > cut).length, minutes.filter((m) => m <= cut).length);
    if (smaller > bestSmaller) {
      best = cut;
      bestSmaller = smaller;
    }
  }
  return best;
}

/** Completion on heavily planned days vs lighter ones. */
function measure(snapshot: PatternSnapshot, threshold?: number) {
  const days = [...groupBy(dueTasks(snapshot), (t) => t.scheduledDate).values()].map((tasks) => ({
    minutes: tasks.reduce((sum, t) => sum + (t.plannedMinutes ?? T.defaultTaskMinutes), 0),
    done: tasks.filter(isDone).length,
    total: tasks.length,
  }));
  if (days.length === 0) return null;
  const cut = threshold ?? balancedCut(days.map((d) => d.minutes));
  const heavy = days.filter((d) => d.minutes > cut);
  const light = days.filter((d) => d.minutes <= cut);
  const sum = (list: typeof days, key: "done" | "total") => list.reduce((s, d) => s + d[key], 0);
  const heavyRate = rate(sum(heavy, "done"), sum(heavy, "total"));
  const lightRate = rate(sum(light, "done"), sum(light, "total"));
  return {
    cut,
    days: days.length,
    heavy: { days: heavy.length, rate: heavyRate },
    light: { days: light.length, rate: lightRate },
    diff: lightRate - heavyRate,
    z: twoProportionZ(sum(light, "done"), sum(light, "total"), sum(heavy, "done"), sum(heavy, "total")),
  };
}

export const overplanningDetector: Detector = {
  key: "deviation.overplanning",
  kind: "deviation",
  version: 1,
  minEffect: T.minDiff,

  detect(snapshot): Candidate[] {
    const m = measure(snapshot);
    if (!m || m.days < T.minDays || m.heavy.days < T.minPerGroup || m.light.days < T.minPerGroup || m.diff < T.minDiff) return [];
    return [
      {
        detectorKey: this.key,
        kind: this.kind,
        fingerprint: this.key,
        subject: {},
        observations: m.days,
        effectSize: m.diff,
        z: m.z,
        comparisons: 1,
        evidence: { thresholdMinutes: m.cut, heavy: m.heavy, light: m.light },
        vars: { minutes: Math.round(m.cut), heavyRate: percent(m.heavy.rate), lightRate: percent(m.light.rate) },
      },
    ];
  },

  effectFor(snapshot, candidate) {
    const m = measure(snapshot, Number((candidate.evidence as { thresholdMinutes: number }).thresholdMinutes));
    return m && m.heavy.days > 0 && m.light.days > 0 ? m.diff : null;
  },
};
