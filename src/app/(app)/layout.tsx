import Link from "next/link";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { requireUser } from "@/server/auth";

const NAV = [{ href: "/today", label: "Today" }] as const;

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-border border-b">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Link href="/today" className="text-sm font-semibold tracking-wide">
              Pattrnx
            </Link>
            <nav aria-label="Main">
              <ul className="flex gap-1">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="hover:bg-muted inline-flex h-11 items-center rounded-lg px-3 text-sm">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
