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
import { PlanPanel } from "@/components/settings/plan-panel";
import { checkoutConfig, getPlan } from "@/server/services/billing";
import { PRICES } from "@/lib/pricing";
import { regionFor } from "@/lib/catalog/standard-ranges";
import { ImproveReadingSwitch } from "@/components/settings/improve-reading";
import { AiHelperSettings } from "@/components/settings/ai-helper";
import { AI_PROVIDER_LABELS, getAiSettings, serverAiLabel } from "@/server/services/ai-settings";
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
import { formatDate, formatDateTime, toDateInputValue } from "@/lib/format";
import { formatIndianPhone } from "@/lib/india";
import { cn, toNum } from "@/lib/utils";
import { getT } from "@/i18n/server";
import type { MessageKey } from "@/i18n/messages";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("nav.settings") };
}

const TABS = [
  { key: "profile", label: "account.tab.profile" },
  { key: "health", label: "account.tab.health" },
  { key: "preferences", label: "account.tab.preferences" },
  { key: "plan", label: "account.tab.plan" },
  { key: "ai", label: "account.tab.ai" },
  { key: "privacy", label: "account.tab.privacy" },
] as const satisfies readonly { key: string; label: MessageKey }[];

const ACTION_LABELS: Record<string, MessageKey> = {
  "auth.sign_in": "account.activity.auth.sign_in",
  "auth.sign_out": "account.activity.auth.sign_out",
  "auth.sign_up": "account.activity.auth.sign_up",
  "auth.password_changed": "account.activity.auth.password_changed",
  "auth.sessions_revoked": "account.activity.auth.sessions_revoked",
  "document.upload": "account.activity.document.upload",
  "document.download": "account.activity.document.download",
  "document.view": "account.activity.document.view",
  "document.delete": "account.activity.document.delete",
  "data.export": "account.activity.data.export",
  "ai.query": "account.activity.ai.query",
  "record.create": "account.activity.record.create",
  "record.update": "account.activity.record.update",
  "record.delete": "account.activity.record.delete",
  "lab.create": "account.activity.lab.create",
  "lab.update": "account.activity.lab.update",
  "lab.delete": "account.activity.lab.delete",
  "lab.import_confirmed": "account.activity.lab.import_confirmed",
  "measurement.create": "account.activity.measurement.create",
  "measurement.update": "account.activity.measurement.update",
  "measurement.delete": "account.activity.measurement.delete",
  "measurement.import": "account.activity.measurement.import",
  "profile.update": "account.activity.profile.update",
  "health_summary.update": "account.activity.health_summary.update",
  "ai.key_saved": "account.activity.ai.key_saved",
  "ai.key_removed": "account.activity.ai.key_removed",
  "ai.document_reading": "account.activity.ai.document_reading",
  "consent.given": "account.activity.consent.given",
};

const SEVERITY_KEYS = {
  MILD: "account.severity.MILD",
  MODERATE: "account.severity.MODERATE",
  SEVERE: "account.severity.SEVERE",
  UNKNOWN: "account.severity.UNKNOWN",
} as const satisfies Record<string, MessageKey>;

