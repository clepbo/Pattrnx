import { afterAll, describe, expect, it } from "vitest";

import { adminClient, anonClient, signedInUser, TEST_PASSWORD, uniqueEmail } from "../support/local-supabase";

const createdUserIds: string[] = [];

afterAll(async () => {
  const admin = adminClient();
  await Promise.all(createdUserIds.map((id) => admin.auth.admin.deleteUser(id)));
});

async function track<T extends { user: { id: string } }>(promise: Promise<T>): Promise<T> {
  const result = await promise;
  createdUserIds.push(result.user.id);
  return result;
}

describe("sign-up", () => {
  it("requires email confirmation and creates a profile from sign-up metadata", async () => {
    const email = uniqueEmail("signup");
    const client = anonClient();
    const { data, error } = await client.auth.signUp({
      email,
      password: TEST_PASSWORD,
      options: { data: { display_name: "Ada", timezone: "Africa/Lagos" } },
    });
    expect(error).toBeNull();
    expect(data.session).toBeNull();
    createdUserIds.push(data.user!.id);

    const { data: profile } = await adminClient().from("profiles").select("*").eq("id", data.user!.id).single();
    expect(profile).toMatchObject({ display_name: "Ada", timezone: "Africa/Lagos", currency: "NGN", week_starts_on: 1 });

    const signIn = await client.auth.signInWithPassword({ email, password: TEST_PASSWORD });
    expect(signIn.error?.code).toBe("email_not_confirmed");
  });

  it("rejects passwords shorter than 10 characters", async () => {
    const { error } = await anonClient().auth.signUp({ email: uniqueEmail("weak"), password: "short-pw" });
    expect(error?.code).toBe("weak_password");
  });
});

describe("row-level security through the API", () => {
  it("lets a user write their own data with derived fields, and hides it from others", async () => {
    const a = await track(signedInUser({ timezone: "Africa/Lagos" }));
    const b = await track(signedInUser());

    const { data: area } = await a.client.from("life_areas").insert({ name: "Career" }).select().single();
    const { data: type } = await a.client
      .from("activity_types")
      .insert({ name: "Portfolio work", life_area_id: area!.id, polarity: "desired" })
      .select()
      .single();
    const { data: activity, error } = await a.client
      .from("activities")
      .insert({ activity_type_id: type!.id, occurred_at: "2026-09-20T23:30:00Z", duration_minutes: 45 })
      .select()
      .single();

    expect(error).toBeNull();
    expect(activity).toMatchObject({ local_date: "2026-09-21", local_hour: 0, life_area_id: area!.id });

    for (const table of ["life_areas", "activity_types", "activities"] as const) {
      const { data } = await b.client.from(table).select("id");
      expect(data, `B reads ${table}`).toEqual([]);
    }

    const { data: updated } = await b.client.from("activities").update({ note: "hacked" }).eq("id", activity!.id).select();
    expect(updated).toEqual([]);
  });

  it("gives anonymous requests no access to user tables", async () => {
    const anon = anonClient();
    for (const table of ["profiles", "life_areas", "activity_types", "activities", "daily_checkins"] as const) {
      const { error } = await anon.from(table).select("*").limit(1);
      expect(error?.code, table).toBe("42501");
    }
  });

  // Runs through the real Auth API: Supabase deletes as supabase_auth_admin, so every
  // trigger on the cascade must work for that role (a regression pgTAP can't reproduce).
  it("removes every row when the account is deleted", async () => {
    const { client, user } = await signedInUser();
    const { data: area } = await client.from("life_areas").insert({ name: "Health" }).select().single();
    await client.from("daily_checkins").insert({ local_date: "2026-09-21", sleep_hours: 7 });
    expect(area).not.toBeNull();

    const admin = adminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    expect(error).toBeNull();

    const counts = await Promise.all(
      (["life_areas", "daily_checkins"] as const).map(async (table) => {
        const { count } = await admin.from(table).select("id", { count: "exact", head: true }).eq("user_id", user.id);
        return count;
      }),
    );
    const { count: profiles } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("id", user.id);
    expect([...counts, profiles]).toEqual([0, 0, 0]);
  });
});
