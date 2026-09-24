import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground text-sm">It may have moved, or it doesn&apos;t exist.</p>
      <Link href="/" className="text-sm underline underline-offset-4">
        Go home
      </Link>
    </main>
  );
}
