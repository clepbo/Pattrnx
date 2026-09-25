import Link from "next/link";

const ITEMS = [
  { href: "/reviews", label: "Weekly review" },
  { href: "/patterns", label: "Patterns" },
  { href: "/experiments", label: "Experiments" },
] as const;

/** Sub-navigation for the Insights area (reviews, patterns, experiments). */
export function InsightsNav({ current }: { current: (typeof ITEMS)[number]["href"] }) {
  return (
    <nav aria-label="Insights" className="-mx-1 flex gap-1 overflow-x-auto">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.href === current ? "page" : undefined}
          className="hover:bg-muted aria-[current=page]:bg-muted inline-flex h-11 shrink-0 items-center rounded-lg px-3 text-sm aria-[current=page]:font-medium"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
