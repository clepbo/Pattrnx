import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { saveSettingsProfile } from "@/features/settings/actions";
import { DeleteAccountForm } from "@/features/settings/components/delete-account-form";
import { LifeAreasManager } from "@/features/settings/components/life-areas-manager";
import { ProfileForm } from "@/features/settings/components/profile-form";
import { supportedTimeZones } from "@/lib/time-zones";
import { requireUser } from "@/server/auth";
import { listLifeAreas } from "@/server/services/life-areas";
import { getProfile } from "@/server/services/profile";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const [profile, areas] = await Promise.all([getProfile(user), listLifeAreas(user, { includeArchived: true })]);

  return (
    <div className="grid gap-10">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <section aria-labelledby="profile-heading" className="grid gap-4">
        <h2 id="profile-heading" className="text-lg font-medium">
          Profile
        </h2>
        <ProfileForm
          action={saveSettingsProfile}
          timeZones={supportedTimeZones()}
          submitLabel="Save profile"
          defaults={{
            displayName: profile.display_name ?? "",
            timezone: profile.timezone,
            currency: profile.currency,
            weekStartsOn: profile.week_starts_on,
          }}
        />
        <p className="text-muted-foreground text-xs">
          Changing your timezone affects new entries only. Past activities stay on the day they were logged.
        </p>
      </section>
      <section aria-labelledby="areas-heading" className="grid gap-4">
        <h2 id="areas-heading" className="text-lg font-medium">
          Life areas
        </h2>
        <LifeAreasManager areas={areas.map((a) => ({ id: a.id, name: a.name, archived: a.archived_at !== null }))} />
      </section>
      <section aria-labelledby="data-heading" className="grid gap-4">
        <h2 id="data-heading" className="text-lg font-medium">
          Your data
        </h2>
        <div className="grid gap-2">
          <p className="text-sm">Download everything Pattrnx stores about you, as a JSON file.</p>
          <Button asChild variant="outline" className="justify-self-start">
            {/* A plain link: the route streams a file download. */}
            <a href="/api/export" download>
              Export my data
            </a>
          </Button>
        </div>
        <details className="border-destructive/30 rounded-xl border p-4">
          <summary className="cursor-pointer text-sm font-medium">Delete my account</summary>
          <div className="mt-3 grid gap-3">
            <p className="text-sm">
              This permanently deletes your account and everything in it: goals, routines, logs, check-ins, patterns,
              experiments and reviews. It can&apos;t be undone. Export your data first if you want a copy.
            </p>
            <DeleteAccountForm />
          </div>
        </details>
      </section>
    </div>
  );
}
