"use client";
import { useRef } from "react";
import { Search, X } from "lucide-react";
import Link from "next/link";

/**
 * GET form for list filters. Works without JavaScript; with JS it submits on
 * change so filters apply immediately.
 */
export function FilterBar({
  action,
  children,
  q,
  placeholder,
  clearHref,
  hidden,
  submitLabel,
}: {
  action: string;
  children?: React.ReactNode;
  q?: string;
  placeholder: string;
  clearHref?: string;
  hidden?: Record<string, string | undefined>;
  submitLabel?: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      action={action}
      method="get"
      role="search"
      onChange={(e) => {
        if ((e.target as HTMLElement).tagName === "SELECT") ref.current?.requestSubmit();
      }}
      className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
    >
      {hidden &&
        Object.entries(hidden).map(([k, v]) =>
          v ? <input key={k} type="hidden" name={k} value={v} /> : null,
        )}
      <div className="relative flex-1 sm:min-w-64">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder={placeholder}
          aria-label={placeholder}
          className="border-input bg-card focus:border-ring focus:ring-ring/20 h-10 w-full rounded-lg border pr-3 pl-9 text-sm shadow-xs outline-none focus:ring-3"
        />
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
      {submitLabel ? (
        <button
          type="submit"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium"
        >
          {submitLabel}
        </button>
      ) : (
        <button type="submit" className="sr-only">
          Apply filters
        </button>
      )}
      {clearHref && (
        <Link
          href={clearHref}
          className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm"
        >
          <X className="size-4" /> Clear
        </Link>
      )}
    </form>
  );
}

export function FilterSelect({
  name,
  value,
  label,
  options,
}: {
  name: string;
  value?: string;
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      name={name}
      defaultValue={value ?? ""}
      aria-label={label}
      className="border-input bg-card focus:border-ring focus:ring-ring/20 h-10 rounded-lg border px-3 pr-8 text-sm shadow-xs outline-none focus:ring-3"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
