"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ChevronDown, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { confirmImportAction, saveLabPanelAction } from "@/actions/labs";
import { Field, FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  BIOMARKERS,
  PANEL_TEMPLATES,
  getBiomarker,
  matchBiomarker,
} from "@/lib/catalog/biomarkers";
import { cn } from "@/lib/utils";

export interface ResultRow {
  key: string;
  include: boolean;
  testName: string;
  biomarkerCode: string;
  value: string;
  unit: string;
  refLow: string;
  refHigh: string;
  refText: string;
  labFlag: string;
  notes: string;
  confidence?: number;
  sourceLine?: string;
  warnings?: string[];
}

export interface PanelFormInitial {
  name: string;
  collectedAt: string;
  labName: string;
  notes: string;
  documentId: string;
  results: Omit<ResultRow, "key" | "include">[];
}

let rowSeq = 0;
const newKey = () => `r${++rowSeq}`;

export function emptyRow(code?: string): ResultRow {
  const def = code ? getBiomarker(code) : undefined;
  return {
    key: newKey(),
    include: true,
    testName: def?.name ?? "",
    biomarkerCode: def?.code ?? "",
    value: "",
    unit: def?.units[0] ?? "",
    refLow: "",
    refHigh: "",
    refText: "",
    labFlag: "",
    notes: "",
  };
}

