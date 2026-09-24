import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { requireUser } from "@/server/auth";

export default async function OnboardingLayout({ children }: LayoutProps<"/">) {
  await requireUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-border border-b">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-4 px-4">
          <span className="text-sm font-semibold tracking-wide">Pattrnx</span>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
