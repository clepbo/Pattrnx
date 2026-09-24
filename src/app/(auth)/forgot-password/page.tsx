import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/features/auth/components/password-forms";

export const metadata: Metadata = { title: "Reset your password" };

export default async function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  const { expired } = await searchParams;

  return (
    <div className="grid gap-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
        <p className="text-muted-foreground text-sm">
          {expired
            ? "That reset link has expired. Enter your email and we'll send a new one."
            : "Enter your email and we'll send you a link to choose a new password."}
        </p>
      </div>
      <ForgotPasswordForm />
      <Link href="/login" className="text-muted-foreground text-sm underline-offset-4 hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}
