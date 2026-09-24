import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { removeActivity } from "@/features/activities/actions";
import { LogActivityForm } from "@/features/activities/components/log-activity-form";
import { addDays, assertLocalDate, todayIn } from "@/lib/dates";
import { formatAmount, formatLocalDate } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { type ActivityWithType, listActivities } from "@/server/services/activities";
import { listActivityTypes } from "@/server/services/activity-types";
import { listGoals } from "@/server/services/goals";
import { getProfile } from "@/server/services/profile";

export const metadata: Metadata = { title: "Log" };

const HISTORY_DAYS = 14;

function groupByDay(activities: ActivityWithType[]): [string, ActivityWithType[]][] {
  const groups = new Map<string, ActivityWithType[]>();
  for (const activity of activities) {
    groups.set(activity.local_date, [...(groups.get(activity.local_date) ?? []), activity]);
  }
  return [...groups.entries()];
}

function timeOf(activity: ActivityWithType, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(activity.occurred_at));
}

export default async function LogPage({ searchParams }: PageProps<"/log">) {
  const user = await requireUser();
  const profile = await getProfile(user);
  const today = todayIn(profile.timezone);
  const [{ type }, types, goals, activities] = await Promise.all([
    searchParams,
    listActivityTypes(user),
    listGoals(user, { statuses: ["active"] }),
    listActivities(user, addDays(today, -(HISTORY_DAYS - 1)), today),
  ]);

  return (
    <div className="grid gap-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Log</h1>
        <Button asChild variant="outline">
          <Link href="/log/types">Activity types</Link>
        </Button>
      </div>

      <section aria-labelledby="log-heading" className="grid gap-4">
        <h2 id="log-heading" className="text-lg font-medium">
          Log an activity
        </h2>
        <LogActivityForm
          types={types.map((t) => ({ id: t.id, name: t.name, unit: t.default_unit, area: t.life_area?.name ?? null }))}
          goals={goals.map(({ goal }) => ({ id: goal.id, title: goal.title }))}
          today={today}
          defaultTypeId={typeof type === "string" ? type : undefined}
        />
      </section>

      <section aria-labelledby="history-heading" className="grid gap-4">
        <h2 id="history-heading" className="text-lg font-medium">
          Last {HISTORY_DAYS} days
        </h2>
        {activities.length === 0 && <p className="text-muted-foreground text-sm">Nothing logged yet.</p>}
        {groupByDay(activities).map(([date, items]) => (
          <div key={date} className="grid gap-2">
            <h3 className="text-muted-foreground text-sm font-medium">
              {date === today ? "Today" : formatLocalDate(assertLocalDate(date))}
            </h3>
            <ul className="grid gap-1">
              {items.map((activity) => (
                <li key={activity.id} className="border-border flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                  <span>
                    <span className="font-medium">{activity.activity_type?.name}</span>
                    <span className="text-muted-foreground">
                      {" · "}
                      {timeOf(activity, profile.timezone)}
                      {activity.duration_minutes !== null && ` · ${activity.duration_minutes} min`}
                      {activity.quantity !== null && ` · ${formatAmount(activity.quantity, activity.unit)}`}
                      {activity.goal && ` · ${activity.goal.title}`}
                      {activity.task_id && " · from a task"}
                    </span>
                    {activity.note && <span className="text-muted-foreground block text-xs">{activity.note}</span>}
                  </span>
                  {!activity.task_id && (
                    <form action={removeActivity}>
                      <input type="hidden" name="id" value={activity.id} />
                      <Button type="submit" variant="ghost" size="sm" className="h-11 sm:h-8" aria-label={`Delete ${activity.activity_type?.name}`}>
                        Delete
                      </Button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
