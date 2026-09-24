import Link from "next/link";
import { redirect } from "next/navigation";

import { DesktopNav, MobileNav } from "@/components/layout/app-nav";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { requireUser } from "@/server/auth";
import { getProfile } from "@/server/services/profile";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const profile = await getProfile(await requireUser());
  if (!profile.onboarding_completed_at) redirect("/onboarding");

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-border border-b">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Link href="/today" className="text-sm font-semibold tracking-wide">
              Pattrnx
            </Link>
            <DesktopNav />
          </div>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-8 pb-24 sm:pb-8">{children}</main>
      <MobileNav />
    </div>
  );
}
