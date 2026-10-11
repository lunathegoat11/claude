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
      className={cn("surface flex flex-col items-start", compact ? "p-5" : "p-6 sm:p-8", className)}
    >
      <Icon className="text-primary mb-3 size-6" aria-hidden />
      <h3 className="text-xl font-semibold">{title}</h3>
      {description && (
        <p className="text-muted-foreground mt-1.5 max-w-lg text-pretty">{description}</p>
      )}
      {action && <div className="mt-5 flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}
