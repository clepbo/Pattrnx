import { formatAmount, formatPercent } from "@/lib/format";
import type { ExperimentMetric, ExperimentOutcome, MetricValue } from "@/server/engines/experiments";

/** Descriptive language for experiment results (BR-1: what changed, never why). */

export function formatMetric(metric: ExperimentMetric, value: number | null, unit: string | null = null): string {
  if (value === null) return "no data";
  switch (metric) {
    case "task_completion_rate":
      return `${formatPercent(value)} of planned tasks done`;
    case "active_days":
      return `on ${formatPercent(value)} of days`;
    case "activity_minutes":
      return `${formatAmount(Math.round(value * 10) / 10, "min")} a day`;
    case "activity_quantity":
      return `${formatAmount(value, unit)} a day`;
  }
}

export const OUTCOME_COPY: Record<ExperimentOutcome, string> = {
  improved: "Moved the way you wanted",
  no_change: "About the same as before",
  worsened: "Moved the other way",
  inconclusive: "Not enough data to tell",
};

export function describeResult(
  metric: ExperimentMetric,
  baseline: MetricValue,
  current: MetricValue,
  running: boolean,
  unit: string | null = null,
): string {
  const during = running ? "So far during the experiment" : "During the experiment";
  return `Before: ${formatMetric(metric, baseline.value, unit)}. ${during}: ${formatMetric(metric, current.value, unit)}.`;
}
