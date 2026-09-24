import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Check your email" };

const MESSAGES = {
  signup: "We sent you a link to confirm your email. Open it to finish creating your account.",
  "magic-link": "If an account exists for that email, a sign-in link is on its way. It works once and expires in an hour.",
  reset: "If an account exists for that email, a password reset link is on its way. It expires in an hour.",
} as const;

export default async function CheckEmailPage({ searchParams }: PageProps<"/check-email">) {
  const { reason } = await searchParams;
  const message = MESSAGES[reason as keyof typeof MESSAGES] ?? MESSAGES["magic-link"];

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
      <p className="text-muted-foreground text-sm" role="status">
        {message}
      </p>
      <Link href="/login" className="text-muted-foreground text-sm underline-offset-4 hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}
