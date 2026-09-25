import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { adminClient, TEST_PASSWORD, uniqueEmail } from "../support/local-supabase";
import { latestEmailLink } from "../support/mailpit";

// Fail any test whose page reports a CSP violation (e.g. a script missing its nonce).
test.beforeEach(async ({ page }) => {
  page.on("console", (message) => {
    if (message.type() === "error" && /Content Security Policy/i.test(message.text())) {
      throw new Error(`CSP violation: ${message.text()}`);
    }
  });
});

test.describe("signed-out visitors", () => {
  test("are redirected from app pages to sign-in, keeping where they were going", async ({ page }) => {
    await page.goto("/today");
    await expect(page).toHaveURL(/\/login\?next=%2Ftoday$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("get a strict CSP with a per-request nonce and security headers", async ({ request }) => {
    const first = await request.get("/login");
    const second = await request.get("/login");
    const csp = first.headers()["content-security-policy"];
    expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toEqual(second.headers()["content-security-policy"]);
    expect(first.headers()["x-frame-options"]).toBe("DENY");
    expect(first.headers()["x-content-type-options"]).toBe("nosniff");
    expect(first.headers()["x-powered-by"]).toBeUndefined();
  });

  test("can show and hide the password they typed", async ({ page }) => {
    await page.goto("/signup");
    const password = page.getByLabel("Password", { exact: true });
    await password.fill("typed-secret-123");
    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(password).toHaveValue("typed-secret-123");
    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(password).toHaveAttribute("type", "password");
  });

  for (const path of ["/", "/login", "/signup", "/forgot-password"]) {
    test(`${path} has no serious accessibility violations`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => v.id)).toEqual([]);
    });
  }
});

test("sign up → confirm email → today → sign out → sign in", async ({ page }) => {
  const email = uniqueEmail("e2e");
  const name = `Ada ${email.split("@")[0].slice(-6)}`;

  await page.goto("/signup");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Use at least 10 characters.")).toBeVisible();
  await expect(page.getByLabel("Email"), "non-secret values survive a failed submit").toHaveValue(email);

  await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/check-email\?reason=signup$/);

  await page.goto(await latestEmailLink(email));
  // New accounts start onboarding, pre-filled with the sign-up name.
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByLabel("Your name")).toHaveValue(name);

  // The browser's timezone (set by client JS, so this also proves hydration under the CSP) was captured.
  const { data: profile } = await adminClient().from("profiles").select("timezone").eq("display_name", name).single();
  expect(profile?.timezone).toBe("Africa/Lagos");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/today");
  await expect(page).toHaveURL(/\/login/);

  // An off-site `next` is ignored after sign-in.
  await page.goto("/login?next=https://evil.example/steal");
  await page.getByLabel("Email").first().fill(email);
  await page.getByLabel("Password", { exact: true }).fill("wrong-password-1");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Email or password is incorrect." })).toBeVisible();

  await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  // `/today` sends users who haven't finished onboarding back to it.
  await expect(page).toHaveURL(/\/onboarding$/);

  // Signed-in users skip the guest pages.
  await page.goto("/login");
  await expect(page).toHaveURL(/\/(today|onboarding)$/);
});

test("password reset via email signs the user in with the new password", async ({ page }) => {
  const email = uniqueEmail("reset");
  await adminClient().auth.admin.createUser({ email, password: TEST_PASSWORD, email_confirm: true });

  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page).toHaveURL(/\/check-email\?reason=reset$/);

  await page.goto(await latestEmailLink(email));
  await expect(page).toHaveURL(/\/reset-password$/);
  await page.getByLabel("New password", { exact: true }).fill("brand-new-password-9");
  await page.getByLabel("Confirm new password").fill("brand-new-password-9");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
});

test("a used or bogus email link shows a friendly error", async ({ page }) => {
  await page.goto("/auth/confirm?token_hash=not-a-real-token&type=email&next=/today");
  await expect(page).toHaveURL(/\/auth\/error$/);
  await expect(page.getByRole("heading", { name: "That link didn't work" })).toBeVisible();
});

test("magic link signs in an existing user and doesn't reveal unknown emails", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").nth(1).fill(uniqueEmail("nobody"));
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page).toHaveURL(/\/check-email\?reason=magic-link$/);

  const email = uniqueEmail("magic");
  await adminClient().auth.admin.createUser({ email, password: TEST_PASSWORD, email_confirm: true });
  await page.goto("/login");
  await page.getByLabel("Email").nth(1).fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page).toHaveURL(/\/check-email\?reason=magic-link$/);

  await page.goto(await latestEmailLink(email));
  await expect(page).toHaveURL(/\/onboarding$/);
});
