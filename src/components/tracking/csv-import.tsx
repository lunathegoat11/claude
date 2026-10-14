"use client";
import { BusyContent } from "@/components/shared/delayed-loader";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, FileSpreadsheet, XCircle } from "lucide-react";
import { toast } from "sonner";
import { importCsvAction, previewCsvAction } from "@/actions/tracking";
import { useActionForm } from "@/components/forms/use-action-form";
import { FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CSV_TEMPLATE } from "@/lib/csv-template";
import { formatDateTime } from "@/lib/format";
import type { CsvRowResult } from "@/server/services/measurements";
import { useT } from "@/i18n/client";
import { contextLabel, metricName } from "./metric-labels";

export function CsvImport({ timezone }: { timezone: string }) {
  const router = useRouter();
  const t = useT();
  const {
    state,
    onSubmit,
    pending: checking,
  } = useActionForm<{ rows: CsvRowResult[]; csv: string }>(previewCsvAction, {
    successToast: false,
  });
  const [pending, start] = useTransition();
  const [dismissed, setDismissed] = useState<object | null>(null);
  const preview = state.ok && state.data && dismissed !== state.data ? state.data : null;
  const valid = preview?.rows.filter((r) => r.ok).length ?? 0;

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "kosha-measurements-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function confirm() {
    if (!preview) return;
    start(async () => {
      const res = await importCsvAction(preview.csv);
      if (res.ok) {
        toast.success(
          `${res.message}${res.data?.skipped ? `, ${t.n("app.csv.skipped", res.data.skipped)}` : ""}`,
        );
        router.push("/tracking");
        router.refresh();
      } else toast.error(res.error ?? t("app.csv.failed"));
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-5 sm:pt-6">
          <div className="text-muted-foreground text-sm">
            <p>
              {t("app.csv.columns")} <code className="bg-muted rounded px-1">metric</code>,{" "}
              <code className="bg-muted rounded px-1">value</code>,{" "}
              <code className="bg-muted rounded px-1">value2</code> {t("app.csv.forBp")},{" "}
              <code className="bg-muted rounded px-1">unit</code>,{" "}
              <code className="bg-muted rounded px-1">measured_at</code> {t("app.csv.dateFormat")},{" "}
              <code className="bg-muted rounded px-1">context</code>,{" "}
              <code className="bg-muted rounded px-1">notes</code>.
            </p>
            <p className="mt-1">
              {t("app.csv.metricNames", {
                list: "blood_glucose, blood_pressure, heart_rate, spo2, temperature, weight, height, sleep, exercise",
              })}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            <Download /> {t("app.csv.template")}
          </Button>
          <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="file"
              name="file"
              accept=".csv,text/csv"
              required
              aria-label={t("app.csv.file")}
              className="file:bg-secondary block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-2 file:text-sm file:font-medium pointer-coarse:file:py-3"
            />
            <SubmitButton
              pending={checking}
              variant="secondary"
              pendingLabel={t("app.csv.checking")}
            >
              <FileSpreadsheet /> {t("app.csv.check")}
            </SubmitButton>
          </form>
          {state.error && <FormError message={state.error} />}
        </CardContent>
      </Card>

      {preview && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              {t("app.csv.readyBefore", { total: preview.rows.length })}
              <strong>{valid}</strong>
              {t("app.csv.readyAfter", { total: preview.rows.length })}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setDismissed(preview)}>
                {t("app.cancel")}
              </Button>
              <Button onClick={confirm} disabled={pending || valid === 0}>
                <BusyContent active={pending} kind="import">
                  {t.n("app.csv.import", valid)}
                </BusyContent>
              </Button>
            </div>
          </div>
          <div className="surface max-h-[60vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground sticky top-0 border-b text-left text-xs">
                <tr>
                  <th className="px-3 py-2">{t("app.csv.row")}</th>
                  <th className="px-3 py-2">{t("app.reading.measurement")}</th>
                  <th className="px-3 py-2">{t("app.csv.value")}</th>
                  <th className="px-3 py-2">{t("app.csv.when")}</th>
                  <th className="px-3 py-2">{t("app.csv.status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.rows.map((r) => (
                  <tr key={r.line}>
                    <td className="text-muted-foreground tabular px-3 py-2">{r.line}</td>
                    <td className="px-3 py-2">
                      {r.metricName
                        ? metricName(t, { key: r.metricKey ?? "", name: r.metricName })
                        : "—"}
                      {r.context && (
                        <span className="text-muted-foreground">
                          {" "}
                          , {contextLabel(t, r.context)}
                        </span>
                      )}
                    </td>
                    <td className="tabular px-3 py-2">
                      {r.ok ? `${r.value}${r.value2 != null ? `/${r.value2}` : ""} ${r.unit}` : "—"}
                    </td>
                    <td className="tabular px-3 py-2">
                      {r.measuredAt ? formatDateTime(r.measuredAt, timezone) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {r.ok ? (
                        <span className="text-success inline-flex items-center gap-1">
                          <CheckCircle2 className="size-4" /> {t("app.csv.ready")}
                        </span>
                      ) : (
                        <span className="text-destructive inline-flex items-center gap-1">
                          <XCircle className="size-4" /> {r.error}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
