"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Field, FormError, SubmitButton } from "@/components/form/fields";

import { deleteAccountAction } from "../actions";

/** Irreversible, so it needs the word typed out (PRD J6). */
export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccountAction, null);
  return (
    <form action={action} className="grid gap-3" noValidate>
      <FormError state={state} />
      {state && !state.ok && state.error.code === "unauthorized" && (
        <Link href="/login?next=/settings" className="text-sm underline underline-offset-4">
          Sign in again
        </Link>
      )}
      <Field name="confirmation" label='Type "DELETE" to confirm' autoComplete="off" state={state} />
      <SubmitButton pendingLabel="Deleting…" variant="destructive" className="sm:justify-self-start">
        Delete my account and all data
      </SubmitButton>
    </form>
  );
}
