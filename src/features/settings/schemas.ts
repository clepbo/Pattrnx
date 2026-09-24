import { z } from "zod";

import { CURRENCIES } from "@/features/onboarding/catalog";
import { normalizeTimeZone } from "@/lib/dates";

export const lifeAreaNameSchema = z
  .string()
  .trim()
  .min(1, { error: "Enter a name." })
  .max(40, { error: "Use at most 40 characters." });

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, { error: "Tell us what to call you." })
    .max(80, { error: "Use at most 80 characters." }),
  timezone: z
    .string()
    .transform((tz) => normalizeTimeZone(tz))
    .pipe(z.string({ error: "Choose a valid timezone." })),
  currency: z.enum(CURRENCIES.map((c) => c.value), { error: "Choose a currency." }),
  weekStartsOn: z.coerce.number().int().min(0).max(6),
});

export type ProfileInput = z.infer<typeof profileSchema>;
