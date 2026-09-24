import { describe, expect, it } from "vitest";

import { onboardingAreasSchema } from "./schemas";

describe("onboardingAreasSchema", () => {
  it("keeps catalog areas, custom areas, and starters of chosen areas only", () => {
    const result = onboardingAreasSchema.parse({
      areas: ["Career", "Finance", "Made up"],
      starters: ["Career::Deep work", "Health::Exercise", "Finance::Not a starter", "Finance::Saving"],
      customAreas: " Side business , ,Faith ",
    });
    expect(result.areas).toEqual(["Career", "Finance", "Side business", "Faith"]);
    expect(result.starters.map((s) => `${s.area}/${s.starter.name}`)).toEqual(["Career/Deep work", "Finance/Saving"]);
  });

  it("requires at least one area", () => {
    const result = onboardingAreasSchema.safeParse({ areas: [], starters: [], customAreas: "" });
    expect(result.error?.flatten().fieldErrors.areas).toEqual(["Choose at least one area."]);
  });

  it("limits custom areas", () => {
    const result = onboardingAreasSchema.safeParse({ areas: ["Career"], starters: [], customAreas: "a,b,c,d,e,f" });
    expect(result.success).toBe(false);
  });
});
