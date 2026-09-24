import { addDays, diffDays } from "@/lib/dates";

import { binomialZ, percent } from "../stats";
import { PATTERN_THRESHOLDS } from "../thresholds";
import type { Candidate, Detector, PatternSnapshot, SnapshotActivity } from "../types";

const T = PATTERN_THRESHOLDS.follows;

/** Did any B happen within the 24 hours after this A (same day later, or next day earlier)? */
function followedBy(a: SnapshotActivity, bs: SnapshotActivity[]): boolean {
  return bs.some(
    (b) => (b.localDate === a.localDate && b.localHour >= a.localHour) || (b.localDate === addDays(a.localDate, 1) && b.localHour < a.localHour),
  );
}

/** P(undesired B within a day after A) vs the share of days that had any B. */
function measure(snapshot: PatternSnapshot, aId: string, bId: string) {
  const inWindow = snapshot.activities.filter((x) => x.localDate >= snapshot.windowStart);
  const as = inWindow.filter((x) => x.typeId === aId);
  const bs = inWindow.filter((x) => x.typeId === bId);
  const days = diffDays(snapshot.windowStart, snapshot.today) + 1;
  const base = new Set(bs.map((b) => b.localDate)).size / days;
  const hits = as.filter((a) => followedBy(a, bs)).length;
  const share = as.length === 0 ? 0 : hits / as.length;
  return { occurrences: as.length, hits, share, base, diff: share - base, lift: base === 0 ? Infinity : share / base, z: binomialZ(hits, as.length, base) };
}

export const activityFollowsDetector: Detector = {
  key: "sequence.activity_follows",
  kind: "sequence",
  version: 1,
  minEffect: T.minDiff,

  detect(snapshot) {
    const names = new Map(snapshot.activityTypes.map((t) => [t.id, t.name]));
    const undesired = snapshot.activityTypes.filter((t) => t.polarity === "undesired");
    // Every (A, B) pair is a test.
    const comparisons = undesired.reduce((n, b) => n + snapshot.activityTypes.filter((a) => a.id !== b.id).length, 0);
    return snapshot.activityTypes.flatMap((a) =>
      undesired
        .filter((b) => b.id !== a.id)
        .flatMap((b): Candidate[] => {
          const m = measure(snapshot, a.id, b.id);
          if (m.occurrences < T.minOccurrences || m.hits < T.minCoOccurrences || m.lift < T.minLift || m.diff < T.minDiff) return [];
          return [
            {
              detectorKey: this.key,
              kind: this.kind,
              fingerprint: `${this.key}:${a.id}:${b.id}`,
              subject: { activityTypeId: a.id, followedById: b.id },
              observations: m.occurrences,
              effectSize: Math.min(1, m.diff),
              z: m.z,
              comparisons,
              evidence: { occurrences: m.occurrences, followed: m.hits, baseShare: m.base, lift: m.lift },
              vars: { after: names.get(a.id) ?? "", follow: names.get(b.id) ?? "", share: percent(m.share), base: percent(m.base) },
            },
          ];
        }),
    );
  },

  effectFor(snapshot, candidate) {
    const m = measure(snapshot, candidate.subject.activityTypeId, candidate.subject.followedById);
    return m.occurrences === 0 ? null : m.diff;
  },
};
