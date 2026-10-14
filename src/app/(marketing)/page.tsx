import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { env } from "@/server/env";
import { SITE_DESCRIPTION } from "@/lib/site";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getCurrentUser } from "@/server/auth/session";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/legal/site-footer";
import { RangeStrip } from "@/components/labs/range-strip";
import { Reveal } from "@/components/shared/reveal";
import { getT } from "@/i18n/server";
import { HTML_LANG } from "@/i18n/config";

/** A made-up report, shown exactly the way Kosha shows a real one. */
const SAMPLE = [
  {
    test: "HbA1c",
    value: "5.7",
    unit: "%",
    low: 4,
    high: 5.6,
    range: "4.0 – 5.6",
    status: "flag.HIGH",
  },
  {
    test: "Glucose, fasting",
    value: "96",
    unit: "mg/dL",
    low: 70,
    high: 100,
    range: "70 – 100",
    status: "flag.NORMAL",
  },
  {
    test: "TSH",
    value: "3.1",
    unit: "µIU/mL",
    low: 0.4,
    high: 4.5,
    range: "0.4 – 4.5",
    status: "flag.NORMAL",
  },
  {
    test: "Vitamin D",
    value: "18",
    unit: "ng/mL",
    low: 30,
    high: 100,
    range: "30 – 100",
    status: "flag.LOW",
  },
] as const;

export const metadata: Metadata = { alternates: { canonical: "/" } };

const FAQ = [
  { q: "marketing.faq.reports.q", a: "marketing.faq.reports.a" },
  { q: "marketing.faq.free.q", a: "marketing.faq.free.a" },
  { q: "marketing.faq.privacy.q", a: "marketing.faq.privacy.a" },
  { q: "marketing.faq.advice.q", a: "marketing.faq.advice.a" },
] as const;

const ALSO = [
  ["marketing.also.readings.title", "marketing.also.readings.body"],
  ["marketing.also.visits.title", "marketing.also.visits.body"],
  ["marketing.also.ask.title", "marketing.also.ask.body"],
  ["marketing.also.data.title", "marketing.also.data.body"],
] as const;

