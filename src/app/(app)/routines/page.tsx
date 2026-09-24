import type { Metadata } from "next";
import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { describeDays } from "@/features/routines/format";
import { requireUser } from "@/server/auth";
import { listRoutines } from "@/server/services/routines";

export const metadata: Metadata = { title: "Routines" };

export default async function RoutinesPage() {
  const routines = await listRoutines(await requireUser());

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Routines</h1>
        <Button asChild>
          <Link href="/routines/new">New routine</Link>
        </Button>
      </div>
      {routines.length === 0 ? (
        <div className="border-border grid gap-2 rounded-xl border border-dashed p-6 text-center">
          <p className="font-medium">No routines yet</p>
          <p className="text-muted-foreground text-sm">
            A routine is something you repeat, like practising three mornings a week. Give it a minimum version for busy days.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {routines.map((routine) => (
            <li key={routine.id}>
              <Link href={`/routines/${routine.id}`} className="border-border hover:bg-muted grid gap-1 rounded-xl border p-4">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{routine.name}</span>
                  {routine.paused_at && <StatusBadge tone="neutral">Paused</StatusBadge>}
                </span>
                <span className="text-muted-foreground text-sm">
                  {describeDays(routine.days_of_week)}
                  {routine.preferred_time && ` at ${routine.preferred_time.slice(0, 5)}`} · {routine.normal_minutes} min
                  {routine.minimum_minutes && ` (minimum ${routine.minimum_minutes})`}
                  {routine.goal && ` · ${routine.goal.title}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
