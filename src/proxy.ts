import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { publicEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/redirects";
import { buildCsp } from "@/server/auth/csp";
import { isGuestOnlyPath, isProtectedPath } from "@/server/auth/routes";

/**
 * Runs before every page request:
 *  1. sets a per-request CSP nonce
 *  2. refreshes the Supabase session cookie
 *  3. redirects signed-out users away from app pages, and signed-in users away from guest pages
 */
export async function proxy(request: NextRequest) {
  const env = publicEnv();
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp({
    nonce,
    isDev: process.env.NODE_ENV === "development",
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const cookieWrites: { name: string; value: string; options: object }[] = [];
  let cacheHeaders: Record<string, string> = {};

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookieWrites.splice(0, cookieWrites.length, ...cookiesToSet);
        cacheHeaders = headers;
      },
    },
  });

  // Do not run code between createServerClient and getClaims: it refreshes the session.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const { pathname, search } = request.nextUrl;
  if (!signedIn && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    response = NextResponse.redirect(url);
  } else if (signedIn && isGuestOnlyPath(pathname)) {
    const target = safeNextPath(request.nextUrl.searchParams.get("next"));
    response = NextResponse.redirect(new URL(target, request.url));
  }

  for (const { name, value, options } of cookieWrites) response.cookies.set(name, value, options);
  for (const [key, value] of Object.entries(cacheHeaders)) response.headers.set(key, value);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
