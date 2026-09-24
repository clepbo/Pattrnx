import type { Metadata } from "next";
import Link from "next/link";

import { SignUpForm } from "@/features/auth/components/sign-up-form";

export const metadata: Metadata = { title: "Create an account" };

export default function SignUpPage() {
  return (
    <div className="grid gap-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-muted-foreground text-sm">
          Already have one?{" "}
          <Link href="/login" className="text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
      <SignUpForm />
      <p className="text-muted-foreground text-xs">
        We use your device&apos;s timezone to put what you log on the right day. You can change it later.
      </p>
    </div>
  );
}
