import "server-only";

import type { User } from "@supabase/supabase-js";

import { type ActionResult, fail, ok } from "@/lib/action-result";
import { createAdminClient } from "@/server/db/admin";
import { createClient } from "@/server/db/server";

import { EXPORT_TABLES } from "./export-tables";

const EXPORTS_PER_HOUR = 5;

/**
 * Everything the user owns, as JSON (PRD F15). Read through the user's own
 * session, so RLS guarantees nothing else can leak in. Rate-limited (§10).
 */
export async function exportData(user: User): Promise<ActionResult<Record<string, unknown>>> {
  const supabase = await createClient();
  const { data: allowed, error: limitError } = await supabase.rpc("hit_rate_limit", {
    p_action: "export",
    p_max: EXPORTS_PER_HOUR,
    p_window: "1 hour",
  });
  if (limitError) return fail("unexpected", "Something went wrong. Please try again.");
  if (!allowed) return fail("limit", "You've exported several times in the last hour. Try again later.");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const tables: Record<string, unknown[]> = {};
  for (const table of EXPORT_TABLES) {
    const { data, error } = await supabase.from(table).select("*").eq("user_id", user.id);
    if (error) return fail("unexpected", "Something went wrong while collecting your data. Please try again.");
    tables[table] = data;
  }
  return ok({
    format: "pattrnx-export",
    version: 1,
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at },
    profile,
    ...tables,
  });
}

/**
 * Deletes the auth user; every row cascades (FR-10). Uses the service role
 * because users can't delete their own auth record through the API.
 */
export async function deleteAccount(user: User): Promise<ActionResult<null>> {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error(JSON.stringify({ level: "error", operation: "account.delete", code: error.code ?? "unknown" }));
    return fail("unexpected", "We couldn't delete your account. Please try again, or contact support.");
  }
  // Clear this browser's session cookies (the refresh tokens are already gone with the user).
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  return ok(null);
}
