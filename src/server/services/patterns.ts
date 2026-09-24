import "server-only";

import type { User } from "@supabase/supabase-js";

import { type ActionResult, ok } from "@/lib/action-result";
import { addDays, assertLocalDate, diffDays, type LocalDate, localDateOf, todayIn } from "@/lib/dates";
import type { Enums, Tables, TablesInsert } from "@/server/db/database";
import { createClient } from "@/server/db/server";
import { detectPatterns, selectVisible } from "@/server/engines/patterns";
import { PATTERN_THRESHOLDS } from "@/server/engines/patterns/thresholds";
import type { PatternSnapshot } from "@/server/engines/patterns/types";

import { fromDbError } from "./errors";
import { getProfile } from "./profile";

export type PatternRow = Tables<"patterns">;
export type PatternFeedback = Enums<"pattern_feedback">;

export type PatternsView =
  | { status: "learning"; daysOfHistory: number; daysRemaining: number }
  | { status: "ready"; visible: PatternRow[] };

const ONE_DAY_MS = 86_400_000;

/** First day with any task or activity: the start of the user's history (BR-2 gate). */
async function historyStart(user: User): Promise<LocalDate | null> {
  const supabase = await createClient();
  const [firstTask, firstActivity] = await Promise.all([
    supabase.from("tasks").select("scheduled_date").eq("user_id", user.id).order("scheduled_date").limit(1),
    supabase.from("activities").select("local_date").eq("user_id", user.id).order("local_date").limit(1),
  ]);
  const firsts = [firstTask.data?.[0]?.scheduled_date, firstActivity.data?.[0]?.local_date].filter((d): d is string => Boolean(d)).sort();
  return firsts[0] ? assertLocalDate(firsts[0]) : null;
}

/** Loads everything the detectors read, as plain engine input (ARCHITECTURE.md §8). */
export async function buildSnapshot(user: User): Promise<PatternSnapshot> {
  const supabase = await createClient();
  const { timezone } = await getProfile(user);
  const today = todayIn(timezone);
  const windowStart = addDays(today, -(PATTERN_THRESHOLDS.windowDays - 1));
  const local = (timestamp: string) => localDateOf(new Date(timestamp), timezone);

  const [areas, routines, goals, tasks, activities, types, checkins, history] = await Promise.all([
    supabase.from("life_areas").select("id, name").eq("user_id", user.id),
    supabase.from("routines").select("id, name, created_at, paused_at, archived_at, activity_type:activity_types(life_area_id)").eq("user_id", user.id),
    supabase.from("goals").select("id, title, life_area_id, created_at, status, status_changed_at").eq("user_id", user.id),
    supabase
      .from("tasks")
      .select("id, routine_id, goal_id, scheduled_date, planned_minutes, status")
      .eq("user_id", user.id)
      .gte("scheduled_date", windowStart)
      .lte("scheduled_date", today),
    supabase
      .from("activities")
      .select("activity_type_id, local_date, local_hour, occurred_at, created_at")
      .eq("user_id", user.id)
      .gte("local_date", addDays(windowStart, -1)),
    supabase.from("activity_types").select("id, name, polarity").eq("user_id", user.id),
    supabase
      .from("daily_checkins")
      .select("local_date, sleep_hours, stress, workload")
      .eq("user_id", user.id)
      .gte("local_date", addDays(windowStart, -1)),
    historyStart(user),
  ]);
  for (const result of [areas, routines, goals, tasks, activities, types, checkins]) {
    if (result.error) throw new Error(`pattern snapshot failed: ${result.error.code}`);
  }

  return {
    today,
    windowStart,
    historyStart: history,
    lifeAreas: areas.data ?? [],
    routines: (routines.data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      lifeAreaId: r.activity_type?.life_area_id ?? "",
      createdDate: local(r.created_at),
      endedDate: r.archived_at ? local(r.archived_at) : r.paused_at ? local(r.paused_at) : null,
    })),
    goals: (goals.data ?? []).map((g) => ({
      id: g.id,
      title: g.title,
      lifeAreaId: g.life_area_id,
      createdDate: local(g.created_at),
      status: g.status,
      statusChangedDate: local(g.status_changed_at),
    })),
    tasks: (tasks.data ?? []).map((t) => ({
      id: t.id,
      routineId: t.routine_id,
      goalId: t.goal_id,
      scheduledDate: assertLocalDate(t.scheduled_date),
      plannedMinutes: t.planned_minutes,
      status: t.status,
    })),
    activities: (activities.data ?? []).map((a) => ({
      typeId: a.activity_type_id,
      localDate: assertLocalDate(a.local_date),
      localHour: a.local_hour,
      backfilled: new Date(a.created_at).getTime() - new Date(a.occurred_at).getTime() > ONE_DAY_MS,
    })),
    activityTypes: types.data ?? [],
    checkins: (checkins.data ?? []).map((c) => ({
      localDate: assertLocalDate(c.local_date),
      sleepHours: c.sleep_hours,
      stress: c.stress,
      workload: c.workload,
    })),
  };
}

