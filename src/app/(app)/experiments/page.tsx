import type { Metadata } from "next";
import Link from "next/link";

import { InsightsNav } from "@/components/layout/insights-nav";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { ExperimentSummary } from "@/features/experiments/components/experiment-summary";
import { OUTCOME_COPY } from "@/features/experiments/copy";
import { assertLocalDate } from "@/lib/dates";
import { formatLocalDate } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { listExperiments } from "@/server/services/experiments";

export const metadata: Metadata = { title: "Experiments" };

export default async function ExperimentsPage() {
  const { active, finished } = await listExperiments(await requireUser());

  return (
    <div className="grid gap-8">
      <InsightsNav current="/experiments" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Experiments</h1>
          <p className="text-muted-foreground text-sm">Try one small change for a few weeks and compare it with before.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/experiments/new">New experiment</Link>
        </Button>
      </div>

      <section aria-labelledby="active-heading" className="grid gap-3">
        <h2 id="active-heading" className="text-lg font-medium">
          Running
        </h2>
        {active.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nothing running. Start one from a pattern (on the Patterns page), or create your own.
          </p>
        ) : (
          <div className="grid gap-3">
            {active.map((view) => (
              <ExperimentSummary key={view.experiment.id} view={view} />
            ))}
          </div>
        )}
      </section>

      {finished.length > 0 && (
        <section aria-labelledby="finished-heading" className="grid gap-3">
          <h2 id="finished-heading" className="text-lg font-medium">
            Finished
          </h2>
          <ul className="grid gap-2">
            {finished.map((e) => (
              <li key={e.id}>
                <Link href={`/experiments/${e.id}`} className="border-border hover:bg-muted flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
                  <span className="text-sm">
                    {e.title}
                    <span className="text-muted-foreground"> · ended {formatLocalDate(assertLocalDate(e.completed_at?.slice(0, 10) ?? e.end_date))}</span>
                  </span>
                  <StatusBadge tone="neutral">{e.status === "abandoned" ? "Stopped early" : e.outcome ? OUTCOME_COPY[e.outcome] : "Finished"}</StatusBadge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
