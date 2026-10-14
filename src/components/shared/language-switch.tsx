"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { setLanguageAction } from "@/actions/language";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/i18n/config";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/** A small language menu. `compact` is for footers; otherwise a labelled field. */
export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label
      className={cn("inline-flex items-center gap-2", compact ? "py-3" : "flex-col items-start")}
    >
      <span className={cn(compact ? "sr-only" : "text-sm font-medium")}>{t("language.label")}</span>
      <span className="relative inline-flex items-center">
        {compact && (
          <Languages className="text-muted-foreground pointer-events-none absolute left-0 size-4" />
        )}
        <select
          value={t.locale}
          disabled={pending}
          onChange={(e) =>
            start(async () => {
              await setLanguageAction(e.target.value as Locale);
              router.refresh();
            })
          }
          className={cn(
            "bg-transparent",
            compact
              ? "hover:text-foreground cursor-pointer pl-6 underline-offset-2 hover:underline"
              : "border-input min-h-11 rounded-2xl border px-4 text-[17px]",
          )}
        >
          {LOCALES.map((l) => (
            <option key={l} value={l} lang={l}>
              {LOCALE_NAMES[l]}
            </option>
          ))}
        </select>
      </span>
      {!compact && <span className="text-muted-foreground text-[13px]">{t("language.hint")}</span>}
    </label>
  );
}
