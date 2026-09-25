import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/server/db/server", () => ({ createClient: vi.fn() }));

const { signedInRecently } = await import("./account");

describe("signedInRecently (SR-2)", () => {
  const now = Date.parse("2026-09-24T12:00:00Z");
  it("accepts a sign-in within 15 minutes", () => {
    expect(signedInRecently({ last_sign_in_at: "2026-09-24T11:50:00Z" }, now)).toBe(true);
  });
  it("rejects older sign-ins and missing ones", () => {
    expect(signedInRecently({ last_sign_in_at: "2026-09-24T11:40:00Z" }, now)).toBe(false);
    expect(signedInRecently({ last_sign_in_at: undefined }, now)).toBe(false);
  });
});
