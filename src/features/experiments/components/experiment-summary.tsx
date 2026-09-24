import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import type { ExperimentView } from "@/server/services/experiments";

/** Compact card for lists, Today and goal pages. */
export function ExperimentSummary({ view }: { view: ExperimentView }) {
  const { experiment, day, totalDays, readyToReview } = view;
  return (
    <Link href={`/experiments/${experiment.id}`} className="border-border hover:bg-muted grid gap-2 rounded-xl border p-3">
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{experiment.title}</span>
        {readyToReview ? <StatusBadge tone="caution">Ready to review</StatusBadge> : <StatusBadge tone="neutral">{`Day ${day} of ${totalDays}`}</StatusBadge>}
      </span>
      <span className="text-muted-foreground text-sm">{experiment.intervention_description}</span>
      {!readyToReview && (
        <span className="bg-muted h-1.5 overflow-hidden rounded-full" aria-hidden="true">
          <span className="bg-primary block h-full rounded-full" style={{ width: `${(day / totalDays) * 100}%` }} />
        </span>
      )}
    </Link>
  );
}
