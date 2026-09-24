import { weekdayOf } from "@/lib/dates";

import { dueTasks, groupBy, isDone, WEEKDAY_NAMES } from "../snapshot";
import { percent, rate, twoProportionZ } from "../stats";
import { PATTERN_THRESHOLDS } from "../thresholds";
import type { Candidate, Detector, PatternSnapshot } from "../types";

const T = PATTERN_THRESHOLDS.weekday;

/** Completion on the weakest weekday vs all other weekdays, per routine. */
function measure(snapshot: PatternSnapshot, routineId: string, weekday?: number) {
  const tasks = dueTasks(snapshot).filter((t) => t.routineId === routineId);
  const byDay = groupBy(tasks, (t) => weekdayOf(t.scheduledDate) as number);
  const eligible = [...byDay.entries()].filter(([, list]) => list.length >= (weekday === undefined ? T.minPerDay : 1));
  if (eligible.length < 2) return null;

  const rates = eligible.map(([day, list]) => ({ day, done: list.filter(isDone).length, total: list.length }));
  const worst = weekday === undefined ? [...rates].sort((a, b) => rate(a.done, a.total) - rate(b.done, b.total) || a.day - b.day)[0] : rates.find((r) => r.day === weekday);
  if (!worst) return null;
  const rest = rates.filter((r) => r.day !== worst.day);
  const restDone = rest.reduce((sum, r) => sum + r.done, 0);
  const restTotal = rest.reduce((sum, r) => sum + r.total, 0);
  return {
    worst,
    diff: rate(restDone, restTotal) - rate(worst.done, worst.total),
    z: twoProportionZ(restDone, restTotal, worst.done, worst.total),
    restRate: rate(restDone, restTotal),
    total: tasks.length,
    compared: rates.length,
    byDay: rates.sort((a, b) => a.day - b.day),
  };
}

export const weekdayDetector: Detector = {
  key: "timing.weekday",
  kind: "timing",
  version: 1,
  minEffect: T.minDiff,

  detect(snapshot) {
    const measured = snapshot.routines.map((routine) => ({ routine, m: measure(snapshot, routine.id) }));
    // Bonferroni over the whole family: every weekday of every routine compared.
    const comparisons = measured.reduce((n, { m }) => n + (m?.compared ?? 0), 0);
    return measured.flatMap(({ routine, m }): Candidate[] => {
      if (!m || m.diff < T.minDiff) return [];
      return [
        {
          detectorKey: this.key,
          kind: this.kind,
          fingerprint: `${this.key}:${routine.id}:${m.worst.day}`,
          subject: { routineId: routine.id, weekday: String(m.worst.day) },
          observations: m.total,
          effectSize: m.diff,
          z: m.z,
          comparisons,
          evidence: { byWeekday: m.byDay, worstWeekday: m.worst.day },
          vars: {
            routine: routine.name,
            day: WEEKDAY_NAMES[m.worst.day],
            worstRate: percent(rate(m.worst.done, m.worst.total)),
            restRate: percent(m.restRate),
            worstDone: m.worst.done,
            worstTotal: m.worst.total,
          },
        },
      ];
    });
  },

  effectFor(snapshot, candidate) {
    return measure(snapshot, candidate.subject.routineId, Number(candidate.subject.weekday))?.diff ?? null;
  },
};
