import { expect, type Page } from "@playwright/test";

import { adminClient, TEST_PASSWORD, uniqueEmail } from "../support/local-supabase";

/**
 * Creates a confirmed user (optionally already onboarded, with a life area and
 * activity types) and signs them in through the UI.
 */
export async function signInNewUser(page: Page, { onboarded = false, timezone = "Africa/Lagos" } = {}) {
  const email = uniqueEmail("e2e");
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: "Tester", timezone },
  });
  if (error) throw error;
  const userId = data.user.id;

  if (onboarded) {
    await admin.from("profiles").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", userId);
    const { data: area } = await admin.from("life_areas").insert({ user_id: userId, name: "Career" }).select().single();
    if (!area) throw new Error("life area fixture failed");
    await admin.from("activity_types").insert([
      { user_id: userId, life_area_id: area.id, name: "Deep work", polarity: "desired", is_quick_log: true, default_unit: "min" },
      { user_id: userId, life_area_id: area.id, name: "Networking", polarity: "desired", is_quick_log: true },
    ]);
  }

  await page.goto("/login");
  await page.getByLabel("Email").first().fill(email);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(onboarded ? /\/today$/ : /\/onboarding$/);
  return { email, userId };
}

/**
 * Gives a user 60 days of history for a Mon–Fri routine that's reliably done
 * except on Wednesdays, which should surface as a weekday pattern.
 */
export async function seedWednesdayDropoff(userId: string, today: string) {
  const { addDays, assertLocalDate, eachDay, weekdayOf } = await import("@/lib/dates");
  const admin = adminClient();
  const start = addDays(assertLocalDate(today), -60);
  const { data: area } = await admin.from("life_areas").select("id").eq("user_id", userId).limit(1).single();
  if (!area) throw new Error("seed needs an onboarded user");
  const { data: type } = await admin
    .from("activity_types")
    .insert({ user_id: userId, life_area_id: area.id, name: "Design practice", polarity: "desired" })
    .select()
    .single();
  if (!type) throw new Error("activity type seed failed");
  const createdAt = `${start}T08:00:00Z`;
  const { data: routine } = await admin
    .from("routines")
    .insert({
      user_id: userId,
      name: "Design practice",
      activity_type_id: type.id,
      days_of_week: [1, 2, 3, 4, 5],
      normal_minutes: 30,
      active_from: start,
      created_at: createdAt,
    })
    .select()
    .single();
  if (!routine) throw new Error("routine seed failed");

  const days = eachDay(start, addDays(assertLocalDate(today), -1)).filter((d) => [1, 2, 3, 4, 5].includes(weekdayOf(d)));
  const { error } = await admin.from("tasks").insert(
    days.map((date, i) => ({
      user_id: userId,
      title: "Design practice",
      source: "routine" as const,
      routine_id: routine.id,
      activity_type_id: type.id,
      scheduled_date: date,
      planned_minutes: 30,
      // Wednesdays: 1 in 9 done. Other days: all done but every 10th.
      status: (weekdayOf(date) === 3 ? (i % 9 === 0 ? "done" : "skipped") : i % 10 === 0 ? "skipped" : "done") as "done" | "skipped",
    })),
  );
  if (error) throw error;
  // Plain inserts wait for the daily detection run (ARCHITECTURE.md §7); make it due now.
  await admin.from("profiles").update({ patterns_dirty: true }).eq("id", userId);
}

/** Moves the account's creation back so past weeks are reviewable. */
export async function backdateAccount(userId: string, days: number) {
  const createdAt = new Date(Date.now() - days * 86_400_000).toISOString();
  const { error } = await adminClient().from("profiles").update({ created_at: createdAt }).eq("id", userId);
  if (error) throw error;
}
