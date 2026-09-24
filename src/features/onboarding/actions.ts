"use server";

import { redirect } from "next/navigation";

import { profileSchema } from "@/features/settings/schemas";
import { echoValues, type FormState, formFields, validationFailure } from "@/lib/action-result";
import { requireUser } from "@/server/auth";
import { ensureActivityTypes } from "@/server/services/activity-types";
import { ensureLifeAreas } from "@/server/services/life-areas";
import { completeOnboarding, getProfile, updateProfile } from "@/server/services/profile";

import { onboardingAreasSchema } from "./schemas";

export async function saveOnboardingProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = formFields(formData, ["displayName", "timezone", "currency", "weekStartsOn"]);
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return echoValues(validationFailure(parsed.error.flatten().fieldErrors), raw);

  const result = await updateProfile(user, parsed.data);
  if (!result.ok) return echoValues(result, raw);
  redirect("/onboarding/areas");
}

export async function saveOnboardingAreas(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = {
    areas: formData.getAll("areas").map(String),
    starters: formData.getAll("starters").map(String),
    customAreas: String(formData.get("customAreas") ?? ""),
  };
  const parsed = onboardingAreasSchema.safeParse(raw);
  if (!parsed.success) {
    return echoValues(validationFailure(parsed.error.flatten().fieldErrors), { customAreas: raw.customAreas });
  }

  const areas = await ensureLifeAreas(user, parsed.data.areas);
  if (!areas.ok) return areas;

  const profile = await getProfile(user);
  const types = await ensureActivityTypes(
    user,
    parsed.data.starters.flatMap(({ area, starter }) => {
      const lifeArea = areas.data.get(area.toLowerCase());
      if (!lifeArea) return [];
      const unit = starter.unit === "currency" ? profile.currency : starter.unit === "minutes" ? "min" : null;
      return [{ name: starter.name, lifeAreaId: lifeArea.id, polarity: starter.polarity, defaultUnit: unit, isQuickLog: true }];
    }),
  );
  if (!types.ok) return types;

  const done = await completeOnboarding(user);
  if (!done.ok) return done;
  redirect("/goals/new?first=1");
}
