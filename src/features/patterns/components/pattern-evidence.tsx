import { assertLocalDate } from "@/lib/dates";
import { formatLocalDate, formatPercent } from "@/lib/format";
import type { PatternRow } from "@/server/services/patterns";

/**
 * The data behind a pattern (PRD F10: every shown pattern carries inspectable
 * evidence). Small tables with visible numbers; no charts needed at this size.
 */

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const BAND_LABELS: Record<string, string> = { morning: "Morning (5–11)", afternoon: "Afternoon (12–16)", evening: "Evening (17–21)", night: "Night (22–4)" };

type Row = (string | number)[];

function Table({ caption, head, rows }: { caption: string; head: string[]; rows: Row[] }) {
  return (
    <table className="w-full text-sm">
      <caption className="text-muted-foreground mb-1 text-left text-xs">{caption}</caption>
      <thead>
        <tr className="text-muted-foreground border-border border-b text-left text-xs">
          {head.map((h, i) => (
            <th key={h} scope="col" className={i === 0 ? "py-1 font-medium" : "py-1 text-right font-medium"}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={String(row[0])} className="border-border border-b last:border-0">
            {row.map((cell, i) => (
              <td key={i} className={i === 0 ? "py-1" : "py-1 text-right tabular-nums"}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const pct = (done: number, total: number) => (total === 0 ? "–" : formatPercent(done / total));
const day = (date: string) => formatLocalDate(assertLocalDate(date), { weekday: undefined });

function Details({ pattern }: { pattern: PatternRow }) {
  // Evidence is written by the engine; shapes are per detector (ARCHITECTURE.md §8.3).
  const e = pattern.evidence as Record<string, never>;
  switch (pattern.detector_key) {
    case "timing.weekday": {
      const rows = (e.byWeekday as { day: number; done: number; total: number }[]).map((r) => [DAY_NAMES[r.day], `${r.done} of ${r.total}`, pct(r.done, r.total)]);
      return <Table caption="Completion by weekday" head={["Day", "Done", "Rate"]} rows={rows} />;
    }
    case "frequency.sustainable_rate": {
      const rows = (e.weeks as { start: string; planned: number; done: number }[]).map((w) => [`Week of ${day(w.start)}`, w.planned, w.done]);
      return <Table caption="Planned and done per week" head={["Week", "Planned", "Done"]} rows={rows} />;
    }
    case "deviation.overplanning": {
      const heavy = e.heavy as { days: number; rate: number };
      const light = e.light as { days: number; rate: number };
      const minutes = Math.round(e.thresholdMinutes as number);
      return (
        <Table
          caption="Task completion by how much was planned that day"
          head={["Days", "Count", "Done"]}
          rows={[
            [`More than ${minutes} min planned`, heavy.days, formatPercent(heavy.rate)],
            [`${minutes} min or less`, light.days, formatPercent(light.rate)],
          ]}
        />
      );
    }
    case "timing.hour_band": {
      const counts = e.counts as Record<string, number>;
      const total = e.total as number;
      const rows = Object.entries(counts).map(([band, n]) => [BAND_LABELS[band] ?? band, n, pct(n, total)]);
      return <Table caption="When it was logged (entries logged over a day late are excluded)" head={["Time of day", "Entries", "Share"]} rows={rows} />;
    }
    case "breaking_point.run_end": {
      const rows = [...(e.byPosition as { position: number; sessions: number; missed: number }[])]
        .sort((a, b) => a.position - b.position)
        .map((p) => [`Session ${p.position} of a streak`, p.sessions, `${p.missed} (${pct(p.missed, p.sessions)})`]);
      return (
        <>
          <Table caption="How often each session in a streak was missed" head={["Session", "Reached", "Missed"]} rows={rows} />
          <p className="text-muted-foreground text-xs">Overall, {formatPercent(e.overallMissRate as number)} of sessions were missed.</p>
        </>
      );
    }
    case "sequence.checkin_conditioned": {
      const after = e.after as { days: number; done: number; total: number };
      const otherwise = e.otherwise as { days: number; done: number; total: number };
      return (
        <Table
          caption="Tasks done, by what the check-in said"
          head={["Check-in", "Days", "Tasks done"]}
          rows={[
            ["Condition met", after.days, `${after.done} of ${after.total} (${pct(after.done, after.total)})`],
            ["Otherwise", otherwise.days, `${otherwise.done} of ${otherwise.total} (${pct(otherwise.done, otherwise.total)})`],
          ]}
        />
      );
    }
    case "sequence.activity_follows":
      return (
        <p className="text-sm">
          Followed within a day on {e.followed as number} of {e.occurrences as number} occasions. On a typical day it happened{" "}
          {formatPercent(e.baseShare as number)} of the time.
        </p>
      );
    case "loop.plan_abandon_replan":
      return (
        <ol className="grid gap-1 text-sm">
          {(e.cycles as { stepped: string; steppedOn: string; next: string; startedOn: string }[]).map((c) => (
            <li key={`${c.stepped}-${c.steppedOn}`}>
              Stepped back from “{c.stepped}” on {day(c.steppedOn)}, then started “{c.next}” on {day(c.startedOn)}.
            </li>
          ))}
        </ol>
      );
    default:
      return null;
  }
}

export function PatternEvidence({ pattern }: { pattern: PatternRow }) {
  return (
    <details className="text-sm">
      <summary className="text-muted-foreground cursor-pointer py-2">See the evidence</summary>
      <div className="grid gap-2 pt-2">
        <Details pattern={pattern} />
        <p className="text-muted-foreground text-xs">
          Based on {pattern.observations} observations between {day(pattern.window_start)} and {day(pattern.window_end)}. These
          things occur together; the data can&apos;t say why.
        </p>
      </div>
    </details>
  );
}
