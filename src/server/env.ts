import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

/** Server-only secrets, validated on first use. Never import from client code. */
export function serverEnv() {
  const result = serverEnvSchema.safeParse({ SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY });
  if (!result.success) throw new Error("Invalid server configuration: SUPABASE_SERVICE_ROLE_KEY is missing.");
  return result.data;
}
