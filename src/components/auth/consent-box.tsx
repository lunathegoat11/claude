"use client";

export function ConsentBox({
  name,
  error,
  children,
  checked,
  onCheckedChange,
}: {
  name: string;
  error?: string[];
  children: React.ReactNode;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <div>
      <label className="text-muted-foreground flex items-start gap-3 text-sm leading-relaxed pointer-coarse:py-2.5">
        <input
          type="checkbox"
          name={name}
          aria-invalid={!!error}
          {...(onCheckedChange
            ? { checked: !!checked, onChange: (e) => onCheckedChange(e.target.checked) }
            : {})}
          className="mt-1 size-5 shrink-0 rounded accent-[var(--primary)]"
        />
        <span>{children}</span>
      </label>
      {error && (
        <p role="alert" className="text-destructive mt-1 pl-8 text-[13px]">
          {error[0]}
        </p>
      )}
    </div>
  );
}

// India's DPDP Act 2023 treats anyone under 18 as a child; Kosha is for adults only. The
// age box text is "account.consent.age".
