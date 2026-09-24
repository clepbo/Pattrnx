import type { LocalDate } from "@/lib/dates";

/** Inputs and outputs of the pattern engine (ARCHITECTURE.md §8.3–8.4). */

export type PatternKind = "frequency" | "deviation" | "timing" | "streak" | "breaking_point" | "sequence" | "loop";
export type Confidence = "low" | "moderate" | "high" | "very_high";
export type TaskStatus = "planned" | "done" | "done_minimum" | "skipped";

export interface SnapshotTask {
  id: string;
  routineId: string | null;
  goalId: string | null;
  scheduledDate: LocalDate;
  plannedMinutes: number | null;
  status: TaskStatus;
}

export interface SnapshotRoutine {
  id: string;
  name: string;
  lifeAreaId: string;
  createdDate: LocalDate;
  /** When it was paused or archived, if it currently is. */
  endedDate: LocalDate | null;
}

export interface SnapshotGoal {
  id: string;
  title: string;
  lifeAreaId: string;
  createdDate: LocalDate;
  status: "draft" | "active" | "paused" | "completed" | "abandoned";
  statusChangedDate: LocalDate;
}

export interface SnapshotActivity {
  typeId: string;
  localDate: LocalDate;
  localHour: number;
  /** Logged more than a day after it happened; its hour isn't trusted for timing. */
  backfilled: boolean;
}

export interface SnapshotActivityType {
  id: string;
  name: string;
  polarity: "desired" | "undesired" | "neutral";
}

export interface SnapshotCheckin {
  localDate: LocalDate;
  sleepHours: number | null;
  stress: number | null;
  workload: number | null;
}

/** Everything detectors may look at. Built by the patterns service; dates are user-local. */
export interface PatternSnapshot {
  today: LocalDate;
  /** Earliest date the snapshot covers for tasks, activities and check-ins. */
  windowStart: LocalDate;
  /** First day the user had any task or activity (for the 21-day history gate). */
  historyStart: LocalDate | null;
  lifeAreas: { id: string; name: string }[];
  routines: SnapshotRoutine[];
  goals: SnapshotGoal[];
  tasks: SnapshotTask[];
  activities: SnapshotActivity[];
  activityTypes: SnapshotActivityType[];
  checkins: SnapshotCheckin[];
}

export interface Candidate {
  detectorKey: string;
  kind: PatternKind;
  /** Stable identity (detector + subject); feedback and suppression attach to it. */
  fingerprint: string;
  subject: Record<string, string>;
  observations: number;
  /** Strength in the pattern's direction, 0–1. */
  effectSize: number;
  /** Two-proportion (or binomial) z statistic, when the detector runs a test. */
  z: number | null;
  /** How many tests the detector ran to find this one (Bonferroni: the required z rises with it). */
  comparisons: number;
  evidence: Record<string, unknown>;
  /** Values for the language template. */
  vars: Record<string, string | number>;
}

export interface Detector {
  key: string;
  kind: PatternKind;
  version: number;
  /** Smallest effect that makes a candidate; halves must reach half of it to count as consistent. */
  minEffect: number;
  detect(snapshot: PatternSnapshot): Candidate[];
  /** The same measure for an existing fingerprint on a sub-window (split-half consistency). */
  effectFor(snapshot: PatternSnapshot, candidate: Candidate): number | null;
  /** Detectors whose evidence isn't a sample (e.g. loops) set confidence directly. */
  confidence?(candidate: Candidate): Confidence;
}

export interface DetectedPattern extends Candidate {
  detectorVersion: number;
  confidence: Confidence;
  consistent: boolean | null;
  summary: string;
  windowStart: LocalDate;
  windowEnd: LocalDate;
}
