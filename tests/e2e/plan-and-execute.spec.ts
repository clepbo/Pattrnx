import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { addMonths, todayIn } from "@/lib/dates";

import { signInNewUser } from "./helpers";

test.beforeEach(async ({ page }) => {
  page.on("console", (message) => {
    if (message.type() === "error" && /Content Security Policy/i.test(message.text())) {
      throw new Error(`CSP violation: ${message.text()}`);
    }
  });
});

async function expectNoSeriousA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
}

test("J1 + J2: onboarding → first goal with feasibility → plan → Today → log", async ({ page }) => {
  test.setTimeout(90_000);
  await signInNewUser(page, { timezone: "UTC" });

  // Step 1: profile.
  await expect(page.getByRole("heading", { name: "Let's get you set up" })).toBeVisible();
  await expect(page.getByLabel("Your name")).toHaveValue("Tester");
  await page.getByLabel("Timezone").selectOption("Africa/Lagos");
  await page.getByLabel("Currency").selectOption("NGN");
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 2: areas and starter activity types (Career, Finance, Health, Learning are pre-selected).
  await expect(page).toHaveURL(/\/onboarding\/areas$/);
  await expectNoSeriousA11yViolations(page);
  await page.getByLabel("Add your own areas (optional)").fill("Side business");
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 3: first goal, the blueprint's savings example.
  await expect(page).toHaveURL(/\/goals\/new\?first=1$/);
  await expect(page.getByText("Step 3 of 3")).toBeVisible();
  const today = todayIn("Africa/Lagos");
  await page.getByLabel("What do you want to achieve?").fill("Emergency fund");
  await page.getByLabel("Life area").selectOption({ label: "Finance" });
  await expect(page.getByLabel("Unit")).toHaveValue("NGN");
  await page.getByLabel("Where you are now").fill("400,000");
  await page.getByLabel("Target").fill("2,000,000");
  await page.getByLabel("Deadline (optional)").fill(addMonths(today, 6));
  await page.getByLabel("How much do you plan to add? (optional)").fill("80,000");
  await page.getByLabel("Per", { exact: true }).selectOption("month");
  await page.getByLabel("How do you intend to get there? (optional)").fill("Save monthly\nCut weekend spending");
  await expectNoSeriousA11yViolations(page);
  await page.getByRole("button", { name: "Create goal" }).click();

  // Feasibility with its arithmetic (PRD F3 acceptance).
  await expect(page).toHaveURL(/\/goals\/[0-9a-f-]+\?created=1$/);
  const feasibility = page.getByRole("region", { name: "Feasibility" });
  await expect(feasibility.getByText("Currently unrealistic")).toBeVisible();
  await expect(feasibility.getByText(/needs about ₦266,667 per month/)).toBeVisible();
  await expect(feasibility.getByText("That's ₦186,667 per month short of what's needed.")).toBeVisible();
  await expect(page.getByText("Cut weekend spending")).toBeVisible();
  await expectNoSeriousA11yViolations(page);
  const goalUrl = page.url().replace("?created=1", "");

  // Milestone + action scheduled for today.
  await page.getByLabel("New milestone").fill("Build a 3-month buffer");
  await page.getByRole("button", { name: "Add milestone" }).click();
  await expect(page.getByRole("listitem").getByText("Build a 3-month buffer", { exact: true })).toBeVisible();
  await page.getByLabel("New action").fill("Open a savings account");
  await page.getByLabel("Milestone", { exact: true }).selectOption({ label: "Build a 3-month buffer" });
  await page.getByLabel("Logs as").selectOption({ label: "Saving" });
  await page.getByRole("button", { name: "Add action" }).click();
  await expect(page.getByRole("listitem").getByText("Open a savings account", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Schedule" }).click();
  await expect(page.getByText(/^Planned for/)).toBeVisible();

  // A routine for this goal, every day so it's on today's plan.
  await page.getByRole("link", { name: "Add a routine for this goal" }).click();
  await page.getByLabel("Name").fill("Review spending");
  await page.getByLabel("Logs as").selectOption({ label: "Discretionary spending" });
  for (const day of ["Sat", "Sun"]) await page.getByLabel(day).check();
  await page.getByLabel("Usual length (min)").fill("20");
  await page.getByLabel("Minimum version (min)").fill("5");
  await page.getByLabel("What the minimum version looks like (optional)").fill("Glance at yesterday's receipts");
  await page.getByRole("button", { name: "Create routine" }).click();
  await expect(page).toHaveURL(/\/routines\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "Review spending" })).toBeVisible();

  // Today: both tasks, grouped under the goal's priority.
  await page.getByRole("link", { name: "Today" }).first().click();
  await expect(page.getByText("0 of 2 planned tasks done")).toBeVisible();
  await expect(page.getByText("Minimum version: Glance at yesterday's receipts")).toBeVisible();
  await expectNoSeriousA11yViolations(page);
  await page.getByRole("button", { name: "Did 5 min" }).click();
  await expect(page.getByText("1 of 2 planned tasks done")).toBeVisible();
  await expect(page.getByText("Done (minimum)")).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByText("2 of 2 planned tasks done")).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).first().click();
  await expect(page.getByText("1 of 2 planned tasks done")).toBeVisible();

  // One-tap logging, and money types open the full form instead.
  await page.getByRole("button", { name: "Exercise", exact: true }).click();
  await expect(page.getByRole("button", { name: "✓ Exercise" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Saving…" })).toBeVisible();

  // Daily check-in, all optional.
  await page.getByLabel("Hours slept").fill("6.5");
  await page.getByRole("group", { name: "Workload" }).getByText("4", { exact: true }).click();
  await page.getByRole("button", { name: "Save check-in" }).click();
  await expect(page.getByText("Check-in saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Hours slept")).toHaveValue("6.5");

  // The log shows the one-tap entry and the task's evidence.
  await page.goto("/log");
  const todayLog = page.locator("section", { has: page.getByRole("heading", { name: /Last 14 days/ }) });
  await expect(todayLog.getByText("Exercise", { exact: true })).toBeVisible();
  await expect(todayLog.getByText(/from a task/)).toHaveCount(1);

  // Logging progress moves the goal forward.
  await page.goto(goalUrl);
  await page.getByLabel("Amount (NGN)").fill("80,000");
  await page.getByRole("button", { name: "Log progress" }).click();
  await expect(page.getByText("₦480,000 of ₦2,000,000")).toBeVisible();
});

test("an activity with an amount is logged from the Log page", async ({ page }) => {
  await signInNewUser(page, { onboarded: true });
  await page.goto("/log");
  await page.getByLabel("What did you do?").selectOption({ label: "Networking (Career)" });
  await page.getByLabel("Minutes (optional)").fill("45");
  await page.getByLabel("Note (optional)").fill("Coffee with a design lead");
  await page.getByRole("button", { name: "Log activity" }).click();
  await expect(page.getByText("Logged.")).toBeVisible();
  await expect(page.getByText("Coffee with a design lead")).toBeVisible();

  await page.getByRole("button", { name: "Delete Networking" }).click();
  await expect(page.getByText("Coffee with a design lead")).toHaveCount(0);
});

test("settings: timezone and life areas", async ({ page }) => {
  await signInNewUser(page, { onboarded: true });
  await page.getByRole("link", { name: "Settings" }).first().click();
  await page.getByLabel("Timezone").selectOption("Europe/London");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.getByLabel("New area").fill("Community");
  await page.getByRole("button", { name: "Add area" }).click();
  await expect(page.getByLabel("Name", { exact: true }).last()).toHaveValue("Community");

  await page.getByLabel("New area").fill("career");
  await page.getByRole("button", { name: "Add area" }).click();
  // Re-adding an existing area (any case) is a no-op, not a duplicate.
  await expect(page.getByLabel("Name", { exact: true })).toHaveCount(2);
});

test("goal form validation keeps what was typed", async ({ page }) => {
  await signInNewUser(page, { onboarded: true });
  await page.goto("/goals/new");
  await page.getByLabel("What do you want to achieve?").fill("Run a 10k");
  await page.getByLabel("A number I track").check();
  await page.getByLabel("Unit").fill("min");
  await page.getByLabel("Where you are now").fill("70");
  await page.getByRole("button", { name: "Create goal" }).click();
  await expect(page.getByText("Where do you want to get to?")).toBeVisible();
  await expect(page.getByLabel("What do you want to achieve?")).toHaveValue("Run a 10k");
  await expect(page.getByLabel("A number I track")).toBeChecked();
  await expect(page.getByLabel("Where you are now")).toHaveValue("70");
});
