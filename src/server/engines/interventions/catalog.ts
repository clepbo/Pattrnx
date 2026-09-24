import { wordingGuard } from "../language/guard";
import type { ExperimentMetric, MetricDirection, MetricSubject } from "../experiments";

/**
 * Interventions catalog (ARCHITECTURE.md §8.5): a detected pattern → one small,
 * testable experiment (blueprint §20: prefer small interventions over motivation).
 * Drafts are suggestions; the user edits them before starting.
 */

export const INTERVENTION_CATALOG_VERSION = 1;

export type InterventionCategory =
  | "reduce"
  | "reschedule"
  | "sequence"
  | "replace"
  | "remove_friction"
  | "add_friction"
  | "environment"
  | "accountability"
  | "strategy_change"
  | "goal_recalibration";

export interface ExperimentDraft {
  title: string;
  hypothesis: string;
  category: InterventionCategory;
  description: string;
  metric: ExperimentMetric;
  subject: MetricSubject;
  direction: MetricDirection;
  durationDays: number;
}

export interface PatternForIntervention {
  detectorKey: string;
  subject: Record<string, string>;
  vars: Record<string, string | number>;
}

type Builder = (p: PatternForIntervention) => ExperimentDraft;

const CATALOG: Record<string, Builder> = {
  "frequency.sustainable_rate": ({ subject, vars }) => {
    const target = Math.max(1, Math.round(Number(vars.done)));
    return {
      title: `Plan ${vars.routine} ${target} times a week`,
      hypothesis: `Planning ${vars.routine} ${target} times a week instead of ${vars.planned} will lead to a higher share of planned sessions getting done.`,
      category: "reduce",
      description: `For three weeks, change ${vars.routine} to ${target} days a week and keep everything else the same.`,
      metric: "task_completion_rate",
      subject: { routineId: subject.routineId },
      direction: "increase",
      durationDays: 21,
    };
  },
  "breaking_point.run_end": ({ subject, vars }) => ({
    title: `Protect session ${vars.next} of ${vars.routine}`,
    hypothesis: `Doing the minimum version of ${vars.routine} on session ${vars.next} of a streak will keep more streaks going.`,
    category: "reduce",
    description: `Whenever you've done ${vars.routine} ${vars.length} times in a row, do only the minimum version next time.`,
    metric: "task_completion_rate",
    subject: { routineId: subject.routineId },
    direction: "increase",
    durationDays: 21,
  }),
  "timing.weekday": ({ subject, vars }) => ({
    title: `Move ${vars.routine} off ${vars.day}s`,
    hypothesis: `Scheduling ${vars.routine} on other days instead of ${vars.day} will raise how often it gets done.`,
    category: "reschedule",
    description: `For two weeks, don't plan ${vars.routine} on ${vars.day}s. Edit the routine's days to try this.`,
    metric: "task_completion_rate",
    subject: { routineId: subject.routineId },
    direction: "increase",
    durationDays: 14,
  }),
  "deviation.overplanning": ({ vars }) => ({
    title: `Cap each day at ${vars.minutes} planned minutes`,
    hypothesis: `Planning no more than ${vars.minutes} minutes a day will lead to a higher share of planned tasks getting done.`,
    category: "reduce",
    description: `For two weeks, keep each day's planned tasks within ${vars.minutes} minutes. Move or drop the rest.`,
    metric: "task_completion_rate",
    subject: {},
    direction: "increase",
    durationDays: 14,
  }),
  "sequence.checkin_conditioned": ({ vars }) => ({
    title: `Go minimal after ${vars.condition}`,
    hypothesis: `Switching to minimum versions after ${vars.condition} will keep more of the plan getting done on those days.`,
    category: "reduce",
    description: `For three weeks, after ${vars.condition}, plan only minimum versions for the next day.`,
    metric: "task_completion_rate",
    subject: {},
    direction: "increase",
    durationDays: 21,
  }),
  "sequence.activity_follows": ({ subject, vars }) => ({
    title: `Plan an alternative after ${vars.after}`,
    hypothesis: `Having a planned alternative ready after ${vars.after} will make ${vars.follow} less frequent.`,
    category: "replace",
    description: `For two weeks, decide in advance what you'll do instead of ${vars.follow} after ${vars.after}.`,
    metric: "active_days",
    subject: { activityTypeId: subject.followedById },
    direction: "decrease",
    durationDays: 14,
  }),
  "timing.hour_band": ({ subject, vars }) => ({
    title: `Schedule ${vars.activity} in the ${vars.band}`,
    hypothesis: `Planning ${vars.activity} for the ${vars.band}, when it usually happens, will make it happen on more days.`,
    category: "reschedule",
    description: `For two weeks, put ${vars.activity} in your plan for the ${vars.band}.`,
    metric: "active_days",
    subject: { activityTypeId: subject.activityTypeId },
    direction: "increase",
    durationDays: 14,
  }),
  "loop.plan_abandon_replan": ({ vars }) => ({
    title: `Keep the current ${vars.area} plan for four weeks`,
    hypothesis: `Adjusting the current ${vars.area} plan instead of starting a new one will lead to more of it getting done.`,
    category: "goal_recalibration",
    description: `For four weeks, don't start new goals or routines in ${vars.area}. If the plan feels too big, halve its pace instead.`,
    metric: "task_completion_rate",
    subject: {},
    direction: "increase",
    durationDays: 28,
  }),
};

export function suggestExperiment(pattern: PatternForIntervention): ExperimentDraft | null {
  const build = CATALOG[pattern.detectorKey];
  if (!build) return null;
  const draft = build(pattern);
  // BR-1 applies to suggestions too.
  wordingGuard(`${draft.title} ${draft.hypothesis} ${draft.description}`);
  return draft;
}

export function hasIntervention(detectorKey: string): boolean {
  return detectorKey in CATALOG;
}
