import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/legal/site-footer";
import { RangeStrip } from "@/components/labs/range-strip";

/** A made-up report, shown the way Kosha shows a real one. */
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

const STEPS = [
  {
    title: "Add a report",
    body: "Upload the PDF from your lab, or take a photo of the printed report. If the photo is blurry, Kosha tells you straight away so you can take another.",
  },
  {
    title: "Kosha reads every result",
    body: "Each test is saved with its value, unit and the range printed on that report, along with the lab's name and the date the sample was taken.",
  },
  {
    title: "See how your numbers change",
    body: "Open any test to see every result you've had, report by report. Take it to your next appointment instead of a folder of papers.",
  },
];

export default async function LandingPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="Kosha home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1.5">
            <ThemeToggle />
            <Button asChild variant="ghost">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild className="hidden sm:inline-flex">
              <Link href="/sign-up">Create an account</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-5 pt-14 pb-20 sm:px-8 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center">
          <div>
            <h1 className="text-[2.6rem] leading-[1.02] font-semibold text-balance sm:text-[3.75rem]">
              Every lab report you&apos;ve had, read and kept in order.
            </h1>
            <p className="text-muted-foreground mt-6 max-w-xl text-lg text-pretty">
              Upload or photograph a report and Kosha saves each result with the lab&apos;s name and
              the date. Your family&apos;s health history, in one place you can open at the
              doctor&apos;s.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/sign-up">Create a free account</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </div>
          </div>

          {/* The product itself, not an illustration of it: one report as Kosha shows it. */}
          <figure className="bg-card rounded-[var(--radius)] border">
            <div className="border-b px-5 py-4">
              <div className="font-display text-xl font-semibold">
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
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 px-5 py-3.5"
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
                      <div className="text-muted-foreground mt-1 flex justify-between text-[13px]">
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
            <figcaption className="text-muted-foreground border-t px-5 py-3 text-[13px]">
              A made-up example. High and low are judged only against the range printed on the
              report itself.
            </figcaption>
          </figure>
        </section>

        <section className="border-t">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <h2 className="text-[2rem] font-semibold">How it works</h2>
            <ol className="mt-10 grid gap-10 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="border-primary border-t-[3px] pt-4">
                  <div className="figure text-primary text-[2.25rem] leading-none font-semibold">
                    {i + 1}
                  </div>
                  <h3 className="mt-3 text-xl font-semibold">{s.title}</h3>
                  <p className="text-muted-foreground mt-2 text-pretty">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 sm:py-20 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <h2 className="text-[2rem] font-semibold">Also in your file</h2>
            <dl className="divide-y border-y">
              {[
                [
                  "Readings",
                  "Blood pressure, sugar (fasting or after meals), weight, SpO₂ and anything else you want to track.",
                ],
                [
                  "Visits and medicines",
                  "Doctor visits, hospital stays, vaccinations, allergies and the medicines you've been prescribed.",
                ],
                [
                  "Questions about your records",
                  "Ask “How has my HbA1c changed?” and get an answer built only from what you've saved, with links to the reports.",
                ],
                [
                  "Your data stays yours",
                  "Only you can see your records. Download everything or delete your account whenever you like.",
                ],
              ].map(([t, d]) => (
                <div key={t} className="grid gap-1 py-4 sm:grid-cols-[13rem_1fr] sm:gap-6">
                  <dt className="font-semibold">{t}</dt>
                  <dd className="text-muted-foreground">{d}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-14 sm:px-8 md:flex-row md:items-center md:justify-between">
            <p className="font-display max-w-xl text-[1.75rem] leading-tight font-semibold">
              Start with the report on your table today.
            </p>
            <Button asChild size="lg">
              <Link href="/sign-up">Create a free account</Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
