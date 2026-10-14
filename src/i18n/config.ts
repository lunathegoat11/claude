/** The languages Kosha's screens are available in. */
export const LOCALES = ["en", "hi", "mr", "te"] as const;
export type Locale = (typeof LOCALES)[number];

/** Each language's name, written in that language (for the language switch). */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  hi: "हिन्दी",
  mr: "मराठी",
  te: "తెలుగు",
};

/** For <html lang>, dates and numbers. */
export const HTML_LANG: Record<Locale, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
  te: "te-IN",
};

export const LOCALE_COOKIE = "kosha_lang";

export const isLocale = (v: unknown): v is Locale => LOCALES.includes(v as Locale);
