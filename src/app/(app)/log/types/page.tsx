import type { Metadata } from "next";
import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { activityTypeCommand } from "@/features/activities/actions";
import { ActivityTypeForm } from "@/features/activities/components/activity-type-form";
import { requireUser } from "@/server/auth";
import { listActivityTypes } from "@/server/services/activity-types";
import { listLifeAreas } from "@/server/services/life-areas";
import { getProfile } from "@/server/services/profile";

export const metadata: Metadata = { title: "Activity types" };

const POLARITY = { desired: "More of", undesired: "Less of", neutral: "Tracking" } as const;

function Command({ id, command, children }: { id: string; command: string; children: React.ReactNode }) {
  return (
    <form action={activityTypeCommand}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="command" value={command} />
      <Button type="submit" variant="ghost" size="sm" className="h-11 sm:h-8">
        {children}
      </Button>
    </form>
  );
}

export default async function ActivityTypesPage() {
  const user = await requireUser();
  const [types, areas, profile] = await Promise.all([
    listActivityTypes(user, { includeArchived: true }),
    listLifeAreas(user),
    getProfile(user),
  ]);

  return (
    <div className="grid gap-8">
      <div className="grid gap-1">
        <Link href="/log" className="text-muted-foreground text-sm hover:underline">
          ← Log
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Activity types</h1>
        <p className="text-muted-foreground text-sm">
          Every activity you log belongs to a type, so Pattrnx can spot patterns across days.
        </p>
      </div>
      <ul className="grid gap-2">
        {types.map((type) => (
          <li key={type.id} className="border-border flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3">
            <div className="grid gap-0.5">
              <span className={type.archived_at ? "text-muted-foreground font-medium" : "font-medium"}>{type.name}</span>
              <span className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                {type.life_area?.name}
                <StatusBadge tone="neutral">{POLARITY[type.polarity]}</StatusBadge>
                {type.is_quick_log && !type.archived_at && <StatusBadge tone="neutral">One-tap</StatusBadge>}
                {type.archived_at && <StatusBadge tone="neutral">Archived</StatusBadge>}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {!type.archived_at && (
                <Command id={type.id} command={type.is_quick_log ? "quick-off" : "quick-on"}>
                  {type.is_quick_log ? "Remove one-tap" : "Make one-tap"}
                </Command>
              )}
              <Command id={type.id} command={type.archived_at ? "restore" : "archive"}>
                {type.archived_at ? "Restore" : "Archive"}
              </Command>
            </div>
          </li>
        ))}
      </ul>
      <section aria-labelledby="new-type-heading" className="grid gap-4">
        <h2 id="new-type-heading" className="text-lg font-medium">
          New activity type
        </h2>
        <ActivityTypeForm areas={areas.map((a) => ({ id: a.id, name: a.name }))} currency={profile.currency} />
      </section>
    </div>
  );
}
