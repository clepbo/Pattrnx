import "server-only";

import type { User } from "@supabase/supabase-js";

import { type ActionResult, ok } from "@/lib/action-result";
import { addDays, assertLocalDate, type LocalDate, localDateOf, startOfWeek, todayIn, type Weekday } from "@/lib/dates";
import type { Json, Tables } from "@/server/db/database";
import { createClient } from "@/server/db/server";
import { suggestExperiment } from "@/server/engines/interventions/catalog";
import { buildWeeklyReview, REVIEW_ENGINE_VERSION, type ReviewContent } from "@/server/engines/reviews/weekly";

import { fromDbError } from "./errors";
import { listGoals } from "./goals";
import { getPatternsView } from "./patterns";
import { getProfile } from "./profile";

export type ReviewRow = Tables<"reviews">;
export interface Review extends Omit<ReviewRow, "content"> {
  content: ReviewContent;
}

/** How many past weeks can be opened (older ones would describe stale plans). */
const MAX_WEEKS_BACK = 12;

/** The most recent fully finished week in the user's timezone and week setting (BR-10). */
export async function latestCompletedWeek(user: User): Promise<LocalDate> {
  const profile = await getProfile(user);
  return addDays(startOfWeek(todayIn(profile.timezone), profile.week_starts_on as Weekday), -7);
}

/** Whether `periodStart` is a finished week the user can have a review for. */
export async function isReviewableWeek(user: User, periodStart: LocalDate): Promise<boolean> {
  const profile = await getProfile(user);
  const latest = await latestCompletedWeek(user);
  const aligned = startOfWeek(periodStart, profile.week_starts_on as Weekday) === periodStart;
  const signupWeek = startOfWeek(localDateOf(new Date(profile.created_at), profile.timezone), profile.week_starts_on as Weekday);
  return aligned && periodStart <= latest && periodStart >= addDays(latest, -7 * MAX_WEEKS_BACK) && periodStart >= signupWeek;
}

async function buildContent(user: User, periodStart: LocalDate): Promise<ReviewContent> {
  const supabase = await createClient();
  const periodEnd = addDays(periodStart, 6);
  const [tasks, routines, experiments, goals, patterns] = await Promise.all([
    supabase
      .from("tasks")
      .select("routine_id, scheduled_date, status")
      .eq("user_id", user.id)
      .gte("scheduled_date", addDays(periodStart, -7))
      .lte("scheduled_date", periodEnd),
    supabase.from("routines").select("id, name").eq("user_id", user.id),
    supabase.from("experiments").select("id, title, start_date, end_date, status").eq("user_id", user.id).neq("status", "abandoned"),
    listGoals(user, { statuses: ["active"] }),
    getPatternsView(user, { limit: 3 }),
  ]);
  if (tasks.error || routines.error || experiments.error) throw new Error("review inputs failed");

  const visible = patterns.status === "ready" ? patterns.visible : [];
  const top = visible[0];
  const draft = top
    ? suggestExperiment({ detectorKey: top.detector_key, subject: top.subject as Record<string, string>, vars: top.vars as Record<string, string | number> })
    : null;

  return buildWeeklyReview({
    periodStart,
    tasks: tasks.data.map((t) => ({ routineId: t.routine_id, scheduledDate: assertLocalDate(t.scheduled_date), status: t.status })),
    routines: routines.data,
    goals: goals.map(({ goal, health }) => ({ id: goal.id, title: goal.title, health: health.state, reason: health.reason })),
    patterns: visible.map((p) => ({ id: p.id, summary: p.summary, confidence: p.confidence })),
    suggestion: top && draft ? { patternId: top.id, title: draft.title, description: draft.description } : null,
    experiments: experiments.data.map((e) => ({
      id: e.id,
      title: e.title,
      startDate: assertLocalDate(e.start_date),
      endDate: assertLocalDate(e.end_date),
      status: e.status,
    })),
  });
}

function asReview(row: ReviewRow): Review {
  return { ...row, content: row.content as unknown as ReviewContent };
}

/** The stored review for a week, generating it on first visit (FR-8: at most one per week). */
export async function getOrGenerateReview(user: User, periodStart: LocalDate): Promise<Review | null> {
  if (!(await isReviewableWeek(user, periodStart))) return null;
  const supabase = await createClient();
  const existing = await supabase.from("reviews").select("*").eq("period_start", periodStart).maybeSingle();
  if (existing.error) throw new Error(`review lookup failed: ${existing.error.code}`);
  if (existing.data) return asReview(existing.data);

  const content = await buildContent(user, periodStart);
  // A concurrent first visit may insert first; the unique key makes that harmless.
  await supabase
    .from("reviews")
    .upsert(
      { period_start: periodStart, period_end: addDays(periodStart, 6), content: content as unknown as Json, engine_version: REVIEW_ENGINE_VERSION },
      { onConflict: "user_id,period,period_start", ignoreDuplicates: true },
    );
  const { data, error } = await supabase.from("reviews").select("*").eq("period_start", periodStart).single();
  if (error) throw new Error(`review generation failed: ${error.code}`);
  return asReview(data);
}

/** Explicit refresh: replaces the snapshot with one built from current data (§8.6). */
export async function regenerateReview(user: User, periodStart: LocalDate): Promise<ActionResult<null>> {
  if (!(await isReviewableWeek(user, periodStart))) return ok(null);
  const content = await buildContent(user, periodStart);
  const supabase = await createClient();
  const { error } = await supabase
    .from("reviews")
    .update({ content: content as unknown as Json, engine_version: REVIEW_ENGINE_VERSION, generated_at: new Date().toISOString() })
    .eq("period_start", periodStart);
  return error ? fromDbError("reviews.regenerate", error) : ok(null);
}

/** True when tasks or activities in the review's week changed after it was generated. */
export async function reviewDataChanged(user: User, review: Review): Promise<boolean> {
  const supabase = await createClient();
  const [tasks, activities] = await Promise.all([
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("scheduled_date", review.period_start)
      .lte("scheduled_date", review.period_end)
      .gt("updated_at", review.generated_at),
    supabase
      .from("activities")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("local_date", review.period_start)
      .lte("local_date", review.period_end)
      .gt("updated_at", review.generated_at),
  ]);
  return (tasks.count ?? 0) + (activities.count ?? 0) > 0;
}

export async function listReviews(user: User): Promise<Pick<ReviewRow, "id" | "period_start" | "period_end" | "viewed_at">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, period_start, period_end, viewed_at")
    .eq("user_id", user.id)
    .order("period_start", { ascending: false })
    .limit(MAX_WEEKS_BACK);
  if (error) throw new Error(`reviews lookup failed: ${error.code}`);
  return data;
}

export async function markReviewViewed(user: User, id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("reviews").update({ viewed_at: new Date().toISOString() }).eq("id", id).is("viewed_at", null);
}

export async function saveReflection(
  user: User,
  periodStart: LocalDate,
  input: { reflection: string | null; usefulness: number | null },
): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reviews")
    .update({ reflection: input.reflection, usefulness: input.usefulness })
    .eq("period_start", periodStart);
  return error ? fromDbError("reviews.reflection", error) : ok(null);
}

/** Whether Today should point to an unseen review of last week. */
export async function unseenLatestReview(user: User): Promise<LocalDate | null> {
  const latest = await latestCompletedWeek(user);
  if (!(await isReviewableWeek(user, latest))) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("reviews").select("viewed_at").eq("period_start", latest).maybeSingle();
  return data?.viewed_at ? null : latest;
}
