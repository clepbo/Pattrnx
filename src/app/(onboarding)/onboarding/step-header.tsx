export function StepHeader({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="grid gap-1">
      <p className="text-muted-foreground text-sm">Step {step} of 3</p>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
