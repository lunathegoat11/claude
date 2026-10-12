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

/** A made-up report, shown exactly the way Kosha shows a real one. */
const SAMPLE = [
  { test: "HbA1c", value: "5.7", unit: "%", low: 4, high: 5.6, range: "4.0 – 5.6", status: "High" },
  {
    test: "Glucose, fasting",
    value: "96",
    unit: "mg/dL",
    low: 70,
    high: 100,
    range: "70 – 100",
    status: "In range",
  },
  {
    test: "TSH",
    value: "3.1",
    unit: "µIU/mL",
    low: 0.4,
    high: 4.5,
    range: "0.4 – 4.5",
    status: "In range",
  },
  {
    test: "Vitamin D",
    value: "18",
    unit: "ng/mL",
    low: 30,
    high: 100,
    range: "30 – 100",
    status: "Low",
  },
];

export const metadata: Metadata = { alternates: { canonical: "/" } };

const FAQ = [
  {
    q: "Which reports can Kosha read?",
    a: "Printed lab reports such as blood sugar and HbA1c, lipid profile, thyroid, liver and kidney function, complete blood count and vitamins. Take a clear photo or upload the PDF your lab sent. Kosha reads each test, its value, unit and printed range, and the report's date. Reading can make mistakes, so Kosha asks you to check the values against the report.",
  },
  {
    q: "Is Kosha free?",
    a: "Yes. There are no paid plans, ads or in-app purchases. If you choose to connect your own AI account for smarter answers, that AI company may charge you directly.",
  },
  {
    q: "Who can see my records?",
    a: "Your records are private to your account. Kosha doesn't sell them or share them with doctors, hospitals, insurers or employers, and has no ads or tracking. You can download your data or delete your account at any time.",
  },
  {
    q: "Does Kosha give medical advice?",
    a: "No. Kosha organises your information and shows how it changes over time. It doesn't diagnose or treat anything. Please discuss your results with your doctor, and in an emergency call 112.",
  },
];

export default async function LandingPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  const inviteOnly = !!env().SIGNUP_INVITE_CODE?.trim();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
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
      mainEntity: FAQ.map((f) => ({
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
            aria-label="Kosha Health home"
            className="inline-flex min-h-11 items-center rounded-full"
          >
            <Logo compact />
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/sign-up">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="enter mx-auto max-w-4xl px-5 pt-16 text-center sm:px-8 sm:pt-24">
          <h1 className="text-[2.75rem] leading-[1.05] font-semibold sm:text-[4rem]">
            Every lab report, read and kept for you.
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-[19px] sm:text-[21px]">
            Photograph a report and Kosha saves each result with its date, so you can see how your
            numbers change.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/sign-up">Get started</Link>
            </Button>
            <Link
              href="/sign-in"
              className="text-info inline-flex min-h-11 items-center text-[17px] hover:underline"
            >
              Sign in <ChevronRight className="size-4" />
            </Link>
          </div>
          {inviteOnly && (
            <p className="text-muted-foreground mt-5 text-[15px]">
              Kosha is open by invitation while we get ready. Got an invite link? Open it to create
              your account.
            </p>
          )}
        </section>

        {/* The product itself: one report, as Kosha shows it. */}
        <Reveal as="figure" className="mx-auto mt-14 max-w-2xl px-5 sm:mt-20 sm:px-8">
          <div className="surface overflow-hidden">
            <div className="px-6 pt-6 pb-4">
              <div className="font-display text-[22px] font-semibold">
                Diabetes &amp; thyroid profile
              </div>
              <div className="text-muted-foreground text-[15px]">
                12 Sept 2026, City Pathology Labs, Lucknow. Read from a photo.
              </div>
            </div>
            <ul className="divide-y">
              {SAMPLE.map((r) => {
                const out = r.status !== "In range";
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
                        <span>Report range {r.range}</span>
                        <span
                          className={
                            out ? "text-destructive font-medium" : "text-success font-medium"
                          }
                        >
                          {r.status}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <figcaption className="text-muted-foreground mt-4 text-center text-[13px]">
            A made-up example. High and low are judged only against the range printed on the report.
          </figcaption>
        </Reveal>

        {/* How it works: three steps, laid out as tiles of different sizes. */}
        <section className="mx-auto mt-24 max-w-6xl px-5 sm:mt-32 sm:px-8">
          <Reveal>
            <h2 className="text-center text-[2rem] font-semibold sm:text-[3rem]">
              Three steps. That&apos;s all.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-6">
            <Reveal className="surface p-8 md:col-span-4 md:row-span-2 md:p-10">
              <div className="figure text-primary text-[3.5rem] leading-none font-semibold">1</div>
              <h3 className="mt-6 text-[28px] font-semibold">Add a report</h3>
              <p className="text-muted-foreground mt-3 max-w-md text-[17px]">
                Upload the PDF from your lab, or take a photo of the printed page. If the photo is
                blurry, Kosha tells you straight away so you can take another.
              </p>
            </Reveal>
            <Reveal className="surface p-8 md:col-span-2">
              <div className="figure text-primary text-[2.5rem] leading-none font-semibold">2</div>
              <h3 className="mt-4 text-[21px] font-semibold">Results are read for you</h3>
              <p className="text-muted-foreground mt-2 text-[15px]">
                Value, unit, the printed range, the lab and the date. Check them against the report.
              </p>
            </Reveal>
            <Reveal className="bg-primary text-primary-foreground rounded-[var(--radius)] p-8 md:col-span-2">
              <div className="figure text-[2.5rem] leading-none font-semibold opacity-80">3</div>
              <h3 className="mt-4 text-[21px] font-semibold">See what changed</h3>
              <p className="mt-2 text-[15px] opacity-85">
                Each test, report by report. Ready for your next appointment.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-3xl px-5 sm:mt-32 sm:px-8">
          <Reveal>
            <h2 className="text-center text-[2rem] font-semibold sm:text-[3rem]">
              Also in your file
            </h2>
          </Reveal>
          <Reveal className="surface mt-10">
            <dl className="divide-y">
              {[
                [
                  "Readings",
                  "Blood pressure, sugar before and after meals, weight, SpO₂ and anything else you track.",
                ],
                [
                  "Visits and medicines",
                  "Doctor visits, hospital stays, vaccinations, allergies and prescriptions.",
                ],
                [
                  "Questions about your records",
                  "Ask “How has my HbA1c changed?” and get an answer built only from what you saved.",
                ],
                [
                  "Your data stays yours",
                  "Private to your account, never sold, no ads or tracking. Download your data or delete your account any time.",
                ],
              ].map(([t, d]) => (
                <div key={t} className="grid gap-1 px-6 py-5 sm:grid-cols-[14rem_1fr] sm:gap-6">
                  <dt className="font-semibold">{t}</dt>
                  <dd className="text-muted-foreground">{d}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </section>

        <section className="mx-auto mt-24 max-w-3xl px-5 sm:mt-32 sm:px-8">
          <Reveal>
            <h2 className="text-center text-[2rem] font-semibold sm:text-[3rem]">Questions</h2>
          </Reveal>
          <Reveal className="surface mt-10">
            <div className="divide-y">
              {FAQ.map((f) => (
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
          <h2 className="text-[2rem] font-semibold sm:text-[3rem]">
            Start with the report on your table.
          </h2>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link href="/sign-up">Get started</Link>
            </Button>
          </div>
        </Reveal>
      </main>
      <SiteFooter />
    </div>
  );
}
