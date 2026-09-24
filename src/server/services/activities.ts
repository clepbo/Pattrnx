import "server-only";

import type { User } from "@supabase/supabase-js";

import { type ActionResult, ok } from "@/lib/action-result";
import type { LocalDate } from "@/lib/dates";
import type { Tables } from "@/server/db/database";
import { createClient } from "@/server/db/server";

import { fromDbError } from "./errors";

export type Activity = Tables<"activities">;
export type ActivityWithType = Activity & {
  activity_type: { name: string; polarity: Tables<"activity_types">["polarity"] } | null;
  goal: { title: string } | null;
};

export interface NewActivity {
  /** Client-generated; makes retries of the same submit idempotent. */
  id: string;
  activityTypeId: string;
  occurredAt: string;
  durationMinutes: number | null;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  goalId: string | null;
}

export async function logActivity(user: User, input: NewActivity): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.from("activities").insert({
    id: input.id,
    activity_type_id: input.activityTypeId,
    occurred_at: input.occurredAt,
    duration_minutes: input.durationMinutes,
    quantity: input.quantity,
    unit: input.unit,
    note: input.note,
    goal_id: input.goalId,
    source: "manual",
  });
  if (error?.code === "23505") return ok(null); // the same submit arrived twice
  return error
    ? fromDbError("activities.log", error, {
        not_found: "That activity type or goal no longer exists.",
        validation: "Check the time: activities can't be logged in the future.",
      })
    : ok(null);
}

export async function listActivities(user: User, from: LocalDate, to: LocalDate): Promise<ActivityWithType[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .select("*, activity_type:activity_types(name, polarity), goal:goals(title)")
    .eq("user_id", user.id)
    .gte("local_date", from)
    .lte("local_date", to)
    .order("occurred_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(`activities lookup failed: ${error.code}`);
  return data;
}

/** Deletes a manually logged activity. Task evidence is removed by undoing the task instead. */
export async function deleteActivity(user: User, id: string): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.from("activities").delete().eq("id", id).is("task_id", null);
  return error ? fromDbError("activities.delete", error) : ok(null);
}
