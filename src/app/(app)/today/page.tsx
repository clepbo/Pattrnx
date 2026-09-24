import type { Metadata } from "next";
import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { CheckinForm } from "@/features/activities/components/checkin-form";
import { QuickLog } from "@/features/activities/components/quick-log";
import { HEALTH_LABELS } from "@/features/goals/health-copy";
import { AddTaskForm } from "@/features/today/components/add-task-form";
import { TaskItem, type TaskView } from "@/features/today/components/task-item";
import { assertLocalDate, localHourOf } from "@/lib/dates";
import { formatLocalDate } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { isMoneyType, listActivityTypes, quickLogMinutes } from "@/server/services/activity-types";
import { getCheckin } from "@/server/services/checkins";
import { listGoals } from "@/server/services/goals";
import { getProfile } from "@/server/services/profile";
import { getDayPlan, type TaskRow } from "@/server/services/tasks";

export const metadata: Metadata = { title: "Today" };

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// PRD F6: grouped by the goal's priority. Tasks without a goal count as maintenance.
const GROUPS = [
  { key: 1, title: "High priority" },
  { key: 2, title: "Maintenance" },
  { key: 3, title: "Optional" },
] as const;

function toView(task: TaskRow, today: string): TaskView {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    source: task.source,
    plannedMinutes: task.planned_minutes,
    minimumMinutes: task.minimum_minutes,
    scheduledTime: task.scheduled_time,
    goalTitle: task.goal?.title ?? null,
    fallback: task.routine?.fallback_description ?? null,
    missed: task.status === "planned" && task.scheduled_date < today,
  };
}

export default async function TodayPage() {
  const user = await requireUser();
  const profile = await getProfile(user);
  const [plan, types, goals] = await Promise.all([getDayPlan(user), listActivityTypes(user), listGoals(user, { statuses: ["active"] })]);
  const checkin = await getCheckin(user, plan.today);
  const done = plan.tasks.filter((t) => t.status === "done" || t.status === "done_minimum").length;
  const missedRecent = plan.recent.filter((t) => t.status === "planned");

  return (
    <div className="grid gap-10">
      <div className="grid gap-1">
        <p className="text-muted-foreground text-sm">{formatLocalDate(plan.today, { year: undefined, weekday: "long", month: "long" })}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting(localHourOf(new Date(), profile.timezone))}
          {profile.display_name ? `, ${profile.display_name}` : ""}
        </h1>
        {plan.tasks.length > 0 && (
          <p className="text-muted-foreground text-sm">
            {done} of {plan.tasks.length} planned tasks done
          </p>
        )}
      </div>

      <section aria-labelledby="focus-heading" className="grid gap-4">
        <h2 id="focus-heading" className="text-lg font-medium">
          Today&apos;s focus
        </h2>
        {plan.tasks.length === 0 ? (
          <div className="border-border grid gap-3 rounded-xl border border-dashed p-4">
            <p className="text-muted-foreground text-sm">
              {goals.length === 0
                ? "Nothing is planned yet. Start with a goal, then add a routine or schedule an action."
                : "Nothing is planned for today. Add a routine, schedule an action from a goal, or add a task below."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={goals.length === 0 ? "/goals/new" : "/routines/new"}>{goals.length === 0 ? "Create a goal" : "Add a routine"}</Link>
              </Button>
            </div>
          </div>
        ) : (
          GROUPS.map((group) => {
            const tasks = plan.tasks.filter((t) => (t.goal?.priority ?? 2) === group.key);
            if (tasks.length === 0) return null;
            return (
              <div key={group.key} className="grid gap-2">
                <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{group.title}</h3>
                <ul className="grid gap-2">
                  {tasks.map((task) => (
                    <TaskItem key={task.id} task={toView(task, plan.today)} />
                  ))}
                </ul>
              </div>
            );
          })
        )}
        <AddTaskForm today={plan.today} goals={goals.map(({ goal }) => ({ id: goal.id, title: goal.title }))} />
      </section>

      <section aria-labelledby="quick-log-heading" className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="quick-log-heading" className="text-lg font-medium">
            Quick log
          </h2>
          <Link href="/log" className="text-muted-foreground text-sm underline-offset-4 hover:underline">
            Log something else
          </Link>
        </div>
        <QuickLog
          types={types
            .filter((t) => t.is_quick_log)
            .map((t) => ({ id: t.id, name: t.name, durationMinutes: quickLogMinutes(t), needsAmount: isMoneyType(t) }))}
        />
      </section>

      <section aria-labelledby="checkin-heading" className="grid gap-4">
        <div className="grid gap-1">
          <h2 id="checkin-heading" className="text-lg font-medium">
            Daily check-in
          </h2>
          <p className="text-muted-foreground text-sm">Optional. Context like sleep and workload helps explain patterns later.</p>
        </div>
        <CheckinForm
          date={plan.today}
          values={{
            sleepHours: checkin?.sleep_hours?.toString() ?? "",
            energy: checkin?.energy?.toString() ?? "",
            mood: checkin?.mood?.toString() ?? "",
            stress: checkin?.stress?.toString() ?? "",
            workload: checkin?.workload?.toString() ?? "",
            note: checkin?.note ?? "",
          }}
        />
      </section>

      {goals.length > 0 && (
        <section aria-labelledby="goals-heading" className="grid gap-3">
          <h2 id="goals-heading" className="text-lg font-medium">
            Active goals
          </h2>
          <ul className="grid gap-2">
            {goals.map(({ goal, health }) => (
              <li key={goal.id}>
                <Link href={`/goals/${goal.id}`} className="border-border hover:bg-muted flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                  <span className="text-sm">{goal.title}</span>
                  <StatusBadge tone={HEALTH_LABELS[health.state].tone}>{HEALTH_LABELS[health.state].label}</StatusBadge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {plan.recent.length > 0 && (
        <section aria-labelledby="recent-heading" className="grid gap-4">
          <div className="grid gap-1">
            <h2 id="recent-heading" className="text-lg font-medium">
              Earlier this week
            </h2>
            <p className="text-muted-foreground text-sm">
              {missedRecent.length > 0
                ? `${missedRecent.length} planned ${missedRecent.length === 1 ? "task wasn't" : "tasks weren't"} marked. If you did them, mark them done so your record is accurate.`
                : "Everything from the past few days is marked."}
            </p>
          </div>
          {[...new Set(plan.recent.map((t) => t.scheduled_date))].map((date) => (
            <div key={date} className="grid gap-2">
              <h3 className="text-muted-foreground text-sm font-medium">{formatLocalDate(assertLocalDate(date))}</h3>
              <ul className="grid gap-2">
                {plan.recent
                  .filter((t) => t.scheduled_date === date)
                  .map((task) => (
                    <TaskItem key={task.id} task={toView(task, plan.today)} />
                  ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
