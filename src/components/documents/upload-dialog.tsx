"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileUp, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field, FormError } from "@/components/forms/field";
import { DOCUMENT_TYPE_LABELS } from "@/lib/catalog/labels";
import { DOCUMENT_TYPES } from "@/lib/validation/health";
import { cn, formatBytes } from "@/lib/utils";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp,image/heic";

function guessType(name: string): string {
  const n = name.toLowerCase();
  if (/(cbc|lab|report|blood|lipid|thyroid|hba1c|sugar|test)/.test(n)) return "LAB_REPORT";
  if (/(prescription|rx)/.test(n)) return "PRESCRIPTION";
  if (/discharge/.test(n)) return "DISCHARGE_SUMMARY";
  if (/(x-?ray|mri|ct|scan|ultrasound|usg|echo|ecg)/.test(n)) return "IMAGING_REPORT";
  if (/(vaccin|immuni)/.test(n)) return "VACCINATION_RECORD";
  if (/(insurance|policy|claim)/.test(n)) return "INSURANCE";
  return "OTHER";
}

export function UploadDialog({
  records,
  maxMb,
  today,
  providers,
}: {
  records: { id: string; title: string }[];
  maxMb: number;
  today: string;
  providers: string[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("OTHER");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const presetRecord = sp.get("recordId") ?? "";

  useEffect(() => {
    if (sp.get("upload") === "1") setOpen(true);
  }, [sp]);

  const pick = useCallback(
    (f: File | undefined | null) => {
      if (!f) return;
      setError(null);
      if (f.size > maxMb * 1024 * 1024)
        return setError(`That file is ${formatBytes(f.size)}. The limit is ${maxMb} MB.`);
      if (f.type && !ACCEPT.split(",").includes(f.type))
        return setError("Only PDF, JPG, PNG, WebP and HEIC files are supported.");
      setFile(f);
      setName(
        (n) =>
          n ||
          f.name
            .replace(/\.[^.]+$/, "")
            .replace(/[_-]+/g, " ")
            .trim(),
      );
      setType(guessType(f.name));
    },
    [maxMb],
  );

  function reset() {
    setFile(null);
    setName("");
    setType("OTHER");
    setError(null);
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return setError("Choose a file to upload.");
    setBusy(true);
    setError(null);
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    fd.set("file", file);
    try {
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message ?? "Upload failed. Please try again.");
        setFieldErrors(body?.error?.fieldErrors ?? {});
        return;
      }
      setOpen(false);
      reset();
      if (body.importJobId) {
        toast.success(
          `Uploaded. We found ${body.candidateCount} possible lab value${body.candidateCount === 1 ? "" : "s"} — please review them.`,
        );
        router.push(`/labs/import/${body.importJobId}`);
      } else {
        toast.success("Document uploaded");
        router.push(`/documents/${body.id}`);
      }
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Upload /> Upload document
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            reset();
            if (sp.get("upload")) router.replace("/documents", { scroll: false });
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Upload a document</DialogTitle>
            <DialogDescription>
              PDF or photo, up to {maxMb} MB. Lab reports are scanned for values that you can review
              before saving.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4" noValidate>
            {error && <FormError message={error} />}
            {!file ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  pick(e.dataTransfer.files?.[0]);
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 py-10 text-center transition",
                  dragging ? "border-primary bg-accent" : "border-input",
                )}
              >
                <span className="bg-accent text-accent-foreground flex size-12 items-center justify-center rounded-2xl">
                  <FileUp className="size-6" />
                </span>
                <div className="text-sm">
                  <span className="font-medium">Drag a file here</span>{" "}
                  <span className="text-muted-foreground">or</span>
                </div>
                <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
                  Choose file
                </Button>
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPT}
                  className="sr-only"
                  onChange={(e) => pick(e.target.files?.[0])}
                  aria-label="Choose file"
                />
              </div>
            ) : (
              <div className="bg-muted/50 flex items-center gap-3 rounded-xl border px-3 py-2.5">
                <FileUp className="text-primary size-5" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{file.name}</div>
                  <div className="text-muted-foreground text-xs">{formatBytes(file.size)}</div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={reset}
                  aria-label="Remove file"
                >
                  <X />
                </Button>
              </div>
            )}
            {file && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Name"
                  htmlFor="doc-name"
                  className="sm:col-span-2"
                  error={fieldErrors.name}
                >
                  <Input
                    id="doc-name"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Type" htmlFor="doc-type" error={fieldErrors.type}>
                  <NativeSelect
                    id="doc-type"
                    name="type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    {DOCUMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {DOCUMENT_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field
                  label="Date on document"
                  htmlFor="doc-date"
                  optional
                  error={fieldErrors.documentDate}
                >
                  <Input id="doc-date" name="documentDate" type="date" max={today} />
                </Field>
                <Field
                  label="Hospital, lab or doctor"
                  htmlFor="doc-provider"
                  optional
                  className="sm:col-span-2"
                >
                  <Input
                    id="doc-provider"
                    name="providerName"
                    list="doc-providers"
                    placeholder="e.g. City Diagnostics, Lucknow"
                  />
                  <datalist id="doc-providers">
                    {providers.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Attach to record" htmlFor="doc-record" optional>
                  <NativeSelect id="doc-record" name="recordId" defaultValue={presetRecord}>
                    <option value="">None</option>
                    {records.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Tags" htmlFor="doc-tags" optional hint="Comma separated">
                  <Input id="doc-tags" name="tags" />
                </Field>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!file || busy}>
                {busy && <Loader2 className="animate-spin" />} {busy ? "Uploading…" : "Upload"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
