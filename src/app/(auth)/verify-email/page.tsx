import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import { verifyEmailWithToken } from "@/server/auth/email-tokens";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth/session";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Confirm email", referrer: "no-referrer" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const result = token ? await verifyEmailWithToken(token) : null;
  if (result) await audit(result.userId, "auth.email_verified");
  const signedIn = !!(await getCurrentUser());
  return (
    <div className="space-y-6 text-center">
      <span
        className={`mx-auto flex size-12 items-center justify-center rounded-2xl ${result ? "bg-success/12 text-success" : "bg-destructive/10 text-destructive"}`}
      >
        {result ? <CheckCircle2 className="size-6" /> : <XCircle className="size-6" />}
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">
        {result ? "Email confirmed" : "This link didn't work"}
      </h1>
      <p className="text-muted-foreground text-[15px]">
        {result
          ? "Thanks! You can now recover your account by email if you ever forget your password."
          : "The link may have expired (they last 24 hours) or already been used. You can send a new one from the banner in the app."}
      </p>
      <Button asChild size="lg" className="w-full">
        <Link href={signedIn ? "/dashboard" : "/sign-in"}>
          {signedIn ? "Go to dashboard" : "Sign in"}
        </Link>
      </Button>
    </div>
  );
}
