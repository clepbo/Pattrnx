import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ResetPasswordForm } from "@/features/auth/components/password-forms";
import { getUser } from "@/server/auth";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  // Reached from the recovery email via /auth/confirm, which signs the user in.
  if (!(await getUser())) redirect("/forgot-password?expired=1");

  return (
    <div className="grid gap-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="text-muted-foreground text-sm">This signs you out on your other devices.</p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
