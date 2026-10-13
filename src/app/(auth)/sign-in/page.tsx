import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/server/auth/session";
import { env } from "@/server/env";
import { SignInForm } from "@/components/auth/sign-in-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { oauthEnabled } from "@/server/auth/oauth";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to Kosha Health to see your lab results, medical records and health readings in one place.",
};

/** Why "Continue with Google/Apple" didn't finish, in plain words (codes only in the URL). */
const OAUTH_MESSAGES: Record<string, string> = {
  failed: "That sign-in didn't complete. Please try again.",
  cancelled: "Sign-in was cancelled.",
  invite:
    "Kosha Health is invite-only for now. To create an account, open your invite link, or ask the person who invited you for the code.",
  closed: "New sign-ups are closed at the moment.",
  email:
    "Your account didn't share a confirmed email address, which Kosha needs. Please sign up with email instead.",
  off: "That sign-in option isn't available yet.",
  busy: "Too many attempts. Please wait a few minutes and try again.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string; oauth?: string }>;
}) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { next, reset, oauth } = await searchParams;
  const oauthMessage = oauth ? (OAUTH_MESSAGES[oauth] ?? OAUTH_MESSAGES.failed) : null;
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-[28px] font-semibold">Welcome back</h1>
        <p className="text-muted-foreground text-[15px]">Sign in to see your health records.</p>
      </div>
      {reset && (
        <p
          role="status"
          className="border-success/30 bg-success/8 rounded-md border px-3.5 py-2.5 text-sm"
        >
          Your password has been changed. Please sign in with your new password.
        </p>
      )}
      {oauthMessage && (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/6 rounded-md border px-3.5 py-2.5 text-sm"
        >
          {oauthMessage}
        </p>
      )}
      <OAuthButtons google={oauthEnabled("google")} apple={oauthEnabled("apple")} next={next} />
      <SignInForm next={next} demoEnabled={env().DEMO_LOGIN_ENABLED} />
      {env().ALLOW_SIGNUP && (
        <p className="text-muted-foreground text-center text-sm">
          New to Kosha?{" "}
          <Link href="/sign-up" className="text-primary font-medium hover:underline">
            Create an account
          </Link>
        </p>
      )}
    </div>
  );
}
