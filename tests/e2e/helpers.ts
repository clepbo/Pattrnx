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
