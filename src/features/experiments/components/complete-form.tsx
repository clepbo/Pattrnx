"use client";

import { useActionState } from "react";

import { FormError, SubmitButton, TextareaField } from "@/components/form/fields";

import { completeExperimentAction } from "../actions";
import { OUTCOMES } from "../schemas";

export function CompleteExperimentForm({ experimentId, suggested }: { experimentId: string; suggested: string }) {
  const [state, action] = useActionState(completeExperimentAction, null);
  const error = state && !state.ok ? state.error.fields?.outcome?.[0] : undefined;
  return (
    <form action={action} className="grid gap-4" noValidate>
      <input type="hidden" name="experimentId" value={experimentId} />
      <FormError state={state} />
      <fieldset className="grid gap-2" aria-describedby={error ? "outcome-error" : undefined}>
        <legend className="mb-1 text-sm font-medium">How did it go for you?</legend>
        {OUTCOMES.map((o) => (
          <label key={o.value} className="border-border has-checked:border-primary has-checked:ring-primary flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 has-checked:ring-1">
            <input type="radio" name="outcome" value={o.value} defaultChecked={(state?.values?.outcome ?? suggested) === o.value} />
            <span className="text-sm">{o.label}</span>
          </label>
        ))}
        {error && (
          <p id="outcome-error" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </fieldset>
      <TextareaField name="reflection" label="What did you learn? (optional)" rows={3} state={state} />
      <SubmitButton pendingLabel="Saving…" className="sm:justify-self-start">
        Finish experiment
      </SubmitButton>
    </form>
  );
}
