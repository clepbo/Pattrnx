"use client";

import { useActionState } from "react";

import { Field, FormError, SubmitButton } from "@/components/form/fields";

import { saveCheckinAction } from "../actions";

const SCALES = [
  { name: "energy", label: "Energy", low: "Drained", high: "Energised" },
  { name: "mood", label: "Mood", low: "Low", high: "Great" },
  { name: "stress", label: "Stress", low: "Calm", high: "Very stressed" },
  { name: "workload", label: "Workload", low: "Light", high: "Heavy" },
] as const;

export interface CheckinValues {
  sleepHours: string;
  energy: string;
  mood: string;
  stress: string;
  workload: string;
  note: string;
}

function Scale({ name, label, low, high, value }: { name: string; label: string; low: string; high: string; value: string }) {
  return (
    <fieldset className="grid gap-1">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground w-20 text-xs">{low}</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className="border-border has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground flex size-11 cursor-pointer items-center justify-center rounded-lg border text-sm"
          >
            <input type="radio" name={name} value={n} defaultChecked={value === String(n)} className="sr-only" />
            {n}
            <span className="sr-only">{n === 1 ? ` (${low})` : n === 5 ? ` (${high})` : ""}</span>
          </label>
        ))}
        <span className="text-muted-foreground w-20 text-right text-xs">{high}</span>
      </div>
    </fieldset>
  );
}

/** Every field is optional (PRD F8): skipping never blocks anything. */
export function CheckinForm({ date, values }: { date: string; values: CheckinValues }) {
  const [state, action] = useActionState(saveCheckinAction, null);
  const current = { ...values, ...(state?.values ?? {}) } as CheckinValues;

  return (
    <form action={action} className="grid gap-4" noValidate>
      <input type="hidden" name="date" value={date} />
      <FormError state={state} />
      <Field name="sleepHours" label="Hours slept" inputMode="decimal" defaultValue={current.sleepHours} className="max-w-32" state={state} />
      {SCALES.map((scale) => (
        <Scale key={scale.name} {...scale} value={current[scale.name]} />
      ))}
      <Field name="note" label="Anything notable? (optional)" defaultValue={current.note} state={state} />
      {state?.ok && (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
          Check-in saved.
        </p>
      )}
      <SubmitButton pendingLabel="Saving…" variant="outline" className="sm:justify-self-start">
        Save check-in
      </SubmitButton>
    </form>
  );
}
