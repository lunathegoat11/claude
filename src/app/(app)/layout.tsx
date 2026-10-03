import { requireUser } from "@/server/auth/session";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <AppShell user={{ name: user.name, email: user.email, isDemo: user.isDemo }}>
      {children}
    </AppShell>
  );
}
