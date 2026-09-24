"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/server/auth";
import { recordFeedback } from "@/server/services/patterns";

const feedbackSchema = z.object({
  patternId: z.uuid(),
  feedback: z.enum(["accurate", "partially_accurate", "not_accurate", "suppress"]),
});

export async function givePatternFeedback(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = feedbackSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await recordFeedback(user, parsed.data.patternId, parsed.data.feedback);
  revalidatePath("/patterns");
  revalidatePath("/today");
}
