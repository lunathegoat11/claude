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

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change theme">
          {mounted && resolvedTheme === "dark" ? <Moon /> : <Sun />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun className="size-4" /> Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="size-4" /> Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Laptop className="size-4" /> System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeSegmented() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const options = [
    { v: "light", label: "Light", icon: Sun },
    { v: "dark", label: "Dark", icon: Moon },
    { v: "system", label: "System", icon: Laptop },
  ];
  return (
    <div role="radiogroup" aria-label="Theme" className="bg-muted inline-flex rounded-md p-1">
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
  const [reduced, setReduced] = useState<boolean | null>(null);
  useEffect(() => setReduced(document.documentElement.dataset.glass === "off"), []);
  return (
    <label className="flex items-start justify-between gap-4">
      <span className="text-sm">
        <span className="block font-medium">Reduce transparency</span>
        <span className="text-muted-foreground">
          Makes the glass bars and sheets solid. Easier to read, and smoother on older phones.
        </span>
      </span>
      <Switch
        checked={!!reduced}
        disabled={reduced === null}
        aria-label="Reduce transparency"
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
