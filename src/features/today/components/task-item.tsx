"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";

import { removeTask, updateTaskStatus } from "../actions";

export interface TaskView {
  id: string;
  title: string;
  status: "planned" | "done" | "done_minimum" | "skipped";
  source: "manual" | "action" | "routine";
  plannedMinutes: number | null;
  minimumMinutes: number | null;
  scheduledTime: string | null;
  goalTitle: string | null;
  fallback: string | null;
  missed: boolean;
}

const DONE_LABELS = { done: "Done", done_minimum: "Done (minimum)", skipped: "Skipped" } as const;

function StatusButton({ taskId, status, children, variant = "outline" }: {
  taskId: string;
  status: TaskView["status"];
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost";
}) {
  const [state, action, pending] = useActionState(updateTaskStatus, null);
  return (
    <form action={action}>
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" variant={variant} disabled={pending} aria-disabled={pending}>
        {children}
      </Button>
      {state && !state.ok && (
        <p role="alert" className="text-destructive mt-1 text-xs">
          {state.error.message}
        </p>
      )}
    </form>
  );
}

export function TaskItem({ task }: { task: TaskView }) {
  const finished = task.status !== "planned";
  const details = [
    task.scheduledTime?.slice(0, 5),
    task.plannedMinutes && `${task.plannedMinutes} min`,
    task.goalTitle,
  ].filter(Boolean);

  return (
    <li className="border-border grid gap-3 rounded-xl border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid gap-0.5">
          <span className={finished ? "text-muted-foreground font-medium line-through" : "font-medium"}>{task.title}</span>
          {details.length > 0 && <span className="text-muted-foreground text-xs">{details.join(" · ")}</span>}
        </div>
        {finished ? (
          <StatusBadge tone={task.status === "skipped" ? "neutral" : "positive"}>{DONE_LABELS[task.status as keyof typeof DONE_LABELS]}</StatusBadge>
        ) : (
          task.missed && <StatusBadge tone="neutral">Not done</StatusBadge>
        )}
      </div>
      {!finished && task.minimumMinutes && task.fallback && (
        <p className="text-muted-foreground text-xs">Minimum version: {task.fallback}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {finished ? (
          <StatusButton taskId={task.id} status="planned" variant="ghost">
            Undo
          </StatusButton>
        ) : (
          <>
            <StatusButton taskId={task.id} status="done" variant="default">
              Done
            </StatusButton>
            {task.minimumMinutes && task.minimumMinutes !== task.plannedMinutes && (
              <StatusButton taskId={task.id} status="done_minimum">
                {`Did ${task.minimumMinutes} min`}
              </StatusButton>
            )}
            <StatusButton taskId={task.id} status="skipped" variant="ghost">
              Skip
            </StatusButton>
            {task.source === "manual" && (
              <form action={removeTask}>
                <input type="hidden" name="taskId" value={task.id} />
                <Button type="submit" variant="ghost">
                  Remove
                </Button>
              </form>
            )}
          </>
        )}
      </div>
    </li>
  );
}
