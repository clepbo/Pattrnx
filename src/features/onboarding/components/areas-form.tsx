"use client";

import { useActionState } from "react";

import { CheckboxRow, Field, FormError, SubmitButton } from "@/components/form/fields";

import { saveOnboardingAreas } from "../actions";
import { DEFAULT_LIFE_AREAS, starterKey } from "../catalog";

export function AreasForm() {
  const [state, action] = useActionState(saveOnboardingAreas, null);
  const areaError = state && !state.ok ? state.error.fields?.areas?.[0] : undefined;

  return (
    <form action={action} className="grid gap-6" noValidate>
      <FormError state={state} />
      <fieldset className="grid gap-4" aria-describedby={areaError ? "areas-error" : undefined}>
        <legend className="mb-2 text-sm font-medium">Areas and the activities you want to track in them</legend>
        {areaError && (
          <p id="areas-error" className="text-destructive text-sm">
            {areaError}
          </p>
        )}
        {DEFAULT_LIFE_AREAS.map((area) => (
          <div key={area.name} className="border-border rounded-xl border p-2">
            <CheckboxRow name="areas" value={area.name} label={area.name} defaultChecked={area.preselected} />
            <div className="grid gap-0.5 pl-7" role="group" aria-label={`${area.name} activities`}>
              {area.starters.map((starter) => (
                <CheckboxRow
                  key={starter.name}
                  name="starters"
                  value={starterKey(area.name, starter.name)}
                  label={starter.name}
                  description={starter.polarity === "undesired" ? "Something you'd like to do less of" : undefined}
                  defaultChecked={area.preselected}
                />
              ))}
            </div>
          </div>
        ))}
      </fieldset>
      <Field
        name="customAreas"
        label="Add your own areas (optional)"
        hint="Separate names with commas, e.g. Side business, Community."
        state={state}
      />
      <p className="text-muted-foreground text-xs">
        Activities appear as one-tap buttons for logging. You can rename, add or archive them any time.
      </p>
      <SubmitButton pendingLabel="Saving…">Continue</SubmitButton>
    </form>
  );
}
