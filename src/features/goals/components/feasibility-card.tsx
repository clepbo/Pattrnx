import { StatusBadge } from "@/components/status-badge";

import type { FeasibilityCopy } from "../feasibility-copy";

export function FeasibilityCard({ copy }: { copy: FeasibilityCopy }) {
  return (
    <section aria-labelledby="feasibility-heading" className="border-border grid gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="feasibility-heading" className="font-medium">
          Feasibility
        </h2>
        <StatusBadge tone={copy.tone}>{copy.label}</StatusBadge>
      </div>
      {copy.sentences.map((sentence) => (
        <p key={sentence} className="text-sm">
          {sentence}
        </p>
      ))}
      {copy.adjustments.length > 0 && (
        <div className="grid gap-1">
          <p className="text-sm font-medium">Ways to close the gap</p>
          <ul className="text-muted-foreground list-disc pl-5 text-sm">
            {copy.adjustments.map((adjustment) => (
              <li key={adjustment}>{adjustment}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-muted-foreground text-xs">This describes the plan, not you. Adjusting the plan is a normal part of making progress.</p>
    </section>
  );
}
