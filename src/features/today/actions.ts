"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requiredDate } from "@/features/goals/schemas";
import { echoValues, fail, type FormState, formFields, ok, validationFailure } from "@/lib/action-result";
import { requireUser } from "@/server/auth";
import { addManualTask, deleteManualTask, setTaskStatus } from "@/server/services/tasks";

function refresh() {
  revalidatePath("/today");
  revalidatePath("/goals", "layout");
  revalidatePath("/routines", "layout");
  revalidatePath("/log");
}

const statusSchema = z.object({
  taskId: z.uuid(),
  status: z.enum(["planned", "done", "done_minimum", "skipped"]),
});

export async function updateTaskStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("not_found", "We couldn't find that task.");
  const result = await setTaskStatus(user, parsed.data.taskId, parsed.data.status);
  refresh();
  return result;
}

const manualTaskSchema = z.object({
  title: z.string().trim().min(1, { error: "Describe the task." }).max(120),
  goalId: z.union([z.uuid(), z.literal("").transform(() => null)]),
  date: requiredDate,
  plannedMinutes: z
    .string()
    .transform((raw) => (raw.trim() === "" ? null : Number(raw)))
    .pipe(z.number({ error: "Whole minutes, please." }).int().min(1).max(1440).nullable()),
});

export async function addTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = formFields(formData, ["title", "goalId", "date", "plannedMinutes"]);
  const parsed = manualTaskSchema.safeParse(raw);
  if (!parsed.success) return echoValues(validationFailure(parsed.error.flatten().fieldErrors), raw);
  const result = await addManualTask(user, parsed.data);
  refresh();
  return result.ok ? ok(null) : echoValues(result, raw);
}

export async function removeTask(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = z.uuid().safeParse(formData.get("taskId"));
  if (!id.success) return;
  await deleteManualTask(user, id.data);
  refresh();
}
