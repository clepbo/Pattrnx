import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { deleteGoal, setGoalStatus } from "@/features/goals/actions";
import { FeasibilityCard } from "@/features/goals/components/feasibility-card";
import { HealthCard } from "@/features/goals/components/health-card";
import {
  AddActionForm,
  AddMilestoneForm,
  AddStrategyForm,
  LogOutcomeForm,
  ScheduleActionForm,
} from "@/features/goals/components/goal-sections";
import { ItemButton } from "@/features/goals/components/item-button";
import { describeFeasibility } from "@/features/goals/feasibility-copy";
import { assertLocalDate, diffDays } from "@/lib/dates";
import { formatAmount, formatLocalDate, formatPercent } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { currentValue, milestoneProgress, outcomeProgress } from "@/server/engines/progress/current-value";
import { listActivityTypes } from "@/server/services/activity-types";
import { type GoalDetail, getGoal, toGoalInput } from "@/server/services/goals";

export const metadata: Metadata = { title: "Goal" };

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MILESTONE_LABELS = { pending: "Not started", in_progress: "In progress", done: "Done", dropped: "Dropped" } as const;
const TASK_LABELS = { planned: "Planned", done: "Done", done_minimum: "Done (minimum)", skipped: "Skipped" } as const;

function Section({ title, children, id }: { title: string; children: React.ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="grid gap-4">
      <h2 id={id} className="text-lg font-medium">
        {title}
      </h2>
      {children}
    </section>
  );
}

function milestoneContext(detail: GoalDetail) {
  const { goal, milestones, today } = detail;
  if (goal.measurement_type !== "milestone" || !goal.deadline) return undefined;
  const counted = milestones.filter((m) => m.status !== "dropped");
  const total = diffDays(assertLocalDate(goal.start_date), assertLocalDate(goal.deadline));
  return {
    done: counted.filter((m) => m.status === "done").length,
    total: counted.length,
    elapsed: Math.min(1, Math.max(0, diffDays(assertLocalDate(goal.start_date), today) / total)),
  };
}

