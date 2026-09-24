import "server-only";

import type { User } from "@supabase/supabase-js";
import { cache } from "react";

import { type ActionResult, ok } from "@/lib/action-result";
import type { ProfileInput } from "@/features/settings/schemas";
import type { Tables } from "@/server/db/database";
import { createClient } from "@/server/db/server";

import { fromDbError } from "./errors";

export type Profile = Tables<"profiles">;

/** The signed-in user's profile. Created by the sign-up trigger, so it always exists. Cached per request. */
export const getProfile = cache(async (user: User): Promise<Profile> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (error) throw new Error(`profile lookup failed: ${error.code}`);
  return data;
});

export async function updateProfile(user: User, input: ProfileInput): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: input.displayName,
      timezone: input.timezone,
      currency: input.currency,
      week_starts_on: input.weekStartsOn,
    })
    .eq("id", user.id);
  return error ? fromDbError("profile.update", error) : ok(null);
}

export async function completeOnboarding(user: User): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("onboarding_completed_at", null);
  return error ? fromDbError("profile.completeOnboarding", error) : ok(null);
}
