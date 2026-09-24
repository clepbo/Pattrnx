"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { AuthFormState } from "../actions";

type FieldProps = React.ComponentProps<typeof Input> & {
  name: string;
  label: string;
  state: AuthFormState;
  hint?: string;
};

/** Labelled input with its validation message wired up for screen readers. */
export function Field({ name, label, state, hint, id = name, ...inputProps }: FieldProps) {
  const errors = state && !state.ok ? state.error.fields?.[name] : undefined;
  const describedBy = [hint && `${id}-hint`, errors && `${id}-error`].filter(Boolean).join(" ") || undefined;

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        aria-invalid={errors ? true : undefined}
        aria-describedby={describedBy}
        defaultValue={state?.values?.[name]}
        {...inputProps}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
      {errors && (
        <p id={`${id}-error`} className="text-destructive text-sm">
          {errors[0]}
        </p>
      )}
    </div>
  );
}

/** Form-level error (not tied to a single field). */
export function FormError({ state }: { state: AuthFormState }) {
  if (!state || state.ok || state.error.code === "validation") return null;
  return (
    <p role="alert" className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
      {state.error.message}
    </p>
  );
}

export function SubmitButton({ children, pendingLabel }: { children: React.ReactNode; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending} aria-disabled={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
