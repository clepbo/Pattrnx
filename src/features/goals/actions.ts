"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { echoValues, fail, type FormState, formFields, ok, validationFailure } from "@/lib/action-result";
import { todayIn, zonedDateTimeToInstant } from "@/lib/dates";
import { requireUser } from "@/server/auth";
import * as goals from "@/server/services/goals";
import { getProfile } from "@/server/services/profile";

import {
  actionSchema,
  createGoalSchema,
  idSchema,
  milestoneSchema,
  outcomeSchema,
  requiredDate,
  strategySchema,
  updateGoalSchema,
} from "./schemas";

const GOAL_FIELDS = [
  "title",
  "lifeAreaId",
  "measurementType",
  "unit",
  "baselineValue",
  "targetValue",
  "deadline",
  "plannedPaceAmount",
  "plannedPacePeriod",
  "motivation",
  "priority",
] as const;

function refresh(goalId?: string) {
  revalidatePath("/goals");
  if (goalId) revalidatePath(`/goals/${goalId}`);
  revalidatePath("/today");
}

export async function createGoal(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = formFields(formData, [...GOAL_FIELDS, "strategy"]);
  const parsed = createGoalSchema.safeParse(raw);
  if (!parsed.success) return echoValues(validationFailure(parsed.error.flatten().fieldErrors), raw);

  const result = await goals.createGoal(user, parsed.data);
  if (!result.ok) return echoValues(result, raw);
  refresh();
  redirect(`/goals/${result.data.id}?created=1`);
}

export async function updateGoal(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = formFields(formData, ["goalId", ...GOAL_FIELDS]);
  const goalId = idSchema.safeParse(raw.goalId);
  const parsed = updateGoalSchema.safeParse(raw);
  if (!goalId.success) return fail("not_found", "We couldn't find that goal.");
  if (!parsed.success) return echoValues(validationFailure(parsed.error.flatten().fieldErrors), raw);

  const result = await goals.updateGoal(user, goalId.data, parsed.data);
  if (!result.ok) return echoValues(result, raw);
  refresh(goalId.data);
  redirect(`/goals/${goalId.data}`);
}

const statusSchema = z.object({
  goalId: idSchema,
  status: z.enum(["active", "paused", "completed", "abandoned"]),
});

export async function setGoalStatus(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await goals.setGoalStatus(user, parsed.data.goalId, parsed.data.status);
  refresh(parsed.data.goalId);
}

export async function deleteGoal(formData: FormData): Promise<void> {
  const user = await requireUser();
  const goalId = idSchema.safeParse(formData.get("goalId"));
  if (!goalId.success) return;
  await goals.deleteGoal(user, goalId.data);
  refresh();
  redirect("/goals");
}

// --- strategy, milestones, actions ------------------------------------------

export async function addStrategy(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = formFields(formData, ["goalId", "description"]);
  const goalId = idSchema.safeParse(raw.goalId);
  const parsed = strategySchema.safeParse(raw);
  if (!goalId.success) return fail("not_found", "We couldn't find that goal.");
  if (!parsed.success) return echoValues(validationFailure(parsed.error.flatten().fieldErrors), raw);

  const result = await goals.addStrategy(user, goalId.data, parsed.data.description);
  refresh(goalId.data);
  return result.ok ? ok(null) : echoValues(result, raw);
}

export async function addMilestone(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = formFields(formData, ["goalId", "title", "targetDate"]);
  const goalId = idSchema.safeParse(raw.goalId);
  const parsed = milestoneSchema.safeParse(raw);
  if (!goalId.success) return fail("not_found", "We couldn't find that goal.");
  if (!parsed.success) return echoValues(validationFailure(parsed.error.flatten().fieldErrors), raw);

  const result = await goals.addMilestone(user, goalId.data, parsed.data);
  refresh(goalId.data);
  return result.ok ? ok(null) : echoValues(result, raw);
}

export async function addAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = formFields(formData, ["goalId", "title", "milestoneId", "activityTypeId", "estimatedMinutes"]);
  const goalId = idSchema.safeParse(raw.goalId);
  const parsed = actionSchema.safeParse(raw);
  if (!goalId.success) return fail("not_found", "We couldn't find that goal.");
  if (!parsed.success) return echoValues(validationFailure(parsed.error.flatten().fieldErrors), raw);

  const result = await goals.addAction(user, goalId.data, parsed.data);
  refresh(goalId.data);
  return result.ok ? ok(null) : echoValues(result, raw);
}

export async function scheduleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = formFields(formData, ["goalId", "actionId", "date"]);
  const actionId = idSchema.safeParse(raw.actionId);
  const date = requiredDate.safeParse(raw.date);
  if (!actionId.success) return fail("not_found", "We couldn't find that action.");
  if (!date.success) return echoValues(validationFailure({ date: ["Choose a date."] }), raw);

  const result = await goals.scheduleAction(user, actionId.data, date.data);
  refresh(raw.goalId);
  return result.ok ? ok(null) : echoValues(result, raw);
}

const itemSchema = z.object({ goalId: idSchema, id: idSchema });

/** Buttons that act on one child row of a goal. */
export async function goalItemCommand(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = itemSchema.safeParse({ goalId: formData.get("goalId"), id: formData.get("id") });
  if (!parsed.success) return;
  const { goalId, id } = parsed.data;

  switch (formData.get("command")) {
    case "delete-strategy":
      await goals.deleteStrategy(user, id);
      break;
    case "delete-milestone":
      await goals.deleteMilestone(user, id);
      break;
    case "milestone-done":
      await goals.setMilestoneStatus(user, id, "done");
      break;
    case "milestone-reopen":
      await goals.setMilestoneStatus(user, id, "pending");
      break;
    case "milestone-drop":
      await goals.setMilestoneStatus(user, id, "dropped");
      break;
    case "delete-action":
      await goals.deleteAction(user, id);
      break;
    case "unschedule-action":
      await goals.unscheduleAction(user, id);
      break;
    case "delete-outcome":
      await goals.deleteOutcome(user, id);
      break;
    default:
      return;
  }
  refresh(goalId);
}

// --- outcomes ---------------------------------------------------------------

export async function logOutcome(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = formFields(formData, ["goalId", "value", "date", "description"]);
  const goalId = idSchema.safeParse(raw.goalId);
  const parsed = outcomeSchema.safeParse(raw);
  if (!goalId.success) return fail("not_found", "We couldn't find that goal.");
  if (!parsed.success) return echoValues(validationFailure(parsed.error.flatten().fieldErrors), raw);

  const { timezone } = await getProfile(user);
  const today = todayIn(timezone);
  if (parsed.data.date > today) return echoValues(validationFailure({ date: ["Choose today or an earlier date."] }), raw);

  // Today's reading is stamped now; a past day's at midday, so it lands on that day.
  const occurredAt =
    parsed.data.date === today ? new Date() : zonedDateTimeToInstant(parsed.data.date, "12:00", timezone);
  const result = await goals.logOutcome(user, goalId.data, {
    value: parsed.data.value,
    description: parsed.data.description,
    occurredAt: occurredAt.toISOString(),
  });
  refresh(goalId.data);
  return result.ok ? ok(null) : echoValues(result, raw);
}
