import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-accent text-accent-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-muted-foreground",
        success: "border-transparent bg-success/12 text-success",
        warning:
          "border-transparent bg-warning/15 text-[color-mix(in_oklch,var(--warning)_70%,var(--foreground))]",
        danger: "border-transparent bg-destructive/10 text-destructive",
        info: "border-transparent bg-info/12 text-info",
        demo: "border-dashed border-warning/60 bg-warning/8 text-[color-mix(in_oklch,var(--warning)_65%,var(--foreground))]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
export { Badge, badgeVariants };
