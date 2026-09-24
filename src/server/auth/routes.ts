/** Route groups the proxy uses for auth redirects. Kept free of server-only imports. */
export const PROTECTED_PREFIXES = [
  "/today",
  "/goals",
  "/routines",
  "/log",
  "/patterns",
  "/experiments",
  "/reviews",
  "/onboarding",
  "/settings",
] as const;

/** Pages a signed-in user has no reason to see. */
export const GUEST_ONLY_PATHS = ["/login", "/signup", "/forgot-password"] as const;

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => matches(pathname, prefix));
}

export function isGuestOnlyPath(pathname: string): boolean {
  return GUEST_ONLY_PATHS.some((prefix) => matches(pathname, prefix));
}
