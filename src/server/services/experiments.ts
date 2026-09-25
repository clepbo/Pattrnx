import "server-only";

import type { User } from "@supabase/supabase-js";

import { type ActionResult, fail, ok } from "@/lib/action-result";
import { addDays, assertLocalDate, type LocalDate, todayIn } from "@/lib/dates";
import type { Enums, Tables } from "@/server/db/database";
import { createClient } from "@/server/db/server";
import {
  durationDays,
  type ExperimentMetric,
  type MetricData,
  type MetricSubject,
  type MetricValue,
  metricValue,
  suggestOutcome,
} from "@/server/engines/experiments";
import { type ExperimentDraft, suggestExperiment } from "@/server/engines/interventions/catalog";

import { fromDbError } from "./errors";
import { getProfile } from "./profile";

export type Experiment = Tables<"experiments">;
export type ExperimentOutcome = Enums<"experiment_outcome">;

export interface ExperimentView {
  experiment: Experiment;
  subject: MetricSubject;
  day: number;
  totalDays: number;
  /** Past its end date and waiting for the user to confirm the outcome. */
  readyToReview: boolean;
  /** Result so far (or final), measured the same way as the baseline. */
  current: MetricValue;
  suggested: ReturnType<typeof suggestOutcome>;
}

async function userToday(user: User): Promise<LocalDate> {
  return todayIn((await getProfile(user)).timezone);
}

async function loadMetricData(user: User, from: LocalDate, to: LocalDate): Promise<MetricData> {
  const supabase = await createClient();
  const [tasks, activities] = await Promise.all([
    supabase.from("tasks").select("routine_id, goal_id, scheduled_date, status").eq("user_id", user.id).gte("scheduled_date", from).lte("scheduled_date", to),
    supabase
      .from("activities")
      .select("activity_type_id, local_date, duration_minutes, quantity")
      .eq("user_id", user.id)
      .gte("local_date", from)
      .lte("local_date", to),
  ]);
  if (tasks.error || activities.error) throw new Error(`experiment data failed: ${(tasks.error ?? activities.error)?.code}`);
  return {
    tasks: tasks.data.map((t) => ({ routineId: t.routine_id, goalId: t.goal_id, scheduledDate: assertLocalDate(t.scheduled_date), status: t.status })),
    activities: activities.data.map((a) => ({
      typeId: a.activity_type_id,
      localDate: assertLocalDate(a.local_date),
      durationMinutes: a.duration_minutes,
      quantity: a.quantity,
    })),
  };
}

function subjectOf(experiment: Experiment): MetricSubject {
  const raw = experiment.metric_subject as Record<string, unknown>;
  const pick = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string) : undefined);
  return { routineId: pick("routineId"), goalId: pick("goalId"), activityTypeId: pick("activityTypeId") };
}

function view(experiment: Experiment, data: MetricData, today: LocalDate): ExperimentView {
  const start = assertLocalDate(experiment.start_date);
  const end = assertLocalDate(experiment.end_date);
  const subject = subjectOf(experiment);
  const current = metricValue(data, experiment.metric, subject, start, end, today);
  const baseline = { value: experiment.baseline_value, observedDays: experiment.baseline_observed_days };
  const totalDays = durationDays(start, end);
  return {
    experiment,
    subject,
    day: Math.min(totalDays, Math.max(0, durationDays(start, today))),
    totalDays,
    readyToReview: experiment.status === "active" && today > end,
    current,
    suggested: suggestOutcome(baseline, current, experiment.direction),
  };
}

export async function listExperiments(user: User): Promise<{ active: ExperimentView[]; finished: Experiment[] }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("experiments").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) throw new Error(`experiments lookup failed: ${error.code}`);
  const today = await userToday(user);
  const active = data.filter((e) => e.status === "active");
  if (active.length === 0) return { active: [], finished: data };
  const from = active.map((e) => e.start_date).sort()[0];
  const metricData = await loadMetricData(user, assertLocalDate(from), today);
  return { active: active.map((e) => view(e, metricData, today)), finished: data.filter((e) => e.status !== "active") };
}

