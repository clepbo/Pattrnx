"use client";

import { useActionState } from "react";

import { requestPasswordReset, updatePassword } from "../actions";
import { Field, FormError, SubmitButton } from "./form-parts";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, null);

  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormError state={state} />
      <Field name="email" label="Email" type="email" autoComplete="email" required state={state} />
      <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePassword, null);

  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormError state={state} />
      <Field
        name="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        minLength={10}
        maxLength={72}
        hint="At least 10 characters."
        state={state}
      />
      <Field name="confirmPassword" label="Confirm new password" type="password" autoComplete="new-password" required state={state} />
      <SubmitButton pendingLabel="Saving…">Save password</SubmitButton>
    </form>
  );
}
