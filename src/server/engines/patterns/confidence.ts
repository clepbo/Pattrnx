import { halves, windowDays } from "./snapshot";
import { criticalZ } from "./stats";
import { PATTERN_THRESHOLDS } from "./thresholds";
import type { Candidate, Confidence, Detector, PatternSnapshot } from "./types";

const C = PATTERN_THRESHOLDS.confidence;

export const CONFIDENCE_RANK: Record<Confidence, number> = { low: 0, moderate: 1, high: 2, very_high: 3 };

/**
 * Split-half consistency: the effect must point the same way in both halves of the
 * window, at no less than half the detector's minimum effect. Null when a half
 * can't measure it.
 */
export function isConsistent(detector: Detector, snapshot: PatternSnapshot, candidate: Candidate): boolean | null {
  const [first, second] = halves(snapshot);
  const a = detector.effectFor(first, candidate);
  const b = detector.effectFor(second, candidate);
  if (a === null || b === null) return null;
  const floor = detector.minEffect / 2;
  return a >= floor && b >= floor;
}

/** The z a candidate needs: family-wise alpha split across the detector's comparisons (Bonferroni). */
export function requiredZ(comparisons: number): number {
  return criticalZ(PATTERN_THRESHOLDS.alpha / Math.max(1, comparisons));
}

/**
 * ARCHITECTURE.md §8.4, plus a significance test for comparison detectors at every
 * level, so chance differences (e.g. the worst of seven weekdays) don't surface.
 */
export function scoreConfidence(candidate: Candidate, consistent: boolean | null, snapshot: PatternSnapshot): Confidence {
  const n = candidate.observations;
  const effect = candidate.effectSize;
  const significant = candidate.z === null || candidate.z >= requiredZ(candidate.comparisons);
  if (!significant || n < C.moderate.n || effect < C.moderate.effect) return "low";
  if (consistent !== true || n < C.high.n || effect < C.high.effect) return "moderate";
  if (n >= C.veryHigh.n && effect >= C.veryHigh.effect && windowDays(snapshot) >= C.veryHigh.windowDays) return "very_high";
  return "high";
}
