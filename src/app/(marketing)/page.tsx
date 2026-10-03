import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Bot,
  CalendarClock,
  FileText,
  FlaskConical,
  FolderHeart,
  Lock,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { getCurrentUser } from "@/server/auth/session";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: FolderHeart,
    title: "Centralised records",
    body: "Doctor visits, diagnoses, prescriptions, vaccinations and hospital stays — organised by date instead of scattered across WhatsApp and paper files.",
  },
  {
    icon: Activity,
    title: "Health tracking",
    body: "Log blood sugar (fasting or after meals), blood pressure, weight, SpO₂ and more. Add your own measurements whenever you need to.",
  },
  {
    icon: FlaskConical,
    title: "Lab trends",
    body: "See how HbA1c, cholesterol, thyroid and other results change across reports — each compared only with the range printed on its own report.",
  },
  {
    icon: Bot,
    title: "AI-powered explanations",
    body: "Ask questions in plain language. Answers are built only from your records, link back to the source, and clearly separate facts from general information.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy first",
    body: "Your records belong to your account alone. Files are stored privately and served only after checking who you are.",
  },
  {
    icon: CalendarClock,
    title: "One timeline",
    body: "Every visit, report, upload and reading in a single, calm chronological view of your health history.",
  },
];

export default async function LandingPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <div className="min-h-dvh">
      <header className="bg-background/80 sticky top-0 z-30 border-b border-transparent backdrop-blur-lg">
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
              <Link href="/sign-up">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pt-16 pb-20 sm:px-8 sm:pt-24">
          <div className="max-w-3xl">
            <p className="bg-card text-muted-foreground mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[13px]">
              <span className="bg-primary size-1.5 rounded-full" /> Personal health records,
              designed for India
            </p>
            <h1 className="text-[40px] leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
              Your health information. <span className="text-primary">Finally in one place.</span>
            </h1>
            <p className="text-muted-foreground mt-6 max-w-2xl text-lg leading-relaxed text-pretty">
              Securely organise your medical records, track health measurements, understand your lab
              results, and see your health history over time.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/sign-up">
                  Get started <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </div>
          </div>

          <div aria-hidden className="mt-16 grid gap-3 sm:grid-cols-3">
            <PreviewCard
              label="Blood glucose"
              value="108"
              unit="mg/dL"
              meta="Today, 8:32 AM · Fasting"
              delta="+6 mg/dL from previous"
              path="M2,26 L18,22 L34,24 L50,16 L66,19 L82,12 L98,14 L114,9"
            />
            <PreviewCard
              label="Blood pressure"
              value="124/80"
              unit="mmHg"
              meta="Yesterday, 8:10 AM"
              delta="−4/−2 mmHg from previous"
              path="M2,14 L18,18 L34,12 L50,16 L66,13 L82,17 L98,15 L114,16"
            />
            <PreviewCard
              label="HbA1c"
              value="5.7"
              unit="%"
              meta="12 Sep · Lab report"
              delta="5.4 → 5.6 → 5.5 → 5.7"
              path="M2,24 L38,16 L76,20 L114,12"
            />
          </div>
          <p className="text-muted-foreground mt-3 text-xs">Illustration with fictional values.</p>
        </section>

        <section className="bg-card/60 border-y">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
            <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-balance">
              Everything important, understandable at a glance
            </h2>
            <div className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title}>
                  <span className="bg-accent text-accent-foreground flex size-10 items-center justify-center rounded-xl">
                    <f.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                  <p className="text-muted-foreground mt-2 text-[15px] leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-balance">
              Built for how healthcare works in India
            </h2>
            <ul className="text-muted-foreground mt-6 space-y-4 text-[15px]">
              <li className="flex gap-3">
                <FileText className="text-primary mt-0.5 size-5 shrink-0" /> Upload PDF reports from
                your diagnostic lab — we find the values and you confirm them before anything is
                saved.
              </li>
              <li className="flex gap-3">
                <CalendarClock className="text-primary mt-0.5 size-5 shrink-0" /> Dates in
                day-month-year, Indian Standard Time, Indian phone numbers, states and cities.
              </li>
              <li className="flex gap-3">
                <Activity className="text-primary mt-0.5 size-5 shrink-0" /> Sugar readings tagged
                as fasting, before or after meals — the way your doctor asks about them.
              </li>
              <li className="flex gap-3">
                <Lock className="text-primary mt-0.5 size-5 shrink-0" /> Export all your data any
                time, or delete your account and every file permanently.
              </li>
            </ul>
          </div>
          <div className="bg-card rounded-3xl border p-6 sm:p-8">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Smartphone className="text-primary size-4" /> Works beautifully on your phone
            </div>
            <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed">
              Add a reading in seconds at the clinic, pull up your last HbA1c during a consultation,
              or show your allergy list in an emergency — all from your mobile browser.
            </p>
            <div className="bg-background mt-6 rounded-2xl border p-4">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                AI-generated · based on your records
              </p>
              <p className="mt-2 text-[15px]">
                Your HbA1c was <b>5.4%</b> on 8 Mar 2025{" "}
                <span className="bg-accent text-accent-foreground rounded px-1 text-[11px] font-semibold">
                  L4
                </span>{" "}
                and <b>5.7%</b> on 12 Sep 2026{" "}
                <span className="bg-accent text-accent-foreground rounded px-1 text-[11px] font-semibold">
                  L1
                </span>
                . The latest value is above the range printed on that report. A doctor can tell you
                what this means for you.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
          <div className="bg-primary text-primary-foreground rounded-3xl px-6 py-14 text-center sm:px-12">
            <h2 className="text-3xl font-semibold tracking-tight text-balance">
              Start your health record today
            </h2>
            <p className="text-primary-foreground/80 mx-auto mt-3 max-w-lg">
              Free to start. Add as much or as little as you like.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" variant="secondary">
                <Link href="/sign-up">Get started</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo className="text-foreground" />
          <p className="max-w-xl text-[13px] leading-relaxed">
            Kosha helps you organise health information. It does not provide medical diagnosis,
            treatment or emergency services. Always consult a qualified healthcare professional. In
            an emergency, call 112.
          </p>
        </div>
      </footer>
    </div>
  );
}

function PreviewCard({
  label,
  value,
  unit,
  meta,
  delta,
  path,
}: {
  label: string;
  value: string;
  unit: string;
  meta: string;
  delta: string;
  path: string;
}) {
  return (
    <div className="bg-card rounded-2xl border p-5 shadow-sm">
      <div className="text-muted-foreground text-sm font-medium">{label}</div>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <span className="tabular text-3xl font-semibold tracking-tight">{value}</span>{" "}
          <span className="text-muted-foreground text-sm">{unit}</span>
          <div className="text-muted-foreground mt-1.5 text-[13px]">{meta}</div>
        </div>
        <svg viewBox="0 0 116 32" className="h-9 w-24">
          <path
            d={path}
            fill="none"
            stroke="var(--chart-1)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="text-muted-foreground tabular mt-3 border-t pt-3 text-[13px]">{delta}</div>
    </div>
  );
}
