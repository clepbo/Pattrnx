"use client";

import { useState } from "react";

import { Field, FormError, SelectField, SubmitButton } from "@/components/form/fields";
import { stateKey } from "@/components/form/state-key";
import { useIdempotentAction } from "@/components/form/use-idempotent-action";
import type { FormState } from "@/lib/action-result";

import { logActivityAction } from "../actions";

export interface LoggableType {
  id: string;
  name: string;
  unit: string | null;
  area: string | null;
}

interface LogActivityFormProps {
  types: LoggableType[];
  goals: { id: string; title: string }[];
  today: string;
  defaultTypeId?: string;
}

export function LogActivityForm(props: LogActivityFormProps) {
  const [state, action] = useIdempotentAction(logActivityAction);
  if (props.types.length === 0) return <p className="text-muted-foreground text-sm">Add an activity type first.</p>;
  return (
    <form id="log-form" action={action} className="grid gap-4" noValidate>
      <LogActivityFields key={stateKey(state)} state={state} {...props} />
    </form>
  );
}

function LogActivityFields({ state, types, goals, today, defaultTypeId }: LogActivityFormProps & { state: FormState }) {
  const [typeId, setTypeId] = useState(state?.values?.activityTypeId ?? defaultTypeId ?? types[0]?.id ?? "");
  const selected = types.find((t) => t.id === typeId);

  return (
    <>
      <FormError state={state} />
      {state?.ok && (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
          Logged.
        </p>
      )}
      <SelectField
        name="activityTypeId"
        label="What did you do?"
        options={types.map((t) => ({ value: t.id, label: t.area ? `${t.name} (${t.area})` : t.name }))}
        value={typeId}
        onChange={(event) => setTypeId(event.target.value)}
        state={state}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="date" label="Date" type="date" max={today} hint="Leave empty for now." state={state} />
        <Field name="time" label="Time" type="time" state={state} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="durationMinutes" label="Minutes (optional)" inputMode="numeric" state={state} />
        <Field
          name="quantity"
          label={selected?.unit ? `Amount in ${selected.unit} (optional)` : "Amount (optional)"}
          inputMode="decimal"
          state={state}
        />
      </div>
      <input type="hidden" name="unit" value={selected?.unit ?? ""} />
      <SelectField
        name="goalId"
        label="Towards a goal (optional)"
        options={[{ value: "", label: "None" }, ...goals.map((g) => ({ value: g.id, label: g.title }))]}
        state={state}
      />
      <Field name="note" label="Note (optional)" maxLength={2000} state={state} />
      <SubmitButton pendingLabel="Logging…" className="sm:justify-self-start">
        Log activity
      </SubmitButton>
    </>
  );
}
