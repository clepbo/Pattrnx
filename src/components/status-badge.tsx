import { cn } from "@/lib/utils";

export type Tone = "positive" | "caution" | "negative" | "neutral";

const TONES: Record<Tone, string> = {
  positive: "border-emerald-600/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  caution: "border-amber-600/30 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  negative: "border-rose-600/30 bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
  neutral: "border-border bg-muted text-foreground",
};

/** A text label with a tone. Status is always spelled out, never colour alone. */
export function StatusBadge({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", TONES[tone], className)}>
      {children}
    </span>
  );
}
