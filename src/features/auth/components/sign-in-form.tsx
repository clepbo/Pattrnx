"use client";

import Link from "next/link";
import { useActionState } from "react";

import { sendMagicLink, signIn } from "../actions";
import { Field, FormError, PasswordField, SubmitButton } from "@/components/form/fields";

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, null);

  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormError state={state} />
      <Field name="email" label="Email" type="email" autoComplete="email" required state={state} />
      <PasswordField name="password" label="Password" autoComplete="current-password" required state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      <Link href="/forgot-password" className="text-muted-foreground justify-self-start text-sm underline-offset-4 hover:underline">
        Forgot your password?
      </Link>
    </form>
  );
}

export function MagicLinkForm() {
  const [state, action] = useActionState(sendMagicLink, null);

  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormError state={state} />
      <Field id="magic-email" name="email" label="Email" type="email" autoComplete="email" required state={state} />
      <SubmitButton pendingLabel="Sending…">Email me a sign-in link</SubmitButton>
    </form>
  );
}
