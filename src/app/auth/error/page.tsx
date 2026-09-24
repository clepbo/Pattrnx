import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Link expired" };

export default function AuthErrorPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">That link didn&apos;t work</h1>
      <p className="text-muted-foreground text-sm">
        It may have expired or already been used. Email links work once and expire after an hour.
      </p>
      <div className="flex flex-wrap gap-4 text-sm">
        <Link href="/login" className="underline underline-offset-4">
          Sign in
        </Link>
        <Link href="/forgot-password" className="underline underline-offset-4">
          Reset password
        </Link>
      </div>
    </main>
  );
}
