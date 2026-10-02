/**
 * Loads ~9 weeks of realistic sample history into ONE existing account, so the
 * patterns, weekly reviews, goal health and experiments can be tried without waiting
 * three weeks. Testing only. Run by .github/workflows/sample-data.yml, or locally:
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… [SAMPLE_USER_ID=…] node scripts/sample-data.mts
 *
 * Target: SAMPLE_USER_ID, or the project's only user. Refuses to run when the account
 * already has goals or routines, so it never mixes with real data or runs twice. If a
 * write fails, everything this run wrote is deleted again. To start over later,
 * delete the account in Settings → Data and sign up again.
 *
 * Planted patterns mirror the calibrated personas in tests/fixtures/behavior:
 * Wednesday drop-off (portfolio), breaking point after 3 sessions (workout) and
 * spending after difficult meetings (sequence). Late-night scrolling, check-ins and
 * savings are realistic context without planted structure. Deterministic (seeded)
 * apart from "today".
 * Logs ids and counts only, never content (AGENTS.md §3).
 */
import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import {
  addDays,
  addMonths,
  assertLocalDate,
  eachDay,
  type LocalDate,
  todayIn,
  weekdayOf,
  zonedDateTimeToInstant,
} from "../src/lib/dates.ts";

const DAYS_OF_HISTORY = 63;
const WEEKDAYS = [1, 2, 3, 4, 5];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

type Row = Record<string, unknown>;

function fail(message: string): never {
  console.error(`sample-data: ${message}`);
  process.exit(1);
}

/** mulberry32, as in tests/fixtures/behavior. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = rng(20260925);
const chance = (p: number) => random() < p;
const int = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));

const url = process.env.SUPABASE_URL ?? fail("SUPABASE_URL is not set");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? fail("SUPABASE_SERVICE_ROLE_KEY is not set");
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function targetUserId(): Promise<string> {
  const requested = process.env.SAMPLE_USER_ID?.trim();
  if (requested) return requested;
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 2 });
  if (error) fail(`listing users failed: ${error.code ?? error.message}`);
  if (data.users.length !== 1) {
    fail(`the project has ${data.users.length === 0 ? "no users" : "more than one user"}; set SAMPLE_USER_ID to choose one`);
  }
  return data.users[0].id;
}

/** Ids written by this run, so a failure can undo them (newest first). */
const written: { table: string; ids: string[] }[] = [];

class InsertError extends Error {}

async function insert(table: string, rows: Row[]) {
  const withIds = rows.map((row) => ({ id: randomUUID(), ...row }));
  for (let i = 0; i < withIds.length; i += 500) {
    const batch = withIds.slice(i, i + 500);
    // Columns a row leaves out take their default, not null.
    const { error } = await admin.from(table).insert(batch, { defaultToNull: false });
    if (error) throw new InsertError(`insert into ${table} failed: ${error.code} ${error.message}`);
    written.unshift({ table, ids: batch.map((row) => row.id as string) });
  }
  console.log(`sample-data: ${table} +${rows.length}`);
}

/** Deletes everything this run inserted, children before parents. */
async function undo() {
  for (const { table, ids } of written) {
    const { error } = await admin.from(table).delete().in("id", ids);
    if (error) console.error(`sample-data: cleanup of ${table} failed: ${error.code}`);
  }
}

/** Existing life area (case-insensitive) or a new one; returns its id. */
async function lifeArea(userId: string, name: string, sortOrder: number): Promise<string> {
  const { data } = await admin.from("life_areas").select("id, name").eq("user_id", userId);
  const found = data?.find((area) => area.name.toLowerCase() === name.toLowerCase());
  if (found) return found.id;
  const id = randomUUID();
  await insert("life_areas", [{ id, user_id: userId, name, sort_order: sortOrder }]);
  return id;
}

