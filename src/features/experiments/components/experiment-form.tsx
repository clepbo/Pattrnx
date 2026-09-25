"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Field, FormError, SelectField, SubmitButton, TextareaField } from "@/components/form/fields";
import { stateKey } from "@/components/form/state-key";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/action-result";

import { startExperimentAction } from "../actions";
import { CATEGORIES, METRICS } from "../schemas";

export interface ExperimentFormDefaults {
  title?: string;
  hypothesis?: string;
  category?: string;
  description?: string;
  metric?: string;
  routineId?: string;
  activityTypeId?: string;
  direction?: string;
  durationDays?: string;
  goalId?: string;
  patternId?: string;
}

interface Options {
  routines: { id: string; name: string }[];
  activityTypes: { id: string; name: string }[];
  goals: { id: string; title: string }[];
}

function Fields({ state, defaults, routines, activityTypes, goals }: { state: FormState; defaults: ExperimentFormDefaults } & Options) {
  const [metric, setMetric] = useState(state?.values?.metric ?? defaults.metric ?? "task_completion_rate");

  return (
    <>
      <FormError state={state} />
      {defaults.patternId && <input type="hidden" name="patternId" value={defaults.patternId} />}
      {!defaults.patternId && <input type="hidden" name="patternId" value="" />}
      <Field name="title" label="Name" maxLength={120} defaultValue={defaults.title} state={state} />
      <TextareaField
        name="hypothesis"
        label="What do you expect?"
        hint="A prediction you can check, e.g. Shorter sessions will get done more often."
        rows={2}
        defaultValue={defaults.hypothesis}
        state={state}
      />
      <TextareaField name="description" label="What will you do differently?" rows={2} defaultValue={defaults.description} state={state} />
      <SelectField name="category" label="Kind of change" options={CATEGORIES} defaultValue={defaults.category ?? "reduce"} state={state} />

      <fieldset className="border-border grid gap-4 rounded-xl border p-3">
        <legend className="px-1 text-sm font-medium">How you&apos;ll measure it</legend>
        <SelectField name="metric" label="Measure" options={METRICS} value={metric} onChange={(e) => setMetric(e.target.value)} state={state} />
        {metric === "task_completion_rate" ? (
          <SelectField
            name="routineId"
            label="Which tasks"
            options={[{ value: "", label: "All planned tasks" }, ...routines.map((r) => ({ value: r.id, label: `Routine: ${r.name}` }))]}
            defaultValue={defaults.routineId ?? ""}
            state={state}
          />
        ) : (
          <SelectField
            name="activityTypeId"
            label="Which activity"
            options={[{ value: "", label: "Choose…" }, ...activityTypes.map((t) => ({ value: t.id, label: t.name }))]}
            defaultValue={defaults.activityTypeId ?? ""}
            state={state}
          />
        )}
        <SelectField
          name="direction"
          label="You want it to"
          options={[
            { value: "increase", label: "Go up" },
            { value: "decrease", label: "Go down" },
          ]}
          defaultValue={defaults.direction ?? "increase"}
          state={state}
        />
        <p className="text-muted-foreground text-xs">
          The same measure over the same number of days before you start is used as the comparison.
        </p>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="durationDays"
          label="Length (days)"
          type="number"
          min={7}
          max={42}
          hint="7 to 42 days."
          defaultValue={defaults.durationDays ?? "14"}
          state={state}
        />
        <SelectField
          name="goalId"
          label="Goal (optional)"
          hint="One active experiment per goal."
          options={[{ value: "", label: "None" }, ...goals.map((g) => ({ value: g.id, label: g.title }))]}
          defaultValue={defaults.goalId ?? ""}
          state={state}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <SubmitButton pendingLabel="Starting…" className="w-full sm:w-auto">
          Start experiment
        </SubmitButton>
        <Button asChild variant="ghost" className="w-full sm:w-auto">
          <Link href="/experiments">Cancel</Link>
        </Button>
      </div>
    </>
  );
}

export function ExperimentForm({ defaults = {}, ...options }: { defaults?: ExperimentFormDefaults } & Options) {
  const [state, action] = useActionState(startExperimentAction, null);
  return (
    <form action={action} className="grid gap-5" noValidate>
      <Fields key={stateKey(state)} state={state} defaults={defaults} {...options} />
    </form>
  );
}
