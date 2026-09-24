/**
 * Every tunable number in the pattern engine (ARCHITECTURE.md §8.3–8.4).
 * These are starting guesses; tune them against the fixtures and beta feedback.
 */
export const PATTERN_THRESHOLDS = {
  /** BR-2: no detection before this much history. */
  minHistoryDays: 21,
  windowDays: 90,
  loopWindowDays: 180,
  /** Family-wise significance for comparison detectors (one-sided), Bonferroni-corrected per detector. */
  alpha: 0.01,

  confidence: {
    moderate: { n: 8, effect: 0.2 },
    high: { n: 16, effect: 0.25 },
    veryHigh: { n: 30, effect: 0.35, windowDays: 56 },
  },

  weekday: { minPerDay: 3, minDiff: 0.3 },
  sustainableRate: { minWeeks: 4, maxRatio: 0.7, minPlannedPerWeek: 2 },
  overplanning: { minDays: 20, minPerGroup: 5, minDiff: 0.2, defaultTaskMinutes: 30 },
  hourBand: { minActivities: 15, minShare: 0.6 },
  breakingPoint: { minAtRisk: 6, minDiff: 0.3, minStreak: 2 },
  checkin: { minDaysPerGroup: 6, minDiff: 0.2 },
  follows: { minOccurrences: 6, minCoOccurrences: 4, minLift: 1.5, minDiff: 0.2 },
  loop: { minCycles: 2, replanWithinDays: 30, replanLeadDays: 7 },

  display: { perReview: 3, onToday: 1 },
} as const;
