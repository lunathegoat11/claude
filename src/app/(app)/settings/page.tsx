import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, HeartPulse, Pill, ShieldCheck } from "lucide-react";
import { cookies } from "next/headers";
import { requireUser, SESSION_COOKIE } from "@/server/auth/session";
import { hashToken } from "@/server/auth/tokens";
import { getProfile, listSessions } from "@/server/services/profile";
import { db } from "@/server/db";
import { deleteHealthItemAction } from "@/actions/settings";
import { PageHeader } from "@/components/shared/page-header";
import { ProfileForm } from "@/components/settings/profile-form";
import { PreferencesForm } from "@/components/settings/preferences-form";
import { HealthItemDialog } from "@/components/settings/health-item-dialog";
import {
  ChangePasswordForm,
  DeleteAccountForm,
  ExportButton,
  RevokeSessionsButton,
} from "@/components/settings/security";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CONDITION_STATUS_LABELS, SEVERITY_LABELS } from "@/lib/catalog/labels";
import { formatDate, formatDateTime, toDateInputValue } from "@/lib/format";
import { formatIndianPhone } from "@/lib/india";
import { cn, toNum } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile & settings" };

const TABS = [
  { key: "profile", label: "Profile" },
  { key: "health", label: "Health summary" },
  { key: "preferences", label: "Preferences" },
  { key: "privacy", label: "Privacy & security" },
] as const;

function describeUA(ua: string | null) {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  const os = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad/.test(ua)
      ? "iOS"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return `${browser}${os ? ` on ${os}` : ""}`;
}

