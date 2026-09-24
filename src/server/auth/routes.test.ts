import { describe, expect, it } from "vitest";
import { isGuestOnlyPath, isProtectedPath } from "./routes";

describe("route groups", () => {
  it("protects app sections and their children", () => {
    expect(isProtectedPath("/today")).toBe(true);
    expect(isProtectedPath("/goals/abc")).toBe(true);
    expect(isProtectedPath("/settings")).toBe(true);
  });

  it("does not protect public pages or look-alike paths", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/todayx")).toBe(false);
    expect(isProtectedPath("/auth/confirm")).toBe(false);
  });

  it("identifies guest-only pages", () => {
    expect(isGuestOnlyPath("/login")).toBe(true);
    expect(isGuestOnlyPath("/signup")).toBe(true);
    expect(isGuestOnlyPath("/reset-password")).toBe(false);
  });
});
