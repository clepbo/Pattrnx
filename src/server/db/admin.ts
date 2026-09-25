import "server-only";

import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/server/env";

import type { Database } from "./database";

/**
 * Service-role client: bypasses RLS. Only for account deletion and cron routes
 * (ARCHITECTURE.md §6). ESLint blocks importing this anywhere else.
 */
export function createAdminClient() {
  return createClient<Database>(publicEnv().NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
