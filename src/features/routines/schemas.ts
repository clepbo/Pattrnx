import { z } from "zod";

const minutes = (label: string) =>
  z
    .string()
    .transform((raw) => (raw.trim() === "" ? null : Number(raw)))
    .pipe(
      z
        .number({ error: `Enter ${label} in whole minutes.` })
        .int({ error: `Enter ${label} in whole minutes.` })
        .min(1, { error: "At least 1 minute." })
        .max(1440, { error: "At most 1440 minutes." })
        .nullable(),
    );

export const routineSchema = z
  .object({
    name: z.string().trim().min(1, { error: "Name the routine." }).max(80),
    goalId: z.union([z.uuid(), z.literal("").transform(() => null)]),
    activityTypeId: z.uuid({ error: "Choose what this routine logs." }),
    daysOfWeek: z
      .array(z.coerce.number().int().min(0).max(6))
      .min(1, { error: "Choose at least one day." })
      .transform((days) => [...new Set(days)]),
    preferredTime: z
      .string()
      .transform((raw) => raw.trim() || null)
      .pipe(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Enter a time like 07:30." }).nullable()),
    normalMinutes: minutes("the usual length"),
    minimumMinutes: minutes("the minimum"),
    fallbackDescription: z
      .string()
      .trim()
      .max(300)
      .transform((v) => v || null),
    steps: z
      .string()
      .transform((raw) => raw.split("\n").map((s) => s.trim()).filter(Boolean))
      .pipe(z.array(z.string().max(120, { error: "Keep each step under 120 characters." })).max(20)),
  })
  .superRefine((routine, ctx) => {
    if (routine.normalMinutes === null) {
      ctx.addIssue({ code: "custom", path: ["normalMinutes"], message: "How long does it usually take?" });
    } else if (routine.minimumMinutes !== null && routine.minimumMinutes > routine.normalMinutes) {
      ctx.addIssue({ code: "custom", path: ["minimumMinutes"], message: "The minimum can't be longer than the usual length." });
    }
  })
  .transform((routine) => ({ ...routine, normalMinutes: routine.normalMinutes as number }));

export type RoutineFormInput = z.infer<typeof routineSchema>;
