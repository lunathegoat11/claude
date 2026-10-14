"use client";
import { createContext, useContext, useMemo } from "react";
import type { Locale } from "./config";
import { makeT, type Messages, type T } from "./translate";

const Ctx = createContext<{ locale: Locale; messages: Messages }>({ locale: "en", messages: {} });

/** Gives client components the current language's text (set up in the root layout). */
export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ locale, messages }), [locale, messages]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The translator for client components: `const t = useT(); t("nav.home")`. */
export function useT(): T {
  const { locale, messages } = useContext(Ctx);
  return useMemo(() => makeT(locale, messages), [locale, messages]);
}
