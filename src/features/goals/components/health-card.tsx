import { StatusBadge } from "@/components/status-badge";
import { assertLocalDate } from "@/lib/dates";
import { formatLocalDate } from "@/lib/format";
import type { HealthResult, WeekCount } from "@/server/engines/progress/health";

import { describeHealth, HEALTH_LABELS } from "../health-copy";

/**
 * Goal health plus the plan-vs-reality strip (PRD F9). One measure per week
 * (done ÷ planned), so each week is a labelled meter with its numbers as text:
 * no legend, no colour-only meaning.
 */
export function HealthCard({ health, weeks }: { health: HealthResult; weeks: WeekCount[] }) {
  const { label, tone } = HEALTH_LABELS[health.state];

  return (
    <section aria-labelledby="health-heading" className="border-border grid gap-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="health-heading" className="font-medium">
          Goal health
        </h2>
        <StatusBadge tone={tone}>{label}</StatusBadge>
      </div>
      {describeHealth(health).map((sentence) => (
        <p key={sentence} className="text-sm">
          {sentence}
        </p>
      ))}
      <div className="grid gap-2">
        <h3 className="text-sm font-medium">Planned vs done, by week</h3>
        <ol className="grid gap-2">
          {weeks.map((week) => {
            const share = week.planned === 0 ? 0 : week.done / week.planned;
            return (
              <li key={week.weekStart} className="grid grid-cols-[7rem_1fr_5.5rem] items-center gap-3 text-sm">
                <span className="text-muted-foreground">
                  {formatLocalDate(assertLocalDate(week.weekStart), { weekday: undefined, year: undefined })}
                </span>
                <span className="bg-muted h-2 overflow-hidden rounded-full" aria-hidden="true">
                  <span className="bg-primary block h-full rounded-full" style={{ width: `${share * 100}%` }} />
                </span>
                <span className="text-right tabular-nums">{week.planned === 0 ? "Nothing planned" : `${week.done} of ${week.planned}`}</span>
              </li>
            );
          })}
        </ol>
        <p className="text-muted-foreground text-xs">Weeks start on the day set in Settings. Today&apos;s unfinished tasks aren&apos;t counted yet.</p>
      </div>
    </section>
  );
}