export default async function GoalPage({ params, searchParams }: PageProps<"/goals/[goalId]">) {
  const user = await requireUser();
  const [{ goalId }, { created }] = await Promise.all([params, searchParams]);
  const [detail, activityTypes] = await Promise.all([getGoal(user, goalId), listActivityTypes(user)]);
  if (!detail) notFound();

  const { goal, strategies, milestones, actions, outcomes, routines, feasibility, health, weeks, today } = detail;
  const numeric = goal.measurement_type !== "milestone";
  const input = toGoalInput(goal, outcomes, milestones);
  const current = currentValue(input);
  const progress = numeric ? outcomeProgress(input) : milestoneProgress(input);
  const copy = describeFeasibility(feasibility, {
    unit: goal.unit,
    targetValue: goal.target_value,
    deadline: goal.deadline ? assertLocalDate(goal.deadline) : null,
    milestones: milestoneContext(detail),
  });
  const unassigned = actions.filter((a) => !a.milestone_id);

  const renderAction = (action: GoalDetail["actions"][number]) => (
    <li key={action.id} className="border-border grid gap-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className={action.status === "done" ? "text-muted-foreground line-through" : ""}>{action.title}</span>
        <ItemButton goalId={goal.id} id={action.id} command="delete-action" label={`Delete ${action.title}`}>
          Delete
        </ItemButton>
      </div>
      {action.task && (
        <p className="text-muted-foreground text-sm">
          {TASK_LABELS[action.task.status]} for {formatLocalDate(assertLocalDate(action.task.scheduled_date))}
        </p>
      )}
      {(!action.task || action.task.status === "planned") && action.status !== "done" && (
        <div className="flex flex-wrap items-end gap-2">
          <ScheduleActionForm
            goalId={goal.id}
            actionId={action.id}
            defaultDate={action.task?.scheduled_date ?? today}
            rescheduling={Boolean(action.task)}
          />
          {action.task && (
            <ItemButton goalId={goal.id} id={action.id} command="unschedule-action" variant="outline">
              Unschedule
            </ItemButton>
          )}
        </div>
      )}
    </li>
  );

  return (
    <div className="grid gap-10">
      <div className="grid gap-3">
        <Link href="/goals" className="text-muted-foreground text-sm hover:underline">
          ← Goals
        </Link>
        {created && (
          <p role="status" className="bg-muted rounded-lg px-3 py-2 text-sm">
            Goal created. Next, break it into milestones and actions, or add a routine.
          </p>
        )}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">{goal.title}</h1>
            <p className="text-muted-foreground text-sm">
              {goal.life_area?.name}
              {goal.deadline && ` · by ${formatLocalDate(assertLocalDate(goal.deadline))}`}
              {goal.status !== "active" && ` · ${goal.status}`}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/goals/${goal.id}/edit`}>Edit</Link>
          </Button>
        </div>
        {goal.motivation && <p className="text-sm italic">“{goal.motivation}”</p>}
      </div>

      {goal.status === "active" && (
        <>
          <HealthCard health={health} weeks={weeks} />
          <FeasibilityCard copy={copy} />
        </>
      )}

      <Section title="Progress" id="progress-heading">
        {progress !== null && (
          <div className="grid gap-2">
            <div className="flex justify-between text-sm">
              <span>
                {numeric && current !== null && goal.target_value !== null
                  ? `${formatAmount(current, goal.unit)} of ${formatAmount(goal.target_value, goal.unit)}`
                  : "Milestones done"}
              </span>
              <span className="font-medium">{formatPercent(progress)}</span>
            </div>
            <div
              className="bg-muted h-2 overflow-hidden rounded-full"
              role="progressbar"
              aria-label="Progress towards target"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
            >
              <div className="bg-primary h-full" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        )}
        <LogOutcomeForm goalId={goal.id} today={today} unit={goal.unit} numeric={numeric} />
        {outcomes.length > 0 && (
          <ul className="grid gap-1">
            {outcomes.slice(0, 10).map((outcome) => (
              <li key={outcome.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  <span className="text-muted-foreground">{formatLocalDate(assertLocalDate(outcome.local_date))}</span>
                  {outcome.value !== null && ` · ${goal.measurement_type === "cumulative" && outcome.value > 0 ? "+" : ""}${formatAmount(outcome.value, goal.unit)}`}
                  {outcome.description && ` · ${outcome.description}`}
                </span>
                <ItemButton goalId={goal.id} id={outcome.id} command="delete-outcome" label="Delete entry">
                  Delete
                </ItemButton>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Strategy" id="strategy-heading">
        {strategies.length === 0 ? (
          <p className="text-muted-foreground text-sm">How do you intend to achieve this? List your main approaches.</p>
        ) : (
          <ul className="grid gap-1">
            {strategies.map((strategy) => (
              <li key={strategy.id} className="flex items-center justify-between gap-2 text-sm">
                <span>{strategy.description}</span>
                <ItemButton goalId={goal.id} id={strategy.id} command="delete-strategy" label={`Remove ${strategy.description}`}>
                  Remove
                </ItemButton>
              </li>
            ))}
          </ul>
        )}
        <AddStrategyForm goalId={goal.id} />
      </Section>

      <Section title="Milestones and actions" id="milestones-heading">
        {milestones.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Break the goal into stages. Each milestone can hold concrete actions you schedule onto a day.
          </p>
        )}
        <ol className="grid gap-4">
          {milestones.map((milestone) => {
            const items = actions.filter((a) => a.milestone_id === milestone.id);
            return (
              <li key={milestone.id} className="border-border grid gap-3 rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="grid gap-0.5">
                    <span className={milestone.status === "done" ? "font-medium line-through" : "font-medium"}>{milestone.title}</span>
                    <span className="text-muted-foreground text-xs">
                      {MILESTONE_LABELS[milestone.status]}
                      {milestone.target_date && ` · target ${formatLocalDate(assertLocalDate(milestone.target_date))}`}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {milestone.status === "done" || milestone.status === "dropped" ? (
                      <ItemButton goalId={goal.id} id={milestone.id} command="milestone-reopen" variant="outline">
                        Reopen
                      </ItemButton>
                    ) : (
                      <>
                        <ItemButton goalId={goal.id} id={milestone.id} command="milestone-done" variant="outline">
                          Mark done
                        </ItemButton>
                        <ItemButton goalId={goal.id} id={milestone.id} command="milestone-drop">
                          Drop
                        </ItemButton>
                      </>
                    )}
                    <ItemButton goalId={goal.id} id={milestone.id} command="delete-milestone" label={`Delete ${milestone.title}`}>
                      Delete
                    </ItemButton>
                  </div>
                </div>
                {items.length > 0 && <ul className="grid gap-2">{items.map(renderAction)}</ul>}
              </li>
            );
          })}
        </ol>
        {unassigned.length > 0 && (
          <div className="grid gap-2">
            <h3 className="text-sm font-medium">Other actions</h3>
            <ul className="grid gap-2">{unassigned.map(renderAction)}</ul>
          </div>
        )}
        <AddMilestoneForm goalId={goal.id} />
        <AddActionForm
          goalId={goal.id}
          milestones={milestones.filter((m) => m.status !== "dropped").map((m) => ({ id: m.id, title: m.title }))}
          activityTypes={activityTypes.map((t) => ({ id: t.id, name: t.name }))}
        />
      </Section>

      <Section title="Routines" id="routines-heading">
        {routines.length === 0 ? (
          <p className="text-muted-foreground text-sm">Routines are recurring commitments, like practising three times a week.</p>
        ) : (
          <ul className="grid gap-2">
            {routines.map((routine) => (
              <li key={routine.id} className="text-sm">
                <Link href={`/routines/${routine.id}`} className="underline-offset-4 hover:underline">
                  {routine.name}
                </Link>
                <span className="text-muted-foreground">
                  {" "}
                  · {routine.days_of_week.map((d) => DAY_NAMES[d]).join(", ")} · {routine.normal_minutes} min
                </span>
              </li>
            ))}
          </ul>
        )}
        <Button asChild variant="outline" className="justify-self-start">
          <Link href={`/routines/new?goalId=${goal.id}`}>Add a routine for this goal</Link>
        </Button>
      </Section>

      <Section title="Goal status" id="status-heading">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["active", "Resume"],
              ["paused", "Pause"],
              ["completed", "Mark complete"],
              ["abandoned", "Stop pursuing"],
            ] as const
          )
            .filter(([status]) => status !== goal.status)
            .filter(([status]) => status !== "active" || goal.status !== "active")
            .map(([status, label]) => (
              <form key={status} action={setGoalStatus}>
                <input type="hidden" name="goalId" value={goal.id} />
                <input type="hidden" name="status" value={status} />
                <Button type="submit" variant="outline">
                  {label}
                </Button>
              </form>
            ))}
        </div>
        <details className="text-sm">
          <summary className="text-muted-foreground cursor-pointer">Delete this goal</summary>
          <div className="mt-3 grid gap-2">
            <p>
              Deleting removes its milestones, actions, progress entries and planned tasks. Activities you logged stay in your
              history. Stopping or completing the goal keeps everything instead.
            </p>
            <form action={deleteGoal}>
              <input type="hidden" name="goalId" value={goal.id} />
              <Button type="submit" variant="destructive">
                Delete goal permanently
              </Button>
            </form>
          </div>
        </details>
        {goal.status !== "active" && (
          <StatusBadge tone="neutral" className="justify-self-start">
            Feasibility is only checked for active goals
          </StatusBadge>
        )}
      </Section>
    </div>
  );
}
