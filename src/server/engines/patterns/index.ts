import { diffDays } from "@/lib/dates";

import { summarize } from "../language/templates";
import { planAbandonReplanDetector } from "../loops/plan-abandon-replan";
import { CONFIDENCE_RANK, isConsistent, scoreConfidence } from "./confidence";
import { activityFollowsDetector } from "./detectors/activity-follows";
import { breakingPointDetector } from "./detectors/breaking-point";
import { checkinConditionedDetector } from "./detectors/checkin-conditioned";
import { hourBandDetector } from "./detectors/hour-band";
import { overplanningDetector } from "./detectors/overplanning";
import { sustainableRateDetector } from "./detectors/sustainable-rate";
import { weekdayDetector } from "./detectors/weekday";
import { PATTERN_THRESHOLDS } from "./thresholds";
import type { Confidence, DetectedPattern, Detector, PatternSnapshot } from "./types";

export const PATTERN_ENGINE_VERSION = 1;

export const DETECTORS: readonly Detector[] = [
  sustainableRateDetector,
  overplanningDetector,
  weekdayDetector,
  hourBandDetector,
  breakingPointDetector,
  checkinConditionedDetector,
  activityFollowsDetector,
  planAbandonReplanDetector,
];

export type DetectionResult =
  | { status: "learning"; daysOfHistory: number; daysRemaining: number; patterns: [] }
  | { status: "ready"; patterns: DetectedPattern[] };

/**
 * Runs every detector over the snapshot (ARCHITECTURE.md §8.3). Returns every
 * candidate with its confidence, including `low` ones, which are stored but never
 * shown (BR-2). Before 21 days of history nothing is computed.
 */
export function detectPatterns(snapshot: PatternSnapshot): DetectionResult {
  const daysOfHistory = snapshot.historyStart ? diffDays(snapshot.historyStart, snapshot.today) + 1 : 0;
  if (daysOfHistory < PATTERN_THRESHOLDS.minHistoryDays) {
    return { status: "learning", daysOfHistory, daysRemaining: PATTERN_THRESHOLDS.minHistoryDays - daysOfHistory, patterns: [] };
  }

  const patterns = DETECTORS.flatMap((detector) =>
    detector.detect(snapshot).map((candidate): DetectedPattern => {
      const consistent = detector.confidence ? null : isConsistent(detector, snapshot, candidate);
      const confidence = detector.confidence?.(candidate) ?? scoreConfidence(candidate, consistent, snapshot);
      return {
        ...candidate,
        detectorVersion: detector.version,
        consistent,
        confidence,
        summary: summarize(candidate, confidence),
        windowStart: snapshot.windowStart,
        windowEnd: snapshot.today,
      };
    }),
  );
  return { status: "ready", patterns };
}

export function isVisible(confidence: Confidence): boolean {
  return CONFIDENCE_RANK[confidence] >= CONFIDENCE_RANK.moderate;
}

/**
 * The patterns worth showing, strongest first (BR-2, multiple-comparison control):
 * moderate+ confidence, not excluded (dismissed/suppressed), at most `limit`.
 */
export function selectVisible<T extends Pick<DetectedPattern, "confidence" | "effectSize" | "fingerprint">>(
  patterns: T[],
  { exclude = new Set<string>(), limit = PATTERN_THRESHOLDS.display.perReview }: { exclude?: Set<string>; limit?: number } = {},
): T[] {
  return patterns
    .filter((p) => isVisible(p.confidence) && !exclude.has(p.fingerprint))
    .sort((a, b) => CONFIDENCE_RANK[b.confidence] * b.effectSize - CONFIDENCE_RANK[a.confidence] * a.effectSize)
    .slice(0, limit);
}

export type { Confidence, DetectedPattern, PatternSnapshot } from "./types";
