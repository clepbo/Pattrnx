import { z } from "zod";

const optionalId = z.union([z.uuid(), z.literal("").transform(() => null)]);

export const CATEGORIES = [
  { value: "reduce", label: "Reduce: make it smaller" },
  { value: "reschedule", label: "Reschedule: change when" },
  { value: "sequence", label: "Sequence: change the order" },
  { value: "replace", label: "Replace: swap the behaviour" },
  { value: "remove_friction", label: "Remove friction: make it easier" },
  { value: "add_friction", label: "Add friction: make it harder" },
  { value: "environment", label: "Environment: change the setting" },
  { value: "accountability", label: "Accountability: involve someone" },
  { value: "strategy_change", label: "Strategy: change the method" },
  { value: "goal_recalibration", label: "Recalibrate: change the goal" },
] as const;

export const METRICS = [
  { value: "task_completion_rate", label: "Share of planned tasks done" },
  { value: "active_days", label: "Days with an activity" },
  { value: "activity_minutes", label: "Minutes of an activity per day" },
  { value: "activity_quantity", label: "Amount of an activity per day" },
] as const;

export const startExperimentSchema = z
  .object({
    title: z.string().trim().min(1, { error: "Name the experiment." }).max(120),
    hypothesis: z.string().trim().min(1, { error: "What do you expect to happen?" }).max(500),
    category: z.enum(CATEGORIES.map((c) => c.value)),
    description: z.string().trim().min(1, { error: "Describe what you'll do differently." }).max(1000),
    metric: z.enum(METRICS.map((m) => m.value)),
    routineId: optionalId,
    activityTypeId: optionalId,
    direction: z.enum(["increase", "decrease"]),
    durationDays: z.coerce
      .number({ error: "Choose a length." })
      .int()
      .min(7, { error: "Run it for at least 7 days." })
      .max(42, { error: "Keep it to 6 weeks or less." }),
    goalId: optionalId,
    patternId: optionalId,
  })
  .refine((e) => e.metric === "task_completion_rate" || e.activityTypeId !== null, {
    path: ["activityTypeId"],
    error: "Choose which activity to measure.",
  });

export const OUTCOMES = [
  { value: "improved", label: "It helped" },
  { value: "no_change", label: "No real difference" },
  { value: "worsened", label: "It made things harder" },
  { value: "inconclusive", label: "Can't tell yet" },
] as const;

export const completeExperimentSchema = z.object({
  experimentId: z.uuid(),
  outcome: z.enum(OUTCOMES.map((o) => o.value), { error: "Choose how it went." }),
  reflection: z
    .string()
    .trim()
    .max(2000)
    .transform((v) => v || null),
});
