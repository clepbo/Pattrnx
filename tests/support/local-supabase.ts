import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/server/db/database";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. Start Supabase and run \`pnpm env:local\` (CI exports it via scripts/local-env.sh).`);
  return value;
}

export const SUPABASE_URL = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
export const ANON_KEY = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
export const MAILPIT_URL = requireEnv("MAILPIT_URL");

const noPersist = { auth: { persistSession: false, autoRefreshToken: false } };

export function anonClient() {
  return createClient<Database>(SUPABASE_URL, ANON_KEY, noPersist);
}

/** Test-only admin client. App code must never do this (ARCHITECTURE.md §6). */
export function adminClient() {
  return createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, noPersist);
}

export function uniqueEmail(prefix = "user"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
}

export const TEST_PASSWORD = "integration-pass-123";

/** A confirmed user signed in on its own client. */
export async function signedInUser(metadata: Record<string, string> = {}) {
  const email = uniqueEmail();
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) throw error;

  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  if (signInError) throw signInError;
  return { client, user: data.user, email };
}
