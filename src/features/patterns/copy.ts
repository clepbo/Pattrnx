import type { Tone } from "@/components/status-badge";

export const CONFIDENCE_LABELS: Record<string, { label: string; tone: Tone }> = {
  moderate: { label: "Moderate confidence", tone: "neutral" },
  high: { label: "High confidence", tone: "neutral" },
  very_high: { label: "Very high confidence", tone: "neutral" },
};

export const KIND_LABELS: Record<string, string> = {
  frequency: "Frequency",
  deviation: "Plan vs reality",
  timing: "Timing",
  streak: "Streaks",
  breaking_point: "Breaking point",
  sequence: "Sequence",
  loop: "Loop",
};

export const FEEDBACK_LABELS: Record<string, string> = {
  accurate: "You marked this as accurate.",
  partially_accurate: "You marked this as partially accurate.",
};
