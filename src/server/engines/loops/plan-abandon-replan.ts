import { addDays, diffDays, type LocalDate } from "@/lib/dates";

import { PATTERN_THRESHOLDS } from "../patterns/thresholds";
import type { Candidate, Confidence, Detector, PatternSnapshot } from "../patterns/types";

const T = PATTERN_THRESHOLDS.loop;

interface Plan {
  id: string;
  title: string;
  lifeAreaId: string;
  createdDate: LocalDate;
  endedDate: LocalDate | null;
}

/**
 * Plan → step back → new plan (PRD F11, blueprint §18). A cycle is a goal that was
 * paused or abandoned (or a routine paused or archived) followed by a new goal or
 * routine in the same life area, created from a week before to 30 days after.
 */
export function findCycles(snapshot: PatternSnapshot, lifeAreaId: string) {
  const since = addDays(snapshot.today, -PATTERN_THRESHOLDS.loopWindowDays);
  const plans: Plan[] = [
    ...snapshot.goals.map((g) => ({
      id: g.id,
      title: g.title,
      lifeAreaId: g.lifeAreaId,
      createdDate: g.createdDate,
      endedDate: g.status === "paused" || g.status === "abandoned" ? g.statusChangedDate : null,
    })),
    ...snapshot.routines.map((r) => ({ id: r.id, title: r.name, lifeAreaId: r.lifeAreaId, createdDate: r.createdDate, endedDate: r.endedDate })),
  ].filter((p) => p.lifeAreaId === lifeAreaId && p.createdDate >= since);

  const used = new Set<string>();
  const cycles: { stepped: string; steppedOn: LocalDate; next: string; startedOn: LocalDate }[] = [];
  const ended = plans
    .flatMap((p) => (p.endedDate ? [{ ...p, endedOn: p.endedDate }] : []))
    .sort((a, b) => a.endedOn.localeCompare(b.endedOn));
  for (const stepped of ended) {
    const next = plans
      .filter(
        (p) =>
          p.id !== stepped.id &&
          !used.has(p.id) &&
          p.createdDate > stepped.createdDate &&
          diffDays(p.createdDate, stepped.endedOn) <= T.replanLeadDays &&
          diffDays(stepped.endedOn, p.createdDate) <= T.replanWithinDays,
      )
      .sort((a, b) => a.createdDate.localeCompare(b.createdDate))[0];
    if (!next) continue;
    used.add(next.id);
    cycles.push({ stepped: stepped.title, steppedOn: stepped.endedOn, next: next.title, startedOn: next.createdDate });
  }
  return cycles;
}

export const planAbandonReplanDetector: Detector = {
  key: "loop.plan_abandon_replan",
  kind: "loop",
  version: 1,
  minEffect: 0,

  detect(snapshot) {
    return snapshot.lifeAreas.flatMap((area): Candidate[] => {
      const cycles = findCycles(snapshot, area.id);
      if (cycles.length < T.minCycles) return [];
      return [
        {
          detectorKey: this.key,
          kind: this.kind,
          fingerprint: `${this.key}:${area.id}`,
          subject: { lifeAreaId: area.id },
          observations: cycles.length,
          effectSize: Math.min(1, cycles.length / 4),
          z: null,
          comparisons: 1,
          evidence: { cycles },
          vars: { area: area.name, cycles: cycles.length, since: cycles[0].steppedOn },
        },
      ];
    });
  },

  // A loop is a count of whole cycles, not a sampled rate, so halves aren't meaningful.
  effectFor: () => null,

  /** BR-3: two complete cycles is the minimum; more cycles, more confidence. */
  confidence(candidate): Confidence {
    if (candidate.observations >= 4) return "very_high";
    if (candidate.observations >= 3) return "high";
    return "moderate";
  },
};
