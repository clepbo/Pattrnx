import "server-only";

import type { User } from "@supabase/supabase-js";

import type { CreateGoalInput, UpdateGoalInput } from "@/features/goals/schemas";
import { type ActionResult, fail, ok } from "@/lib/action-result";
import { assertLocalDate, type LocalDate, todayIn } from "@/lib/dates";
import type { Enums, Tables } from "@/server/db/database";
import { createClient } from "@/server/db/server";
import { assessFeasibility, type FeasibilityResult } from "@/server/engines/feasibility";
import type { GoalInput } from "@/types/engine";

import { fromDbError } from "./errors";
import { getProfile } from "./profile";

export type Goal = Tables<"goals">;
export type Milestone = Tables<"milestones">;
export type Action = Tables<"actions">;
export type Outcome = Tables<"outcomes">;
export type GoalStatus = Enums<"goal_status">;

export interface GoalSummary {
  goal: Goal & { life_area: { name: string } | null };
  feasibility: FeasibilityResult;
}

export interface GoalDetail extends GoalSummary {
  strategies: Tables<"goal_strategies">[];
  milestones: Milestone[];
  actions: (Action & { task: Pick<Tables<"tasks">, "id" | "scheduled_date" | "status"> | null })[];
  outcomes: Outcome[];
  routines: Pick<Tables<"routines">, "id" | "name" | "days_of_week" | "normal_minutes">[];
  today: LocalDate;
}

/** DB rows → the engine's input shape (ARCHITECTURE.md §8). */
export function toGoalInput(goal: Goal, outcomes: Pick<Outcome, "local_date" | "value">[], milestones: Pick<Milestone, "status">[]): GoalInput {
  return {
    measurementType: goal.measurement_type,
    baselineValue: goal.baseline_value,
    targetValue: goal.target_value,
    startDate: assertLocalDate(goal.start_date),
    deadline: goal.deadline ? assertLocalDate(goal.deadline) : null,
    plannedPace:
      goal.planned_pace_amount !== null && goal.planned_pace_period !== null
        ? { amount: goal.planned_pace_amount, period: goal.planned_pace_period }
        : null,
    outcomes: [...outcomes]
      .sort((a, b) => a.local_date.localeCompare(b.local_date))
      .map((o) => ({ localDate: assertLocalDate(o.local_date), value: o.value })),
    milestones: milestones.map((m) => ({ status: m.status })),
  };
}

async function userToday(user: User): Promise<LocalDate> {
  return todayIn((await getProfile(user)).timezone);
}

export async function listGoals(user: User, { statuses }: { statuses?: GoalStatus[] } = {}): Promise<GoalSummary[]> {
  const supabase = await createClient();
  let query = supabase
    .from("goals")
    .select("*, life_area:life_areas(name), outcomes(local_date, value), milestones(status)")
    .eq("user_id", user.id);
  if (statuses) query = query.in("status", statuses);
  const { data, error } = await query.order("priority").order("created_at");
  if (error) throw new Error(`goals lookup failed: ${error.code}`);

  const today = await userToday(user);
  return data.map(({ outcomes, milestones, ...goal }) => ({
    goal,
    feasibility: assessFeasibility(toGoalInput(goal, outcomes, milestones), today),
  }));
}

