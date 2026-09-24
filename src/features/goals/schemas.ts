import { z } from "zod";

import { parseLocalDate } from "@/lib/dates";
import { parseAmount } from "@/lib/format";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Use at most ${max} characters.` })
    .transform((v) => v || null);

const optionalAmount = z.string().transform((raw, ctx) => {
  if (raw.trim() === "") return null;
  const value = parseAmount(raw);
  if (value === null || Math.abs(value) >= 1e12) {
    ctx.addIssue({ code: "custom", message: "Enter a number." });
    return z.NEVER;
  }
  return value;
});

const optionalDate = z.string().transform((raw, ctx) => {
  if (raw.trim() === "") return null;
  const date = parseLocalDate(raw.trim());
  if (!date) {
    ctx.addIssue({ code: "custom", message: "Enter a valid date." });
    return z.NEVER;
  }
  return date;
});

export const requiredDate = z.string().transform((raw, ctx) => {
  const date = parseLocalDate(raw.trim());
  if (!date) {
    ctx.addIssue({ code: "custom", message: "Enter a valid date." });
    return z.NEVER;
  }
  return date;
});

export const idSchema = z.uuid({ error: "Choose an option." });

export const goalFieldsSchema = z.object({
  title: z.string().trim().min(1, { error: "Give your goal a name." }).max(120, { error: "Use at most 120 characters." }),
  lifeAreaId: idSchema,
  unit: optionalText(20),
  baselineValue: optionalAmount,
  targetValue: optionalAmount,
  deadline: optionalDate,
  plannedPaceAmount: optionalAmount,
  plannedPacePeriod: z.enum(["day", "week", "month"]).optional().or(z.literal("").transform(() => undefined)),
  motivation: optionalText(2000),
  priority: z.coerce.number().int().min(1).max(3),
});

export const measurementTypeSchema = z.enum(["cumulative", "level", "milestone"], {
  error: "Choose how you'll measure progress.",
});

/** Rules that depend on the measurement type (mirrors goals_measurement_check). */
function refineGoal(
  goal: z.infer<typeof goalFieldsSchema> & { measurementType: z.infer<typeof measurementTypeSchema> },
  ctx: z.RefinementCtx,
) {
  if (goal.measurementType !== "milestone") {
    if (!goal.unit) ctx.addIssue({ code: "custom", path: ["unit"], message: "Add a unit, e.g. NGN, kg or pages." });
    if (goal.baselineValue === null) ctx.addIssue({ code: "custom", path: ["baselineValue"], message: "Where are you starting from?" });
    if (goal.targetValue === null) ctx.addIssue({ code: "custom", path: ["targetValue"], message: "Where do you want to get to?" });
    if (goal.baselineValue !== null && goal.targetValue !== null && goal.baselineValue === goal.targetValue) {
      ctx.addIssue({ code: "custom", path: ["targetValue"], message: "The target needs to differ from where you are now." });
    }
  }
  if (goal.plannedPaceAmount !== null) {
    if (goal.plannedPaceAmount <= 0) ctx.addIssue({ code: "custom", path: ["plannedPaceAmount"], message: "Enter an amount above zero." });
    if (!goal.plannedPacePeriod) ctx.addIssue({ code: "custom", path: ["plannedPacePeriod"], message: "Per day, week or month?" });
  }
}

export const createGoalSchema = goalFieldsSchema
  .extend({
    measurementType: measurementTypeSchema,
    strategy: z
      .string()
      .transform((raw) => raw.split("\n").map((line) => line.trim()).filter(Boolean))
      .pipe(
        z
          .array(z.string().max(300, { error: "Keep each strategy line under 300 characters." }))
          .max(10, { error: "List at most 10 approaches." }),
      ),
  })
  .superRefine(refineGoal);

/** Measurement type can't change after creation, so it's passed through from the stored goal. */
export const updateGoalSchema = goalFieldsSchema.extend({ measurementType: measurementTypeSchema }).superRefine(refineGoal);

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

export const outcomeSchema = z
  .object({
    value: optionalAmount,
    date: requiredDate,
    description: optionalText(500),
  })
  .refine((o) => o.value !== null || o.description !== null, {
    path: ["value"],
    error: "Enter an amount or a note.",
  });

export const milestoneSchema = z.object({
  title: z.string().trim().min(1, { error: "Name the milestone." }).max(120),
  targetDate: optionalDate,
});

export const actionSchema = z.object({
  title: z.string().trim().min(1, { error: "Describe the action." }).max(120),
  milestoneId: z.union([z.uuid(), z.literal("").transform(() => null)]),
  activityTypeId: z.union([z.uuid(), z.literal("").transform(() => null)]),
  estimatedMinutes: z
    .string()
    .transform((raw) => (raw.trim() === "" ? null : Number(raw)))
    .pipe(z.number().int().min(1).max(1440).nullable()),
});

export const strategySchema = z.object({
  description: z.string().trim().min(1, { error: "Describe the approach." }).max(300),
});
