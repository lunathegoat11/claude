import Link from "next/link";
import { Lock, ShieldCheck, FileHeart } from "lucide-react";
import { Logo } from "@/components/shared/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(420px,520px)]">
      <div className="bg-card relative hidden overflow-hidden border-r lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link href="/" aria-label="Kosha home">
          <Logo />
        </Link>
        <div className="max-w-md space-y-8">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight text-balance">
            All of your important health information, in one calm place.
          </h2>
          <ul className="text-muted-foreground space-y-5 text-[15px]">
            <li className="flex gap-3">
              <FileHeart className="text-primary mt-0.5 size-5 shrink-0" /> Reports, prescriptions
              and discharge summaries organised by date.
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="text-primary mt-0.5 size-5 shrink-0" /> Your records are
              private to your account. Nothing is shared without you.
            </li>
            <li className="flex gap-3">
              <Lock className="text-primary mt-0.5 size-5 shrink-0" /> Passwords are hashed with
              Argon2id and sessions are server-verified.
            </li>
          </ul>
        </div>
        <p className="text-muted-foreground text-xs">
          Kosha organises information and does not provide medical advice.
        </p>
        <div
          aria-hidden
          className="bg-primary/6 pointer-events-none absolute -top-24 -right-24 size-96 rounded-full blur-3xl"
        />
      </div>
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <Link href="/" className="mb-10 lg:hidden" aria-label="Kosha home">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}
