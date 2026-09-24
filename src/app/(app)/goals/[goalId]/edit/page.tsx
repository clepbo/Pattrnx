import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { updateGoal } from "@/features/goals/actions";
import { GoalForm } from "@/features/goals/components/goal-form";
import { requireUser } from "@/server/auth";
import { getGoal } from "@/server/services/goals";
import { listLifeAreas } from "@/server/services/life-areas";
import { getProfile } from "@/server/services/profile";

export const metadata: Metadata = { title: "Edit goal" };

const str = (value: number | string | null) => (value === null ? "" : String(value));

export default async function EditGoalPage({ params }: PageProps<"/goals/[goalId]/edit">) {
  const user = await requireUser();
  const { goalId } = await params;
  const [detail, profile, areas] = await Promise.all([getGoal(user, goalId), getProfile(user), listLifeAreas(user)]);
  if (!detail) notFound();
  const { goal } = detail;

  return (
    <div className="grid gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">Edit goal</h1>
      <GoalForm
        action={updateGoal}
        areas={areas.map((a) => ({ id: a.id, name: a.name }))}
        currency={profile.currency}
        mode="edit"
        cancelHref={`/goals/${goal.id}`}
        defaults={{
          goalId: goal.id,
          title: goal.title,
          lifeAreaId: goal.life_area_id,
          measurementType: goal.measurement_type,
          unit: str(goal.unit),
          baselineValue: str(goal.baseline_value),
          targetValue: str(goal.target_value),
          deadline: str(goal.deadline),
          plannedPaceAmount: str(goal.planned_pace_amount),
          plannedPacePeriod: str(goal.planned_pace_period),
          motivation: str(goal.motivation),
          priority: String(goal.priority),
        }}
      />
    </div>
  );
}
