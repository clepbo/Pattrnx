"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { echoValues, fail, type FormState, formFields, ok, validationFailure } from "@/lib/action-result";
import { requireUser } from "@/server/auth";
import { deleteAccount } from "@/server/services/account";
import { createLifeArea, renameLifeArea, setLifeAreaArchived } from "@/server/services/life-areas";
import { updateProfile } from "@/server/services/profile";

import { lifeAreaNameSchema, profileSchema } from "./schemas";

const idSchema = z.uuid();

export async function saveSettingsProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = formFields(formData, ["displayName", "timezone", "currency", "weekStartsOn"]);
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return echoValues(validationFailure(parsed.error.flatten().fieldErrors), raw);

  const result = await updateProfile(user, parsed.data);
  revalidatePath("/", "layout");
  return echoValues(result, raw);
}

export async function addLifeArea(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = formFields(formData, ["name"]);
  const parsed = lifeAreaNameSchema.safeParse(raw.name);
  if (!parsed.success) return echoValues(validationFailure({ name: parsed.error.issues.map((i) => i.message) }), raw);

  const result = await createLifeArea(user, parsed.data);
  if (!result.ok) return echoValues(result, raw);
  revalidatePath("/settings");
  return ok(null);
}

export async function renameArea(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = formFields(formData, ["id", "name"]);
  const id = idSchema.safeParse(raw.id);
  const name = lifeAreaNameSchema.safeParse(raw.name);
  if (!id.success) return fail("not_found", "We couldn't find that area.");
  if (!name.success) return echoValues(validationFailure({ name: name.error.issues.map((i) => i.message) }), raw);

  const result = await renameLifeArea(user, id.data, name.data);
  revalidatePath("/settings");
  return echoValues(result, raw);
}

export async function toggleAreaArchived(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  await setLifeAreaArchived(user, id.data, formData.get("archive") === "true");
  revalidatePath("/settings");
}

export async function deleteAccountAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = formFields(formData, ["confirmation"]);
  if (raw.confirmation.trim() !== "DELETE") {
    return echoValues(validationFailure({ confirmation: ['Type DELETE in capitals to confirm.'] }), raw);
  }
  const result = await deleteAccount(user);
  if (!result.ok) return result;
  redirect("/?deleted=1");
}
