import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { abandonExperimentAction } from "@/features/experiments/actions";
import { CompleteExperimentForm } from "@/features/experiments/components/complete-form";
import { describeResult, OUTCOME_COPY } from "@/features/experiments/copy";
import { CATEGORIES, METRICS } from "@/features/experiments/schemas";
import { assertLocalDate } from "@/lib/dates";
import { formatLocalDate } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { EXPERIMENT_THRESHOLDS } from "@/server/engines/experiments";
import { getExperiment } from "@/server/services/experiments";

export const metadata: Metadata = { title: "Experiment" };

export default async function ExperimentPage({ params, searchParams }: PageProps<"/experiments/[experimentId]">) {
  const user = await requireUser();
  const [{ experimentId }, { started }] = await Promise.all([params, searchParams]);
  const view = await getExperiment(user, experimentId);
  if (!view) notFound();

  const { experiment: e, day, totalDays, readyToReview, current, suggested } = view;
  const running = e.status === "active" && !readyToReview;
  const baseline = { value: e.baseline_value, observedDays: e.baseline_observed_days };
  const final = e.status === "completed" ? { value: e.result_value, observedDays: e.result_observed_days ?? 0 } : current;
  const outcome = e.status === "completed" ? e.suggested_outcome : suggested.outcome;

  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <Link href="/experiments" className="text-muted-foreground text-sm hover:underline">
          ← Experiments
        </Link>
        {started && (
          <p role="status" className="bg-muted rounded-lg px-3 py-2 text-sm">
            Experiment started. It shows on Today until it ends.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{e.title}</h1>
          <StatusBadge tone="neutral">
            {e.status === "abandoned" ? "Stopped early" : e.status === "completed" ? "Finished" : readyToReview ? "Ready to review" : `Day ${day} of ${totalDays}`}
          </StatusBadge>
        </div>
        <p className="text-muted-foreground text-sm">
          {formatLocalDate(assertLocalDate(e.start_date))} to {formatLocalDate(assertLocalDate(e.end_date))} ·{" "}
          {CATEGORIES.find((c) => c.value === e.intervention_category)?.label}
        </p>
      </div>

      <section aria-labelledby="plan-heading" className="grid gap-2">
        <h2 id="plan-heading" className="text-lg font-medium">
          The change
        </h2>
        <p className="text-sm">{e.intervention_description}</p>
        <p className="text-muted-foreground text-sm">Prediction: {e.hypothesis}</p>
      </section>

      <section aria-labelledby="result-heading" className="border-border grid gap-2 rounded-xl border p-4">
        <h2 id="result-heading" className="font-medium">
          {running ? "How it's going" : "Result"}
        </h2>
        <p className="text-muted-foreground text-xs">{METRICS.find((m) => m.value === e.metric)?.label}</p>
        <p className="text-sm">{describeResult(e.metric, baseline, final, running)}</p>
        {!running && outcome && (
          <p className="text-sm">
            <span className="font-medium">{OUTCOME_COPY[outcome]}.</span>{" "}
            {outcome === "inconclusive"
              ? `Pattrnx needs at least ${EXPERIMENT_THRESHOLDS.minObservedDays} days with plans or logs in each period to compare them.`
              : "This compares two periods. Other things may also have changed, so treat it as evidence, not proof."}
          </p>
        )}
      </section>

      {readyToReview && (
        <section aria-labelledby="finish-heading" className="grid gap-3">
          <h2 id="finish-heading" className="text-lg font-medium">
            Wrap up
          </h2>
          <CompleteExperimentForm experimentId={e.id} suggested={suggested.outcome} />
        </section>
      )}

      {e.status === "completed" && (
        <section aria-labelledby="learned-heading" className="grid gap-2">
          <h2 id="learned-heading" className="text-lg font-medium">
            Your conclusion
          </h2>
          <p className="text-sm">{e.outcome ? OUTCOME_COPY[e.outcome] : ""}</p>
          {e.reflection && <p className="text-sm italic">“{e.reflection}”</p>}
        </section>
      )}

      {running && (
        <details className="text-sm">
          <summary className="text-muted-foreground cursor-pointer">Stop this experiment early</summary>
          <form action={abandonExperimentAction} className="mt-3 grid gap-2">
            <input type="hidden" name="experimentId" value={e.id} />
            <label htmlFor="stop-reflection" className="text-sm">
              Anything worth remembering? (optional)
            </label>
            <Textarea id="stop-reflection" name="reflection" rows={2} maxLength={2000} />
            <Button type="submit" variant="outline" className="justify-self-start">
              Stop experiment
            </Button>
          </form>
        </details>
      )}
    </div>
  );
}
