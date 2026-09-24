/**
 * Synthetic users for pattern-engine tests (ARCHITECTURE.md §12.2). Each persona
 * plants one known pattern; `noise` has no structure at all. Deterministic: a
 * seeded PRNG, a fixed "today".
 */
import { addDays, assertLocalDate, eachDay, type LocalDate, weekdayOf } from "@/lib/dates";
import type {
  PatternSnapshot,
  SnapshotActivity,
  SnapshotCheckin,
  SnapshotTask,
  TaskStatus,
} from "@/server/engines/patterns/types";

export const TODAY = assertLocalDate("2026-09-24");
export const WINDOW_START = addDays(TODAY, -89);

/** mulberry32: small, fast, seedable. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Builder {
  snapshot: PatternSnapshot = {
    today: TODAY,
    windowStart: WINDOW_START,
    historyStart: WINDOW_START,
    lifeAreas: [{ id: "area-career", name: "Career" }, { id: "area-finance", name: "Finance" }],
    routines: [],
    goals: [],
    tasks: [],
    activities: [],
    activityTypes: [],
    checkins: [],
  };
  private taskCount = 0;

  constructor(readonly random: () => number) {}

  /** Past days of the window (tasks for today are left planned). */
  days(): LocalDate[] {
    return eachDay(WINDOW_START, addDays(TODAY, -1));
  }

  routine(id: string, name: string, weekdays: number[], done: (date: LocalDate, index: number) => boolean, minutes = 30) {
    this.snapshot.routines.push({ id, name, lifeAreaId: "area-career", createdDate: WINDOW_START, endedDate: null });
    let index = 0;
    for (const date of this.days()) {
      if (!weekdays.includes(weekdayOf(date))) continue;
      this.task(date, done(date, index++) ? "done" : "skipped", minutes, id);
    }
    return this;
  }

  task(date: LocalDate, status: TaskStatus, minutes: number | null = 30, routineId: string | null = null) {
    const task: SnapshotTask = { id: `task-${++this.taskCount}`, routineId, goalId: null, scheduledDate: date, plannedMinutes: minutes, status };
    this.snapshot.tasks.push(task);
    return this;
  }

  type(id: string, name: string, polarity: "desired" | "undesired" | "neutral") {
    this.snapshot.activityTypes.push({ id, name, polarity });
    return this;
  }

  activity(typeId: string, localDate: LocalDate, localHour: number) {
    const activity: SnapshotActivity = { typeId, localDate, localHour, backfilled: false };
    this.snapshot.activities.push(activity);
    return this;
  }

  checkin(checkin: SnapshotCheckin) {
    this.snapshot.checkins.push(checkin);
    return this;
  }

  chance(p: number) {
    return this.random() < p;
  }

  int(min: number, max: number) {
    return min + Math.floor(this.random() * (max - min + 1));
  }

  build(): PatternSnapshot {
    return this.snapshot;
  }
}

const WEEKDAYS = [1, 2, 3, 4, 5];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

