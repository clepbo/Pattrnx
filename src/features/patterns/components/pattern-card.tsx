import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import type { PatternRow } from "@/server/services/patterns";

import { givePatternFeedback } from "../actions";
import { CONFIDENCE_LABELS, FEEDBACK_LABELS, KIND_LABELS } from "../copy";
import { PatternEvidence } from "./pattern-evidence";

const FEEDBACK_OPTIONS = [
  { value: "accurate", label: "Accurate" },
  { value: "partially_accurate", label: "Partly" },
  { value: "not_accurate", label: "Not accurate" },
  { value: "suppress", label: "Don't show again" },
] as const;

export function PatternCard({ pattern }: { pattern: PatternRow }) {
  const confidence = CONFIDENCE_LABELS[pattern.confidence];
  return (
    <article className="border-border grid gap-3 rounded-xl border p-4" aria-label={KIND_LABELS[pattern.kind]}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone="neutral">{KIND_LABELS[pattern.kind]}</StatusBadge>
        {confidence && <StatusBadge tone={confidence.tone}>{confidence.label}</StatusBadge>}
      </div>
      <p>{pattern.summary}</p>
      <PatternEvidence pattern={pattern} />
      {pattern.feedback && FEEDBACK_LABELS[pattern.feedback] ? (
        <p className="text-muted-foreground text-xs">{FEEDBACK_LABELS[pattern.feedback]}</p>
      ) : (
        <form action={givePatternFeedback} className="grid gap-2">
          <input type="hidden" name="patternId" value={pattern.id} />
          <p className="text-muted-foreground text-xs" id={`feedback-${pattern.id}`}>
            Does this match your experience?
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`feedback-${pattern.id}`}>
            {FEEDBACK_OPTIONS.map((option) => (
              <Button key={option.value} type="submit" name="feedback" value={option.value} variant={option.value === "suppress" ? "ghost" : "outline"}>
                {option.label}
              </Button>
            ))}
          </div>
        </form>
      )}
    </article>
  );
}
