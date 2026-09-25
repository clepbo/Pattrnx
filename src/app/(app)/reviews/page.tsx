import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireUser } from "@/server/auth";
import { isReviewableWeek, latestCompletedWeek } from "@/server/services/reviews";

import { NoReviewYet } from "./no-review";

export const metadata: Metadata = { title: "Weekly review" };

export default async function ReviewsPage() {
  const user = await requireUser();
  const latest = await latestCompletedWeek(user);
  if (await isReviewableWeek(user, latest)) redirect(`/reviews/${latest}`);
  return <NoReviewYet />;
}