/**
 * Runs detection if it's due (never run, source data edited, or older than a day)
 * and this request wins the claim. Results are upserted by fingerprint so feedback
 * and suppression survive re-detection (BR-9). Failures never block the page.
 */
export async function refreshPatterns(user: User, { force = false } = {}): Promise<void> {
  const supabase = await createClient();
  const { data: claimed, error: claimError } = await supabase.rpc("claim_pattern_detection", force ? { p_max_age: "0 seconds" } : {});
  if (claimError) {
    console.error(JSON.stringify({ level: "error", operation: "patterns.claim", code: claimError.code }));
    return;
  }
  if (!claimed) return;

  try {
    const snapshot = await buildSnapshot(user);
    const result = detectPatterns(snapshot);
    if (result.status === "learning") return;

    const now = new Date().toISOString();
    const rows: TablesInsert<"patterns">[] = result.patterns.map((p) => ({
      kind: p.kind,
      detector_key: p.detectorKey,
      detector_version: p.detectorVersion,
      fingerprint: p.fingerprint,
      subject: p.subject,
      summary: p.summary,
      evidence: p.evidence as TablesInsert<"patterns">["evidence"],
      vars: p.vars,
      observations: p.observations,
      effect_size: Math.min(1, Math.max(0, p.effectSize)),
      confidence: p.confidence,
      window_start: p.windowStart,
      window_end: p.windowEnd,
      last_detected_at: now,
    }));

    if (rows.length > 0) {
      const { error } = await supabase.from("patterns").upsert(rows, { onConflict: "user_id,fingerprint" });
      if (error) throw new Error(`upsert: ${error.code}`);
    }
    const detected = rows.map((r) => r.fingerprint);
    // Found again after being resolved: back to a candidate. Dismissed ones stay dismissed.
    if (detected.length > 0) {
      await supabase.from("patterns").update({ status: "candidate" }).eq("user_id", user.id).eq("status", "resolved").in("fingerprint", detected);
    }
    // No longer detected: resolved (feedback and suppression are kept).
    let stale = supabase.from("patterns").update({ status: "resolved" }).eq("user_id", user.id).in("status", ["candidate", "presented", "acknowledged"]);
    if (detected.length > 0) stale = stale.not("fingerprint", "in", `(${detected.map((f) => `"${f}"`).join(",")})`);
    await stale;
  } catch (error) {
    console.error(JSON.stringify({ level: "error", operation: "patterns.refresh", message: (error as Error).message }));
    // Let the next page view retry.
    await supabase.from("profiles").update({ patterns_dirty: true }).eq("id", user.id);
  }
}

/** Visible patterns (BR-2, BR-9): moderate+, not dismissed or suppressed, strongest first. */
export async function getPatternsView(user: User, { limit }: { limit?: number } = {}): Promise<PatternsView> {
  await refreshPatterns(user);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patterns")
    .select("*")
    .eq("user_id", user.id)
    .eq("suppressed", false)
    .in("status", ["candidate", "presented", "acknowledged"])
    .in("confidence", ["moderate", "high", "very_high"]);
  if (error) throw new Error(`patterns lookup failed: ${error.code}`);

  if (data.length === 0) {
    const [start, profile] = await Promise.all([historyStart(user), getProfile(user)]);
    const days = start ? diffDays(start, todayIn(profile.timezone)) + 1 : 0;
    if (days < PATTERN_THRESHOLDS.minHistoryDays) {
      return { status: "learning", daysOfHistory: days, daysRemaining: PATTERN_THRESHOLDS.minHistoryDays - days };
    }
  }

  const visible = selectVisible(
    data.map((row) => ({ ...row, effectSize: row.effect_size })),
    { limit: limit ?? data.length },
  );
  return { status: "ready", visible };
}

/** Records that these patterns were shown to the user (candidate → presented). */
export async function markPresented(user: User, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const supabase = await createClient();
  await supabase.from("patterns").update({ status: "presented", presented_at: new Date().toISOString() }).in("id", ids).eq("status", "candidate");
}

/** PRD F12: feedback moves the lifecycle; "don't show again" suppresses the fingerprint for good. */
export async function recordFeedback(
  user: User,
  id: string,
  feedback: PatternFeedback | "suppress",
): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const update =
    feedback === "suppress"
      ? { suppressed: true, status: "dismissed" as const }
      : {
          feedback,
          feedback_at: new Date().toISOString(),
          status: feedback === "not_accurate" ? ("dismissed" as const) : ("acknowledged" as const),
        };
  const { error } = await supabase.from("patterns").update(update).eq("id", id);
  return error ? fromDbError("patterns.feedback", error) : ok(null);
}

