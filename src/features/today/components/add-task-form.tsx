"use client";

import { useActionState } from "react";

import { Field, FormError, SelectField, SubmitButton } from "@/components/form/fields";

import { addTask } from "../actions";

export function AddTaskForm({ today, goals }: { today: string; goals: { id: string; title: string }[] }) {
  const [state, action] = useActionState(addTask, null);
  return (
    <form action={action} className="grid gap-3" noValidate>
      <input type="hidden" name="date" value={today} />
      <Field id="task-title" name="title" label="Add a task for today" state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          id="task-goal"
          name="goalId"
          label="Goal (optional)"
          options={[{ value: "", label: "None" }, ...goals.map((g) => ({ value: g.id, label: g.title }))]}
          state={state}
        />
        <Field id="task-minutes" name="plannedMinutes" label="Minutes (optional)" inputMode="numeric" state={state} />
      </div>
      <FormError state={state} />
      <SubmitButton pendingLabel="Adding…" variant="outline" className="sm:justify-self-start">
        Add task
      </SubmitButton>
    </form>
  );
}