export async function getExperiment(user: User, id: string): Promise<ExperimentView | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("experiments").select("*").eq("id", id).maybeSingle();
  if (error) {
    if (error.code === "22P02") return null;
    throw new Error(`experiment lookup failed: ${error.code}`);
  }
  if (!data) return null;
  const today = await userToday(user);
  return view(data, await loadMetricData(user, assertLocalDate(data.start_date), today), today);
}

/** A draft suggested for a stored pattern (PRD F14: pre-filled from the pattern). */
export async function draftForPattern(user: User, patternId: string): Promise<{ draft: ExperimentDraft; patternId: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("patterns").select("id, detector_key, subject, vars").eq("id", patternId).maybeSingle();
  if (!data) return null;
  const draft = suggestExperiment({
    detectorKey: data.detector_key,
    subject: data.subject as Record<string, string>,
    vars: data.vars as Record<string, string | number>,
  });
  return draft ? { draft, patternId: data.id } : null;
}

export interface StartExperimentInput {
  title: string;
  hypothesis: string;
  category: Enums<"intervention_category">;
  description: string;
  metric: ExperimentMetric;
  subject: MetricSubject;
  direction: Enums<"metric_direction">;
  durationDays: number;
  goalId: string | null;
  patternId: string | null;
}

/** Starts today; the baseline is measured now over the equal-length window before (FR-9). */
export async function startExperiment(user: User, input: StartExperimentInput): Promise<ActionResult<{ id: string }>> {
  const today = await userToday(user);
  const end = addDays(today, input.durationDays - 1);
  const baselineStart = addDays(today, -input.durationDays);
  const baselineEnd = addDays(today, -1);
  const data = await loadMetricData(user, baselineStart, baselineEnd);
  const baseline = metricValue(data, input.metric, input.subject, baselineStart, baselineEnd, today);

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("experiments")
    .insert({
      title: input.title,
      hypothesis: input.hypothesis,
      intervention_category: input.category,
      intervention_description: input.description,
      metric: input.metric,
      metric_subject: Object.fromEntries(Object.entries(input.subject).filter(([, v]) => v)),
      direction: input.direction,
      goal_id: input.goalId,
      pattern_id: input.patternId,
      start_date: today,
      end_date: end,
      baseline_start: baselineStart,
      baseline_end: baselineEnd,
      baseline_value: baseline.value,
      baseline_observed_days: baseline.observedDays,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return fail("limit", "That goal already has an active experiment. Finish or stop it first.");
    if (error.code === "23514" && error.message.includes("two active")) {
      return fail("limit", "You can run two experiments at a time. Finish or stop one first, so their results don't mix.");
    }
    return fromDbError("experiments.start", error, { not_found: "That goal or pattern no longer exists." });
  }
  return ok({ id: row.id });
}

/** Records the final result and the user's confirmed outcome (PRD F14). */
export async function completeExperiment(
  user: User,
  id: string,
  input: { outcome: ExperimentOutcome; reflection: string | null },
): Promise<ActionResult<null>> {
  const current = await getExperiment(user, id);
  if (!current) return fail("not_found", "We couldn't find that experiment.");
  if (!current.readyToReview) return fail("validation", "This experiment is still running. You can stop it early instead.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("experiments")
    .update({
      status: "completed",
      result_value: current.current.value,
      result_observed_days: current.current.observedDays,
      suggested_outcome: current.suggested.outcome,
      outcome: input.outcome,
      reflection: input.reflection,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);
  return error ? fromDbError("experiments.complete", error) : ok(null);
}

export async function abandonExperiment(user: User, id: string, reflection: string | null): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("experiments")
    .update({ status: "abandoned", reflection, completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "active");
  return error ? fromDbError("experiments.abandon", error) : ok(null);
}
