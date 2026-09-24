import type { LocalDate } from "@/lib/dates";

/** Engine inputs are plain, camelCase data built by services from DB rows (ARCHITECTURE.md §8). */

export type MeasurementType = "cumulative" | "level" | "milestone";
export type PacePeriod = "day" | "week" | "month";
export type MilestoneStatus = "pending" | "in_progress" | "done" | "dropped";

export interface OutcomeInput {
  localDate: LocalDate;
  /** Cumulative goals: the amount added. Level goals: the new reading. */
  value: number | null;
}

export interface GoalInput {
  measurementType: MeasurementType;
  baselineValue: number | null;
  targetValue: number | null;
  startDate: LocalDate;
  deadline: LocalDate | null;
  plannedPace: { amount: number; period: PacePeriod } | null;
  /** Oldest first. */
  outcomes: OutcomeInput[];
  milestones: { status: MilestoneStatus }[];
}
