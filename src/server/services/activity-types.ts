import "server-only";

import type { User } from "@supabase/supabase-js";

import { type ActionResult, fail, ok } from "@/lib/action-result";
import type { Enums, Tables, TablesInsert } from "@/server/db/database";
import { createClient } from "@/server/db/server";

import { fromDbError } from "./errors";

export type ActivityType = Tables<"activity_types">;
export type ActivityTypeWithArea = ActivityType & { life_area: { name: string } | null };

export interface NewActivityType {
  name: string;
  lifeAreaId: string;
  polarity: Enums<"activity_polarity">;
  defaultUnit?: string | null;
  isQuickLog?: boolean;
  quickLogDefaults?: { durationMinutes?: number; quantity?: number };
}

/** The one-tap duration stored in `quick_log_defaults`, if any. */
export function quickLogMinutes(type: Pick<ActivityType, "quick_log_defaults">): number | null {
  const defaults = type.quick_log_defaults;
  if (defaults && typeof defaults === "object" && !Array.isArray(defaults)) {
    const minutes = defaults.durationMinutes;
    if (typeof minutes === "number") return minutes;
  }
  return null;
}

/** Money-denominated types (ISO currency unit) need an amount, so they can't be one-tap. */
export function isMoneyType(type: Pick<ActivityType, "default_unit">): boolean {
  return Boolean(type.default_unit && /^[A-Z]{3}$/.test(type.default_unit));
}

function toRow(input: NewActivityType): TablesInsert<"activity_types"> {
  return {
    name: input.name,
    life_area_id: input.lifeAreaId,
    polarity: input.polarity,
    default_unit: input.defaultUnit ?? null,
    is_quick_log: input.isQuickLog ?? false,
    quick_log_defaults: input.quickLogDefaults ?? {},
  };
}

export async function listActivityTypes(user: User, { includeArchived = false } = {}): Promise<ActivityTypeWithArea[]> {
  const supabase = await createClient();
  let query = supabase.from("activity_types").select("*, life_area:life_areas(name)").eq("user_id", user.id);
  if (!includeArchived) query = query.is("archived_at", null);
  const { data, error } = await query.order("name");
  if (error) throw new Error(`activity types lookup failed: ${error.code}`);
  return data;
}

/** Inserts the given types, skipping names (case-insensitive) the user already has. */
export async function ensureActivityTypes(user: User, inputs: NewActivityType[]): Promise<ActionResult<number>> {
  const existing = new Set((await listActivityTypes(user, { includeArchived: true })).map((t) => t.name.toLowerCase()));
  const seen = new Set<string>();
  const rows = inputs.filter((input) => {
    const key = input.name.toLowerCase();
    if (existing.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (rows.length === 0) return ok(0);

  const supabase = await createClient();
  const { error } = await supabase.from("activity_types").insert(rows.map(toRow));
  return error ? fromDbError("activityTypes.ensure", error) : ok(rows.length);
}

export async function createActivityType(user: User, input: NewActivityType): Promise<ActionResult<ActivityType>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("activity_types").insert(toRow(input)).select().single();
  if (error) {
    return fromDbError("activityTypes.create", error, {
      conflict: "You already have an activity type with that name.",
      not_found: "Choose one of your life areas.",
    });
  }
  return ok(data);
}

export async function updateActivityType(
  user: User,
  id: string,
  patch: Partial<Pick<NewActivityType, "name" | "polarity" | "isQuickLog" | "defaultUnit">> & { archived?: boolean },
): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_types")
    .update({
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.polarity !== undefined && { polarity: patch.polarity }),
      ...(patch.isQuickLog !== undefined && { is_quick_log: patch.isQuickLog }),
      ...(patch.defaultUnit !== undefined && { default_unit: patch.defaultUnit }),
      ...(patch.archived !== undefined && { archived_at: patch.archived ? new Date().toISOString() : null }),
    })
    .eq("id", id)
    .select("id");
  if (error) return fromDbError("activityTypes.update", error, { conflict: "You already have an activity type with that name." });
  return data.length > 0 ? ok(null) : fail("not_found", "We couldn't find that activity type.");
}
