import type { Metadata } from "next";

import { saveOnboardingProfile } from "@/features/onboarding/actions";
import { ProfileForm } from "@/features/settings/components/profile-form";
import { supportedTimeZones } from "@/lib/time-zones";
import { requireUser } from "@/server/auth";
import { getProfile } from "@/server/services/profile";

import { StepHeader } from "./step-header";

export const metadata: Metadata = { title: "Set up" };

export default async function OnboardingProfilePage() {
  const profile = await getProfile(await requireUser());

  return (
    <div className="grid gap-8">
      <StepHeader step={1} title="Let's get you set up" description="This takes about two minutes." />
      <ProfileForm
        action={saveOnboardingProfile}
        timeZones={supportedTimeZones()}
        submitLabel="Continue"
        defaults={{
          displayName: profile.display_name ?? "",
          timezone: profile.timezone,
          currency: profile.currency,
          weekStartsOn: profile.week_starts_on,
        }}
      />
    </div>
  );
}
