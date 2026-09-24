import type { Metadata } from "next";

import { createRoutine } from "@/features/routines/actions";
import { RoutineForm } from "@/features/routines/components/routine-form";
import { requireUser } from "@/server/auth";
import { listActivityTypes } from "@/server/services/activity-types";
import { listGoals } from "@/server/services/goals";

export const metadata: Metadata = { title: "New routine" };

export default async function NewRoutinePage({ searchParams }: PageProps<"/routines/new">) {
  const user = await requireUser();
  const [{ goalId }, goals, types] = await Promise.all([searchParams, listGoals(user, { statuses: ["active"] }), listActivityTypes(user)]);
  const preselected = typeof goalId === "string" && goals.some((g) => g.goal.id === goalId) ? goalId : undefined;

  return (
    <div className="grid gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">New routine</h1>
      <RoutineForm
        action={createRoutine}
        goals={goals.map(({ goal }) => ({ id: goal.id, title: goal.title }))}
        activityTypes={types.map((t) => ({ id: t.id, name: t.name }))}
        defaults={{ goalId: preselected }}
        cancelHref={preselected ? `/goals/${preselected}` : "/routines"}
      />
    </div>
  );
}
