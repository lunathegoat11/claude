"use client";
import { useT } from "@/i18n/client";

/** Google's "G" mark, as its sign-in branding guidelines ask. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-5">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

/** The Apple logo, as Apple's Sign in with Apple guidelines ask. */
function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-current">
      <path d="M16.37 12.62c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.89 2.65 3.24 2.6 1.3-.05 1.79-.84 3.36-.84s2.01.84 3.38.81c1.4-.02 2.28-1.27 3.13-2.52.99-1.45 1.39-2.85 1.42-2.92-.03-.01-2.72-1.04-2.75-4.14zM13.8 4.98c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.27.68-3 1.54-.66.76-1.24 1.98-1.08 3.15 1.14.09 2.31-.58 3.02-1.44z" />
    </svg>
  );
}

/**
 * "Continue with Google" and "Continue with Apple". On the sign-up page, the invite code
 * typed above (if Kosha is invite-only) is carried along so a new account can be made.
 */
export function OAuthButtons({
  google,
  apple,
  next,
  inviteFieldId,
}: {
  google: boolean;
  apple: boolean;
  next?: string;
  inviteFieldId?: string;
}) {
  const t = useT();
  if (!google && !apple) return null;
  const go = (provider: "google" | "apple") => {
    const q = new URLSearchParams();
    if (next) q.set("next", next);
    const invite = inviteFieldId
      ? (document.getElementById(inviteFieldId) as HTMLInputElement | null)?.value.trim()
      : "";
    if (invite) q.set("invite", invite);
    window.location.assign(`/api/auth/${provider}/start${q.size ? `?${q}` : ""}`);
  };
  const base =
    "pressable flex h-12 w-full items-center justify-center gap-2.5 rounded-full text-[16px] font-medium transition-colors";
  return (
    <div className="space-y-3">
      <div className="grid gap-2.5">
        {apple && (
          <button
            type="button"
            onClick={() => go("apple")}
            className={`${base} bg-black text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/90`}
          >
            <AppleMark />
            {t("account.oauth.apple")}
          </button>
        )}
        {google && (
          <button
            type="button"
            onClick={() => go("google")}
            className={`${base} bg-card text-foreground hover:bg-muted shadow-[inset_0_0_0_1px_var(--input)]`}
          >
            <GoogleMark />
            {t("account.oauth.google")}
          </button>
        )}
      </div>
      <div className="text-muted-foreground flex items-center gap-3 text-[13px]">
        <span className="bg-border h-px flex-1" />
        {t("account.oauth.orEmail")}
        <span className="bg-border h-px flex-1" />
      </div>
    </div>
  );
}
