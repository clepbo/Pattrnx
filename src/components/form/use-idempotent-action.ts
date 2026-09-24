"use client";

import { useActionState, useRef } from "react";

import type { FormState } from "@/lib/action-result";

/**
 * `useActionState` that stamps each logical submission with an `id` field.
 * Retries after a failure reuse the id (so a lost response can't double-log);
 * a success clears it so the next submission gets a new one.
 */
export function useIdempotentAction(action: (prev: FormState, formData: FormData) => Promise<FormState>) {
  const idRef = useRef<string | null>(null);
  return useActionState(async (prev: FormState, formData: FormData) => {
    idRef.current ??= crypto.randomUUID();
    formData.set("id", idRef.current);
    const result = await action(prev, formData);
    if (result?.ok) idRef.current = null;
    return result;
  }, null);
}
