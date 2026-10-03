"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, FileSpreadsheet, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { importCsvAction, previewCsvAction } from "@/actions/tracking";
import { useActionForm } from "@/components/forms/use-action-form";
import { FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CONTEXT_LABELS } from "@/lib/catalog/metrics";
import { CSV_TEMPLATE } from "@/lib/csv-template";
import { formatDateTime } from "@/lib/format";
import type { CsvRowResult } from "@/server/services/measurements";

export function CsvImport({ timezone }: { timezone: string }) {
  const router = useRouter();
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
        toast.success(`${res.message}${res.data?.skipped ? ` · ${res.data.skipped} skipped` : ""}`);
        router.push("/tracking");
        router.refresh();
      } else toast.error(res.error ?? "Import failed");
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-5 sm:pt-6">
          <div className="text-muted-foreground text-sm">
            <p>
              Columns: <code className="bg-muted rounded px-1">metric</code>,{" "}
              <code className="bg-muted rounded px-1">value</code>,{" "}
              <code className="bg-muted rounded px-1">value2</code> (for blood pressure),{" "}
              <code className="bg-muted rounded px-1">unit</code>,{" "}
              <code className="bg-muted rounded px-1">measured_at</code> (YYYY-MM-DD HH:mm, Indian
              Standard Time), <code className="bg-muted rounded px-1">context</code>,{" "}
              <code className="bg-muted rounded px-1">notes</code>.
            </p>
            <p className="mt-1">
              Metric names: blood_glucose, blood_pressure, heart_rate, spo2, temperature, weight,
              height, sleep, exercise, or the name of a custom measurement.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            <Download /> Download template
          </Button>
          <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="file"
              name="file"
              accept=".csv,text/csv"
              required
              aria-label="CSV file"
              className="file:bg-secondary block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-2 file:text-sm file:font-medium"
            />
            <SubmitButton pending={checking} variant="secondary" pendingLabel="Checking…">
              <FileSpreadsheet /> Check file
            </SubmitButton>
          </form>
          {state.error && <FormError message={state.error} />}
        </CardContent>
      </Card>

      {preview && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              <strong>{valid}</strong> of {preview.rows.length} rows are ready to import. Rows with
              problems will be skipped.
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setDismissed(preview)}>
                Cancel
              </Button>
              <Button onClick={confirm} disabled={pending || valid === 0}>
                {pending && <Loader2 className="animate-spin" />} Import {valid} readings
              </Button>
            </div>
          </div>
          <div className="bg-card max-h-[60vh] overflow-auto rounded-2xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground sticky top-0 border-b text-left text-xs">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Measurement</th>
                  <th className="px-3 py-2">Value</th>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.rows.map((r) => (
                  <tr key={r.line}>
                    <td className="text-muted-foreground tabular px-3 py-2">{r.line}</td>
                    <td className="px-3 py-2">
                      {r.metricName ?? "—"}
                      {r.context && (
                        <span className="text-muted-foreground">
                          {" "}
                          · {CONTEXT_LABELS[r.context] ?? r.context}
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
                          <CheckCircle2 className="size-4" /> Ready
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
