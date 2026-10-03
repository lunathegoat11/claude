import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-card/50 flex flex-col items-center justify-center rounded-2xl border border-dashed text-center",
        compact ? "px-4 py-8" : "px-6 py-14",
        className,
      )}
    >
      <div className="bg-accent text-accent-foreground mb-4 flex size-12 items-center justify-center rounded-2xl">
        <Icon className="size-6" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && (
        <p className="text-muted-foreground mt-1.5 max-w-sm text-sm text-pretty">{description}</p>
      )}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
