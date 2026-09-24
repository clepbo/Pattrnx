import { z } from "zod";

import { lifeAreaNameSchema } from "@/features/settings/schemas";

import { DEFAULT_LIFE_AREAS, STARTER_SEPARATOR } from "./catalog";

const DEFAULT_AREA_NAMES = new Set(DEFAULT_LIFE_AREAS.map((a) => a.name));

export const onboardingAreasSchema = z
  .object({
    areas: z.array(z.string()).transform((names) => names.filter((n) => DEFAULT_AREA_NAMES.has(n))),
    starters: z.array(z.string()),
    customAreas: z
      .string()
      .transform((raw) => raw.split(",").map((s) => s.trim()).filter(Boolean))
      .pipe(z.array(lifeAreaNameSchema).max(5, { error: "Add at most 5 of your own areas for now." })),
  })
  .transform(({ areas, starters, customAreas }) => ({
    areas: [...areas, ...customAreas],
    // Only starters from the catalog whose area was also chosen.
    starters: starters.flatMap((key) => {
      const [area, name] = key.split(STARTER_SEPARATOR);
      const starter = DEFAULT_LIFE_AREAS.find((a) => a.name === area && areas.includes(area))?.starters.find(
        (s) => s.name === name,
      );
      return starter ? [{ area, starter }] : [];
    }),
  }))
  .refine((value) => value.areas.length > 0, { path: ["areas"], error: "Choose at least one area." });
