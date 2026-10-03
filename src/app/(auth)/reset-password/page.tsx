import Link from "next/link";
import type { Metadata } from "next";
import { findValidToken } from "@/server/auth/email-tokens";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Choose a new password", referrer: "no-referrer" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  // Only checks the link here; it is used up when the new password is saved.
  const valid = token ? await findValidToken(token, "PASSWORD_RESET") : null;
  if (!valid) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">This link has expired</h1>
        <p className="text-muted-foreground text-[15px]">
          Password reset links work once, for 1 hour. Please request a new one.
        </p>
        <Button asChild size="lg" className="w-full">
          <Link href="/forgot-password">Send a new link</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="text-muted-foreground text-[15px]">
          Pick something you don&apos;t use anywhere else.
        </p>
      </div>
      <ResetPasswordForm token={token} />
    </div>
  );
}
