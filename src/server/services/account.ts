import "server-only";

import type { User } from "@supabase/supabase-js";

import { type ActionResult, fail, ok } from "@/lib/action-result";
import { createAdminClient } from "@/server/db/admin";
import { createClient } from "@/server/db/server";

import { EXPORT_TABLES } from "./export-tables";

/**
 * Everything the user owns, as JSON (PRD F15). Read through the user's own
 * session, so RLS guarantees nothing else can leak in. Rate-limited (§10).
 */
export async function exportData(user: User): Promise<ActionResult<Record<string, unknown>>> {
  const supabase = await createClient();
  // Limit (5 per hour) is defined in the SQL function, not here (security review SR-1).
  const { data: allowed, error: limitError } = await supabase.rpc("hit_rate_limit", { p_action: "export" });
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

/** Deleting the account needs a sign-in this recent (security review SR-2). */
export const RECENT_SIGN_IN_MINUTES = 15;

export function signedInRecently(user: Pick<User, "last_sign_in_at">, now = Date.now()): boolean {
  if (!user.last_sign_in_at) return false;
  return now - new Date(user.last_sign_in_at).getTime() <= RECENT_SIGN_IN_MINUTES * 60_000;
}

/**
 * Deletes the auth user; every row cascades (FR-10). Uses the service role
 * because users can't delete their own auth record through the API. Requires a
 * recent sign-in so a stolen or forgotten session can't erase an account.
 */
export async function deleteAccount(user: User): Promise<ActionResult<null>> {
  if (!signedInRecently(user)) {
    return fail("unauthorized", "For your security, sign in again before deleting your account.");
  }
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
