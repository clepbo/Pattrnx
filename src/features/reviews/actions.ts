"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requiredDate } from "@/features/goals/schemas";
import { echoValues, type FormState, formFields, ok, validationFailure } from "@/lib/action-result";
import { requireUser } from "@/server/auth";
import { regenerateReview, saveReflection } from "@/server/services/reviews";

const reflectionSchema = z.object({
  periodStart: requiredDate,
  reflection: z
    .string()
    .trim()
    .max(4000, { error: "Keep it under 4000 characters." })
    .transform((v) => v || null),
  usefulness: z
    .string()
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(z.number().int().min(1).max(5).nullable()),
});

export async function saveReflectionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = formFields(formData, ["periodStart", "reflection", "usefulness"]);
  const parsed = reflectionSchema.safeParse(raw);
  if (!parsed.success) return echoValues(validationFailure(parsed.error.flatten().fieldErrors), raw);
  const { periodStart, reflection, usefulness } = parsed.data;
  const result = await saveReflection(user, periodStart, { reflection, usefulness });
  revalidatePath(`/reviews/${periodStart}`);
  return result.ok ? ok(null) : echoValues(result, raw);
}

export async function regenerateReviewAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const date = requiredDate.safeParse(formData.get("periodStart"));
  if (!date.success) return;
  await regenerateReview(user, date.data);
  revalidatePath(`/reviews/${date.data}`);
}