export const personas = {
  /** Mon–Fri routine done ~90% of the time except Wednesdays (~15%). */
  weekdayDropoff(seed = 1) {
    const b = new Builder(rng(seed));
    return b.routine("r-design", "Design practice", WEEKDAYS, (date) => b.chance(weekdayOf(date) === 3 ? 0.15 : 0.9)).build();
  },

  /** Daily routine done three days in a row, then missed, repeatedly (occasionally four). */
  breakingPoint(seed = 2) {
    const b = new Builder(rng(seed));
    let streak = 0;
    let target = 3;
    return b
      .routine("r-run", "Morning run", EVERY_DAY, () => {
        if (streak < target) {
          streak += 1;
          return true;
        }
        streak = 0;
        target = b.chance(0.2) ? 4 : 3;
        return false;
      })
      .build();
  },

  /** Heavy days (5 × 60 min) get ~40% done; light days (2 × 30 min) ~90%. */
  overplanner(seed = 3) {
    const b = new Builder(rng(seed));
    for (const date of b.days()) {
      const heavy = b.chance(0.5);
      const count = heavy ? 5 : 2;
      for (let i = 0; i < count; i++) b.task(date, b.chance(heavy ? 0.4 : 0.9) ? "done" : "skipped", heavy ? 60 : 30);
    }
    return b.build();
  },

  /** Daily routine drops to ~35% on days after a high-workload check-in, ~90% otherwise. */
  workloadSensitive(seed = 4) {
    const b = new Builder(rng(seed));
    const workload = new Map<string, number>();
    for (const date of eachDay(addDays(WINDOW_START, -1), addDays(TODAY, -1))) {
      const w = b.int(1, 5);
      workload.set(date, w);
      b.checkin({ localDate: date, workload: w, stress: b.int(1, 5), sleepHours: 6 + b.int(0, 20) / 10 });
    }
    return b
      .routine("r-portfolio", "Portfolio work", EVERY_DAY, (date) => b.chance((workload.get(addDays(date, -1)) ?? 1) >= 4 ? 0.35 : 0.9))
      .build();
  },

  /** Discretionary spending usually follows a difficult meeting the same evening. */
  spendingAfterMeetings(seed = 5) {
    const b = new Builder(rng(seed)).type("t-meeting", "Difficult meeting", "neutral").type("t-spend", "Discretionary spending", "undesired");
    for (const date of b.days()) {
      if (b.chance(0.35)) {
        b.activity("t-meeting", date, 14);
        if (b.chance(0.75)) b.activity("t-spend", date, 19);
      } else if (b.chance(0.1)) {
        b.activity("t-spend", date, 12);
      }
    }
    return b.build();
  },

  /** Planned five times a week, done a little under three. */
  unsustainable(seed = 6) {
    const b = new Builder(rng(seed));
    return b.routine("r-gym", "Gym", WEEKDAYS, () => b.chance(0.55)).build();
  },

  /** Most portfolio work happens in the evening. */
  eveningWorker(seed = 7) {
    const b = new Builder(rng(seed)).type("t-portfolio", "Portfolio work", "desired");
    for (const date of b.days()) {
      if (b.chance(0.5)) b.activity("t-portfolio", date, b.chance(0.85) ? b.int(18, 21) : b.int(7, 15));
    }
    return b.build();
  },

  /** Two goals in Career abandoned and each quickly replaced by a new one. */
  replanner() {
    const b = new Builder(rng(8));
    b.snapshot.goals.push(
      { id: "g1", title: "Learn UX research", lifeAreaId: "area-career", createdDate: addDays(TODAY, -170), status: "abandoned", statusChangedDate: addDays(TODAY, -140) },
      { id: "g2", title: "Finish UX course", lifeAreaId: "area-career", createdDate: addDays(TODAY, -138), status: "abandoned", statusChangedDate: addDays(TODAY, -100) },
      { id: "g3", title: "Build portfolio", lifeAreaId: "area-career", createdDate: addDays(TODAY, -95), status: "active", statusChangedDate: addDays(TODAY, -95) },
      // A goal completed in another area is not a cycle.
      { id: "g4", title: "Save ₦500k", lifeAreaId: "area-finance", createdDate: addDays(TODAY, -160), status: "completed", statusChangedDate: addDays(TODAY, -60) },
    );
    return b.build();
  },

  /** No structure: everything independent, completion ~85%. */
  noise(seed: number) {
    const b = new Builder(rng(1000 + seed))
      .type("t-work", "Deep work", "desired")
      .type("t-walk", "Walk", "desired")
      .type("t-scroll", "Late-night scrolling", "undesired");
    b.routine("r-daily", "Daily practice", EVERY_DAY, () => b.chance(0.85));
    b.routine("r-weekday", "Weekday study", WEEKDAYS, () => b.chance(0.85));
    for (const date of b.days()) {
      for (let i = b.int(0, 3); i > 0; i--) b.task(date, b.chance(0.85) ? "done" : "skipped", b.int(1, 4) * 15);
      b.checkin({ localDate: date, workload: b.int(1, 5), stress: b.int(1, 5), sleepHours: 4 + b.int(0, 50) / 10 });
      for (const type of ["t-work", "t-walk", "t-scroll"]) if (b.chance(0.4)) b.activity(type, date, b.int(6, 23));
    }
    return b.build();
  },

  /** Ten days of history: too early for patterns (BR-2). */
  newUser() {
    const b = new Builder(rng(9));
    b.snapshot.historyStart = addDays(TODAY, -9);
    return b.build();
  },
};
