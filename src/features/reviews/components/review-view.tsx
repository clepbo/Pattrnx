import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { HEALTH_LABELS } from "@/features/goals/health-copy";
import { CONFIDENCE_LABELS } from "@/features/patterns/copy";
import { assertLocalDate } from "@/lib/dates";
import { formatLocalDate, formatPercent } from "@/lib/format";
import type { ReviewContent } from "@/server/engines/reviews/weekly";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-3">
      <h2 id={id} className="text-lg font-medium">
        {title}
      </h2>
      {children}
    </section>
  );
}

const pct = (rate: number | null) => (rate === null ? "—" : formatPercent(rate));

/** The weekly review snapshot (PRD F13, blueprint §32). */
export function ReviewView({ content }: { content: ReviewContent }) {
  const { execution, goals, patterns, suggestion, experiments, improvement, concern } = content;
  const onTrack = goals.filter((g) => g.health === "on_track").length;
  const attention = goals.filter((g) => g.health !== "on_track" && g.health !== "uncertain").length;

  return (
    <div className="grid gap-8">
      <Section id="execution-heading" title="Execution">
        {execution.planned === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing was planned this week.</p>
        ) : (
          <div className="grid gap-2">
            <p className="text-sm">
              <span className="text-2xl font-semibold tabular-nums">{pct(execution.rate)}</span> of planned tasks done ({execution.done} of{" "}
              {execution.planned})
              {execution.previousRate !== null && <span className="text-muted-foreground">, compared with {pct(execution.previousRate)} the week before</span>}.
            </p>
            <div className="bg-muted h-2 overflow-hidden rounded-full" aria-hidden="true">
              <div className="bg-primary h-full rounded-full" style={{ width: `${(execution.rate ?? 0) * 100}%` }} />
            </div>
          </div>
        )}
      </Section>

      {(improvement || concern) && (
        <Section id="changes-heading" title="What changed">
          {improvement && (
            <p className="text-sm">
              <span className="font-medium">Biggest improvement:</span> {improvement.routine} went from {pct(improvement.previousRate)} to{" "}
              {pct(improvement.rate)} of sessions done.
            </p>
          )}
          {concern?.kind === "goal" && (
            <p className="text-sm">
              <span className="font-medium">Needs attention:</span>{" "}
              <Link href={`/goals/${concern.goalId}`} className="underline underline-offset-4">
                {concern.title}
              </Link>{" "}
              is {HEALTH_LABELS[concern.health].label.toLowerCase()}.
            </p>
          )}
          {concern?.kind === "routine" && (
            <p className="text-sm">
              <span className="font-medium">Biggest drop:</span> {concern.routine} went from {pct(concern.previousRate)} to {pct(concern.rate)} of sessions done.
            </p>
          )}
        </Section>
      )}

      {goals.length > 0 && (
        <Section id="goals-heading" title="Goals">
          <p className="text-muted-foreground text-sm">
            {onTrack} on track{attention > 0 ? `, ${attention} needing attention` : ""}.
          </p>
          <ul className="grid gap-2">
            {goals.map((g) => (
              <li key={g.id}>
                <Link href={`/goals/${g.id}`} className="border-border hover:bg-muted flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                  <span className="text-sm">{g.title}</span>
                  <StatusBadge tone={HEALTH_LABELS[g.health].tone}>{HEALTH_LABELS[g.health].label}</StatusBadge>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section id="patterns-heading" title="What repeated">
        {patterns.length === 0 ? (
          <p className="text-muted-foreground text-sm">No clear patterns yet. They need about three weeks of plans and logs.</p>
        ) : (
          <ul className="grid gap-2">
            {patterns.map((p) => (
              <li key={p.id} className="border-border grid gap-1 rounded-lg border p-3 text-sm">
                <span>{p.summary}</span>
                <span className="text-muted-foreground text-xs">{CONFIDENCE_LABELS[p.confidence]?.label}</span>
              </li>
            ))}
          </ul>
        )}
        {patterns.length > 0 && (
          <Link href="/patterns" className="text-muted-foreground text-sm underline-offset-4 hover:underline">
            See the evidence and give feedback
          </Link>
        )}
      </Section>

      {suggestion && (
        <Section id="suggestion-heading" title="Something to try">
          <div className="border-border grid gap-2 rounded-xl border p-4">
            <p className="font-medium">{suggestion.title}</p>
            <p className="text-muted-foreground text-sm">{suggestion.description}</p>
            <Button asChild variant="outline" className="justify-self-start">
              <Link href={`/experiments/new?patternId=${suggestion.patternId}`}>Set up this experiment</Link>
            </Button>
          </div>
        </Section>
      )}

      {(experiments.running.length > 0 || experiments.ended.length > 0) && (
        <Section id="experiments-heading" title="Experiments">
          <ul className="grid gap-1 text-sm">
            {experiments.ended.map((e) => (
              <li key={e.id}>
                <Link href={`/experiments/${e.id}`} className="underline underline-offset-4">
                  {e.title}
                </Link>{" "}
                ended this week. Review the result.
              </li>
            ))}
            {experiments.running.map((e) => (
              <li key={e.id}>
                <Link href={`/experiments/${e.id}`} className="underline underline-offset-4">
                  {e.title}
                </Link>{" "}
                is still running.
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

export function reviewTitle(periodStart: string): string {
  return `Week of ${formatLocalDate(assertLocalDate(periodStart), { weekday: undefined })}`;
}
