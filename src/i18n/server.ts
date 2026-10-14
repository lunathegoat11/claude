import "server-only";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { DICTIONARIES } from "./messages";
import { makeT, type Messages } from "./translate";

/**
 * The language to show: the one the person chose (a cookie), or else the first of
 * Hindi, Marathi or Telugu their browser asks for, or else English.
 */
export async function getLocale(): Promise<Locale> {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;
  const accept = (await headers()).get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const lang = part.trim().slice(0, 2).toLowerCase();
    if (lang === "en") return "en";
    if (isLocale(lang)) return lang;
  }
  return "en";
}

/** The translator for server components: `const t = await getT(); t("nav.home")`. */
export async function getT() {
  const locale = await getLocale();
  return makeT(locale, messagesFor(locale));
}

/** One language's messages, with English filling any gaps. */
export function messagesFor(locale: Locale): Messages {
  return locale === "en" ? DICTIONARIES.en : { ...DICTIONARIES.en, ...DICTIONARIES[locale] };
}
