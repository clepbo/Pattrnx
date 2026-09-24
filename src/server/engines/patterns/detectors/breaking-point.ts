import { dueTasks, isDone } from "../snapshot";
import { binomialZ, rate } from "../stats";
import { PATTERN_THRESHOLDS } from "../thresholds";
import type { Candidate, Detector, PatternSnapshot } from "../types";

const T = PATTERN_THRESHOLDS.breakingPoint;

/**
 * Where streaks break (blueprint §28). For each position in a streak (the k-th
 * session after k−1 completed in a row), the share of sessions at that position
 * that were missed, compared with the routine's overall miss rate. With no
 * breaking point, the miss rate is about the same at every position.
 */
export function streakHazards(snapshot: PatternSnapshot, routineId: string) {
  const sessions = dueTasks(snapshot)
    .filter((t) => t.routineId === routineId)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  const atRisk = new Map<number, { sessions: number; missed: number }>();
  let streak = 0;
  let missed = 0;
  for (const session of sessions) {
    const position = streak + 1;
    const slot = atRisk.get(position) ?? { sessions: 0, missed: 0 };
    slot.sessions += 1;
    if (isDone(session)) streak += 1;
    else {
      slot.missed += 1;
      missed += 1;
      streak = 0;
    }
    atRisk.set(position, slot);
  }
  return { sessions: sessions.length, missRate: rate(missed, sessions.length), byPosition: atRisk };
}

function measureAt(snapshot: PatternSnapshot, routineId: string, position: number) {
  const h = streakHazards(snapshot, routineId);
  const slot = h.byPosition.get(position);
  if (!slot || slot.sessions === 0) return null;
  return rate(slot.missed, slot.sessions) - h.missRate;
}

export const breakingPointDetector: Detector = {
  key: "breaking_point.run_end",
  kind: "breaking_point",
  version: 2,
  minEffect: T.minDiff,

  detect(snapshot) {
    const measured = snapshot.routines.map((routine) => {
      const h = streakHazards(snapshot, routine.id);
      // Positions after at least `minStreak` completions in a row, with enough sessions to judge.
      const positions = [...h.byPosition.entries()].filter(([position, slot]) => position > T.minStreak && slot.sessions >= T.minAtRisk);
      return { routine, h, positions };
    });
    // Bonferroni over every position of every routine tested.
    const comparisons = measured.reduce((n, { positions }) => n + positions.length, 0);
    return measured.flatMap(({ routine, h, positions }): Candidate[] => {
      if (positions.length === 0 || h.missRate === 0) return [];
      const scored = positions
        .map(([position, slot]) => ({
          position,
          ...slot,
          hazard: rate(slot.missed, slot.sessions),
          z: binomialZ(slot.missed, slot.sessions, h.missRate),
        }))
        .sort((a, b) => b.z - a.z || a.position - b.position);
      const top = scored[0];
      const diff = top.hazard - h.missRate;
      if (diff < T.minDiff) return [];
      const streakLength = top.position - 1;
      return [
        {
          detectorKey: this.key,
          kind: this.kind,
          fingerprint: `${this.key}:${routine.id}`,
          subject: { routineId: routine.id },
          observations: top.sessions,
          effectSize: Math.min(1, diff),
          z: top.z,
          comparisons,
          evidence: {
            position: top.position,
            typicalLength: streakLength,
            missRateAtPosition: top.hazard,
            overallMissRate: h.missRate,
            byPosition: scored.map(({ position, sessions, missed }) => ({ position, sessions, missed })),
          },
          vars: {
            routine: routine.name,
            length: streakLength,
            next: top.position,
            missed: top.missed,
            reached: top.sessions,
          },
        },
      ];
    });
  },

  effectFor(snapshot, candidate) {
    return measureAt(snapshot, candidate.subject.routineId, Number((candidate.evidence as { position: number }).position));
  },
};
