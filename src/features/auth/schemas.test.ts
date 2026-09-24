import { describe, expect, it } from "vitest";

import { resetPasswordSchema, signInSchema, signUpSchema } from "./schemas";

describe("signUpSchema", () => {
  const valid = { displayName: " Ada ", email: " Ada@Example.COM ", password: "correct horse", timezone: "africa/lagos" };

  it("normalizes name, email and timezone", () => {
    expect(signUpSchema.parse(valid)).toEqual({
      displayName: "Ada",
      email: "ada@example.com",
      password: "correct horse",
      timezone: "Africa/Lagos",
    });
  });

  it("drops an unknown timezone instead of failing sign-up", () => {
    expect(signUpSchema.parse({ ...valid, timezone: "Mars/Olympus" }).timezone).toBeUndefined();
    expect(signUpSchema.parse({ ...valid, timezone: "" }).timezone).toBeUndefined();
  });

  it("enforces the password policy", () => {
    const result = signUpSchema.safeParse({ ...valid, password: "short" });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.password).toEqual(["Use at least 10 characters."]);
    expect(signUpSchema.safeParse({ ...valid, password: "x".repeat(73) }).success).toBe(false);
  });

  it("rejects an invalid email and blank name", () => {
    const result = signUpSchema.safeParse({ ...valid, email: "nope", displayName: "   " });
    expect(Object.keys(result.error?.flatten().fieldErrors ?? {})).toEqual(["displayName", "email"]);
  });
});

describe("signInSchema", () => {
  it("treats an empty next as absent", () => {
    expect(signInSchema.parse({ email: "a@b.co", password: "x", next: "" }).next).toBeUndefined();
  });
});

describe("resetPasswordSchema", () => {
  it("requires matching passwords", () => {
    const result = resetPasswordSchema.safeParse({ password: "long enough pw", confirmPassword: "different pw!" });
    expect(result.error?.flatten().fieldErrors.confirmPassword).toEqual(["Passwords don't match."]);
  });
});
