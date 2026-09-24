import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { routineCommand, updateRoutine } from "@/features/routines/actions";
import { RoutineForm } from "@/features/routines/components/routine-form";
import { describeDays } from "@/features/routines/format";
import { addDays, todayIn } from "@/lib/dates";
import { requireUser } from "@/server/auth";
import { listActivityTypes } from "@/server/services/activity-types";
import { listGoals } from "@/server/services/goals";
import { getProfile } from "@/server/services/profile";
import { getRoutine } from "@/server/services/routines";
import { taskCounts } from "@/server/services/tasks";

export const metadata: Metadata = { title: "Routine" };

export default async function RoutinePage({ params, searchParams }: PageProps<"/routines/[routineId]">) {
  const user = await requireUser();
  const [{ routineId }, { saved }] = await Promise.all([params, searchParams]);
  const routine = await getRoutine(user, routineId);
  if (!routine || routine.archived_at) notFound();

  const today = todayIn((await getProfile(user)).timezone);
  // Yesterday back 28 days: today isn't over yet.
  const [goals, types, last28] = await Promise.all([
    listGoals(user, { statuses: ["active"] }),
    listActivityTypes(user),
    taskCounts(user, { routineId: routine.id }, addDays(today, -28), addDays(today, -1)),
  ]);

  return (
    <div className="grid gap-10">
      <div className="grid gap-3">
        <Link href="/routines" className="text-muted-foreground text-sm hover:underline">
          ← Routines
        </Link>
        {saved && (
          <p role="status" className="bg-muted rounded-lg px-3 py-2 text-sm">
            Saved. Today&apos;s and future tasks use the new settings.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{routine.name}</h1>
          {routine.paused_at && <StatusBadge tone="neutral">Paused</StatusBadge>}
        </div>
        <p className="text-muted-foreground text-sm">
          {describeDays(routine.days_of_week)} · {routine.normal_minutes} min
          {routine.goal && (
            <>
              {" · "}
              <Link href={`/goals/${routine.goal.id}`} className="underline-offset-4 hover:underline">
                {routine.goal.title}
              </Link>
            </>
          )}
        </p>
        <p className="text-sm">
          {last28.planned === 0
            ? "No completed days to show yet."
            : `Last 4 weeks: done on ${last28.done} of ${last28.planned} planned days.`}
        </p>
      </div>

      <section aria-labelledby="edit-heading" className="grid gap-4">
        <h2 id="edit-heading" className="text-lg font-medium">
          Edit
        </h2>
        <RoutineForm
          action={updateRoutine}
          goals={goals.map(({ goal }) => ({ id: goal.id, title: goal.title }))}
          activityTypes={types.map((t) => ({ id: t.id, name: t.name }))}
          cancelHref="/routines"
          defaults={{
            routineId: routine.id,
            name: routine.name,
            goalId: routine.goal_id ?? "",
            activityTypeId: routine.activity_type_id,
            daysOfWeek: routine.days_of_week,
            preferredTime: routine.preferred_time?.slice(0, 5) ?? "",
            normalMinutes: String(routine.normal_minutes),
            minimumMinutes: routine.minimum_minutes === null ? "" : String(routine.minimum_minutes),
            fallbackDescription: routine.fallback_description ?? "",
            steps: routine.steps.map((s) => s.title).join("\n"),
          }}
        />
      </section>

      <section aria-labelledby="status-heading" className="grid gap-3">
        <h2 id="status-heading" className="text-lg font-medium">
          Pause or archive
        </h2>
        <p className="text-muted-foreground text-sm">
          Pausing removes upcoming tasks without counting them as missed. Archiving hides the routine but keeps its history.
        </p>
        <div className="flex flex-wrap gap-2">
          <form action={routineCommand}>
            <input type="hidden" name="routineId" value={routine.id} />
            <input type="hidden" name="command" value={routine.paused_at ? "resume" : "pause"} />
            <Button type="submit" variant="outline">
              {routine.paused_at ? "Resume" : "Pause"}
            </Button>
          </form>
          <form action={routineCommand}>
            <input type="hidden" name="routineId" value={routine.id} />
            <input type="hidden" name="command" value="archive" />
            <Button type="submit" variant="ghost">
              Archive
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
