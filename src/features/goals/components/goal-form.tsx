"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Field, FormError, SelectField, SubmitButton, TextareaField } from "@/components/form/fields";
import { stateKey } from "@/components/form/state-key";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/action-result";

type MeasurementType = "cumulative" | "level" | "milestone";

const MEASUREMENT_OPTIONS: { value: MeasurementType; label: string; description: string }[] = [
  { value: "cumulative", label: "A number that adds up", description: "Money saved, pages written, applications sent." },
  { value: "level", label: "A number I track", description: "Weight, typing speed, a test score. It can go up or down." },
  { value: "milestone", label: "Milestones", description: "A qualitative goal, e.g. becoming a product designer." },
];

const PRIORITIES = [
  { value: "1", label: "High" },
  { value: "2", label: "Normal" },
  { value: "3", label: "Low" },
];

const PERIODS = [
  { value: "", label: "Per…" },
  { value: "day", label: "per day" },
  { value: "week", label: "per week" },
  { value: "month", label: "per month" },
];

export interface GoalFormDefaults {
  goalId?: string;
  title?: string;
  lifeAreaId?: string;
  measurementType?: MeasurementType;
  unit?: string;
  baselineValue?: string;
  targetValue?: string;
  deadline?: string;
  plannedPaceAmount?: string;
  plannedPacePeriod?: string;
  motivation?: string;
  priority?: string;
}

type GoalFormProps = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  areas: { id: string; name: string }[];
  defaults?: GoalFormDefaults;
  currency: string;
  mode: "create" | "edit";
  cancelHref: string;
};

export function GoalForm({ action, ...props }: GoalFormProps) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <GoalFormBody key={stateKey(state)} state={state} {...props} />
    </form>
  );
}

function GoalFormBody({
  state,
  areas,
  defaults = {},
  currency,
  mode,
  cancelHref,
}: {
  state: FormState;
  areas: { id: string; name: string }[];
  defaults?: GoalFormDefaults;
  currency: string;
  mode: "create" | "edit";
  cancelHref: string;
}) {
  const [measurement, setMeasurement] = useState<MeasurementType>(
    (state?.values?.measurementType as MeasurementType | undefined) ?? defaults.measurementType ?? "cumulative",
  );
  const numeric = measurement !== "milestone";

  return (
    <>
      <FormError state={state} />
      {defaults.goalId && <input type="hidden" name="goalId" value={defaults.goalId} />}

      <Field name="title" label="What do you want to achieve?" required maxLength={120} defaultValue={defaults.title} state={state} />
      <SelectField
        name="lifeAreaId"
        label="Life area"
        options={areas.map((a) => ({ value: a.id, label: a.name }))}
        defaultValue={defaults.lifeAreaId ?? areas[0]?.id}
        state={state}
      />

      {mode === "create" ? (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">How will you measure progress?</legend>
          {MEASUREMENT_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="border-border has-checked:border-primary has-checked:ring-1 has-checked:ring-primary flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3"
            >
              <input
                type="radio"
                name="measurementType"
                value={option.value}
                checked={measurement === option.value}
                onChange={() => setMeasurement(option.value)}
                className="mt-1"
              />
              <span className="grid gap-0.5">
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-muted-foreground text-xs">{option.description}</span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : (
        <input type="hidden" name="measurementType" value={measurement} />
      )}

      {numeric && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            name="unit"
            label="Unit"
            hint={`e.g. ${currency}, kg, pages`}
            defaultValue={defaults.unit ?? (measurement === "cumulative" ? currency : "")}
            maxLength={20}
            state={state}
          />
          <Field name="baselineValue" label="Where you are now" inputMode="decimal" defaultValue={defaults.baselineValue} state={state} />
          <Field name="targetValue" label="Target" inputMode="decimal" defaultValue={defaults.targetValue} state={state} />
        </div>
      )}

      <Field
        name="deadline"
        label="Deadline (optional)"
        type="date"
        hint="Without a deadline, Pattrnx can't check whether you're on pace."
        defaultValue={defaults.deadline}
        state={state}
      />

      {numeric && (
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field
            name="plannedPaceAmount"
            label="How much do you plan to add? (optional)"
            inputMode="decimal"
            hint="Your intended pace, e.g. 150,000 per month."
            defaultValue={defaults.plannedPaceAmount}
            state={state}
          />
          <SelectField name="plannedPacePeriod" label="Per" options={PERIODS} defaultValue={defaults.plannedPacePeriod ?? ""} state={state} />
        </div>
      )}

      {mode === "create" && (
        <TextareaField
          name="strategy"
          label="How do you intend to get there? (optional)"
          hint="One approach per line, e.g. Save monthly. Cut weekend spending."
          rows={4}
          state={state}
        />
      )}

      <TextareaField name="motivation" label="Why does this matter to you? (optional)" rows={2} defaultValue={defaults.motivation} state={state} />
      <SelectField name="priority" label="Priority" options={PRIORITIES} defaultValue={defaults.priority ?? "2"} state={state} />

      <div className="flex flex-wrap gap-3">
        <SubmitButton pendingLabel="Saving…" className="w-full sm:w-auto">
          {mode === "create" ? "Create goal" : "Save changes"}
        </SubmitButton>
        <Button asChild variant="ghost" className="w-full sm:w-auto">
          <Link href={cancelHref}>{mode === "create" ? "Skip for now" : "Cancel"}</Link>
        </Button>
      </div>
    </>
  );
}