const ACTION_LABELS: Record<string, string> = {
  "auth.sign_in": "Signed in",
  "auth.sign_out": "Signed out",
  "auth.sign_up": "Account created",
  "auth.password_changed": "Password changed",
  "auth.sessions_revoked": "Signed out other devices",
  "document.upload": "Uploaded a document",
  "document.download": "Downloaded a document",
  "document.view": "Viewed a document",
  "document.delete": "Deleted a document",
  "data.export": "Exported data",
  "ai.query": "Asked the assistant",
  "record.create": "Added a record",
  "record.update": "Edited a record",
  "record.delete": "Deleted a record",
  "lab.create": "Added lab results",
  "lab.update": "Edited lab results",
  "lab.delete": "Deleted lab results",
  "lab.import_confirmed": "Confirmed imported lab values",
  "measurement.create": "Added a reading",
  "measurement.update": "Edited a reading",
  "measurement.delete": "Deleted a reading",
  "measurement.import": "Imported readings",
  "profile.update": "Updated profile",
  "health_summary.update": "Updated health summary",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const { tab: rawTab } = await searchParams;
  const tab = TABS.find((t) => t.key === rawTab)?.key ?? "profile";
  const tz = user.timezone;
  const { user: account, profile, medications, allergies, conditions } = await getProfile(user.id);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Profile & settings"
        description="Your details, health summary, preferences and privacy controls."
      />
      <nav
        aria-label="Settings sections"
        className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0"
      >
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/settings?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 px-3 pt-1 pb-3 text-sm font-medium transition",
              tab === t.key
                ? "border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "profile" && (
        <Card>
          <CardContent className="pt-5 sm:pt-6">
            <ProfileForm
              email={account.email}
              today={toDateInputValue(new Date(), tz)}
              values={{
                fullName: profile?.fullName ?? "",
                dateOfBirth: toDateInputValue(profile?.dateOfBirth, "UTC"),
                sex: profile?.sex ?? "",
                phone: formatIndianPhone(profile?.phone),
                city: profile?.city ?? "",
                state: profile?.state ?? "",
                bloodGroup: profile?.bloodGroup ?? "",
                heightCm: profile?.heightCm ? String(toNum(profile.heightCm)) : "",
                emergencyContactName: profile?.emergencyContactName ?? "",
                emergencyContactPhone: formatIndianPhone(profile?.emergencyContactPhone),
                emergencyContactRelation: profile?.emergencyContactRelation ?? "",
              }}
            />
          </CardContent>
        </Card>
      )}

      {tab === "health" && (
        <div className="space-y-6">
          <HealthCard
            icon={HeartPulse}
            title="Medical conditions"
            action={<HealthItemDialog kind="condition" />}
            empty="No conditions added."
          >
            {conditions.map((c) => (
              <Row
                key={c.id}
                title={c.name}
                subtitle={[
                  CONDITION_STATUS_LABELS[c.status],
                  c.diagnosedOn && `since ${formatDate(c.diagnosedOn, "UTC")}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                actions={
                  <>
                    <HealthItemDialog
                      kind="condition"
                      initial={{
                        id: c.id,
                        name: c.name,
                        status: c.status,
                        diagnosedOn: toDateInputValue(c.diagnosedOn, "UTC"),
                        notes: c.notes,
                      }}
                    />
                    <ConfirmDelete
                      action={deleteHealthItemAction.bind(null, "condition", c.id)}
                      title="Remove this condition?"
                      description={c.name}
                      iconOnly
                      triggerVariant="ghost"
                      triggerSize="sm"
                      triggerLabel={`Remove ${c.name}`}
                    />
                  </>
                }
              />
            ))}
          </HealthCard>
          <HealthCard
            icon={Pill}
            title="Medications"
            action={<HealthItemDialog kind="medication" />}
            empty="No medications added."
            note="Recorded exactly as prescribed. Kosha never recommends medicines or doses."
          >
            {medications.map((m) => (
              <Row
                key={m.id}
                title={
                  <>
                    {m.name} {!m.active && <Badge variant="secondary">Stopped</Badge>}
                  </>
                }
                subtitle={[m.dosage, m.frequency, m.prescribedBy && `by ${m.prescribedBy}`]
                  .filter(Boolean)
                  .join(" · ")}
                actions={
                  <>
                    <HealthItemDialog
                      kind="medication"
                      initial={{
                        id: m.id,
                        name: m.name,
                        dosage: m.dosage,
                        frequency: m.frequency,
                        startDate: toDateInputValue(m.startDate, "UTC"),
                        endDate: toDateInputValue(m.endDate, "UTC"),
                        prescribedBy: m.prescribedBy,
                        active: m.active,
                        notes: m.notes,
                      }}
                    />
                    <ConfirmDelete
                      action={deleteHealthItemAction.bind(null, "medication", m.id)}
                      title="Remove this medication?"
                      description={m.name}
                      iconOnly
                      triggerVariant="ghost"
                      triggerSize="sm"
                      triggerLabel={`Remove ${m.name}`}
                    />
                  </>
                }
              />
            ))}
          </HealthCard>
          <HealthCard
            icon={AlertTriangle}
            title="Allergies"
            action={<HealthItemDialog kind="allergy" />}
            empty="No allergies added."
          >
            {allergies.map((a) => (
              <Row
                key={a.id}
                title={a.allergen}
                subtitle={[a.reaction, SEVERITY_LABELS[a.severity]].filter(Boolean).join(" · ")}
                actions={
                  <>
                    <HealthItemDialog
                      kind="allergy"
                      initial={{
                        id: a.id,
                        allergen: a.allergen,
                        reaction: a.reaction,
                        severity: a.severity,
                        notes: a.notes,
                      }}
                    />
                    <ConfirmDelete
                      action={deleteHealthItemAction.bind(null, "allergy", a.id)}
                      title="Remove this allergy?"
                      description={a.allergen}
                      iconOnly
                      triggerVariant="ghost"
                      triggerSize="sm"
                      triggerLabel={`Remove ${a.allergen}`}
                    />
                  </>
                }
              />
            ))}
          </HealthCard>
        </div>
      )}

      {tab === "preferences" && (
        <Card>
          <CardContent className="pt-5 sm:pt-6">
            <PreferencesForm
              values={{
                glucoseUnit: profile?.glucoseUnit ?? "MG_DL",
                weightUnit: profile?.weightUnit ?? "KG",
                temperatureUnit: profile?.temperatureUnit ?? "F",
              }}
            />
          </CardContent>
        </Card>
      )}

      {tab === "privacy" && <PrivacyTab userId={user.id} isDemo={user.isDemo} tz={tz} />}
    </div>
  );
}

async function PrivacyTab({ userId, isDemo, tz }: { userId: string; isDemo: boolean; tz: string }) {
  const [sessions, activity, jar] = await Promise.all([
    listSessions(userId),
    db.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, action: true, createdAt: true },
    }),
    cookies(),
  ]);
  const current = jar.get(SESSION_COOKIE)?.value;
  const currentHash = current ? hashToken(current) : null;
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-3 pt-5 text-sm sm:pt-6">
          <div className="flex items-center gap-2 font-medium">
            <ShieldCheck className="text-primary size-4" /> How your data is handled
          </div>
          <ul className="text-muted-foreground list-disc space-y-1.5 pl-5">
            <li>
              Your records are visible only to your account. Every request is checked on the server.
            </li>
            <li>
              Documents are stored privately and are only served to you after checking your session.
            </li>
            <li>
              The AI assistant only reads the records relevant to each question and never changes
              your records.
            </li>
            <li>Security events are logged without the contents of your records.</li>
          </ul>
          <p className="text-muted-foreground text-xs">
            Kosha is not a government or ABDM-integrated service and does not share your records
            with any hospital, insurer or third party.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent>
          {isDemo ? (
            <p className="text-muted-foreground text-sm">
              The demo account&apos;s password can&apos;t be changed.
            </p>
          ) : (
            <ChangePasswordForm />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Signed-in devices</CardTitle>
          {sessions.length > 1 && <RevokeSessionsButton />}
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                <span>
                  {describeUA(s.userAgent)}{" "}
                  {s.tokenHash === currentHash && <Badge className="ml-1">This device</Badge>}
                </span>
                <span className="text-muted-foreground text-xs">
                  Active {formatDateTime(s.lastUsedAt, tz)}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Your data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Download a copy of everything you&apos;ve stored — records, lab results, readings,
            health summary and assistant conversations. Files can be downloaded individually from
            Documents.
          </p>
          <ExportButton />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent account activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {activity.map((a) => (
              <li key={a.id} className="flex justify-between gap-3 py-2">
                <span>{ACTION_LABELS[a.action] ?? a.action}</span>
                <span className="text-muted-foreground text-xs">
                  {formatDateTime(a.createdAt, tz)}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      {isDemo ? (
        <p className="text-muted-foreground text-sm">
          The shared demo account can&apos;t be deleted.
        </p>
      ) : (
        <DeleteAccountForm />
      )}
    </div>
  );
}

function HealthCard({
  icon: Icon,
  title,
  action,
  empty,
  note,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  action: React.ReactNode;
  empty: string;
  note?: string;
  children: React.ReactNode[];
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Icon className="text-primary size-4" /> {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent>
        {children.length ? (
          <ul className="divide-y">{children}</ul>
        ) : (
          <p className="text-muted-foreground text-sm">{empty}</p>
        )}
        {note && <p className="text-muted-foreground mt-3 text-xs">{note}</p>}
      </CardContent>
    </Card>
  );
}

function Row({
  title,
  subtitle,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: string;
  actions: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="font-medium">{title}</div>
        {subtitle && <div className="text-muted-foreground text-sm">{subtitle}</div>}
      </div>
      <div className="flex shrink-0 items-center">{actions}</div>
    </li>
  );
}
