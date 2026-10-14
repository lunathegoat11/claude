"use client";
import { useEffect, useState } from "react";
import { HTML_LANG, LOCALE_COOKIE, isLocale, type Locale } from "@/i18n/config";

/**
 * This page replaces the whole app (including the language provider), so its few
 * words are kept here, and the language is read from the saved choice or the browser.
 */
const TEXT: Record<Locale, { title: string; body: string; reload: string }> = {
  en: {
    title: "Something went wrong",
    body: "Please reload the page. Nothing you saved was lost.",
    reload: "Reload",
  },
  hi: {
    title: "कुछ गड़बड़ हो गई",
    body: "कृपया पेज दोबारा लोड करें। आपका सेव किया हुआ कुछ भी नहीं खोया है।",
    reload: "दोबारा लोड करें",
  },
  mr: {
    title: "काहीतरी चुकलं",
    body: "कृपया पेज पुन्हा लोड करा. तुम्ही सेव्ह केलेलं काहीही हरवलेलं नाही.",
    reload: "पुन्हा लोड करा",
  },
  te: {
    title: "ఏదో పొరపాటు జరిగింది",
    body: "దయచేసి పేజీని మళ్లీ లోడ్ చేయండి. మీరు సేవ్ చేసినవేవీ పోలేదు.",
    reload: "మళ్లీ లోడ్ చేయండి",
  },
};

function currentLocale(): Locale {
  const saved = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${LOCALE_COOKIE}=`))
    ?.split("=")[1];
  if (isLocale(saved)) return saved;
  // Otherwise the browser's languages, the same way the server picks one.
  for (const l of navigator.languages ?? []) {
    const lang = l.slice(0, 2).toLowerCase();
    if (lang === "en") return "en";
    if (isLocale(lang)) return lang;
  }
  return "en";
}

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<Locale>("en");
  // Read after the first render so the server's HTML and the browser's first render match.
  useEffect(() => setLocale(currentLocale()), []);
  const text = TEXT[locale];
  return (
    <html lang={HTML_LANG[locale]}>
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "grid",
          placeItems: "center",
          minHeight: "100vh",
          margin: 0,
          background: "#f8f9fb",
          color: "#1f2430",
        }}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>{text.title}</h1>
          <p style={{ color: "#667085", fontSize: 14 }}>{text.body}</p>
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              padding: "10px 16px",
              borderRadius: 10,
              border: 0,
              background: "#2a3f9d",
              color: "white",
              fontSize: 14,
            }}
          >
            {text.reload}
          </button>
        </div>
      </body>
    </html>
  );
}
