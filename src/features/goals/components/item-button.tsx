import { Button } from "@/components/ui/button";

import { goalItemCommand } from "../actions";

/** A one-click command on a goal's child row (delete, mark done…). */
export function ItemButton({
  goalId,
  id,
  command,
  children,
  label,
  variant = "ghost",
}: {
  goalId: string;
  id: string;
  command: string;
  children: React.ReactNode;
  label?: string;
  variant?: "ghost" | "outline";
}) {
  return (
    <form action={goalItemCommand}>
      <input type="hidden" name="goalId" value={goalId} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="command" value={command} />
      <Button type="submit" variant={variant} size="sm" className="h-11 sm:h-8" aria-label={label}>
        {children}
      </Button>
    </form>
  );
}