export async function getGoal(user: User, id: string): Promise<GoalDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("goals")
    .select(
      `*, life_area:life_areas(name),
       strategies:goal_strategies(*),
       milestones(*),
       actions(*, task:tasks(id, scheduled_date, status)),
       outcomes(*),
       routines(id, name, days_of_week, normal_minutes, archived_at)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    if (error.code === "22P02") return null; // not a uuid
    throw new Error(`goal lookup failed: ${error.code}`);
  }
  if (!data) return null;

  const { strategies, milestones, actions, outcomes, routines, ...goal } = data;
  const today = await userToday(user);
  const bySort = <T extends { sort_order: number; created_at: string }>(a: T, b: T) =>
    a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at);

  return {
    goal,
    today,
    strategies: [...strategies].sort(bySort),
    milestones: [...milestones].sort(bySort),
    // tasks.action_id is unique, but the embed is typed as an array (composite FK).
    actions: [...actions].sort(bySort).map(({ task, ...action }) => ({ ...action, task: task[0] ?? null })),
    outcomes: [...outcomes].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)),
    routines: routines.filter((r) => r.archived_at === null),
    feasibility: assessFeasibility(toGoalInput(goal, outcomes, milestones), today),
  };
}

function goalColumns(input: UpdateGoalInput) {
  const numeric = input.measurementType !== "milestone";
  return {
    title: input.title,
    life_area_id: input.lifeAreaId,
    unit: numeric ? input.unit : null,
    baseline_value: numeric ? input.baselineValue : null,
    target_value: numeric ? input.targetValue : null,
    deadline: input.deadline,
    planned_pace_amount: input.plannedPaceAmount,
    planned_pace_period: input.plannedPaceAmount !== null ? (input.plannedPacePeriod ?? null) : null,
    motivation: input.motivation,
    priority: input.priority,
  };
}

const GOAL_MESSAGES = {
  validation: "Check the dates and numbers: the deadline must be after today.",
  not_found: "Choose one of your life areas.",
} as const;

export async function createGoal(user: User, input: CreateGoalInput): Promise<ActionResult<{ id: string }>> {
  const today = await userToday(user);
  if (input.deadline && input.deadline <= today) {
    return fail("validation", "Check the highlighted fields.", { deadline: ["Choose a date after today."] });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("goals")
    .insert({ ...goalColumns(input), measurement_type: input.measurementType, start_date: today })
    .select("id")
    .single();
  if (error) return fromDbError("goals.create", error, GOAL_MESSAGES);

  if (input.strategy.length > 0) {
    const { error: strategyError } = await supabase
      .from("goal_strategies")
      .insert(input.strategy.map((description, index) => ({ goal_id: data.id, description, sort_order: index })));
    if (strategyError) return fromDbError("goals.createStrategy", strategyError);
  }
  return ok({ id: data.id });
}

export async function updateGoal(user: User, id: string, input: UpdateGoalInput): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("goals").update(goalColumns(input)).eq("id", id).select("id");
  if (error) return fromDbError("goals.update", error, GOAL_MESSAGES);
  return data.length > 0 ? ok(null) : fail("not_found", "We couldn't find that goal.");
}

export async function setGoalStatus(user: User, id: string, status: GoalStatus): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.from("goals").update({ status }).eq("id", id);
  return error ? fromDbError("goals.setStatus", error) : ok(null);
}

export async function deleteGoal(user: User, id: string): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.from("goals").delete().eq("id", id);
  return error ? fromDbError("goals.delete", error) : ok(null);
}

// --- strategy ---------------------------------------------------------------

export async function addStrategy(user: User, goalId: string, description: string): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { count } = await supabase.from("goal_strategies").select("id", { count: "exact", head: true }).eq("goal_id", goalId);
  const { error } = await supabase.from("goal_strategies").insert({ goal_id: goalId, description, sort_order: count ?? 0 });
  return error ? fromDbError("goals.addStrategy", error) : ok(null);
}

export async function deleteStrategy(user: User, id: string): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.from("goal_strategies").delete().eq("id", id);
  return error ? fromDbError("goals.deleteStrategy", error) : ok(null);
}

// --- milestones -------------------------------------------------------------

export async function addMilestone(
  user: User,
  goalId: string,
  input: { title: string; targetDate: string | null },
): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { count } = await supabase.from("milestones").select("id", { count: "exact", head: true }).eq("goal_id", goalId);
  const { error } = await supabase
    .from("milestones")
    .insert({ goal_id: goalId, title: input.title, target_date: input.targetDate, sort_order: count ?? 0 });
  return error ? fromDbError("goals.addMilestone", error) : ok(null);
}

export async function setMilestoneStatus(user: User, id: string, status: Enums<"milestone_status">): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.from("milestones").update({ status }).eq("id", id);
  return error ? fromDbError("goals.setMilestoneStatus", error) : ok(null);
}

export async function deleteMilestone(user: User, id: string): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.from("milestones").delete().eq("id", id);
  return error ? fromDbError("goals.deleteMilestone", error) : ok(null);
}

// --- actions ----------------------------------------------------------------

export async function addAction(
  user: User,
  goalId: string,
  input: { title: string; milestoneId: string | null; activityTypeId: string | null; estimatedMinutes: number | null },
): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { count } = await supabase.from("actions").select("id", { count: "exact", head: true }).eq("goal_id", goalId);
  const { error } = await supabase.from("actions").insert({
    goal_id: goalId,
    title: input.title,
    milestone_id: input.milestoneId,
    activity_type_id: input.activityTypeId,
    estimated_minutes: input.estimatedMinutes,
    sort_order: count ?? 0,
  });
  return error
    ? fromDbError("goals.addAction", error, { not_found: "That milestone or activity type no longer exists." })
    : ok(null);
}

export async function deleteAction(user: User, id: string): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.from("actions").delete().eq("id", id);
  return error ? fromDbError("goals.deleteAction", error) : ok(null);
}

/** Puts an action on a day's plan, or moves it if it's already scheduled and not yet done. */
export async function scheduleAction(user: User, actionId: string, date: LocalDate): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { data: action, error } = await supabase
    .from("actions")
    .select("id, title, goal_id, activity_type_id, estimated_minutes, task:tasks(id, status)")
    .eq("id", actionId)
    .maybeSingle();
  if (error) return fromDbError("goals.scheduleAction", error);
  if (!action) return fail("not_found", "We couldn't find that action.");
  const existing = action.task[0];
  if (existing && existing.status !== "planned") {
    return fail("conflict", "This action is already done or skipped. Reopen it from Today to reschedule.");
  }

  const { error: upsertError } = await supabase.from("tasks").upsert(
    {
      title: action.title,
      source: "action",
      action_id: action.id,
      goal_id: action.goal_id,
      activity_type_id: action.activity_type_id,
      planned_minutes: action.estimated_minutes,
      scheduled_date: date,
    },
    { onConflict: "action_id" },
  );
  return upsertError ? fromDbError("goals.scheduleActionUpsert", upsertError) : ok(null);
}

export async function unscheduleAction(user: User, actionId: string): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("action_id", actionId).eq("status", "planned");
  return error ? fromDbError("goals.unscheduleAction", error) : ok(null);
}

// --- outcomes ---------------------------------------------------------------

export async function logOutcome(
  user: User,
  goalId: string,
  input: { value: number | null; occurredAt: string; description: string | null },
): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.from("outcomes").insert({
    goal_id: goalId,
    value: input.value,
    occurred_at: input.occurredAt,
    description: input.description,
    valence: "unknown",
  });
  return error
    ? fromDbError("goals.logOutcome", error, { validation: "That date is in the future." })
    : ok(null);
}

export async function deleteOutcome(user: User, id: string): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.from("outcomes").delete().eq("id", id);
  return error ? fromDbError("goals.deleteOutcome", error) : ok(null);
}
