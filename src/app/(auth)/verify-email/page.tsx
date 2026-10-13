import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, Mail, XCircle } from "lucide-react";
import { verifyEmailAction } from "@/actions/auth";
import { findValidToken } from "@/server/auth/email-tokens";
import { getCurrentUser } from "@/server/auth/session";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Confirm email",
  description: "Confirm the email address for your Kosha Health account.",
  referrer: "no-referrer",
  robots: { index: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; done?: string; failed?: string }>;
}) {
  const { token = "", done, failed } = await searchParams;
  const signedIn = !!(await getCurrentUser());
  // Opening the link only checks it; the address is confirmed when the button is pressed.
  const valid =
    !done && !failed && token ? !!(await findValidToken(token, "EMAIL_VERIFICATION")) : false;
  const state = done ? "done" : valid ? "ready" : "failed";
  return (
    <div className="space-y-6 text-center">
      <span
        className={`mx-auto flex size-12 items-center justify-center rounded-[var(--radius)] ${
          state === "failed" ? "bg-destructive/10 text-destructive" : "bg-success/12 text-success"
        }`}
      >
        {state === "done" ? (
          <CheckCircle2 className="size-6" />
        ) : state === "ready" ? (
          <Mail className="size-6" />
        ) : (
          <XCircle className="size-6" />
        )}
      </span>
      <h1 className="text-[28px] font-semibold">
        {state === "done"
          ? "Email confirmed"
          : state === "ready"
            ? "Confirm your email"
            : "This link didn't work"}
      </h1>
      <p className="text-muted-foreground text-[15px]">
        {state === "done"
          ? "Thanks! You can now recover your account by email if you ever forget your password."
          : state === "ready"
            ? "Press the button to confirm this is your email address."
            : "The link may have expired (they last 24 hours) or already been used. You can send a new one from the banner in the app."}
      </p>
      {state === "ready" ? (
        <form action={verifyEmailAction}>
          <input type="hidden" name="token" value={token} />
          <Button type="submit" size="lg" className="w-full">
            Confirm my email
          </Button>
        </form>
      ) : (
        <Button asChild size="lg" className="w-full">
          <Link href={signedIn ? "/dashboard" : "/sign-in"}>
            {signedIn ? "Go to dashboard" : "Sign in"}
          </Link>
        </Button>
      )}
    </div>
  );
}
