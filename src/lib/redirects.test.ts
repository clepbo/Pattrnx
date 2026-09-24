import { describe, expect, it } from "vitest";
import { DEFAULT_AFTER_LOGIN, safeNextPath } from "./redirects";

describe("safeNextPath", () => {
  it("keeps same-origin relative paths with query and hash", () => {
    expect(safeNextPath("/goals/123?tab=health#top")).toBe("/goals/123?tab=health#top");
    expect(safeNextPath("/today")).toBe("/today");
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["absolute URL", "https://evil.example/today"],
    ["protocol-relative", "//evil.example"],
    ["backslash trick", "/\\evil.example"],
    ["embedded backslash", "/foo\\..\\\\evil.example"],
    ["javascript scheme", "javascript:alert(1)"],
    ["relative without slash", "today"],
    ["control characters", "/\u0009/evil.example"],
    ["non-string", 42],
  ])("falls back for %s", (_label, value) => {
    expect(safeNextPath(value)).toBe(DEFAULT_AFTER_LOGIN);
  });

  it("uses the supplied fallback", () => {
    expect(safeNextPath("https://evil.example", "/login")).toBe("/login");
  });
});
