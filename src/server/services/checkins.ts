import "server-only";

import type { User } from "@supabase/supabase-js";

import { type ActionResult, ok } from "@/lib/action-result";
import type { LocalDate } from "@/lib/dates";
import type { Tables } from "@/server/db/database";
import { createClient } from "@/server/db/server";

import { fromDbError } from "./errors";

export type Checkin = Tables<"daily_checkins">;

export interface CheckinInput {
  localDate: LocalDate;
  sleepHours: number | null;
  energy: number | null;
  mood: number | null;
  stress: number | null;
  workload: number | null;
  note: string | null;
}

export async function getCheckin(user: User, date: LocalDate): Promise<Checkin | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("daily_checkins").select("*").eq("user_id", user.id).eq("local_date", date).maybeSingle();
  if (error) throw new Error(`check-in lookup failed: ${error.code}`);
  return data;
}

export async function saveCheckin(user: User, input: CheckinInput): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.from("daily_checkins").upsert(
    {
      user_id: user.id,
      local_date: input.localDate,
      sleep_hours: input.sleepHours,
      energy: input.energy,
      mood: input.mood,
      stress: input.stress,
      workload: input.workload,
      note: input.note,
    },
    { onConflict: "user_id,local_date" },
  );
  return error ? fromDbError("checkins.save", error) : ok(null);
}
