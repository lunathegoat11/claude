import { AlertTriangle } from "lucide-react";
import { env } from "@/server/env";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";

/**
 * The operator's details used in the Privacy Policy and Terms. Each comes from the
 * server's settings (.env); anything missing is shown in [square brackets], and the
 * documents keep their "draft" warning until every item is filled in AND a lawyer has
 * reviewed them (LEGAL_REVIEWED=true).
 */
export function legalParties() {
  const e = env();
  const fields = {
    org: e.ORGANIZATION_NAME,
    contact: e.CONTACT_EMAIL,
    officer: e.GRIEVANCE_OFFICER_NAME,
    officerEmail: e.GRIEVANCE_OFFICER_EMAIL || e.CONTACT_EMAIL,
    officerAddress: e.GRIEVANCE_OFFICER_ADDRESS,
    location: e.DATA_LOCATION,
    hosts: e.HOSTING_PROVIDERS,
    city: e.JURISDICTION_CITY,
    backupDays: e.BACKUP_RETENTION_DAYS?.toString(),
  };
  const complete = Object.values(fields).every(Boolean);
  return {
    org: fields.org || "[Your organisation's legal name]",
    contact: fields.contact || "[contact email]",
    officer: fields.officer || "[Grievance Officer's name]",
    officerEmail: fields.officerEmail || "[grievance email]",
    officerAddress: fields.officerAddress || "[Grievance Officer's postal address]",
    location: fields.location || "[city and country where data is stored, and the hosting company]",
    hosts: fields.hosts || "[hosting and storage companies]",
    city: fields.city || "[city]",
    backupDays: fields.backupDays || "[number of]",
    reviewed: e.LEGAL_REVIEWED && complete,
    complete,
  };
}

export function LegalDoc({
  title,
  intro,
  children,
}: {
  title: string;
  intro: React.ReactNode;
  children: React.ReactNode;
}) {
  const { reviewed } = legalParties();
  return (
    <article className="space-y-8">
      {!reviewed && (
        <div
          role="note"
          className="border-warning/50 bg-warning/8 flex gap-3 rounded-[var(--radius)] border p-4 text-sm leading-relaxed"
        >
          <AlertTriangle className="text-warning mt-0.5 size-5 shrink-0" />
          <p>
            <strong>Draft template.</strong> This document has not yet been reviewed by a lawyer and
            is not legal advice. Items in [square brackets] still need to be completed by the
            operator of this service.
          </p>
        </div>
      )}
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="text-muted-foreground text-sm">Last updated: {LEGAL_LAST_UPDATED}</p>
        <div className="text-muted-foreground text-[15px] leading-relaxed">{intro}</div>
      </header>
      <div className="space-y-8 text-[15px] leading-relaxed [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:mt-1.5 [&_p]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </article>
  );
}
