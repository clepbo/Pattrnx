import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { addDays, todayIn } from "@/lib/dates";

import { adminClient } from "../support/local-supabase";
import { backdateAccount, seedWednesdayDropoff, signInNewUser } from "./helpers";

test.beforeEach(async ({ page }) => {
  page.on("console", (message) => {
    if (message.type() === "error" && /Content Security Policy/i.test(message.text())) {
      throw new Error(`CSP violation: ${message.text()}`);
    }
  });
});

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
}

test("J3 + J4: weekly review and a pattern-suggested experiment", async ({ page }) => {
  test.setTimeout(90_000);
  const { userId } = await signInNewUser(page, { onboarded: true });
  const today = todayIn("Africa/Lagos");
  await seedWednesdayDropoff(userId, today);
  await backdateAccount(userId, 60);

  // Today points at last week's review until it's opened.
  await page.goto("/today");
  await expect(page.getByRole("link", { name: /Your review of last week is ready/ })).toBeVisible();

  // The Insights tab opens the latest completed week's review.
  await page.getByRole("link", { name: "Insights" }).first().click();
  await expect(page).toHaveURL(/\/reviews\/\d{4}-\d{2}-\d{2}$/);
  await expect(page.getByRole("heading", { name: /^Week of / })).toBeVisible();
  await expect(page.getByRole("region", { name: "Execution" }).getByText(/of planned tasks done/)).toBeVisible();
  await expect(page.getByRole("region", { name: "What repeated" }).getByText(/on Wednesdays/)).toBeVisible();
  const suggestion = page.getByRole("region", { name: "Something to try" });
  await expect(suggestion.getByText("Move Design practice off Wednesdays")).toBeVisible();
  await expectAccessible(page);

  await page.getByLabel("Your reflection (optional)").fill("Wednesdays are meeting-heavy. Try Saturdays.");
  await page.getByRole("group", { name: "How useful was this review?" }).getByText("4", { exact: true }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  const reviewUrl = page.url();

  await page.goto("/today");
  await expect(page.getByRole("link", { name: /Your review of last week is ready/ })).toHaveCount(0);

  // Opening the review again shows the stored snapshot and reflection (FR-8).
  await page.goto(reviewUrl);
  await expect(page.getByLabel("Your reflection (optional)")).toHaveValue("Wednesdays are meeting-heavy. Try Saturdays.");

  // Start the suggested experiment, pre-filled from the pattern (J4).
  await suggestion.getByRole("link", { name: "Set up this experiment" }).click();
  await expect(page.getByLabel("Name")).toHaveValue("Move Design practice off Wednesdays");
  await expect(page.getByLabel("Which tasks")).toHaveValue(/[0-9a-f-]{36}/);
  await expectAccessible(page);
  await page.getByRole("button", { name: "Start experiment" }).click();
  await expect(page).toHaveURL(/\/experiments\/[0-9a-f-]+\?started=1$/);
  await expect(page.getByText("Day 1 of 14")).toBeVisible();
  await expect(page.getByText(/^Before: \d+% of planned tasks done\. So far during the experiment:/)).toBeVisible();

  await page.goto("/today");
  await expect(page.getByRole("region", { name: "Experiments" }).getByText("Move Design practice off Wednesdays")).toBeVisible();

  // BR-7: one active experiment per goal is enforced, and the limit is explained.
  const { data: experiments } = await adminClient().from("experiments").select("baseline_value, baseline_observed_days").eq("user_id", userId);
  expect(experiments).toHaveLength(1);
  expect(experiments?.[0].baseline_observed_days).toBeGreaterThanOrEqual(5);
});

test("J4: an experiment past its end date is wrapped up with an outcome", async ({ page }) => {
  const { userId } = await signInNewUser(page, { onboarded: true });
  const today = todayIn("Africa/Lagos");
  const start = addDays(today, -14);
  const { data, error } = await adminClient()
    .from("experiments")
    .insert({
      user_id: userId,
      title: "Shorter sessions",
      hypothesis: "30-minute sessions will get done more often than 60-minute ones.",
      intervention_category: "reduce",
      intervention_description: "Plan 30 minutes instead of 60.",
      metric: "task_completion_rate",
      direction: "increase",
      start_date: start,
      end_date: addDays(start, 6),
      baseline_start: addDays(start, -7),
      baseline_end: addDays(start, -1),
      baseline_value: 0.4,
      baseline_observed_days: 2,
    })
    .select("id")
    .single();
  if (error) throw error;

  await page.goto(`/experiments/${data.id}`);
  await expect(page.getByText("Ready to review")).toBeVisible();
  // Two observed baseline days is below BR-8's minimum of five.
  await expect(page.getByText(/Not enough data to tell/)).toBeVisible();
  await page.getByLabel("It helped").check();
  await page.getByLabel("What did you learn? (optional)").fill("Felt easier to start.");
  await page.getByRole("button", { name: "Finish experiment" }).click();
  await expect(page.getByRole("region", { name: "Your conclusion" }).getByText("Moved the way you wanted")).toBeVisible();

  const { data: row } = await adminClient().from("experiments").select("status, outcome, suggested_outcome").eq("id", data.id).single();
  expect(row).toEqual({ status: "completed", outcome: "improved", suggested_outcome: "inconclusive" });
});

test("J6: export downloads everything the user owns, with a rate limit", async ({ page }) => {
  await signInNewUser(page, { onboarded: true });
  await page.goto("/settings");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Export my data" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^pattrnx-export-\d{4}-\d{2}-\d{2}\.json$/);
  const exported = JSON.parse(await (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString()));
  expect(exported).toMatchObject({ format: "pattrnx-export", version: 1, profile: { display_name: "Tester" } });
  expect(exported.life_areas).toHaveLength(1);
  expect(exported.activity_types.map((t: { name: string }) => t.name).sort()).toEqual(["Deep work", "Networking"]);

  // 5 per hour: the first download used one.
  for (let i = 0; i < 4; i++) expect((await page.request.get("/api/export")).status()).toBe(200);
  const limited = await page.request.get("/api/export");
  expect(limited.status()).toBe(429);
  expect((await limited.json()).error).toMatch(/Try again later/);

  const anonymous = await page.request.get("/api/export", { headers: { cookie: "" } });
  expect(anonymous.status()).toBe(401);
});

test("J6: deleting the account removes the user and every row", async ({ page }) => {
  const { userId } = await signInNewUser(page, { onboarded: true });
  await page.goto("/settings");
  await page.getByText("Delete my account", { exact: true }).click();
  await page.getByLabel('Type "DELETE" to confirm').fill("delete");
  await page.getByRole("button", { name: "Delete my account and all data" }).click();
  await expect(page.getByText("Type DELETE in capitals to confirm.")).toBeVisible();

  await page.getByLabel('Type "DELETE" to confirm').fill("DELETE");
  await page.getByRole("button", { name: "Delete my account and all data" }).click();
  await expect(page).toHaveURL(/\/\?deleted=1$/);
  await expect(page.getByText("Your account and all of its data have been deleted.")).toBeVisible();

  const admin = adminClient();
  const { data: user } = await admin.auth.admin.getUserById(userId);
  expect(user.user).toBeNull();
  const { count: profiles } = await admin.from("profiles").select("*", { count: "exact", head: true }).eq("id", userId);
  expect(profiles).toBe(0);
  for (const table of ["life_areas", "activity_types"] as const) {
    const { count } = await admin.from(table).select("*", { count: "exact", head: true }).eq("user_id", userId);
    expect(count, table).toBe(0);
  }
  await page.goto("/today");
  await expect(page).toHaveURL(/\/login/);
});
