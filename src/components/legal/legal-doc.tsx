import { AlertTriangle } from "lucide-react";
import { env } from "@/server/env";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";

export function legalParties() {
  const e = env();
  return {
    org: e.ORGANIZATION_NAME || "[Your organisation's legal name]",
    contact: e.CONTACT_EMAIL || "[contact email]",
    officer: e.GRIEVANCE_OFFICER_NAME || "[Grievance Officer's name]",
    officerEmail: e.GRIEVANCE_OFFICER_EMAIL || e.CONTACT_EMAIL || "[grievance email]",
    reviewed: e.LEGAL_REVIEWED,
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
          className="border-warning/50 bg-warning/8 flex gap-3 rounded-2xl border p-4 text-sm leading-relaxed"
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
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">Last updated: {LEGAL_LAST_UPDATED}</p>
        <div className="text-muted-foreground text-[15px] leading-relaxed">{intro}</div>
      </header>
      <div className="space-y-8 text-[15px] leading-relaxed [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:mt-1.5 [&_p]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </article>
  );
}
