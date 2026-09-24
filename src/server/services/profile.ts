import "server-only";

import type { User } from "@supabase/supabase-js";

import type { Tables } from "@/server/db/database";
import { createClient } from "@/server/db/server";

export type Profile = Tables<"profiles">;

/** The signed-in user's profile. Created by the sign-up trigger, so it always exists. */
export async function getProfile(user: User): Promise<Profile> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (error) throw new Error(`profile lookup failed: ${error.code}`);
  return data;
}
