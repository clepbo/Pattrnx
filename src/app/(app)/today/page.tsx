import type { Metadata } from "next";

import { localHourOf } from "@/lib/dates";
import { requireUser } from "@/server/auth";
import { getProfile } from "@/server/services/profile";

export const metadata: Metadata = { title: "Today" };

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function TodayPage() {
  const user = await requireUser();
  const profile = await getProfile(user);
  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: profile.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <p className="text-muted-foreground text-sm">{dateLabel}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting(localHourOf(now, profile.timezone))}
          {profile.display_name ? `, ${profile.display_name}` : ""}
        </h1>
      </div>
      <section aria-labelledby="focus-heading" className="border-border grid gap-2 rounded-xl border p-4">
        <h2 id="focus-heading" className="font-medium">
          Today&apos;s focus
        </h2>
        <p className="text-muted-foreground text-sm">
          Nothing is planned yet. Once you set a goal and a routine, today&apos;s tasks will show up here.
        </p>
      </section>
    </div>
  );
}