export default async function LandingPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  const inviteOnly = !!env().SIGNUP_INVITE_CODE?.trim();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const t = await getT();
  const faq = FAQ.map((f) => ({ q: t(f.q), a: t(f.a) }));
  // Tells search engines what Kosha is (a free health web app), and answers common questions.
  const structured = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Kosha Health",
      alternateName: "Kosha",
      url: env().APP_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "HealthApplication",
      operatingSystem: "Any (web browser)",
      inLanguage: "en-IN",
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: HTML_LANG[t.locale],
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];
  return (
    <div className="min-h-dvh">
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        // JSON from constants above (no user input); "<" is escaped so it can't end the tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structured).replace(/</g, "\\u003c"),
        }}
      />
      <header className="glass-bar sticky top-0 z-30">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link
            href="/"
            aria-label={t("marketing.homeLabel")}
            className="inline-flex min-h-11 items-center rounded-full"
          >
            <Logo compact />
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/sign-in">{t("marketing.signIn")}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/sign-up">{t("marketing.getStarted")}</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="enter mx-auto max-w-4xl px-5 pt-16 text-center sm:px-8 sm:pt-24">
          <h1 className="text-[2.75rem] leading-[1.05] font-semibold sm:text-[4rem]">
            {t("marketing.hero.title")}
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-[19px] sm:text-[21px]">
            {t("marketing.hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/sign-up">{t("marketing.getStarted")}</Link>
            </Button>
            <Link
              href="/sign-in"
              className="text-info inline-flex min-h-11 items-center text-[17px] hover:underline"
            >
              {t("marketing.signIn")} <ChevronRight className="size-4" />
            </Link>
          </div>
          {inviteOnly && (
            <p className="text-muted-foreground mt-5 text-[15px]">
              {t("marketing.hero.inviteOnly")}
            </p>
          )}
        </section>

        {/* The product itself: one report, as Kosha shows it. */}
        <Reveal as="figure" className="mx-auto mt-14 max-w-2xl px-5 sm:mt-20 sm:px-8">
          <div className="surface overflow-hidden">
            <div className="px-6 pt-6 pb-4">
              <div className="font-display text-[22px] font-semibold">
                {t("marketing.sample.title")}
              </div>
              <div className="text-muted-foreground text-[15px]">{t("marketing.sample.meta")}</div>
            </div>
            <ul className="divide-y">
              {SAMPLE.map((r) => {
                const out = r.status !== "flag.NORMAL";
                return (
                  <li
                    key={r.test}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 px-6 py-4"
                  >
                    <span className="font-medium">{r.test}</span>
                    <span className="text-right whitespace-nowrap">
                      <span className="figure text-[1.375rem] leading-none font-semibold">
                        {r.value}
                      </span>{" "}
                      <span className="text-muted-foreground text-sm">{r.unit}</span>
                    </span>
                    <div className="col-span-2">
                      <RangeStrip value={Number(r.value)} low={r.low} high={r.high} />
                      <div className="text-muted-foreground mt-1.5 flex justify-between text-[13px]">
                        <span>{t("marketing.sample.reportRange", { range: r.range })}</span>
                        <span
                          className={
                            out ? "text-destructive font-medium" : "text-success font-medium"
                          }
                        >
                          {t(r.status)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <figcaption className="text-muted-foreground mt-4 text-center text-[13px]">
            {t("marketing.sample.caption")}
          </figcaption>
        </Reveal>

        {/* How it works: three steps, laid out as tiles of different sizes. */}
        <section className="mx-auto mt-24 max-w-6xl px-5 sm:mt-32 sm:px-8">
          <Reveal>
            <h2 className="text-center text-[2rem] font-semibold sm:text-[3rem]">
              {t("marketing.steps.title")}
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-6">
            <Reveal className="surface p-8 md:col-span-4 md:row-span-2 md:p-10">
              <div className="figure text-primary text-[3.5rem] leading-none font-semibold">1</div>
              <h3 className="mt-6 text-[28px] font-semibold">{t("marketing.steps.1.title")}</h3>
              <p className="text-muted-foreground mt-3 max-w-md text-[17px]">
                {t("marketing.steps.1.body")}
              </p>
            </Reveal>
            <Reveal className="surface p-8 md:col-span-2">
              <div className="figure text-primary text-[2.5rem] leading-none font-semibold">2</div>
              <h3 className="mt-4 text-[21px] font-semibold">{t("marketing.steps.2.title")}</h3>
              <p className="text-muted-foreground mt-2 text-[15px]">
                {t("marketing.steps.2.body")}
              </p>
            </Reveal>
            <Reveal className="bg-primary text-primary-foreground rounded-[var(--radius)] p-8 md:col-span-2">
              <div className="figure text-[2.5rem] leading-none font-semibold opacity-80">3</div>
              <h3 className="mt-4 text-[21px] font-semibold">{t("marketing.steps.3.title")}</h3>
              <p className="mt-2 text-[15px] opacity-85">{t("marketing.steps.3.body")}</p>
            </Reveal>
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-3xl px-5 sm:mt-32 sm:px-8">
          <Reveal>
            <h2 className="text-center text-[2rem] font-semibold sm:text-[3rem]">
              {t("marketing.also.title")}
            </h2>
          </Reveal>
          <Reveal className="surface mt-10">
            <dl className="divide-y">
              {ALSO.map(([title, body]) => (
                <div key={title} className="grid gap-1 px-6 py-5 sm:grid-cols-[14rem_1fr] sm:gap-6">
                  <dt className="font-semibold">{t(title)}</dt>
                  <dd className="text-muted-foreground">{t(body)}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </section>

        <section className="mx-auto mt-24 max-w-3xl px-5 sm:mt-32 sm:px-8">
          <Reveal>
            <h2 className="text-center text-[2rem] font-semibold sm:text-[3rem]">
              {t("marketing.faq.title")}
            </h2>
          </Reveal>
          <Reveal className="surface mt-10">
            <div className="divide-y">
              {faq.map((f) => (
                <details key={f.q} className="group px-6 py-5">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                    <h3 className="text-[17px]">{f.q}</h3>
                    <ChevronRight
                      aria-hidden
                      className="text-muted-foreground size-5 shrink-0 transition-transform group-open:rotate-90"
                    />
                  </summary>
                  <p className="text-muted-foreground mt-2">{f.a}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </section>

        <Reveal
          as="section"
          className="mx-auto mt-24 max-w-3xl px-5 pb-24 text-center sm:mt-32 sm:px-8"
        >
          <h2 className="text-[2rem] font-semibold sm:text-[3rem]">{t("marketing.cta.title")}</h2>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link href="/sign-up">{t("marketing.getStarted")}</Link>
            </Button>
          </div>
        </Reveal>
      </main>
      <SiteFooter />
    </div>
  );
}
