import { describe, expect, it } from "vitest";

import { binomialUpperTail, binomialZ, criticalZ, median, mode, normalCdf, twoProportionZ } from "./stats";

describe("stats", () => {
  it("twoProportionZ is large for a clear difference and ~0 for none", () => {
    expect(twoProportionZ(45, 50, 10, 50)).toBeGreaterThan(6);
    expect(twoProportionZ(25, 50, 25, 50)).toBe(0);
    expect(twoProportionZ(10, 50, 45, 50)).toBe(0);
    expect(twoProportionZ(5, 10, 0, 0)).toBe(0);
  });

  it("binomialZ compares a share with an expected share using the exact tail", () => {
    expect(binomialZ(15, 20, 0.25)).toBeGreaterThan(4);
    expect(binomialZ(5, 20, 0.25)).toBe(0);
    // 7 of 10 at p = 0.21: exact tail ≈ 0.0013, so z ≈ 3.0 (the normal approximation says ≈ 3.7).
    expect(binomialZ(7, 10, 0.21)).toBeCloseTo(3.0, 0);
  });

  it("binomialUpperTail matches hand-computed values", () => {
    expect(binomialUpperTail(1, 1, 0.3)).toBeCloseTo(0.3);
    expect(binomialUpperTail(2, 2, 0.5)).toBeCloseTo(0.25);
    expect(binomialUpperTail(0, 5, 0.5)).toBe(1);
  });

  it("normalCdf and criticalZ agree with standard tables", () => {
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(criticalZ(0.005)).toBeCloseTo(2.576, 2);
    expect(criticalZ(0.01)).toBeCloseTo(2.326, 2);
    expect(criticalZ(0.005 / 7)).toBeCloseTo(3.19, 1);
  });

  it("median and mode", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(mode([3, 3, 2, 2, 5])).toBe(2);
    expect(mode([])).toBeNull();
  });
});

describe("balancedCut", async () => {
  const { balancedCut } = await import("./detectors/overplanning");
  it("splits tied values as evenly as possible", () => {
    expect(balancedCut([300, 300, 300, 60, 60])).toBe(60);
    expect(balancedCut([30, 60, 90, 120])).toBe(60);
    expect(balancedCut([45])).toBe(45);
  });
});
