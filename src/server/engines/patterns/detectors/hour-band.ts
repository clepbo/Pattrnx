import { binomialZ, percent } from "../stats";
import { PATTERN_THRESHOLDS } from "../thresholds";
import type { Candidate, Detector, PatternSnapshot } from "../types";

const T = PATTERN_THRESHOLDS.hourBand;

export const HOUR_BANDS = [
  { key: "morning", label: "morning", hours: [5, 6, 7, 8, 9, 10, 11] },
  { key: "afternoon", label: "afternoon", hours: [12, 13, 14, 15, 16] },
  { key: "evening", label: "evening", hours: [17, 18, 19, 20, 21] },
  { key: "night", label: "late evening and night", hours: [22, 23, 0, 1, 2, 3, 4] },
] as const;

const bandOf = (hour: number) => HOUR_BANDS.find((b) => (b.hours as readonly number[]).includes(hour))?.key ?? "night";

/** Share of a desired activity type's (non-backfilled) entries that fall in each band of the day. */
function measure(snapshot: PatternSnapshot, typeId: string) {
  const entries = snapshot.activities.filter((a) => a.typeId === typeId && !a.backfilled && a.localDate >= snapshot.windowStart);
  const counts = new Map<string, number>(HOUR_BANDS.map((b) => [b.key, 0]));
  for (const a of entries) counts.set(bandOf(a.localHour), (counts.get(bandOf(a.localHour)) ?? 0) + 1);
  return { total: entries.length, counts };
}

const expected = 1 / HOUR_BANDS.length;

export const hourBandDetector: Detector = {
  key: "timing.hour_band",
  kind: "timing",
  version: 1,
  minEffect: (T.minShare - expected) / (1 - expected),

  detect(snapshot) {
    const measured = snapshot.activityTypes
      .filter((t) => t.polarity === "desired")
      .map((type) => ({ type, m: measure(snapshot, type.id) }))
      .filter(({ m }) => m.total >= T.minActivities);
    // Bonferroni: every band of every type with enough data.
    const comparisons = measured.length * HOUR_BANDS.length;
    return measured.flatMap(({ type, m }): Candidate[] => {
        const [band, count] = [...m.counts.entries()].sort((a, b) => b[1] - a[1])[0];
        const share = count / m.total;
        if (share < T.minShare) return [];
        return [
          {
            detectorKey: this.key,
            kind: this.kind,
            fingerprint: `${this.key}:${type.id}:${band}`,
            subject: { activityTypeId: type.id, band },
            observations: m.total,
            effectSize: (share - expected) / (1 - expected),
            z: binomialZ(count, m.total, expected),
            comparisons,
            evidence: { counts: Object.fromEntries(m.counts), total: m.total },
            vars: { activity: type.name, band: HOUR_BANDS.find((b) => b.key === band)?.label ?? band, share: percent(share) },
          },
        ];
    });
  },

  effectFor(snapshot, candidate) {
    const m = measure(snapshot, candidate.subject.activityTypeId);
    if (m.total === 0) return null;
    return ((m.counts.get(candidate.subject.band) ?? 0) / m.total - expected) / (1 - expected);
  },
};
