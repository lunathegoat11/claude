import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Forgot your password?</h1>
        <p className="text-muted-foreground text-[15px]">
          Enter the email you signed up with and we&apos;ll send you a link to choose a new one.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
