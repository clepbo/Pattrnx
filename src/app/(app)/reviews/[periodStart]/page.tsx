import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { InsightsNav } from "@/components/layout/insights-nav";
import { Button } from "@/components/ui/button";
import { regenerateReviewAction } from "@/features/reviews/actions";
import { ReflectionForm } from "@/features/reviews/components/reflection-form";
import { reviewTitle, ReviewView } from "@/features/reviews/components/review-view";
import { parseLocalDate } from "@/lib/dates";
import { requireUser } from "@/server/auth";
import { getOrGenerateReview, listReviews, markReviewViewed, reviewDataChanged } from "@/server/services/reviews";

export const metadata: Metadata = { title: "Weekly review" };

export default async function ReviewPage({ params }: PageProps<"/reviews/[periodStart]">) {
  const user = await requireUser();
  const periodStart = parseLocalDate((await params).periodStart);
  if (!periodStart) notFound();
  const review = await getOrGenerateReview(user, periodStart);
  if (!review) notFound();

  const [changed, past] = await Promise.all([reviewDataChanged(user, review), listReviews(user)]);
  await markReviewViewed(user, review.id);

  return (
    <div className="grid gap-8">
      <InsightsNav current="/reviews" />
      <div className="grid gap-1">
        <p className="text-muted-foreground text-sm">Weekly review</p>
        <h1 className="text-2xl font-semibold tracking-tight">{reviewTitle(review.period_start)}</h1>
      </div>

      {changed && (
        <div role="status" className="bg-muted flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm">
          <span>Some plans or logs for this week changed after this review was made.</span>
          <form action={regenerateReviewAction}>
            <input type="hidden" name="periodStart" value={review.period_start} />
            <Button type="submit" variant="outline" size="sm" className="h-11 sm:h-8">
              Refresh review
            </Button>
          </form>
        </div>
      )}

      <ReviewView content={review.content} />

      <section aria-labelledby="reflection-heading" className="grid gap-3">
        <h2 id="reflection-heading" className="text-lg font-medium">
          Reflect
        </h2>
        <ReflectionForm periodStart={review.period_start} reflection={review.reflection ?? ""} usefulness={review.usefulness} />
      </section>

      {past.length > 1 && (
        <nav aria-label="Earlier reviews" className="grid gap-2">
          <h2 className="text-muted-foreground text-sm font-medium">Earlier weeks</h2>
          <ul className="flex flex-wrap gap-2">
            {past
              .filter((r) => r.period_start !== review.period_start)
              .map((r) => (
                <li key={r.id}>
                  <Link href={`/reviews/${r.period_start}`} className="border-border hover:bg-muted inline-flex h-11 items-center rounded-lg border px-3 text-sm">
                    {reviewTitle(r.period_start)}
                  </Link>
                </li>
              ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
