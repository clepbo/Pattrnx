import "server-only";

import type { User } from "@supabase/supabase-js";

import { type ActionResult, fail, ok } from "@/lib/action-result";
import type { Tables } from "@/server/db/database";
import { createClient } from "@/server/db/server";

import { fromDbError } from "./errors";

export type LifeArea = Tables<"life_areas">;

export async function listLifeAreas(user: User, { includeArchived = false } = {}): Promise<LifeArea[]> {
  const supabase = await createClient();
  let query = supabase.from("life_areas").select("*").eq("user_id", user.id);
  if (!includeArchived) query = query.is("archived_at", null);
  const { data, error } = await query.order("sort_order").order("created_at");
  if (error) throw new Error(`life areas lookup failed: ${error.code}`);
  return data;
}

/**
 * Creates the named areas, skipping (case-insensitively) any the user already has,
 * and returns every requested area by lower-cased name.
 */
export async function ensureLifeAreas(user: User, names: string[]): Promise<ActionResult<Map<string, LifeArea>>> {
  const supabase = await createClient();
  const existing = await listLifeAreas(user, { includeArchived: true });
  const byName = new Map(existing.map((area) => [area.name.toLowerCase(), area]));

  const nextOrder = existing.reduce((max, area) => Math.max(max, area.sort_order), -1) + 1;
  const missing = [...new Set(names.map((n) => n.trim()))].filter((name) => !byName.has(name.toLowerCase()));
  if (missing.length > 0) {
    const { data, error } = await supabase
      .from("life_areas")
      .insert(missing.map((name, index) => ({ name, sort_order: nextOrder + index })))
      .select();
    if (error) return fromDbError("lifeAreas.ensure", error);
    for (const area of data) byName.set(area.name.toLowerCase(), area);
  }

  // Re-selecting an archived area un-archives it.
  const archivedIds = names
    .map((n) => byName.get(n.trim().toLowerCase()))
    .filter((a): a is LifeArea => Boolean(a?.archived_at))
    .map((a) => a.id);
  if (archivedIds.length > 0) {
    const { error } = await supabase.from("life_areas").update({ archived_at: null }).in("id", archivedIds);
    if (error) return fromDbError("lifeAreas.unarchive", error);
  }
  return ok(byName);
}

export async function createLifeArea(user: User, name: string): Promise<ActionResult<LifeArea>> {
  const result = await ensureLifeAreas(user, [name]);
  if (!result.ok) return result;
  const area = result.data.get(name.trim().toLowerCase());
  return area ? ok(area) : fail("unexpected", "Something went wrong. Please try again.");
}

export async function renameLifeArea(user: User, id: string, name: string): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("life_areas").update({ name }).eq("id", id).select("id");
  if (error) return fromDbError("lifeAreas.rename", error, { conflict: "You already have an area with that name." });
  return data.length > 0 ? ok(null) : fail("not_found", "We couldn't find that area.");
}

export async function setLifeAreaArchived(user: User, id: string, archived: boolean): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("life_areas")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id)
    .select("id");
  if (error) return fromDbError("lifeAreas.archive", error);
  return data.length > 0 ? ok(null) : fail("not_found", "We couldn't find that area.");
}
