"use client";

import Link from "next/link";
import { useActionState } from "react";

import { CheckboxRow, Field, FormError, SelectField, SubmitButton, TextareaField } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/action-result";

// Monday first; values are Postgres/JS weekday numbers (0 = Sunday).
const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

export interface RoutineFormDefaults {
  routineId?: string;
  name?: string;
  goalId?: string;
  activityTypeId?: string;
  daysOfWeek?: number[];
  preferredTime?: string;
  normalMinutes?: string;
  minimumMinutes?: string;
  fallbackDescription?: string;
  steps?: string;
}

export function RoutineForm({
  action,
  goals,
  activityTypes,
  defaults = {},
  cancelHref,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  goals: { id: string; title: string }[];
  activityTypes: { id: string; name: string }[];
  defaults?: RoutineFormDefaults;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const echoedDays = state?.values?.daysOfWeek;
  const days = echoedDays !== undefined ? echoedDays.split(",").filter(Boolean).map(Number) : (defaults.daysOfWeek ?? [1, 2, 3, 4, 5]);
  const dayError = state && !state.ok ? state.error.fields?.daysOfWeek?.[0] : undefined;

  if (activityTypes.length === 0) {
    return (
      <p className="text-sm">
        A routine logs an activity when you complete it, and you don&apos;t have any activity types yet.{" "}
        <Link href="/log/types" className="underline underline-offset-4">
          Add one first
        </Link>
        .
      </p>
    );
  }

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <FormError state={state} />
      {defaults.routineId && <input type="hidden" name="routineId" value={defaults.routineId} />}
      <Field name="name" label="Name" hint="e.g. Morning design practice" maxLength={80} defaultValue={defaults.name} state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="activityTypeId"
          label="Logs as"
          hint="Recorded each time you complete it."
          options={activityTypes.map((t) => ({ value: t.id, label: t.name }))}
          defaultValue={defaults.activityTypeId}
          state={state}
        />
        <SelectField
          name="goalId"
          label="Goal (optional)"
          options={[{ value: "", label: "None" }, ...goals.map((g) => ({ value: g.id, label: g.title }))]}
          defaultValue={defaults.goalId ?? ""}
          state={state}
        />
      </div>

      <fieldset className="grid gap-2" aria-describedby={dayError ? "days-error" : undefined}>
        <legend className="mb-2 text-sm font-medium">Days</legend>
        <div className="grid grid-cols-4 gap-1 sm:grid-cols-7">
          {/* Keyed on the day set so the checkboxes re-read their defaults after a failed submit. */}
          {DAYS.map((day) => (
            <CheckboxRow key={`${day.value}-${days.join()}`} name="daysOfWeek" value={String(day.value)} label={day.label} defaultChecked={days.includes(day.value)} />
          ))}
        </div>
        {dayError && (
          <p id="days-error" className="text-destructive text-sm">
            {dayError}
          </p>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="preferredTime" label="Time (optional)" type="time" defaultValue={defaults.preferredTime} state={state} />
        <Field name="normalMinutes" label="Usual length (min)" inputMode="numeric" defaultValue={defaults.normalMinutes ?? "30"} state={state} />
        <Field
          name="minimumMinutes"
          label="Minimum version (min)"
          inputMode="numeric"
          hint="The smallest version that still counts."
          defaultValue={defaults.minimumMinutes}
          state={state}
        />
      </div>
      <Field
        name="fallbackDescription"
        label="What the minimum version looks like (optional)"
        hint="e.g. One 15-minute exercise instead of a full session."
        defaultValue={defaults.fallbackDescription}
        state={state}
      />
      <TextareaField name="steps" label="Steps (optional)" hint="One per line." rows={3} defaultValue={defaults.steps} state={state} />

      <div className="flex flex-wrap gap-3">
        <SubmitButton pendingLabel="Saving…" className="w-full sm:w-auto">
          {defaults.routineId ? "Save changes" : "Create routine"}
        </SubmitButton>
        <Button asChild variant="ghost" className="w-full sm:w-auto">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
      {defaults.routineId && (
        <p className="text-muted-foreground text-xs">Changes apply from today. Past days keep the plan they had.</p>
      )}
    </form>
  );
}
