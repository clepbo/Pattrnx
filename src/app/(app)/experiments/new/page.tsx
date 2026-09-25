import type { Metadata } from "next";

import { ExperimentForm } from "@/features/experiments/components/experiment-form";
import { requireUser } from "@/server/auth";
import { listActivityTypes } from "@/server/services/activity-types";
import { draftForPattern } from "@/server/services/experiments";
import { listGoals } from "@/server/services/goals";
import { listRoutines } from "@/server/services/routines";

export const metadata: Metadata = { title: "New experiment" };

export default async function NewExperimentPage({ searchParams }: PageProps<"/experiments/new">) {
  const user = await requireUser();
  const { patternId } = await searchParams;
  const [suggestion, routines, types, goals] = await Promise.all([
    typeof patternId === "string" ? draftForPattern(user, patternId) : Promise.resolve(null),
    listRoutines(user),
    listActivityTypes(user),
    listGoals(user, { statuses: ["active"] }),
  ]);
  const draft = suggestion?.draft;

  return (
    <div className="grid gap-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">New experiment</h1>
        <p className="text-muted-foreground text-sm">
          {draft ? "Suggested from a pattern. Change anything that doesn't fit." : "One small, specific change you can keep up for a few weeks."}
        </p>
      </div>
      <ExperimentForm
        routines={routines.map((r) => ({ id: r.id, name: r.name }))}
        activityTypes={types.map((t) => ({ id: t.id, name: t.name }))}
        goals={goals.map(({ goal }) => ({ id: goal.id, title: goal.title }))}
        defaults={
          draft
            ? {
                title: draft.title,
                hypothesis: draft.hypothesis,
                category: draft.category,
                description: draft.description,
                metric: draft.metric,
                routineId: draft.subject.routineId,
                activityTypeId: draft.subject.activityTypeId,
                direction: draft.direction,
                durationDays: String(draft.durationDays),
                patternId: suggestion.patternId,
              }
            : {}
        }
      />
    </div>
  );
}
