import type { Candidate, Confidence } from "../patterns/types";

import { wordingGuard } from "./guard";

/**
 * Plain-language summaries per detector (ARCHITECTURE.md §8.8). Wording gets more
 * tentative at lower confidence. Every output passes `wordingGuard`.
 */

type Vars = Candidate["vars"];

const TEMPLATES: Record<string, (v: Vars) => string> = {
  "timing.weekday": (v) =>
    `${v.routine} gets done ${v.worstRate}% of the time on ${v.day}s (${v.worstDone} of ${v.worstTotal}), compared with ${v.restRate}% on other days.`,
  "frequency.sustainable_rate": (v) =>
    `You've planned ${v.routine} about ${v.planned} times a week and done it about ${v.done} times a week over the last ${v.weeks} weeks. A sustainable plan may be closer to ${v.done} a week.`,
  "deviation.overplanning": (v) =>
    `On days with more than ${v.minutes} minutes planned, ${v.heavyRate}% of tasks got done, compared with ${v.lightRate}% on lighter days.`,
  "timing.hour_band": (v) => `Most of your ${v.activity} (${v.share}%) happens in the ${v.band}.`,
  "breaking_point.run_end": (v) =>
    `${v.routine} tends to slip after ${v.length} sessions in a row: of the ${v.reached} times a streak reached session ${v.next}, ${v.missed} were missed. That session is where momentum usually drops.`,
  "sequence.checkin_conditioned": (v) =>
    `${v.timing} ${v.condition}, ${v.conditionRate}% of planned tasks got done, compared with ${v.otherRate}% otherwise.`,
  "sequence.activity_follows": (v) =>
    `${v.follow} happened within a day after ${v.after} ${v.share}% of the time, compared with ${v.base}% of days overall.`,
  "loop.plan_abandon_replan": (v) =>
    `In ${v.area}, a new plan has started within a few weeks of stepping back from the previous one ${v.cycles} times.`,
};

const PREFIX: Record<Confidence, string> = {
  low: "Possible pattern, not enough evidence yet: ",
  moderate: "Possible pattern: ",
  high: "",
  very_high: "",
};

export function hasTemplate(detectorKey: string): boolean {
  return detectorKey in TEMPLATES;
}

export function summarize(candidate: Pick<Candidate, "detectorKey" | "vars">, confidence: Confidence): string {
  const template = TEMPLATES[candidate.detectorKey];
  if (!template) throw new Error(`No template for ${candidate.detectorKey}`);
  return wordingGuard(PREFIX[confidence] + template(candidate.vars));
}
