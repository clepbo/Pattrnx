"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export const APP_NAV = [
  { href: "/today", label: "Today" },
  { href: "/goals", label: "Goals" },
  { href: "/routines", label: "Routines" },
  { href: "/log", label: "Log" },
  { href: "/reviews", label: "Insights", also: ["/patterns", "/experiments"] },
  { href: "/settings", label: "Settings" },
] as const;

function useIsActive() {
  const pathname = usePathname();
  return (href: string, also: readonly string[] = []) =>
    [href, ...also].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** Inline links in the header on wider screens. */
export function DesktopNav() {
  const isActive = useIsActive();
  return (
    <nav aria-label="Main" className="hidden sm:block">
      <ul className="flex gap-1">
        {APP_NAV.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive(item.href, "also" in item ? item.also : []) ? "page" : undefined}
              className="hover:bg-muted aria-[current=page]:bg-muted inline-flex h-11 items-center rounded-lg px-3 text-sm aria-[current=page]:font-medium"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Bottom tab bar on phones. */
export function MobileNav() {
  const isActive = useIsActive();
  return (
    <nav aria-label="Main" className="bg-background border-border fixed inset-x-0 bottom-0 z-10 border-t pb-[env(safe-area-inset-bottom)] sm:hidden">
      <ul className="grid grid-cols-6">
        {APP_NAV.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive(item.href, "also" in item ? item.also : []) ? "page" : undefined}
              className={cn(
                "text-muted-foreground flex h-14 items-center justify-center text-[11px]",
                "aria-[current=page]:text-foreground aria-[current=page]:font-semibold",
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
