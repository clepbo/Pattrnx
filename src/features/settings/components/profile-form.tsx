"use client";

import { useActionState } from "react";

import { Field, FormError, SelectField, SubmitButton } from "@/components/form/fields";
import { CURRENCIES, WEEKDAYS } from "@/features/onboarding/catalog";
import type { FormState } from "@/lib/action-result";

export interface ProfileDefaults {
  displayName: string;
  timezone: string;
  currency: string;
  weekStartsOn: number;
}

export function ProfileForm({
  action,
  defaults,
  timeZones,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults: ProfileDefaults;
  timeZones: string[];
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormError state={state} />
      {state?.ok && (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
          Saved.
        </p>
      )}
      <Field name="displayName" label="Your name" autoComplete="name" required maxLength={80} defaultValue={defaults.displayName} state={state} />
      <SelectField
        name="timezone"
        label="Timezone"
        hint="Decides which day your activities count towards."
        options={timeZones.map((tz) => ({ value: tz, label: tz.replaceAll("_", " ") }))}
        defaultValue={defaults.timezone}
        state={state}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField name="currency" label="Currency" options={CURRENCIES} defaultValue={defaults.currency} state={state} />
        <SelectField
          name="weekStartsOn"
          label="Week starts on"
          hint="Used for weekly reviews."
          options={WEEKDAYS}
          defaultValue={String(defaults.weekStartsOn)}
          state={state}
        />
      </div>
      <SubmitButton pendingLabel="Saving…" className="sm:justify-self-start">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
