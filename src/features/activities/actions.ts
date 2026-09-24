"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { echoValues, fail, type FormState, formFields, ok, validationFailure } from "@/lib/action-result";
import { addDays, todayIn, zonedDateTimeToInstant } from "@/lib/dates";
import { requireUser } from "@/server/auth";
import { deleteActivity, logActivity } from "@/server/services/activities";
import { createActivityType, updateActivityType } from "@/server/services/activity-types";
import { saveCheckin } from "@/server/services/checkins";
import { getProfile } from "@/server/services/profile";

import { activityTypeSchema, checkinSchema, logActivitySchema } from "./schemas";

function refresh() {
  revalidatePath("/today");
  revalidatePath("/log", "layout");
  revalidatePath("/goals", "layout");
}

export async function logActivityAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = formFields(formData, ["id", "activityTypeId", "date", "time", "durationMinutes", "quantity", "unit", "note", "goalId"]);
  const parsed = logActivitySchema.safeParse(raw);
  if (!parsed.success) return echoValues(validationFailure(parsed.error.flatten().fieldErrors), raw);

  const { timezone } = await getProfile(user);
  const { date, time } = parsed.data;
  const occurredAt = date ? zonedDateTimeToInstant(date, time ?? "12:00", timezone) : new Date();
  if (date && date > todayIn(timezone)) {
    return echoValues(validationFailure({ date: ["Choose today or an earlier date."] }), raw);
  }

  const result = await logActivity(user, { ...parsed.data, occurredAt: occurredAt.toISOString() });
  refresh();
  return result.ok ? ok(null) : echoValues(result, raw);
}

export async function removeActivity(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  await deleteActivity(user, id.data);
  refresh();
}

export async function saveCheckinAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = formFields(formData, ["date", "sleepHours", "energy", "mood", "stress", "workload", "note"]);
  const parsed = checkinSchema.safeParse(raw);
  if (!parsed.success) return echoValues(validationFailure(parsed.error.flatten().fieldErrors), raw);

  // Check-ins can be filled in or corrected for the past week (PRD F8).
  const today = todayIn((await getProfile(user)).timezone);
  if (parsed.data.date > today || parsed.data.date < addDays(today, -7)) {
    return fail("validation", "Check-ins can be edited for the past 7 days only.");
  }
  const result = await saveCheckin(user, { ...parsed.data, localDate: parsed.data.date });
  refresh();
  return result.ok ? ok(null) : echoValues(result, raw);
}

export async function createActivityTypeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = formFields(formData, ["name", "lifeAreaId", "polarity", "defaultUnit", "isQuickLog"]);
  const parsed = activityTypeSchema.safeParse(raw);
  if (!parsed.success) return echoValues(validationFailure(parsed.error.flatten().fieldErrors), raw);
  const result = await createActivityType(user, parsed.data);
  refresh();
  return result.ok ? ok(null) : echoValues(result, raw);
}

const typeCommandSchema = z.object({
  id: z.uuid(),
  command: z.enum(["quick-on", "quick-off", "archive", "restore"]),
});

export async function activityTypeCommand(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = typeCommandSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { id, command } = parsed.data;
  const patch =
    command === "quick-on" || command === "quick-off" ? { isQuickLog: command === "quick-on" } : { archived: command === "archive" };
  await updateActivityType(user, id, patch);
  refresh();
}
