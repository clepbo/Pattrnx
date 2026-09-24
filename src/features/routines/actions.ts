"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { echoValues, fail, type FormState, formFields, validationFailure } from "@/lib/action-result";
import { requireUser } from "@/server/auth";
import * as routines from "@/server/services/routines";

import { routineSchema } from "./schemas";

const FIELDS = ["name", "goalId", "activityTypeId", "preferredTime", "normalMinutes", "minimumMinutes", "fallbackDescription", "steps"];

function readForm(formData: FormData) {
  const raw = formFields(formData, FIELDS);
  const days = formData.getAll("daysOfWeek").map(String);
  return { raw, input: { ...raw, daysOfWeek: days }, echo: { ...raw, daysOfWeek: days.join(",") } };
}

function refresh(routineId?: string) {
  revalidatePath("/routines");
  if (routineId) revalidatePath(`/routines/${routineId}`);
  revalidatePath("/today");
  revalidatePath("/goals", "layout");
}

export async function createRoutine(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const { input, echo } = readForm(formData);
  const parsed = routineSchema.safeParse(input);
  if (!parsed.success) return echoValues(validationFailure(parsed.error.flatten().fieldErrors), echo);

  const result = await routines.createRoutine(user, parsed.data);
  if (!result.ok) return echoValues(result, echo);
  refresh();
  redirect(`/routines/${result.data.id}`);
}

export async function updateRoutine(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = z.uuid().safeParse(formData.get("routineId"));
  if (!id.success) return fail("not_found", "We couldn't find that routine.");
  const { input, echo } = readForm(formData);
  const parsed = routineSchema.safeParse(input);
  if (!parsed.success) return echoValues(validationFailure(parsed.error.flatten().fieldErrors), echo);

  const result = await routines.updateRoutine(user, id.data, parsed.data);
  if (!result.ok) return echoValues(result, echo);
  refresh(id.data);
  redirect(`/routines/${id.data}?saved=1`);
}

const commandSchema = z.object({ routineId: z.uuid(), command: z.enum(["pause", "resume", "archive"]) });

export async function routineCommand(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = commandSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { routineId, command } = parsed.data;

  if (command === "archive") {
    await routines.archiveRoutine(user, routineId);
    refresh(routineId);
    redirect("/routines");
  }
  await routines.setRoutinePaused(user, routineId, command === "pause");
  refresh(routineId);
}
