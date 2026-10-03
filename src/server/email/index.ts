import "server-only";
import { env } from "@/server/env";
import { logger } from "@/server/logger";
import { AppError } from "@/server/errors";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Email delivery. "console" prints the message in the server terminal (useful
 * when running on your own computer); "resend" sends real email via Resend's API.
 * Emails never contain health information — only account links.
 */
export async function sendEmail(msg: EmailMessage): Promise<void> {
  const e = env();
  if (e.EMAIL_PROVIDER === "resend" && e.RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${e.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: e.EMAIL_FROM,
        to: [msg.to],
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
      }),
      signal: AbortSignal.timeout(15_000),
    }).catch(() => null);
    if (!res?.ok) {
      logger.error("email.send_failed", { provider: "resend", status: res?.status });
      throw new AppError(
        "INTERNAL",
        "We couldn't send the email. Please try again in a few minutes.",
      );
    }
    return;
  }
  if (e.EMAIL_PROVIDER === "resend") logger.warn("email.resend_key_missing");
  if (process.env.NODE_ENV === "test") return;
  // Development / self-hosted without an email service: show the email in the terminal.
  console.warn(
    [
      "",
      "──────────────── EMAIL (not sent — EMAIL_PROVIDER=console) ────────────────",
      `To:      ${msg.to}`,
      `Subject: ${msg.subject}`,
      "",
      msg.text,
      "────────────────────────────────────────────────────────────────────────────",
      "",
    ].join("\n"),
  );
}

function layout(
  title: string,
  body: string,
  button: { label: string; url: string },
  footer: string,
) {
  const esc = (s: string) =>
    s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  return `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1f2430">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table width="100%" style="max-width:480px;background:#fff;border:1px solid #e6e8ec;border-radius:16px;padding:32px">
<tr><td>
<div style="font-weight:600;font-size:18px;color:#1d6f78;margin-bottom:24px">Kosha</div>
<h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1>
<p style="font-size:15px;line-height:1.6;color:#4a5160;margin:0 0 24px">${esc(body)}</p>
<a href="${esc(button.url)}" style="display:inline-block;background:#1d6f78;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:15px;font-weight:600">${esc(button.label)}</a>
<p style="font-size:13px;line-height:1.6;color:#6b7280;margin:24px 0 0">${esc(footer)}</p>
<p style="font-size:12px;color:#9aa0aa;margin:16px 0 0;word-break:break-all">If the button doesn't work, copy this link into your browser:<br>${esc(button.url)}</p>
</td></tr></table></td></tr></table></body></html>`;
}

export function passwordResetEmail(to: string, url: string): EmailMessage {
  return {
    to,
    subject: "Reset your Kosha password",
    text: `Someone (hopefully you) asked to reset the password for your Kosha account.\n\nReset it here (the link works for 1 hour, once):\n${url}\n\nIf you didn't ask for this, you can ignore this email — your password won't change.`,
    html: layout(
      "Reset your password",
      "Someone (hopefully you) asked to reset the password for your Kosha account. This link works once, for 1 hour.",
      { label: "Choose a new password", url },
      "If you didn't ask for this, you can ignore this email — your password won't change.",
    ),
  };
}

export function verificationEmail(to: string, url: string): EmailMessage {
  return {
    to,
    subject: "Confirm your email for Kosha",
    text: `Welcome to Kosha. Please confirm your email address (the link works for 24 hours):\n${url}\n\nIf you didn't create a Kosha account, you can ignore this email.`,
    html: layout(
      "Confirm your email",
      "Welcome to Kosha. Please confirm this is your email address so you can recover your account if you ever forget your password.",
      { label: "Confirm email", url },
      "If you didn't create a Kosha account, you can ignore this email.",
    ),
  };
}
