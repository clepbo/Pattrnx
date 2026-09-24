import type { Metadata } from "next";

import { AreasForm } from "@/features/onboarding/components/areas-form";

import { StepHeader } from "../step-header";

export const metadata: Metadata = { title: "Choose your areas" };

export default function OnboardingAreasPage() {
  return (
    <div className="grid gap-8">
      <StepHeader
        step={2}
        title="Where do you want to make progress?"
        description="Pick the parts of life you want to track. Start small: you can add more later."
      />
      <AreasForm />
    </div>
  );
}
