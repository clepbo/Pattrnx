import { addDays, diffDays, type LocalDate } from "@/lib/dates";

import type { PatternSnapshot, SnapshotTask } from "./types";

export const isDone = (task: SnapshotTask) => task.status === "done" || task.status === "done_minimum";

/** Due = an earlier day, or today and already finished. Today's open tasks aren't missed yet (BR-4). */
export function dueTasks(snapshot: PatternSnapshot): SnapshotTask[] {
  return snapshot.tasks.filter(
    (t) => t.scheduledDate >= snapshot.windowStart && (t.scheduledDate < snapshot.today || (t.scheduledDate === snapshot.today && t.status !== "planned")),
  );
}

export function windowDays(snapshot: PatternSnapshot): number {
  return diffDays(snapshot.windowStart, snapshot.today) + 1;
}

/** The snapshot restricted to [from, to]; `today` becomes the day after `to` so every task in range is due. */
export function sliceSnapshot(snapshot: PatternSnapshot, from: LocalDate, to: LocalDate): PatternSnapshot {
  const inRange = (date: LocalDate) => date >= from && date <= to;
  return {
    ...snapshot,
    windowStart: from,
    today: to >= snapshot.today ? snapshot.today : addDays(to, 1),
    tasks: snapshot.tasks.filter((t) => inRange(t.scheduledDate)),
    activities: snapshot.activities.filter((a) => inRange(a.localDate)),
    checkins: snapshot.checkins.filter((c) => inRange(c.localDate)),
  };
}

/** The first and second half of the snapshot's window. */
export function halves(snapshot: PatternSnapshot): [PatternSnapshot, PatternSnapshot] {
  const mid = addDays(snapshot.windowStart, Math.floor(windowDays(snapshot) / 2));
  return [sliceSnapshot(snapshot, snapshot.windowStart, addDays(mid, -1)), sliceSnapshot(snapshot, mid, snapshot.today)];
}

export function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = groups.get(k);
    if (list) list.push(item);
    else groups.set(k, [item]);
  }
  return groups;
}

export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
