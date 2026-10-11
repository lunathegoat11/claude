import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { CONSENT_VERSION } from "@/lib/legal";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user.isDemo) {
    // After the Terms or Privacy Policy change, ask for consent again before going on.
    const row = await db.user.findUnique({
      where: { id: user.id },
      select: { consentVersion: true },
    });
    if (row?.consentVersion !== CONSENT_VERSION) redirect("/consent");
  }
  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        isDemo: user.isDemo,
        emailVerified: user.emailVerified,
      }}
    >
      {children}
    </AppShell>
  );
}