const CONDITION_STATUS_KEYS = {
  ACTIVE: "account.conditionStatus.ACTIVE",
  MANAGED: "account.conditionStatus.MANAGED",
  RESOLVED: "account.conditionStatus.RESOLVED",
} as const satisfies Record<string, MessageKey>;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; paid?: string }>;
}) {
  const t = await getT();
  const user = await requireUser();
  const { tab: rawTab, paid } = await searchParams;
  const tab = TABS.find((x) => x.key === rawTab)?.key ?? "profile";
  const tz = user.timezone;
  const { user: account, profile, medications, allergies, conditions } = await getProfile(user.id);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("nav.settings")} description={t("account.settings.description")} />
      <nav
        aria-label={t("account.settings.sections")}
        className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0"
      >
        {TABS.map((x) => (
          <Link
            key={x.key}
            href={`/settings?tab=${x.key}`}
            aria-current={tab === x.key ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 px-3 pt-1 pb-3 text-sm font-medium transition",
              tab === x.key
                ? "border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {t(x.label)}
          </Link>
        ))}
      </nav>

      {tab === "plan" && (
        <Card>
          <CardContent className="pt-5 sm:pt-6">
            <PlanTab userId={user.id} email={account.email} tz={tz} justPaid={paid === "1"} />
          </CardContent>
        </Card>
      )}

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
            title={t("account.health.conditions")}
            action={<HealthItemDialog kind="condition" />}
            empty={t("account.health.conditions.empty")}
          >
            {conditions.map((c) => (
              <Row
                key={c.id}
                title={c.name}
                subtitle={[
                  t(CONDITION_STATUS_KEYS[c.status]),
                  c.diagnosedOn &&
                    t("account.health.since", { date: formatDate(c.diagnosedOn, "UTC") }),
                ]
                  .filter(Boolean)
                  .join(", ")}
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
                      title={t("account.health.removeCondition")}
                      description={c.name}
                      iconOnly
                      triggerVariant="ghost"
                      triggerSize="sm"
                      triggerLabel={t("account.health.remove", { name: c.name })}
                    />
                  </>
                }
              />
            ))}
          </HealthCard>
          <HealthCard
            icon={Pill}
            title={t("account.health.medications")}
            action={<HealthItemDialog kind="medication" />}
            empty={t("account.health.medications.empty")}
            note={t("account.health.medications.note")}
          >
            {medications.map((m) => (
              <Row
                key={m.id}
                title={
                  <>
                    {m.name}{" "}
                    {!m.active && <Badge variant="secondary">{t("account.health.stopped")}</Badge>}
                  </>
                }
                subtitle={[
                  m.dosage,
                  m.frequency,
                  m.prescribedBy && t("account.health.by", { name: m.prescribedBy }),
                ]
                  .filter(Boolean)
                  .join(", ")}
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
                      title={t("account.health.removeMedication")}
                      description={m.name}
                      iconOnly
                      triggerVariant="ghost"
                      triggerSize="sm"
                      triggerLabel={t("account.health.remove", { name: m.name })}
                    />
                  </>
                }
              />
            ))}
          </HealthCard>
          <HealthCard
            icon={AlertTriangle}
            title={t("account.health.allergies")}
            action={<HealthItemDialog kind="allergy" />}
            empty={t("account.health.allergies.empty")}
          >
            {allergies.map((a) => (
              <Row
                key={a.id}
                title={a.allergen}
                subtitle={[a.reaction, t(SEVERITY_KEYS[a.severity])].filter(Boolean).join(", ")}
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
                      title={t("account.health.removeAllergy")}
                      description={a.allergen}
                      iconOnly
                      triggerVariant="ghost"
                      triggerSize="sm"
                      triggerLabel={t("account.health.remove", { name: a.allergen })}
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
                rangeRegion: profile?.rangeRegion ?? "AUTO",
                autoRegion: regionFor(null, profile?.timezone),
              }}
            />
          </CardContent>
        </Card>
      )}

      {tab === "ai" && <AiTab userId={user.id} isDemo={user.isDemo} tz={tz} />}

      {tab === "privacy" && <PrivacyTab userId={user.id} isDemo={user.isDemo} tz={tz} />}
    </div>
  );
}

async function AiTab({ userId, isDemo, tz }: { userId: string; isDemo: boolean; tz: string }) {
  const t = await getT();
  const [saved, consent] = await Promise.all([
    getAiSettings(userId),
    db.user.findUnique({ where: { id: userId }, select: { aiConsentAt: true } }),
  ]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("account.tab.ai")}</CardTitle>
      </CardHeader>
      <CardContent>
        <AiHelperSettings
          isDemo={isDemo}
          serverAi={serverAiLabel()}
          serverConsent={!!consent?.aiConsentAt}
          saved={
            saved && {
              provider: saved.provider,
              providerLabel: AI_PROVIDER_LABELS[saved.provider] ?? saved.provider,
              model: saved.model,
              keyHint: saved.keyHint,
              readDocuments: saved.readDocuments,
              savedOn: formatDate(saved.updatedAt, tz),
              usable: saved.usable,
            }
          }
        />
      </CardContent>
    </Card>
  );
}

