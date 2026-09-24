"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/action-result";

type AnyFormState = FormState<unknown>;

function fieldErrors(state: AnyFormState, name: string): string[] | undefined {
  return state && !state.ok ? state.error.fields?.[name] : undefined;
}

function useFieldA11y(id: string, hint: string | undefined, errors: string[] | undefined) {
  const describedBy = [hint && `${id}-hint`, errors && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return { "aria-invalid": errors ? true : undefined, "aria-describedby": describedBy } as const;
}

function FieldMessages({ id, hint, errors }: { id: string; hint?: string; errors?: string[] }) {
  return (
    <>
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
    </>
  );
}

type Common = { name: string; label: string; state: AnyFormState; hint?: string; id?: string };

/** Labelled input with its validation message wired up for screen readers. */
export function Field({ name, label, state, hint, id = name, defaultValue, ...inputProps }: Common & React.ComponentProps<typeof Input>) {
  const errors = fieldErrors(state, name);
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} defaultValue={state?.values?.[name] ?? defaultValue} {...useFieldA11y(id, hint, errors)} {...inputProps} />
      <FieldMessages id={id} hint={hint} errors={errors} />
    </div>
  );
}

export function TextareaField({ name, label, state, hint, id = name, defaultValue, ...props }: Common & React.ComponentProps<typeof Textarea>) {
  const errors = fieldErrors(state, name);
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} name={name} defaultValue={state?.values?.[name] ?? defaultValue} {...useFieldA11y(id, hint, errors)} {...props} />
      <FieldMessages id={id} hint={hint} errors={errors} />
    </div>
  );
}

export function SelectField({
  name,
  label,
  state,
  hint,
  id = name,
  options,
  defaultValue,
  ...props
}: Common & { options: readonly { value: string; label: string }[] } & Omit<React.ComponentProps<"select">, "size">) {
  const errors = fieldErrors(state, name);
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect id={id} name={name} defaultValue={state?.values?.[name] ?? defaultValue} {...useFieldA11y(id, hint, errors)} {...props}>
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <FieldMessages id={id} hint={hint} errors={errors} />
    </div>
  );
}

/** A checkbox in a full-width, 44 px-tall label row. Submits `value` when checked. */
export function CheckboxRow({
  name,
  value,
  label,
  description,
  defaultChecked,
  id = `${name}-${value}`,
}: {
  name: string;
  value: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
  id?: string;
}) {
  return (
    <label htmlFor={id} className="hover:bg-muted flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-2">
      <Checkbox id={id} name={name} value={value} defaultChecked={defaultChecked} />
      <span className="grid gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        {description && <span className="text-muted-foreground text-xs">{description}</span>}
      </span>
    </label>
  );
}

/** Form-level error (not tied to a single field). */
export function FormError({ state }: { state: AnyFormState }) {
  if (!state || state.ok || state.error.code === "validation") return null;
  return (
    <p role="alert" className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
      {state.error.message}
    </p>
  );
}

export function SubmitButton({
  children,
  pendingLabel,
  className = "w-full",
  ...props
}: { children: React.ReactNode; pendingLabel: string } & Omit<React.ComponentProps<typeof Button>, "type">) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className={className} disabled={pending} aria-disabled={pending} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
