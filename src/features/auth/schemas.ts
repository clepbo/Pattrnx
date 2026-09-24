import { z } from "zod";

import { normalizeTimeZone } from "@/lib/dates";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address." }).max(254));

// bcrypt (used by Supabase Auth) only reads the first 72 bytes.
export const newPasswordSchema = z
  .string()
  .min(10, { error: "Use at least 10 characters." })
  .max(72, { error: "Use at most 72 characters." });

const optionalText = z
  .string()
  .optional()
  .transform((value) => value || undefined);

export const signUpSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, { error: "Tell us what to call you." })
    .max(80, { error: "Use at most 80 characters." }),
  email: emailSchema,
  password: newPasswordSchema,
  // Detected in the browser. An unknown value falls back to UTC in the DB trigger.
  timezone: optionalText.transform((tz) => (tz ? (normalizeTimeZone(tz) ?? undefined) : undefined)),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "Enter your password." }).max(72),
  next: optionalText,
});

export const magicLinkSchema = z.object({
  email: emailSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    error: "Passwords don't match.",
  });

export const otpTypeSchema = z.enum(["email", "signup", "magiclink", "recovery", "email_change", "invite"]);
