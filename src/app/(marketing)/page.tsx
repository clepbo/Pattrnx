import Link from "next/link";

import { Button } from "@/components/ui/button";

export default async function LandingPage({ searchParams }: PageProps<"/">) {
  const { deleted } = await searchParams;
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-4 py-16">
      <p className="text-sm font-semibold tracking-wide">Pattrnx</p>
      {deleted && (
        <p role="status" className="bg-muted rounded-lg px-3 py-2 text-sm">
          Your account and all of its data have been deleted.
        </p>
      )}
      <div className="grid gap-4">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Close the gap between what you intend to do and what you consistently do.
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg text-pretty">
          Set a goal, log what actually happens, and see the patterns that keep repeating. Then test a small change
          and find out whether it helped.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/signup">Create an account</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
      <ol className="text-muted-foreground grid gap-2 text-sm sm:grid-cols-5">
        {["Observe", "Understand", "Intervene", "Experiment", "Adapt"].map((step, index) => (
          <li key={step} className="border-border rounded-lg border px-3 py-2">
            <span className="text-foreground font-medium">{index + 1}.</span> {step}
          </li>
        ))}
      </ol>
    </main>
  );
}
