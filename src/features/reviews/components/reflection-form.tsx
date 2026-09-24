"use client";

import { useActionState } from "react";

import { FormError, SubmitButton, TextareaField } from "@/components/form/fields";

import { saveReflectionAction } from "../actions";

export function ReflectionForm({ periodStart, reflection, usefulness }: { periodStart: string; reflection: string; usefulness: number | null }) {
  const [state, action] = useActionState(saveReflectionAction, null);
  const current = state?.values?.usefulness ?? (usefulness === null ? "" : String(usefulness));
  return (
    <form action={action} className="grid gap-4" noValidate>
      <input type="hidden" name="periodStart" value={periodStart} />
      <FormError state={state} />
      <TextareaField
        name="reflection"
        label="Your reflection (optional)"
        hint="What would you keep, change or drop next week?"
        rows={3}
        defaultValue={state?.values?.reflection ?? reflection}
        state={state}
      />
      <fieldset className="grid gap-1">
        <legend className="text-sm font-medium">How useful was this review?</legend>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground w-16 text-xs">Not at all</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              className="border-border has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground flex size-11 cursor-pointer items-center justify-center rounded-lg border text-sm"
            >
              <input type="radio" name="usefulness" value={n} defaultChecked={current === String(n)} className="sr-only" />
              {n}
            </label>
          ))}
          <span className="text-muted-foreground w-16 text-right text-xs">Very</span>
        </div>
      </fieldset>
      {state?.ok && (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
          Saved.
        </p>
      )}
      <SubmitButton pendingLabel="Saving…" variant="outline" className="sm:justify-self-start">
        Save
      </SubmitButton>
    </form>
  );
}
