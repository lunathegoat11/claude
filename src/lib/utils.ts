import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Convert Prisma Decimal / string / number to a JS number (or null). */
export function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "object" && v !== null && "toNumber" in v) {
    return (v as { toNumber: () => number }).toNumber();
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Normalise free-text tags: trimmed, lower-case, unique, max 20. */
export function normaliseTags(tags: string[] | string | undefined | null): string[] {
  const list = Array.isArray(tags) ? tags : (tags ?? "").split(",");
  const out = new Set<string>();
  for (const t of list) {
    const clean = t.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 40);
    if (clean) out.add(clean);
    if (out.size >= 20) break;
  }
  return [...out];
}

export function pluralize(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export function initials(name: string | null | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")
  ).toUpperCase();
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}
