"use client";

import Link from "next/link";

import { useIdempotentAction } from "@/components/form/use-idempotent-action";
import { Button } from "@/components/ui/button";

import { logActivityAction } from "../actions";

export interface QuickLogType {
  id: string;
  name: string;
  durationMinutes: number | null;
  /** Money-type activities need an amount, so they open the full form instead. */
  needsAmount: boolean;
}

function QuickLogButton({ type }: { type: QuickLogType }) {
  const [state, action, pending] = useIdempotentAction(logActivityAction);
  const logged = state?.ok === true;

  return (
    <form action={action}>
      <input type="hidden" name="activityTypeId" value={type.id} />
      <input type="hidden" name="durationMinutes" value={type.durationMinutes ?? ""} />
      {["date", "time", "quantity", "unit", "note", "goalId"].map((name) => (
        <input key={name} type="hidden" name={name} value="" />
      ))}
      <Button type="submit" variant="outline" disabled={pending} aria-disabled={pending}>
        {pending ? "Logging…" : logged ? `✓ ${type.name}` : type.name}
      </Button>
      {state && !state.ok && (
        <p role="alert" className="text-destructive mt-1 text-xs">
          {state.error.message}
        </p>
      )}
    </form>
  );
}

export function QuickLog({ types }: { types: QuickLogType[] }) {
  if (types.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Mark activity types as quick-log to get one-tap buttons here.{" "}
        <Link href="/log/types" className="underline underline-offset-4">
          Manage activity types
        </Link>
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-2" aria-live="polite">
      {types.map((type) =>
        type.needsAmount ? (
          <Button key={type.id} asChild variant="outline">
            <Link href={`/log?type=${type.id}#log-form`}>{type.name}…</Link>
          </Button>
        ) : (
          <QuickLogButton key={type.id} type={type} />
        ),
      )}
    </div>
  );
}
