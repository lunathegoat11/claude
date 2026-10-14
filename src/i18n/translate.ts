import type { Locale } from "./config";
import type { MessageKey } from "./messages";

export type Vars = Record<string, string | number>;
export type Messages = Partial<Record<MessageKey, string>>;
export type T = ((key: MessageKey, vars?: Vars) => string) & {
  /** Picks `${key}_one` for 1 and `${key}_other` otherwise, with {n} filled in. */
  n: (key: string, n: number, vars?: Vars) => string;
  locale: Locale;
};

/** "{name} has {n} results" → "Asha has 3 results". */
function fill(s: string, vars?: Vars) {
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}

/**
 * A translator over one language's messages (already filled in with English where a
 * translation is missing; see messagesFor). Kept free of the dictionaries themselves so
 * the browser only downloads the language in use.
 */
export function makeT(locale: Locale, messages: Messages): T {
  const t = ((key: MessageKey, vars?: Vars) => fill(messages[key] ?? key, vars)) as T;
  t.n = (key, n, vars) => t(`${key}_${n === 1 ? "one" : "other"}` as MessageKey, { n, ...vars });
  t.locale = locale;
  return t;
}
