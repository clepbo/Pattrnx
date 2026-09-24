"use client";

import { useActionState } from "react";

import { signUp } from "../actions";
import { Field, FormError, SubmitButton } from "./form-parts";

function detectTimeZone(input: HTMLInputElement | null) {
  // Set on the client only, so server and client HTML match.
  if (input) input.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function SignUpForm() {
  const [state, action] = useActionState(signUp, null);

  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormError state={state} />
      <Field name="displayName" label="Your name" autoComplete="name" required maxLength={80} state={state} />
      <Field name="email" label="Email" type="email" autoComplete="email" required state={state} />
      <Field
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        required
        minLength={10}
        maxLength={72}
        hint="At least 10 characters."
        state={state}
      />
      <input type="hidden" name="timezone" ref={detectTimeZone} />
      <SubmitButton pendingLabel="Creating account…">Create account</SubmitButton>
    </form>
  );
}
