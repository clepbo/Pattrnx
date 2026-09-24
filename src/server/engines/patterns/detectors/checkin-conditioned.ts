import { addDays } from "@/lib/dates";

import { dueTasks, groupBy, isDone } from "../snapshot";
import { percent, rate, twoProportionZ } from "../stats";
import { PATTERN_THRESHOLDS } from "../thresholds";
import type { Candidate, Detector, PatternSnapshot, SnapshotCheckin } from "../types";

const T = PATTERN_THRESHOLDS.checkin;

export const CONDITIONS = [
  { key: "high_workload", label: "high-workload days", test: (c: SnapshotCheckin) => (c.workload === null ? null : c.workload >= 4) },
  { key: "short_sleep", label: "nights with under 6 hours' sleep", test: (c: SnapshotCheckin) => (c.sleepHours === null ? null : c.sleepHours < 6) },
  { key: "high_stress", label: "high-stress days", test: (c: SnapshotCheckin) => (c.stress === null ? null : c.stress >= 4) },
] as const;

/**
 * Next-day task completion after check-ins where the condition held vs didn't.
 * (Short sleep is logged on the morning's check-in, so it's compared with the same day.)
 */
function measure(snapshot: PatternSnapshot, conditionKey: string) {
  const condition = CONDITIONS.find((c) => c.key === conditionKey);
  if (!condition) return null;
  const tasksByDay = groupBy(dueTasks(snapshot), (t) => t.scheduledDate as string);
  const groups = { yes: { days: 0, done: 0, total: 0 }, no: { days: 0, done: 0, total: 0 } };
  for (const checkin of snapshot.checkins) {
    const holds = condition.test(checkin);
    if (holds === null) continue;
    const day = condition.key === "short_sleep" ? checkin.localDate : addDays(checkin.localDate, 1);
    const tasks = tasksByDay.get(day) ?? [];
    if (tasks.length === 0) continue;
    const group = holds ? groups.yes : groups.no;
    group.days += 1;
    group.done += tasks.filter(isDone).length;
    group.total += tasks.length;
  }
  const yesRate = rate(groups.yes.done, groups.yes.total);
  const noRate = rate(groups.no.done, groups.no.total);
  return { condition, groups, yesRate, noRate, diff: noRate - yesRate, z: twoProportionZ(groups.no.done, groups.no.total, groups.yes.done, groups.yes.total) };
}

export const checkinConditionedDetector: Detector = {
  key: "sequence.checkin_conditioned",
  kind: "sequence",
  version: 1,
  minEffect: T.minDiff,

  detect(snapshot) {
    return CONDITIONS.flatMap((condition): Candidate[] => {
      const m = measure(snapshot, condition.key);
      if (!m || m.groups.yes.days < T.minDaysPerGroup || m.groups.no.days < T.minDaysPerGroup || m.diff < T.minDiff) return [];
      return [
        {
          detectorKey: this.key,
          kind: this.kind,
          fingerprint: `${this.key}:${condition.key}`,
          subject: { condition: condition.key },
          observations: m.groups.yes.days + m.groups.no.days,
          effectSize: m.diff,
          z: m.z,
          comparisons: CONDITIONS.length,
          evidence: { condition: condition.key, after: m.groups.yes, otherwise: m.groups.no },
          vars: {
            condition: condition.label,
            timing: condition.key === "short_sleep" ? "On the day after" : "On days after",
            conditionRate: percent(m.yesRate),
            otherRate: percent(m.noRate),
          },
        },
      ];
    });
  },

  effectFor(snapshot, candidate) {
    const m = measure(snapshot, candidate.subject.condition);
    return m && m.groups.yes.total > 0 && m.groups.no.total > 0 ? m.diff : null;
  },
};
