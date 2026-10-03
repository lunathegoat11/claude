import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
  optional,
}: {
  label: string;
  htmlFor: string;
  hint?: React.ReactNode;
  error?: string[] | string;
  children: React.ReactNode;
  className?: string;
  optional?: boolean;
}) {
  const msg = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="flex items-baseline gap-1.5">
        {label}
        {optional && <span className="text-muted-foreground text-xs font-normal">Optional</span>}
      </Label>
      {children}
      {msg ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-destructive text-[13px]">
          {msg}
        </p>
      ) : hint ? (
        <p className="text-muted-foreground text-[13px]">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="text-muted-foreground text-[13px]">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="border-destructive/25 bg-destructive/6 text-destructive rounded-xl border px-3.5 py-2.5 text-sm"
    >
      {message}
    </div>
  );
}