async function PrivacyTab({ userId, isDemo, tz }: { userId: string; isDemo: boolean; tz: string }) {
  const t = await getT();
  const [sessions, activity, jar, account] = await Promise.all([
    listSessions(userId),
    db.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, action: true, createdAt: true },
    }),
    cookies(),
    db.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        emailVerified: true,
        termsAcceptedAt: true,
        healthDataConsentAt: true,
        consentVersion: true,
        improveReadingAt: true,
        passwordHash: true,
        accounts: { select: { provider: true } },
      },
    }),
  ]);
  const hasPassword = !!account?.passwordHash;
  const linked = (account?.accounts ?? []).map((a) =>
    a.provider === "apple" ? "Apple" : "Google",
  );
  const current = jar.get(SESSION_COOKIE)?.value;
  const currentHash = current ? hashToken(current) : null;
  return (
    <div className="space-y-6">
      {!isDemo && (
        <Card>
          <CardHeader>
            <CardTitle>{t("account.privacy.improveTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ImproveReadingSwitch initial={!!account?.improveReadingAt} />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="space-y-3 pt-5 text-sm sm:pt-6">
          <div className="flex items-center gap-2 font-medium">
            <ShieldCheck className="text-primary size-4" /> {t("account.privacy.handling")}
          </div>
          <ul className="text-muted-foreground list-disc space-y-1.5 pl-5">
            <li>{t("account.privacy.point1")}</li>
            <li>{t("account.privacy.point2")}</li>
            <li>{t("account.privacy.point3")}</li>
            <li>{t("account.privacy.point4")}</li>
          </ul>
          <p className="text-muted-foreground text-xs">{t("account.privacy.sharing")}</p>
          <dl className="grid gap-2 border-t pt-3 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs">{t("account.email")}</dt>
              <dd>
                {account?.email} ·{" "}
                {account?.emailVerified || isDemo ? (
                  <span className="text-success">{t("account.privacy.confirmed")}</span>
                ) : (
                  <span className="text-warning">{t("account.privacy.notConfirmed")}</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">{t("account.privacy.consent")}</dt>
              <dd>
                {account?.healthDataConsentAt
                  ? t("account.privacy.consentGiven", {
                      date: formatDate(account.healthDataConsentAt, tz),
                      version: account.consentVersion ?? "",
                    })
                  : t("account.privacy.consentOld")}
              </dd>
            </div>
          </dl>
          <p className="text-xs">
            <Link href="/privacy" className="text-primary underline underline-offset-2">
              {t("account.link.privacy")}
            </Link>{" "}
            ·{" "}
            <Link href="/terms" className="text-primary underline underline-offset-2">
              {t("account.link.terms")}
            </Link>
            . {t("account.privacy.withdraw")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("account.password")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isDemo ? (
            <p className="text-muted-foreground text-sm">{t("account.privacy.demoPassword")}</p>
          ) : hasPassword ? (
            <ChangePasswordForm />
          ) : (
            <p className="text-muted-foreground text-sm">
              {t("account.privacy.oauthPassword", {
                providers: (linked.length ? linked : ["Google", "Apple"]).join(
                  ` ${t("account.or")} `,
                ),
              })}
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t("account.devices.title")}</CardTitle>
          {sessions.length > 1 && <RevokeSessionsButton />}
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                <span>
                  {s.device ?? t("account.devices.unknown")}{" "}
                  {s.tokenHash === currentHash && (
                    <Badge className="ml-1">{t("account.devices.current")}</Badge>
                  )}
                </span>
                <span className="text-muted-foreground text-xs">
                  {t("account.devices.active", { time: formatDateTime(s.lastUsedAt, tz) })}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("account.data.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">{t("account.data.desc")}</p>
          <ExportButton />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("account.activity.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {activity.map((a) => (
              <li key={a.id} className="flex justify-between gap-3 py-2">
                <span>{ACTION_LABELS[a.action] ? t(ACTION_LABELS[a.action]) : a.action}</span>
                <span className="text-muted-foreground text-xs">
                  {formatDateTime(a.createdAt, tz)}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      {isDemo ? (
        <p className="text-muted-foreground text-sm">{t("account.delete.demo")}</p>
      ) : (
        <DeleteAccountForm needsPassword={hasPassword} />
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

async function PlanTab({
  userId,
  email,
  tz,
  justPaid,
}: {
  userId: string;
  email: string;
  tz: string;
  justPaid: boolean;
}) {
  const plan = await getPlan(userId, tz);
  return (
    <PlanPanel
      plan={{
        plus: plan.plus,
        via: plan.via,
        status: plan.status,
        renews: plan.currentPeriodEnd ? formatDate(plan.currentPeriodEnd, tz) : null,
        canManage: plan.canManage,
        uploadsThisMonth: plan.uploadsThisMonth,
        uploadLimit: plan.uploadLimit,
      }}
      prices={PRICES[regionFor(null, tz)]}
      checkout={checkoutConfig()}
      user={{ id: userId, email }}
      justPaid={justPaid}
    />
  );
}
