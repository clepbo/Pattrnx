"use client";

import { useActionState } from "react";

import { Field, FormError, SubmitButton } from "@/components/form/fields";
import { Button } from "@/components/ui/button";

import { addLifeArea, renameArea, toggleAreaArchived } from "../actions";

export interface AreaRow {
  id: string;
  name: string;
  archived: boolean;
}

function AreaItem({ area }: { area: AreaRow }) {
  const [state, action] = useActionState(renameArea, null);

  return (
    <li className="border-border grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <form action={action} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end" noValidate>
        <input type="hidden" name="id" value={area.id} />
        <Field id={`area-${area.id}`} name="name" label={area.archived ? `${area.name} (archived)` : "Name"} defaultValue={area.name} state={state} />
        <SubmitButton pendingLabel="Saving…" variant="outline" className="sm:w-auto">
          Rename
        </SubmitButton>
        <div className="sm:col-span-2">
          <FormError state={state} />
        </div>
      </form>
      <form action={toggleAreaArchived}>
        <input type="hidden" name="id" value={area.id} />
        <input type="hidden" name="archive" value={String(!area.archived)} />
        <Button type="submit" variant="ghost" className="w-full sm:w-auto">
          {area.archived ? "Restore" : "Archive"}
        </Button>
      </form>
    </li>
  );
}

export function LifeAreasManager({ areas }: { areas: AreaRow[] }) {
  const [state, action] = useActionState(addLifeArea, null);

  return (
    <div className="grid gap-4">
      <ul className="grid gap-3">
        {areas.map((area) => (
          <AreaItem key={`${area.id}-${area.name}-${area.archived}`} area={area} />
        ))}
      </ul>
      <form action={action} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end" noValidate>
        <Field id="new-area" name="name" label="New area" state={state} />
        <SubmitButton pendingLabel="Adding…" className="sm:w-auto">
          Add area
        </SubmitButton>
        <div className="sm:col-span-2">
          <FormError state={state} />
        </div>
      </form>
      <p className="text-muted-foreground text-xs">Archived areas stay on past activities but disappear from pickers.</p>
    </div>
  );
}
