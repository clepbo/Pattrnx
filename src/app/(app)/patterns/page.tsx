import type { Metadata } from "next";

import { InsightsNav } from "@/components/layout/insights-nav";
import { PatternCard } from "@/features/patterns/components/pattern-card";
import { requireUser } from "@/server/auth";
import { getPatternsView, markPresented } from "@/server/services/patterns";

export const metadata: Metadata = { title: "Patterns" };

export default async function PatternsPage() {
  const user = await requireUser();
  const view = await getPatternsView(user);
  if (view.status === "ready") await markPresented(user, view.visible.map((p) => p.id));

  return (
    <div className="grid gap-8">
      <InsightsNav current="/patterns" />
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Patterns</h1>
        <p className="text-muted-foreground text-sm">
          Things that keep happening in what you plan and do. They show what tends to occur together, not why. Your feedback
          decides what Pattrnx shows you next.
        </p>
      </div>

      {view.status === "learning" ? (
        <div className="border-border grid gap-2 rounded-xl border border-dashed p-6 text-center">
          <p className="font-medium">Still learning</p>
          <p className="text-muted-foreground text-sm">
            Patterns need about three weeks of plans and logs to be reliable.{" "}
            {view.daysRemaining === 1 ? "1 more day to go." : `${view.daysRemaining} more days to go.`}
          </p>
        </div>
      ) : view.visible.length === 0 ? (
        <div className="border-border grid gap-2 rounded-xl border border-dashed p-6 text-center">
          <p className="font-medium">No clear patterns right now</p>
          <p className="text-muted-foreground text-sm">
            Nothing in the last 90 days stands out strongly enough to show. That can change as you keep logging.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {view.visible.map((pattern) => (
            <PatternCard key={pattern.id} pattern={pattern} />
          ))}
        </div>
      )}
    </div>
  );
}
