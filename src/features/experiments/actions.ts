"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { echoValues, type FormState, formFields, validationFailure } from "@/lib/action-result";
import { requireUser } from "@/server/auth";
import { abandonExperiment, completeExperiment, startExperiment } from "@/server/services/experiments";

import { completeExperimentSchema, startExperimentSchema } from "./schemas";

const FIELDS = [
  "title",
  "hypothesis",
  "category",
  "description",
  "metric",
  "routineId",
  "activityTypeId",
  "direction",
  "durationDays",
  "goalId",
  "patternId",
] as const;

function refresh() {
  revalidatePath("/experiments", "layout");
  revalidatePath("/today");
  revalidatePath("/goals", "layout");
  revalidatePath("/patterns");
}

export async function startExperimentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = formFields(formData, FIELDS);
  const parsed = startExperimentSchema.safeParse(raw);
  if (!parsed.success) return echoValues(validationFailure(parsed.error.flatten().fieldErrors), raw);

  const { routineId, activityTypeId, metric, ...rest } = parsed.data;
  const result = await startExperiment(user, {
    ...rest,
    metric,
    // Completion is measured on a routine (or all tasks); activity metrics on one activity type.
    subject: metric === "task_completion_rate" ? { routineId: routineId ?? undefined } : { activityTypeId: activityTypeId ?? undefined },
  });
  if (!result.ok) return echoValues(result, raw);
  refresh();
  redirect(`/experiments/${result.data.id}?started=1`);
}

export async function completeExperimentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = formFields(formData, ["experimentId", "outcome", "reflection"]);
  const parsed = completeExperimentSchema.safeParse(raw);
  if (!parsed.success) return echoValues(validationFailure(parsed.error.flatten().fieldErrors), raw);
  const result = await completeExperiment(user, parsed.data.experimentId, parsed.data);
  if (!result.ok) return echoValues(result, raw);
  refresh();
  redirect(`/experiments/${parsed.data.experimentId}`);
}

const abandonSchema = z.object({ experimentId: z.uuid() });

export async function abandonExperimentAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = abandonSchema.safeParse({ experimentId: formData.get("experimentId") });
  if (!parsed.success) return;
  const reflection = String(formData.get("reflection") ?? "").trim().slice(0, 2000) || null;
  await abandonExperiment(user, parsed.data.experimentId, reflection);
  refresh();
}

