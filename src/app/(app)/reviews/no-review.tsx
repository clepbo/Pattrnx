import { InsightsNav } from "@/components/layout/insights-nav";

export function NoReviewYet() {
  return (
    <div className="grid gap-8">
      <InsightsNav current="/reviews" />
      <h1 className="text-2xl font-semibold tracking-tight">Weekly review</h1>
      <div className="border-border grid gap-2 rounded-xl border border-dashed p-6 text-center">
        <p className="font-medium">Your first review comes after your first full week</p>
        <p className="text-muted-foreground text-sm">
          Each week Pattrnx summarizes what you planned, what got done, what repeated, and one thing to try next.
        </p>
      </div>
    </div>
  );
}
