import { type NextRequest, NextResponse } from "next/server";

import { otpTypeSchema } from "@/features/auth/schemas";
import { safeNextPath } from "@/lib/redirects";
import { createClient } from "@/server/db/server";

/**
 * Target of every auth email (confirm sign-up, magic link, password recovery).
 * Exchanges the one-time token hash for a session cookie, then continues to `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = otpTypeSchema.safeParse(searchParams.get("type"));
  const next = safeNextPath(searchParams.get("next"));

  if (tokenHash && type.success) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type: type.data, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
    console.error(JSON.stringify({ level: "warn", action: "auth.confirm", code: error.code ?? "unknown" }));
  }

  return NextResponse.redirect(new URL("/auth/error", request.url));
}
