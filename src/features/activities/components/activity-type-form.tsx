"use client";

import { useActionState } from "react";

import { CheckboxRow, Field, FormError, SelectField, SubmitButton } from "@/components/form/fields";

import { createActivityTypeAction } from "../actions";

const POLARITIES = [
  { value: "desired", label: "Something I want to do more of" },
  { value: "undesired", label: "Something I want to do less of" },
  { value: "neutral", label: "Neutral / just tracking" },
];

export function ActivityTypeForm({ areas, currency }: { areas: { id: string; name: string }[]; currency: string }) {
  const [state, action] = useActionState(createActivityTypeAction, null);
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormError state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Name" hint="e.g. Portfolio work, Gym, Takeaway food" maxLength={60} state={state} />
        <SelectField name="lifeAreaId" label="Life area" options={areas.map((a) => ({ value: a.id, label: a.name }))} state={state} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField name="polarity" label="This is…" options={POLARITIES} defaultValue="desired" state={state} />
        <Field name="defaultUnit" label="Amount unit (optional)" hint={`e.g. ${currency} for spending, km, pages`} maxLength={20} state={state} />
      </div>
      <CheckboxRow name="isQuickLog" value="on" label="Show as a one-tap button on Today" defaultChecked />
      <SubmitButton pendingLabel="Adding…" className="sm:justify-self-start">
        Add activity type
      </SubmitButton>
    </form>
  );
}
