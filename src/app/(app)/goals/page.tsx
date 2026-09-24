import type { Metadata } from "next";
import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { FEASIBILITY_LABELS } from "@/features/goals/feasibility-copy";
import { assertLocalDate } from "@/lib/dates";
import { formatLocalDate } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { listGoals } from "@/server/services/goals";

export const metadata: Metadata = { title: "Goals" };

const STATUS_LABELS = { draft: "Draft", active: "Active", paused: "Paused", completed: "Completed", abandoned: "Abandoned" };

export default async function GoalsPage() {
  const user = await requireUser();
  const summaries = await listGoals(user);
  const active = summaries.filter((s) => s.goal.status === "active");
  const other = summaries.filter((s) => s.goal.status !== "active");

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
        <Button asChild>
          <Link href="/goals/new">New goal</Link>
        </Button>
      </div>

      {summaries.length === 0 && (
        <div className="border-border grid gap-2 rounded-xl border border-dashed p-6 text-center">
          <p className="font-medium">No goals yet</p>
          <p className="text-muted-foreground text-sm">Start with one thing you want to change in the next few months.</p>
        </div>
      )}

      {[
        { title: "Active", items: active },
        { title: "Paused, completed and abandoned", items: other },
      ]
        .filter((group) => group.items.length > 0)
        .map((group) => (
          <section key={group.title} className="grid gap-3" aria-label={group.title}>
            {other.length > 0 && <h2 className="text-muted-foreground text-sm font-medium">{group.title}</h2>}
            <ul className="grid gap-3">
              {group.items.map(({ goal, feasibility }) => {
                const badge = FEASIBILITY_LABELS[feasibility.state];
                return (
                  <li key={goal.id}>
                    <Link href={`/goals/${goal.id}`} className="border-border hover:bg-muted grid gap-2 rounded-xl border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <span className="font-medium">{goal.title}</span>
                        {goal.status === "active" ? (
                          <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                        ) : (
                          <StatusBadge tone="neutral">{STATUS_LABELS[goal.status]}</StatusBadge>
                        )}
                      </div>
                      <span className="text-muted-foreground text-sm">
                        {goal.life_area?.name}
                        {goal.deadline && ` · by ${formatLocalDate(assertLocalDate(goal.deadline))}`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
    </div>
  );
}
