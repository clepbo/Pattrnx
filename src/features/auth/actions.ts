"use server";

import type { AuthError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { z } from "zod";

import { type ActionResult, fail } from "@/lib/action-result";
import { safeNextPath } from "@/lib/redirects";
import { createClient } from "@/server/db/server";

import {
  forgotPasswordSchema,
  magicLinkSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "./schemas";

/** Failures echo back non-secret inputs so the form can re-fill them (React resets forms after an action). */
export type AuthFormState = (ActionResult<null> & { values?: Record<string, string> }) | null;

const SECRET_FIELDS = new Set(["password", "confirmPassword"]);

function fields(formData: FormData, names: string[]): Record<string, string> {
  return Object.fromEntries(names.map((name) => [name, String(formData.get(name) ?? "")]));
}

function echo(state: AuthFormState, raw: Record<string, string>): AuthFormState {
  if (!state) return state;
  return { ...state, values: Object.fromEntries(Object.entries(raw).filter(([key]) => !SECRET_FIELDS.has(key))) };
}

function validationFailure(error: z.ZodError): AuthFormState {
  return fail("validation", "Check the highlighted fields.", error.flatten().fieldErrors as Record<string, string[]>);
}

function authFailure(action: string, error: AuthError): AuthFormState {
  switch (error.code) {
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return fail("limit", "Too many attempts. Wait a few minutes and try again.");
    case "weak_password":
      return fail("validation", "Choose a stronger password.", {
        password: ["This password is too common or has appeared in a data breach."],
      });
    case "same_password":
      return fail("validation", "Choose a password you haven't used here before.", {
        password: ["Must differ from your current password."],
      });
    default:
      // Never log emails or passwords: action name and error code only.
      console.error(JSON.stringify({ level: "error", action, code: error.code ?? "unknown", status: error.status }));
      return fail("unexpected", "Something went wrong. Please try again.");
  }
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = fields(formData, ["displayName", "email", "password", "timezone"]);
  return echo(await signUpImpl(raw), raw);
}

async function signUpImpl(raw: Record<string, string>): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) return validationFailure(parsed.error);

  const { displayName, email, password, timezone } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName, timezone } },
  });

  // With email confirmation on, Supabase answers an existing email the same way as a new one,
  // so this page never reveals whether an account exists.
  if (error) return authFailure("auth.signUp", error);
  redirect("/check-email?reason=signup");
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = fields(formData, ["email", "password", "next"]);
  return echo(await signInImpl(raw), raw);
}

async function signInImpl(raw: Record<string, string>): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) return validationFailure(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (error.code === "invalid_credentials") return fail("unauthorized", "Email or password is incorrect.");
    if (error.code === "email_not_confirmed") {
      return fail("unauthorized", "Confirm your email first. Check your inbox for the link we sent.");
    }
    return authFailure("auth.signIn", error);
  }
  redirect(safeNextPath(parsed.data.next));
}

export async function sendMagicLink(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = fields(formData, ["email"]);
  return echo(await sendMagicLinkImpl(raw), raw);
}

async function sendMagicLinkImpl(raw: Record<string, string>): Promise<AuthFormState> {
  const parsed = magicLinkSchema.safeParse(raw);
  if (!parsed.success) return validationFailure(parsed.error);

  const supabase = await createClient();
  // Sign-up needs a name and timezone, so magic links never create accounts.
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: false },
  });

  // Unknown emails get the same response as known ones (no account enumeration).
  if (error && error.code !== "otp_disabled" && error.code !== "user_not_found") {
    return authFailure("auth.magicLink", error);
  }
  redirect("/check-email?reason=magic-link");
}

export async function requestPasswordReset(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = fields(formData, ["email"]);
  return echo(await requestPasswordResetImpl(raw), raw);
}

async function requestPasswordResetImpl(raw: Record<string, string>): Promise<AuthFormState> {
  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) return validationFailure(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email);
  if (error) return authFailure("auth.resetPassword", error);
  redirect("/check-email?reason=reset");
}

export async function updatePassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = fields(formData, ["password", "confirmPassword"]);
  return echo(await updatePasswordImpl(raw), raw);
}

async function updatePasswordImpl(raw: Record<string, string>): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) return validationFailure(parsed.error);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return fail("unauthorized", "Your reset link has expired. Request a new one.");

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return authFailure("auth.updatePassword", error);

  // A password change signs out every other session.
  await supabase.auth.signOut({ scope: "others" });
  redirect("/today");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
