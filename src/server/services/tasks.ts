import "server-only";

import type { User } from "@supabase/supabase-js";

import { type ActionResult, fail, ok } from "@/lib/action-result";
import { addDays, type LocalDate, todayIn } from "@/lib/dates";
import type { Enums, Tables } from "@/server/db/database";
import { createClient } from "@/server/db/server";

import { fromDbError } from "./errors";
import { getProfile } from "./profile";
import { ensureRoutineTasks } from "./routines";

export type TaskStatus = Enums<"task_status">;
export type TaskRow = Tables<"tasks"> & {
  goal: { title: string; priority: number } | null;
  routine: { fallback_description: string | null } | null;
};

export interface DayPlan {
  today: LocalDate;
  tasks: TaskRow[];
  /** Earlier days' tasks, still `planned` (i.e. missed, BR-4) or finished. */
  recent: TaskRow[];
}

const SELECT = "*, goal:goals(title, priority), routine:routines(fallback_description)";

/** Today's plan plus the previous `lookbackDays`, generating routine tasks first. */
export async function getDayPlan(user: User, lookbackDays = 6): Promise<DayPlan> {
  await ensureRoutineTasks(user);
  const today = todayIn((await getProfile(user)).timezone);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(SELECT)
    .eq("user_id", user.id)
    .gte("scheduled_date", addDays(today, -lookbackDays))
    .lte("scheduled_date", today)
    .order("scheduled_date", { ascending: false })
    .order("scheduled_time", { ascending: true, nullsFirst: false })
    .order("created_at");
  if (error) throw new Error(`tasks lookup failed: ${error.code}`);

  return {
    today,
    tasks: data.filter((t) => t.scheduled_date === today),
    recent: data.filter((t) => t.scheduled_date !== today),
  };
}

export async function setTaskStatus(user: User, taskId: string, status: TaskStatus): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_task_status", { p_task_id: taskId, p_status: status });
  if (error) {
    if (error.code === "23514") return fail("validation", "You can't complete a task that's planned for the future.");
    return fromDbError("tasks.setStatus", error, { not_found: "We couldn't find that task." });
  }
  return ok(null);
}

export async function addManualTask(
  user: User,
  input: { title: string; goalId: string | null; date: LocalDate; plannedMinutes: number | null },
): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    title: input.title,
    source: "manual",
    goal_id: input.goalId,
    scheduled_date: input.date,
    planned_minutes: input.plannedMinutes,
  });
  return error ? fromDbError("tasks.addManual", error, { not_found: "Choose one of your goals." }) : ok(null);
}

export async function deleteManualTask(user: User, taskId: string): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId).eq("source", "manual");
  return error ? fromDbError("tasks.deleteManual", error) : ok(null);
}

/** Planned vs finished tasks in a date range, e.g. for a routine's recent adherence. */
export async function taskCounts(
  user: User,
  filter: { routineId?: string; goalId?: string },
  from: LocalDate,
  to: LocalDate,
): Promise<{ planned: number; done: number }> {
  const supabase = await createClient();
  let query = supabase.from("tasks").select("status").eq("user_id", user.id).gte("scheduled_date", from).lte("scheduled_date", to);
  if (filter.routineId) query = query.eq("routine_id", filter.routineId);
  if (filter.goalId) query = query.eq("goal_id", filter.goalId);
  const { data, error } = await query;
  if (error) throw new Error(`task counts failed: ${error.code}`);
  return { planned: data.length, done: data.filter((t) => t.status === "done" || t.status === "done_minimum").length };
}