export function LabPanelForm({
  mode,
  panelId,
  jobId,
  initial,
  documents,
  providers,
  today,
}: {
  mode: "create" | "edit" | "import";
  panelId?: string;
  jobId?: string;
  initial?: Partial<PanelFormInitial>;
  documents: { id: string; name: string }[];
  providers: string[];
  today: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(initial?.name ?? "");
  const [collectedAt, setCollectedAt] = useState(initial?.collectedAt ?? today);
  const [labName, setLabName] = useState(initial?.labName ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [documentId, setDocumentId] = useState(initial?.documentId ?? "");
  const [rows, setRows] = useState<ResultRow[]>(() =>
    initial?.results?.length
      ? initial.results.map((r) => ({ ...r, key: newKey(), include: true }))
      : [emptyRow()],
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [openRanges, setOpenRanges] = useState<Set<string>>(
    () => new Set(rows.filter((r) => r.refLow || r.refHigh || r.refText).map((r) => r.key)),
  );

  const included = rows.filter((r) => r.include);
  const unitOptions = useMemo(() => new Map(BIOMARKERS.map((b) => [b.code, b.units])), []);

  function applyTemplate(key: string) {
    const t = PANEL_TEMPLATES.find((p) => p.key === key);
    if (!t) return;
    if (!name) setName(t.name);
    const existing = new Set(rows.map((r) => r.biomarkerCode).filter(Boolean));
    const blank = rows.filter((r) => r.testName || r.value);
    setRows([...blank, ...t.codes.filter((c) => !existing.has(c)).map((c) => emptyRow(c))]);
  }

  function update(key: string, patch: Partial<ResultRow>) {
    setRows((rs) =>
      rs.map((r) => {
        if (r.key !== key) return r;
        const next = { ...r, ...patch };
        if (patch.testName !== undefined) {
          const def = matchBiomarker(patch.testName);
          next.biomarkerCode = def?.code ?? "";
          if (def && !r.unit) next.unit = def.units[0];
        }
        return next;
      }),
    );
  }

  function submit() {
    setError(null);
    setFieldErrors({});
    const payload = {
      name,
      collectedAt,
      labName,
      notes,
      documentId: mode === "import" ? undefined : documentId,
      results: included.map((r) => ({
        testName: r.testName,
        biomarkerCode: r.biomarkerCode,
        value: r.value,
        unit: r.unit,
        refLow: r.refLow,
        refHigh: r.refHigh,
        refText: r.refText,
        labFlag: r.labFlag || undefined,
        notes: r.notes,
      })),
    };
    start(async () => {
      const res =
        mode === "import" && jobId
          ? await confirmImportAction(jobId, payload)
          : await saveLabPanelAction(panelId ?? null, payload);
      if (res.ok && res.data) {
        toast.success(res.message ?? "Saved");
        router.push(`/labs/reports/${res.data.id}`);
        router.refresh();
      } else {
        setError(res.error ?? "Could not save. Please check the values.");
        setFieldErrors(res.fieldErrors ?? {});
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  const resultErr = (i: number, f: string) => fieldErrors[`results.${i}.${f}`]?.[0];
  const anyResultErrors = Object.keys(fieldErrors).some((k) => k.startsWith("results"));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-8"
      noValidate
    >
      {error && (
        <FormError
          message={
            anyResultErrors ? "Some results need your attention — see the highlighted rows." : error
          }
        />
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Report name"
          htmlFor="name"
          error={fieldErrors.name}
          className="sm:col-span-2"
        >
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Lipid Profile"
            required
          />
        </Field>
        <Field label="Sample collection date" htmlFor="collectedAt" error={fieldErrors.collectedAt}>
          <Input
            id="collectedAt"
            type="date"
            max={today}
            value={collectedAt.slice(0, 10)}
            onChange={(e) => setCollectedAt(e.target.value)}
            required
          />
        </Field>
        <Field label="Laboratory" htmlFor="labName" optional error={fieldErrors.labName}>
          <Input
            id="labName"
            list="lab-providers"
            value={labName}
            onChange={(e) => setLabName(e.target.value)}
            placeholder="e.g. Metro Diagnostics, Chennai"
          />
          <datalist id="lab-providers">
            {providers.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </Field>
        {mode !== "import" && documents.length > 0 && (
          <Field label="Linked document" htmlFor="documentId" optional className="sm:col-span-2">
            <NativeSelect
              id="documentId"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
            >
              <option value="">None</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Results</h2>
            <p className="text-muted-foreground text-sm">
              Copy values and reference ranges exactly as printed on the report.
            </p>
          </div>
          {mode !== "import" && (
            <div className="flex flex-wrap gap-1.5">
              {PANEL_TEMPLATES.map((t) => (
                <Button
                  key={t.key}
                  type="button"
                  variant="soft"
                  size="sm"
                  onClick={() => applyTemplate(t.key)}
                >
                  + {t.name.replace(/ \(.*\)/, "")}
                </Button>
              ))}
            </div>
          )}
        </div>

        <datalist id="biomarkers">
          {BIOMARKERS.map((b) => (
            <option key={b.code} value={b.name} />
          ))}
        </datalist>
        <ol className="space-y-3">
          {rows.map((r) => {
            const idx = included.indexOf(r);
            const units = unitOptions.get(r.biomarkerCode) ?? [];
            const lowConfidence = r.confidence !== undefined && r.confidence < 0.7;
            const rangeOpen = openRanges.has(r.key);
            return (
              <li
                key={r.key}
                className={cn(
                  "bg-card rounded-2xl border p-4 transition",
                  !r.include && "opacity-55",
                  idx >= 0 &&
                    (resultErr(idx, "value") ||
                      resultErr(idx, "testName") ||
                      resultErr(idx, "refHigh")) &&
                    "border-destructive/50",
                )}
              >
                {mode === "import" && (
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                    <label className="inline-flex items-center gap-2 font-medium">
                      <input
                        type="checkbox"
                        checked={r.include}
                        onChange={(e) => update(r.key, { include: e.target.checked })}
                        className="size-5 accent-[var(--primary)]"
                      />
                      Include this value
                    </label>
                    {lowConfidence ? (
                      <Badge variant="warning">
                        <AlertTriangle /> Please double-check
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Read from report</Badge>
                    )}
                    {r.sourceLine && (
                      <span
                        className="text-muted-foreground truncate font-mono"
                        title={r.sourceLine}
                      >
                        “{r.sourceLine}”
                      </span>
                    )}
                    {r.warnings?.map((w) => (
                      <p
                        key={w}
                        role="alert"
                        className="bg-warning/12 w-full rounded-lg px-2.5 py-1.5 text-[13px] font-medium"
                      >
                        ⚠ {w}
                      </p>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <Field
                    label="Test"
                    htmlFor={`t-${r.key}`}
                    className="col-span-2 sm:col-span-1"
                    error={idx >= 0 ? resultErr(idx, "testName") : undefined}
                  >
                    <Input
                      id={`t-${r.key}`}
                      list="biomarkers"
                      value={r.testName}
                      onChange={(e) => update(r.key, { testName: e.target.value })}
                      placeholder="e.g. HbA1c"
                      disabled={!r.include}
                    />
                  </Field>
                  <Field
                    label="Value"
                    htmlFor={`v-${r.key}`}
                    error={idx >= 0 ? resultErr(idx, "value") : undefined}
                  >
                    <Input
                      id={`v-${r.key}`}
                      inputMode="decimal"
                      value={r.value}
                      onChange={(e) => update(r.key, { value: e.target.value })}
                      placeholder="5.6"
                      disabled={!r.include}
                      className="tabular"
                    />
                  </Field>
                  <Field label="Unit" htmlFor={`u-${r.key}`}>
                    <Input
                      id={`u-${r.key}`}
                      list={`units-${r.key}`}
                      value={r.unit}
                      onChange={(e) => update(r.key, { unit: e.target.value })}
                      placeholder="mg/dL"
                      disabled={!r.include}
                    />
                    <datalist id={`units-${r.key}`}>
                      {units.map((u) => (
                        <option key={u} value={u} />
                      ))}
                    </datalist>
                  </Field>
                  <div className="col-span-2 flex items-end justify-end sm:col-span-1">
                    {mode !== "import" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${r.testName || "result"}`}
                        onClick={() =>
                          setRows((rs) =>
                            rs.length > 1 ? rs.filter((x) => x.key !== r.key) : [emptyRow()],
                          )
                        }
                      >
                        <Trash2 className="text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setOpenRanges((s) => {
                      const n = new Set(s);
                      if (n.has(r.key)) n.delete(r.key);
                      else n.add(r.key);
                      return n;
                    })
                  }
                  className="text-primary mt-1 inline-flex min-h-9 items-center gap-1 text-[13px] font-medium"
                  aria-expanded={rangeOpen}
                >
                  <ChevronDown
                    className={cn("size-3.5 transition-transform", rangeOpen && "rotate-180")}
                  />
                  {r.refLow || r.refHigh || r.refText
                    ? `Reference range: ${r.refText || `${r.refLow || "…"} – ${r.refHigh || "…"}`}`
                    : "Add reference range from report"}
                </button>
                {rangeOpen && (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Field label="Range low" htmlFor={`lo-${r.key}`} optional>
                      <Input
                        id={`lo-${r.key}`}
                        inputMode="decimal"
                        value={r.refLow}
                        onChange={(e) => update(r.key, { refLow: e.target.value })}
                        disabled={!r.include}
                      />
                    </Field>
                    <Field
                      label="Range high"
                      htmlFor={`hi-${r.key}`}
                      optional
                      error={idx >= 0 ? resultErr(idx, "refHigh") : undefined}
                    >
                      <Input
                        id={`hi-${r.key}`}
                        inputMode="decimal"
                        value={r.refHigh}
                        onChange={(e) => update(r.key, { refHigh: e.target.value })}
                        disabled={!r.include}
                      />
                    </Field>
                    <Field
                      label="Or range as printed"
                      htmlFor={`rt-${r.key}`}
                      optional
                      className="col-span-2 sm:col-span-1"
                    >
                      <Input
                        id={`rt-${r.key}`}
                        value={r.refText}
                        onChange={(e) => update(r.key, { refText: e.target.value })}
                        placeholder="< 200"
                        disabled={!r.include}
                      />
                    </Field>
                    <Field
                      label="Lab's flag"
                      htmlFor={`f-${r.key}`}
                      optional
                      className="col-span-2 sm:col-span-1"
                    >
                      <NativeSelect
                        id={`f-${r.key}`}
                        value={r.labFlag}
                        onChange={(e) => update(r.key, { labFlag: e.target.value })}
                        disabled={!r.include}
                      >
                        <option value="">From range</option>
                        <option value="HIGH">High (H)</option>
                        <option value="LOW">Low (L)</option>
                        <option value="ABNORMAL">Abnormal</option>
                        <option value="NORMAL">Normal</option>
                      </NativeSelect>
                    </Field>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        {mode !== "import" && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setRows((rs) => [...rs, emptyRow()])}
          >
            <Plus /> Add another test
          </Button>
        )}
        <p className="text-muted-foreground text-xs">
          Reference ranges differ between labs, testing methods, age and sex. Kosha only compares a
          value with the range from the same report.
        </p>
      </section>

      <Field label="Notes" htmlFor="panel-notes" optional>
        <Input
          id="panel-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Fasting sample, taken at home collection"
        />
      </Field>

      <div className="bg-card/95 sticky bottom-20 z-10 flex items-center justify-between gap-2 rounded-2xl border p-2.5 shadow-lg backdrop-blur sm:p-3 lg:bottom-4">
        <span className="text-muted-foreground hidden px-1 text-sm sm:inline">
          {included.length} result{included.length === 1 ? "" : "s"}{" "}
          {mode === "import" ? "selected" : ""}
        </span>
        <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
          <Button asChild variant="ghost">
            <Link href={panelId ? `/labs/reports/${panelId}` : "/labs"}>Cancel</Link>
          </Button>
          <Button
            type="submit"
            className="flex-1 sm:flex-none"
            disabled={pending || included.length === 0}
          >
            {pending && <Loader2 className="animate-spin" />}
            {mode === "import"
              ? "Confirm & save values"
              : mode === "edit"
                ? "Save changes"
                : "Save lab report"}
          </Button>
        </div>
      </div>
    </form>
  );
}
