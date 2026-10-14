"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Laptop, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/i18n/client";

export function ThemeToggle() {
  const t = useT();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("app.theme.change")}>
          {mounted && resolvedTheme === "dark" ? <Moon /> : <Sun />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun className="size-4" /> {t("app.theme.light")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="size-4" /> {t("app.theme.dark")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Laptop className="size-4" /> {t("app.theme.system")}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeSegmented() {
  const t = useT();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const options = [
    { v: "light", label: t("app.theme.light"), icon: Sun },
    { v: "dark", label: t("app.theme.dark"), icon: Moon },
    { v: "system", label: t("app.theme.system"), icon: Laptop },
  ];
  return (
    <div
      role="radiogroup"
      aria-label={t("app.theme.label")}
      className="bg-muted inline-flex rounded-md p-1"
    >
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={mounted && theme === o.v}
          onClick={() => setTheme(o.v)}
          className="text-muted-foreground aria-checked:bg-card aria-checked:text-foreground inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition aria-checked:shadow-sm pointer-coarse:h-10"
        >
          <o.icon className="size-4" /> {o.label}
        </button>
      ))}
    </div>
  );
}

/** Kosha's own "Reduce transparency" switch, saved on this device only. */
export function TransparencySwitch() {
  const t = useT();
  const [reduced, setReduced] = useState<boolean | null>(null);
  useEffect(() => setReduced(document.documentElement.dataset.glass === "off"), []);
  return (
    <label className="flex items-start justify-between gap-4">
      <span className="text-sm">
        <span className="block font-medium">{t("app.theme.reduce")}</span>
        <span className="text-muted-foreground">{t("app.theme.reduceBody")}</span>
      </span>
      <Switch
        checked={!!reduced}
        disabled={reduced === null}
        aria-label={t("app.theme.reduce")}
        onCheckedChange={(on) => {
          setReduced(on);
          try {
            localStorage.setItem("kosha-glass", on ? "off" : "on");
          } catch {}
          if (on) document.documentElement.dataset.glass = "off";
          else delete document.documentElement.dataset.glass;
        }}
      />
    </label>
  );
}
