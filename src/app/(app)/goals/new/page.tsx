import type { Metadata } from "next";

import { createGoal } from "@/features/goals/actions";
import { GoalForm } from "@/features/goals/components/goal-form";
import { requireUser } from "@/server/auth";
import { listLifeAreas } from "@/server/services/life-areas";
import { getProfile } from "@/server/services/profile";

export const metadata: Metadata = { title: "New goal" };

export default async function NewGoalPage({ searchParams }: PageProps<"/goals/new">) {
  const user = await requireUser();
  const [{ first }, profile, areas] = await Promise.all([searchParams, getProfile(user), listLifeAreas(user)]);
  const onboarding = first === "1";

  return (
    <div className="grid gap-8">
      <div className="grid gap-1">
        {onboarding && <p className="text-muted-foreground text-sm">Step 3 of 3</p>}
        <h1 className="text-2xl font-semibold tracking-tight">{onboarding ? "Create your first goal" : "New goal"}</h1>
        <p className="text-muted-foreground text-sm">
          Pattrnx will check whether your plan matches the pace the goal needs. You can change anything later.
        </p>
      </div>
      <GoalForm
        action={createGoal}
        areas={areas.map((a) => ({ id: a.id, name: a.name }))}
        currency={profile.currency}
        mode="create"
        cancelHref={onboarding ? "/today" : "/goals"}
      />
    </div>
  );
}