async function main() {
  const userId = await targetUserId();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("timezone, created_at, onboarding_completed_at")
    .eq("id", userId)
    .single();
  if (profileError) fail(`profile lookup failed: ${profileError.code}; apply the migrations first`);

  for (const table of ["goals", "routines"]) {
    const { count } = await admin.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId);
    if (count) fail(`the account already has ${table}; sample data is only loaded into an empty account`);
  }

  const tz = profile.timezone;
  const today = todayIn(tz);
  const start = addDays(today, -DAYS_OF_HISTORY);
  const yesterday = addDays(today, -1);
  const at = (date: LocalDate, time: string) => zonedDateTimeToInstant(date, time, tz).toISOString();
  const hh = (hour: number, minute = 0) => `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const createdAt = at(start, "08:00");
  console.log(`sample-data: user ${userId}, ${start} → ${yesterday}`);

  // The account "started" before the history, so past weeks have reviews.
  const { error: backdateError } = await admin
    .from("profiles")
    .update({ created_at: at(addDays(start, -1), "08:00"), onboarding_completed_at: profile.onboarding_completed_at ?? createdAt })
    .eq("id", userId);
  if (backdateError) fail(`profile update failed: ${backdateError.code}`);

  try {
    await load(userId, today, start, yesterday, at, hh, createdAt);
  } catch (error) {
    if (!(error instanceof InsertError)) throw error;
    console.error(`sample-data: ${error.message}; removing what this run wrote`);
    await undo();
    await admin.from("profiles").update({ created_at: profile.created_at, onboarding_completed_at: profile.onboarding_completed_at }).eq("id", userId);
    process.exit(1);
  }
}

async function load(
  userId: string,
  today: LocalDate,
  start: LocalDate,
  yesterday: LocalDate,
  at: (date: LocalDate, time: string) => string,
  hh: (hour: number, minute?: number) => string,
  createdAt: string,
) {

  const career = await lifeArea(userId, "Career", 1);
  const health = await lifeArea(userId, "Health", 2);
  const finance = await lifeArea(userId, "Finance", 3);

  const types = {
    portfolio: { id: randomUUID(), life_area_id: career, name: "Portfolio work", polarity: "desired", default_unit: "min", is_quick_log: true },
    workout: { id: randomUUID(), life_area_id: health, name: "Workout", polarity: "desired", default_unit: "min", is_quick_log: true },
    scrolling: { id: randomUUID(), life_area_id: health, name: "Late-night scrolling", polarity: "undesired", default_unit: "min", is_quick_log: true },
    meeting: { id: randomUUID(), life_area_id: career, name: "Difficult meeting", polarity: "neutral", is_quick_log: false },
    spending: { id: randomUUID(), life_area_id: finance, name: "Entertainment spending", polarity: "undesired", default_unit: "₦", is_quick_log: true },
  };
  const { data: existingTypes } = await admin.from("activity_types").select("name").eq("user_id", userId);
  const taken = new Set(existingTypes?.map((t) => t.name.toLowerCase()));
  for (const type of Object.values(types)) {
    if (taken.has(type.name.toLowerCase())) throw new InsertError(`an activity type named "${type.name}" already exists`);
  }
  await insert("activity_types", Object.values(types).map((t) => ({ ...t, user_id: userId, created_at: createdAt })));

  // Goals --------------------------------------------------------------------
  const designer = randomUUID();
  const savings = randomUUID();
  const tenK = randomUUID();
  await insert("goals", [
    {
      id: designer, user_id: userId, life_area_id: career, title: "Become employable as a Product Designer",
      motivation: "A design role pays better and is work I actually enjoy.", measurement_type: "milestone",
      start_date: start, deadline: addDays(today, 120), priority: 1, created_at: createdAt, status_changed_at: createdAt,
    },
    {
      id: savings, user_id: userId, life_area_id: finance, title: "Save ₦2,000,000",
      motivation: "An emergency fund, so a bad month isn't a crisis.", measurement_type: "cumulative", unit: "₦",
      baseline_value: 400000, target_value: 2000000, start_date: start, deadline: addMonths(start, 6),
      planned_pace_amount: 150000, planned_pace_period: "month", priority: 2, created_at: createdAt, status_changed_at: createdAt,
    },
    {
      id: tenK, user_id: userId, life_area_id: health, title: "Run a 10K", measurement_type: "milestone",
      start_date: start, deadline: addDays(today, 75), priority: 3, created_at: createdAt, status_changed_at: createdAt,
    },
  ]);
  await insert("goal_strategies", [
    { user_id: userId, goal_id: designer, description: "Practise on real briefs every weekday evening", sort_order: 0 },
    { user_id: userId, goal_id: designer, description: "Get feedback from a senior designer every two weeks", sort_order: 1 },
    { user_id: userId, goal_id: savings, description: "Move money to savings on payday, before spending", sort_order: 0 },
  ]);

  const caseStudies = randomUUID();
  await insert("milestones", [
    { user_id: userId, goal_id: designer, title: "Complete a UX fundamentals course", sort_order: 0, status: "done", completed_at: at(addDays(start, 20), "20:00") },
    { id: caseStudies, user_id: userId, goal_id: designer, title: "Finish 3 portfolio case studies", sort_order: 1, status: "in_progress", target_date: addDays(today, 30) },
    { user_id: userId, goal_id: designer, title: "Publish portfolio site", sort_order: 2, target_date: addDays(today, 60) },
    { user_id: userId, goal_id: designer, title: "Apply to 20 roles", sort_order: 3, target_date: addDays(today, 110) },
    { user_id: userId, goal_id: tenK, title: "Run 5K without stopping", sort_order: 0, status: "done", completed_at: at(addDays(start, 30), "07:00") },
    { user_id: userId, goal_id: tenK, title: "Run 8K", sort_order: 1, status: "in_progress", target_date: addDays(today, 30) },
    { user_id: userId, goal_id: tenK, title: "Race day: 10K", sort_order: 2, target_date: addDays(today, 75) },
  ]);
  await insert("actions", [
    { user_id: userId, goal_id: designer, milestone_id: caseStudies, title: "Case study: banking app redesign", activity_type_id: types.portfolio.id, estimated_minutes: 600, sort_order: 0, status: "done", completed_at: at(addDays(today, -12), "21:00") },
    { user_id: userId, goal_id: designer, milestone_id: caseStudies, title: "Case study: logistics dashboard", activity_type_id: types.portfolio.id, estimated_minutes: 600, sort_order: 1 },
    { user_id: userId, goal_id: designer, milestone_id: caseStudies, title: "Case study: clinic booking flow", activity_type_id: types.portfolio.id, estimated_minutes: 600, sort_order: 2 },
  ]);

  // Routines and their past tasks ---------------------------------------------
  const portfolioRoutine = randomUUID();
  const workoutRoutine = randomUUID();
  await insert("routines", [
    {
      id: portfolioRoutine, user_id: userId, name: "Portfolio work", goal_id: designer, activity_type_id: types.portfolio.id,
      days_of_week: WEEKDAYS, preferred_time: "19:00", normal_minutes: 60, minimum_minutes: 20,
      fallback_description: "Tidy one screen", active_from: start, created_at: createdAt,
    },
    {
      id: workoutRoutine, user_id: userId, name: "Morning workout", goal_id: tenK, activity_type_id: types.workout.id,
      days_of_week: EVERY_DAY, preferred_time: "06:30", normal_minutes: 45, minimum_minutes: 15,
      fallback_description: "A 15-minute walk", active_from: start, created_at: createdAt,
    },
  ]);

  const tasks: Row[] = [];
  const activities: Row[] = [];
  const days = eachDay(start, yesterday);
  const addTask = (routineId: string, title: string, goalId: string, typeId: string, date: LocalDate, time: string, minutes: number, minimum: number, outcome: "done" | "done_minimum" | "missed") => {
    const id = randomUUID();
    const status = outcome === "missed" ? (chance(0.5) ? "skipped" : "planned") : outcome;
    const completed = outcome === "missed" ? null : at(date, time);
    tasks.push({
      id, user_id: userId, title, source: "routine", routine_id: routineId, goal_id: goalId, activity_type_id: typeId,
      scheduled_date: date, scheduled_time: time, planned_minutes: minutes, minimum_minutes: minimum, status,
      completed_at: completed, created_at: at(date, "00:05"),
    });
    // What set_task_status writes for a completed task.
    if (completed) {
      activities.push({
        user_id: userId, activity_type_id: typeId, goal_id: goalId, task_id: id, occurred_at: completed, created_at: completed,
        duration_minutes: outcome === "done_minimum" ? minimum : minutes, source: "task",
      });
    }
  };

  // Portfolio: reliable on weekdays except Wednesdays (personas.weekdayDropoff).
  for (const date of days.filter((d) => WEEKDAYS.includes(weekdayOf(d)))) {
    const done = chance(weekdayOf(date) === 3 ? 0.15 : 0.9);
    addTask(portfolioRoutine, "Portfolio work", designer, types.portfolio.id, date, "19:00", 60, 20, done ? (chance(0.15) ? "done_minimum" : "done") : "missed");
  }
  // Workout: three days in a row, then a miss, repeatedly (personas.breakingPoint).
  let streak = 0;
  let target = 3;
  for (const date of days) {
    let done = false;
    if (streak < target) {
      streak += 1;
      done = true;
    } else {
      streak = 0;
      target = chance(0.2) ? 4 : 3;
    }
    addTask(workoutRoutine, "Morning workout", tenK, types.workout.id, date, "06:30", 45, 15, done ? (chance(0.2) ? "done_minimum" : "done") : "missed");
  }

  // Manual activities -----------------------------------------------------------
  const log = (typeId: string, date: LocalDate, time: string, extra: Row) => {
    const occurred = at(date, time);
    activities.push({ user_id: userId, activity_type_id: typeId, occurred_at: occurred, created_at: occurred, source: "manual", ...extra });
  };
  for (const date of days) {
    // Late-night scrolling, mostly after 23:00 (an undesired type to run "decrease" experiments on).
    if (chance(0.55)) {
      const late = chance(0.85);
      log(types.scrolling.id, date, late ? hh(23, int(0, 50)) : hh(int(20, 21), int(0, 50)), { duration_minutes: int(3, 9) * 10 });
    }
    // Spending usually follows a difficult meeting the same evening (personas.spendingAfterMeetings).
    if (WEEKDAYS.includes(weekdayOf(date)) && chance(0.35)) {
      log(types.meeting.id, date, hh(14, int(0, 30)), { duration_minutes: int(2, 4) * 15 });
      if (chance(0.75)) log(types.spending.id, date, hh(20, int(0, 50)), { quantity: int(5, 25) * 1000, unit: "₦" });
    } else if (chance(0.1)) {
      log(types.spending.id, date, hh(12, int(0, 50)), { quantity: int(3, 12) * 1000, unit: "₦" });
    }
  }
  await insert("tasks", tasks);
  await insert("activities", activities);

  // Savings deposits (~₦80k a month against a plan of ₦150k) ------------------
  const outcomes: Row[] = [];
  for (let day = 5; day < DAYS_OF_HISTORY; day += 14) {
    const occurred = at(addDays(start, day), "10:00");
    outcomes.push({ user_id: userId, goal_id: savings, occurred_at: occurred, created_at: occurred, value: int(35, 45) * 1000, valence: "positive", description: "Savings deposit" });
  }
  await insert("outcomes", outcomes);

  // Daily check-ins: independent context, most days ---------------------------------
  const checkins: Row[] = days
    .filter(() => chance(0.85))
    .map((date) => ({
      user_id: userId, local_date: date, sleep_hours: (55 + int(0, 30)) / 10, energy: int(2, 5), mood: int(2, 5),
      stress: int(1, 5), workload: int(1, 5), created_at: at(date, "21:30"),
    }));
  await insert("daily_checkins", checkins);

  // Detection normally runs at most daily; make it due on the next page view.
  await admin.from("profiles").update({ patterns_dirty: true }).eq("id", userId);
  console.log("sample-data: done. Open /today, /patterns and /reviews.");
}

assertLocalDate("2026-01-01"); // fail fast if the date helpers didn't load
await main();
