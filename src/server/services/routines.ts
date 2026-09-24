import "server-only";

import type { User } from "@supabase/supabase-js";

import { type ActionResult, fail, ok } from "@/lib/action-result";
import { assertLocalDate, type LocalDate, todayIn } from "@/lib/dates";
import type { Tables, TablesInsert } from "@/server/db/database";
import { createClient } from "@/server/db/server";
import { generationWindow, routineOccurrences } from "@/server/engines/schedule/occurrences";

import { fromDbError } from "./errors";
import { getProfile } from "./profile";

export type Routine = Tables<"routines">;
export type RoutineWithRelations = Routine & {
  goal: { id: string; title: string; priority: number } | null;
  activity_type: { name: string } | null;
  steps: Tables<"routine_steps">[];
};

export interface RoutineInput {
  name: string;
  goalId: string | null;
  activityTypeId: string;
  daysOfWeek: number[];
  preferredTime: string | null;
  normalMinutes: number;
  minimumMinutes: number | null;
  fallbackDescription: string | null;
  steps: string[];
}

const SELECT = "*, goal:goals(id, title, priority), activity_type:activity_types(name), steps:routine_steps(*)";

async function userToday(user: User): Promise<LocalDate> {
  return todayIn((await getProfile(user)).timezone);
}

export async function listRoutines(user: User, { includeArchived = false } = {}): Promise<RoutineWithRelations[]> {
  const supabase = await createClient();
  let query = supabase.from("routines").select(SELECT).eq("user_id", user.id);
  if (!includeArchived) query = query.is("archived_at", null);
  const { data, error } = await query.order("created_at");
  if (error) throw new Error(`routines lookup failed: ${error.code}`);
  return data;
}

export async function getRoutine(user: User, id: string): Promise<RoutineWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("routines").select(SELECT).eq("id", id).maybeSingle();
  if (error) {
    if (error.code === "22P02") return null;
    throw new Error(`routine lookup failed: ${error.code}`);
  }
  if (data) data.steps.sort((a, b) => a.sort_order - b.sort_order);
  return data;
}

function columns(input: RoutineInput): Omit<TablesInsert<"routines">, "active_from"> {
  return {
    name: input.name,
    goal_id: input.goalId,
    activity_type_id: input.activityTypeId,
    days_of_week: [...new Set(input.daysOfWeek)].sort((a, b) => a - b),
    preferred_time: input.preferredTime,
    normal_minutes: input.normalMinutes,
    minimum_minutes: input.minimumMinutes,
    fallback_description: input.fallbackDescription,
  };
}

async function replaceSteps(routineId: string, steps: string[]): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.from("routine_steps").delete().eq("routine_id", routineId);
  if (error) return fromDbError("routines.deleteSteps", error);
  if (steps.length === 0) return ok(null);
  const { error: insertError } = await supabase
    .from("routine_steps")
    .insert(steps.map((title, index) => ({ routine_id: routineId, title, sort_order: index })));
  return insertError ? fromDbError("routines.insertSteps", insertError) : ok(null);
}

/** Removes a routine's not-yet-acted-on tasks from `from` onwards. */
async function clearPlannedTasks(routineId: string, from: LocalDate): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("routine_id", routineId)
    .eq("status", "planned")
    .gte("scheduled_date", from);
  return error ? fromDbError("routines.clearPlannedTasks", error) : ok(null);
}

const MESSAGES = { not_found: "Choose one of your goals and activity types." } as const;

export async function createRoutine(user: User, input: RoutineInput): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const today = await userToday(user);
  const { data, error } = await supabase
    .from("routines")
    .insert({ ...columns(input), active_from: today })
    .select("id")
    .single();
  if (error) return fromDbError("routines.create", error, MESSAGES);

  const steps = await replaceSteps(data.id, input.steps);
  if (!steps.ok) return steps;
  await ensureRoutineTasks(user);
  return ok({ id: data.id });
}

/** Edits apply from today: today's and future planned tasks are regenerated, history is kept. */
export async function updateRoutine(user: User, id: string, input: RoutineInput): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("routines").update(columns(input)).eq("id", id).select("id");
  if (error) return fromDbError("routines.update", error, MESSAGES);
  if (data.length === 0) return fail("not_found", "We couldn't find that routine.");

  const steps = await replaceSteps(id, input.steps);
  if (!steps.ok) return steps;
  const cleared = await clearPlannedTasks(id, await userToday(user));
  if (!cleared.ok) return cleared;
  await ensureRoutineTasks(user);
  return ok(null);
}

export async function setRoutinePaused(user: User, id: string, paused: boolean): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const today = await userToday(user);
  const { error } = await supabase
    .from("routines")
    // Resuming restarts the schedule today, so paused days are never backfilled as missed.
    .update(paused ? { paused_at: new Date().toISOString() } : { paused_at: null, active_from: today })
    .eq("id", id);
  if (error) return fromDbError("routines.pause", error);
  if (paused) return clearPlannedTasks(id, today);
  await ensureRoutineTasks(user);
  return ok(null);
}

export async function archiveRoutine(user: User, id: string): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.from("routines").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) return fromDbError("routines.archive", error);
  return clearPlannedTasks(id, await userToday(user));
}

/**
 * Idempotently creates routine tasks for the generation window (FR-3).
 * Safe to call on every page load: existing (routine, date) pairs are left untouched.
 */
export async function ensureRoutineTasks(user: User): Promise<void> {
  const today = await userToday(user);
  const { from, to } = generationWindow(today);
  const routines = await listRoutines(user);

  const rows: TablesInsert<"tasks">[] = routines.flatMap((routine) =>
    routineOccurrences(
      {
        daysOfWeek: routine.days_of_week,
        activeFrom: assertLocalDate(routine.active_from),
        paused: routine.paused_at !== null,
        archived: routine.archived_at !== null,
      },
      from,
      to,
    ).map((date) => ({
      title: routine.name,
      source: "routine" as const,
      routine_id: routine.id,
      goal_id: routine.goal_id,
      activity_type_id: routine.activity_type_id,
      scheduled_date: date,
      scheduled_time: routine.preferred_time,
      planned_minutes: routine.normal_minutes,
      minimum_minutes: routine.minimum_minutes,
    })),
  );
  if (rows.length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .upsert(rows, { onConflict: "routine_id,scheduled_date", ignoreDuplicates: true });
  if (error) console.error(JSON.stringify({ level: "error", operation: "routines.ensureTasks", code: error.code }));
}
