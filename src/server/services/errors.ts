import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import { type ActionResult, fail } from "@/lib/action-result";

/**
 * Maps a PostgREST/Postgres error to a user-safe `ActionResult`.
 * `messages` overrides the default copy per failure kind. Unexpected errors are
 * logged with the operation name and SQLSTATE only (no user content).
 */
export function fromDbError<T = never>(
  operation: string,
  error: PostgrestError,
  messages: Partial<Record<"conflict" | "not_found" | "validation", string>> = {},
): ActionResult<T> {
  switch (error.code) {
    case "23505":
      return fail("conflict", messages.conflict ?? "That already exists.");
    case "23503":
    case "P0002":
    case "PGRST116":
      return fail("not_found", messages.not_found ?? "We couldn't find that. It may have been deleted.");
    case "23514":
    case "22P02":
      return fail("validation", messages.validation ?? "Some of those values aren't allowed.");
    default:
      console.error(JSON.stringify({ level: "error", operation, code: error.code }));
      return fail("unexpected", "Something went wrong. Please try again.");
  }
}
