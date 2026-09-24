import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { todayIn } from "@/lib/dates";

import { adminClient } from "../support/local-supabase";
import { seedWednesdayDropoff, signInNewUser } from "./helpers";

test.beforeEach(async ({ page }) => {
  page.on("console", (message) => {
    if (message.type() === "error" && /Content Security Policy/i.test(message.text())) {
      throw new Error(`CSP violation: ${message.text()}`);
    }
  });
});

test("a new user sees the still-learning state (BR-2)", async ({ page }) => {
  await signInNewUser(page, { onboarded: true });
  // Insights → (no review before the first full week) → Patterns.
  await page.getByRole("link", { name: "Insights" }).first().click();
  await expect(page.getByText("Your first review comes after your first full week")).toBeVisible();
  await page.getByRole("navigation", { name: "Insights" }).getByRole("link", { name: "Patterns" }).click();
  await expect(page.getByText("Still learning")).toBeVisible();
  await expect(page.getByText(/more days to go/)).toBeVisible();
});

test("a planted weekday pattern surfaces with evidence, and feedback hides it (F10, F12)", async ({ page }) => {
  const { userId } = await signInNewUser(page, { onboarded: true });
  await seedWednesdayDropoff(userId, todayIn("Africa/Lagos"));

  // Today shows at most one pattern to watch.
  await page.goto("/today");
  const watch = page.getByRole("region", { name: "Pattern to watch" });
  await expect(watch.getByText(/Design practice gets done \d+% of the time on Wednesdays/)).toBeVisible();

  await page.goto("/patterns");
  const card = page.getByRole("article", { name: "Timing" });
  await expect(card.getByText(/on Wednesdays/)).toBeVisible();
  await expect(card.getByText(/confidence/)).toBeVisible();
  await card.getByText("See the evidence").click();
  await expect(card.getByRole("table", { name: "Completion by weekday" })).toBeVisible();
  await expect(card.getByRole("row", { name: /Wednesday/ })).toBeVisible();
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);

  await card.getByRole("button", { name: "Not accurate" }).click();
  await expect(page.getByText("No clear patterns right now")).toBeVisible();

  // Dismissed patterns stay hidden even after detection re-runs (BR-9).
  await adminClient().from("profiles").update({ patterns_dirty: true }).eq("id", userId);
  await page.goto("/today");
  const { data: row } = await adminClient().from("patterns").select("status, last_detected_at").eq("user_id", userId).single();
  expect(row?.status).toBe("dismissed");
  await expect(page.getByRole("region", { name: "Pattern to watch" })).toHaveCount(0);
});

test("goal health and the plan-vs-reality strip show on the goal page (F9)", async ({ page }) => {
  const { userId } = await signInNewUser(page, { onboarded: true });
  await page.goto("/goals/new");
  await page.getByLabel("What do you want to achieve?").fill("Ship a portfolio");
  await page.getByLabel("Milestones").check();
  await page.getByRole("button", { name: "Create goal" }).click();
  await expect(page).toHaveURL(/\/goals\/[0-9a-f-]+\?created=1$/);

  const health = page.getByRole("region", { name: "Goal health" });
  await expect(health.getByText("Uncertain")).toBeVisible();
  await expect(health.getByText("There isn't enough information to judge the pace yet.")).toBeVisible();
  await expect(health.getByText("Planned vs done, by week")).toBeVisible();
  await expect(health.getByText("Nothing planned")).toHaveCount(4);
  expect(userId).toBeTruthy();
});
