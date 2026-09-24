"use client";

import { useActionState } from "react";

import { Field, FormError, SelectField, SubmitButton } from "@/components/form/fields";

import { addAction, addMilestone, addStrategy, logOutcome, scheduleAction } from "../actions";

/** Small inline forms used on the goal page. Each resets after a successful submit. */

export function AddStrategyForm({ goalId }: { goalId: string }) {
  const [state, action] = useActionState(addStrategy, null);
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end" noValidate>
      <input type="hidden" name="goalId" value={goalId} />
      <Field id="strategy-description" name="description" label="Add an approach" state={state} />
      <SubmitButton pendingLabel="Adding…" variant="outline" className="sm:w-auto">
        Add
      </SubmitButton>
      <div className="sm:col-span-2">
        <FormError state={state} />
      </div>
    </form>
  );
}

export function AddMilestoneForm({ goalId }: { goalId: string }) {
  const [state, action] = useActionState(addMilestone, null);
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[2fr_1fr_auto] sm:items-end" noValidate>
      <input type="hidden" name="goalId" value={goalId} />
      <Field id="milestone-title" name="title" label="New milestone" state={state} />
      <Field id="milestone-date" name="targetDate" label="Target date (optional)" type="date" state={state} />
      <SubmitButton pendingLabel="Adding…" variant="outline" className="sm:w-auto">
        Add milestone
      </SubmitButton>
      <div className="sm:col-span-3">
        <FormError state={state} />
      </div>
    </form>
  );
}

export function AddActionForm({
  goalId,
  milestones,
  activityTypes,
}: {
  goalId: string;
  milestones: { id: string; title: string }[];
  activityTypes: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(addAction, null);
  return (
    <form action={action} className="grid gap-3" noValidate>
      <input type="hidden" name="goalId" value={goalId} />
      <Field id="action-title" name="title" label="New action" hint="Something concrete, e.g. Write the problem statement." state={state} />
      <div className="grid gap-3 sm:grid-cols-3">
        <SelectField
          id="action-milestone"
          name="milestoneId"
          label="Milestone"
          options={[{ value: "", label: "None" }, ...milestones.map((m) => ({ value: m.id, label: m.title }))]}
          state={state}
        />
        <SelectField
          id="action-type"
          name="activityTypeId"
          label="Logs as"
          hint="Recorded when you complete it."
          options={[{ value: "", label: "Nothing" }, ...activityTypes.map((t) => ({ value: t.id, label: t.name }))]}
          state={state}
        />
        <Field id="action-minutes" name="estimatedMinutes" label="Minutes (optional)" inputMode="numeric" state={state} />
      </div>
      <FormError state={state} />
      <SubmitButton pendingLabel="Adding…" variant="outline" className="sm:justify-self-start">
        Add action
      </SubmitButton>
    </form>
  );
}

export function ScheduleActionForm({
  goalId,
  actionId,
  defaultDate,
  rescheduling,
}: {
  goalId: string;
  actionId: string;
  defaultDate: string;
  rescheduling: boolean;
}) {
  const [state, action] = useActionState(scheduleAction, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2" noValidate>
      <input type="hidden" name="goalId" value={goalId} />
      <input type="hidden" name="actionId" value={actionId} />
      <Field id={`schedule-${actionId}`} name="date" label={rescheduling ? "Move to" : "Plan for"} type="date" defaultValue={defaultDate} state={state} />
      <SubmitButton pendingLabel="Saving…" variant="outline" className="w-auto">
        {rescheduling ? "Move" : "Schedule"}
      </SubmitButton>
      <FormError state={state} />
    </form>
  );
}

export function LogOutcomeForm({ goalId, today, unit, numeric }: { goalId: string; today: string; unit: string | null; numeric: boolean }) {
  const [state, action] = useActionState(logOutcome, null);
  return (
    <form action={action} className="grid gap-3" noValidate>
      <input type="hidden" name="goalId" value={goalId} />
      <div className="grid gap-3 sm:grid-cols-3">
        {numeric && (
          <Field
            id="outcome-value"
            name="value"
            label={unit ? `Amount (${unit})` : "Amount"}
            inputMode="decimal"
            state={state}
          />
        )}
        <Field id="outcome-date" name="date" label="Date" type="date" defaultValue={today} max={today} state={state} />
        <Field id="outcome-note" name="description" label="Note (optional)" state={state} />
      </div>
      <FormError state={state} />
      <SubmitButton pendingLabel="Saving…" variant="outline" className="sm:justify-self-start">
        Log progress
      </SubmitButton>
    </form>
  );
}
