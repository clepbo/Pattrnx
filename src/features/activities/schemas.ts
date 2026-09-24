import { z } from "zod";

import { requiredDate } from "@/features/goals/schemas";
import { parseAmount } from "@/lib/format";

const optionalUuid = z.union([z.uuid(), z.literal("").transform(() => null)]);

const optionalInt = (min: number, max: number, message: string) =>
  z
    .string()
    .transform((raw) => (raw.trim() === "" ? null : Number(raw)))
    .pipe(z.number({ error: message }).int({ error: message }).min(min, { error: message }).max(max, { error: message }).nullable());

export const logActivitySchema = z.object({
  id: z.uuid(),
  activityTypeId: z.uuid({ error: "Choose what you did." }),
  // Empty date/time means "now".
  date: z.union([requiredDate, z.literal("").transform(() => null)]),
  time: z
    .string()
    .transform((raw) => raw.trim() || null)
    .pipe(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Enter a time like 19:30." }).nullable()),
  durationMinutes: optionalInt(0, 1440, "Enter whole minutes, up to 1440."),
  quantity: z.string().transform((raw, ctx) => {
    if (raw.trim() === "") return null;
    const value = parseAmount(raw);
    if (value === null || value < 0) {
      ctx.addIssue({ code: "custom", message: "Enter an amount of zero or more." });
      return z.NEVER;
    }
    return value;
  }),
  note: z
    .string()
    .trim()
    .max(2000, { error: "Keep notes under 2000 characters." })
    .transform((v) => v || null),
  goalId: optionalUuid,
  unit: z
    .string()
    .trim()
    .max(20)
    .transform((v) => v || null),
});

const rating = optionalInt(1, 5, "Choose 1 to 5.");

export const checkinSchema = z.object({
  date: requiredDate,
  sleepHours: z.string().transform((raw, ctx) => {
    if (raw.trim() === "") return null;
    const value = parseAmount(raw);
    if (value === null || value < 0 || value > 24) {
      ctx.addIssue({ code: "custom", message: "Enter hours between 0 and 24." });
      return z.NEVER;
    }
    return Math.round(value * 10) / 10;
  }),
  energy: rating,
  mood: rating,
  stress: rating,
  workload: rating,
  note: z
    .string()
    .trim()
    .max(2000)
    .transform((v) => v || null),
});

export const activityTypeSchema = z.object({
  name: z.string().trim().min(1, { error: "Name the activity." }).max(60),
  lifeAreaId: z.uuid({ error: "Choose a life area." }),
  polarity: z.enum(["desired", "undesired", "neutral"]),
  defaultUnit: z
    .string()
    .trim()
    .max(20)
    .transform((v) => v || null),
  isQuickLog: z.string().optional().transform((v) => v === "on" || v === "true"),
});
