"use client";
import { DelayedLoader } from "@/components/shared/delayed-loader";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, FileUp, Upload, X } from "lucide-react";
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

/** A hint from the file name. "AUTO" lets the server decide from the document's contents. */
function guessType(name: string): string {
  const n = name.toLowerCase();
  if (/(prescription|\brx\b)/.test(n)) return "PRESCRIPTION";
  if (/discharge/.test(n)) return "DISCHARGE_SUMMARY";
  if (/(x-?ray|mri|\bct\b|ultrasound|usg|echo|ecg)/.test(n)) return "IMAGING_REPORT";
  if (/(vaccin|immuni)/.test(n)) return "VACCINATION_RECORD";
  if (/(insurance|policy|claim)/.test(n)) return "INSURANCE";
  return "AUTO";
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
  const [type, setType] = useState("AUTO");
  const [quality, setQuality] = useState<string | null>(null);
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
      setQuality(null);
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

  const formRef = useRef<HTMLFormElement>(null);

  function reset() {
    setFile(null);
    setName("");
    setType("AUTO");
    setError(null);
    setQuality(null);
    setFieldErrors({});
  }

  function retakePhoto() {
    reset();
    // Open the picker straight away; on phones it offers the camera.
    requestAnimationFrame(() => inputRef.current?.click());
  }

  async function send(allowPoorQuality: boolean) {
    if (!file || !formRef.current) return setError("Choose a file to upload.");
    setBusy(true);
    setError(null);
    setQuality(null);
    setFieldErrors({});
    const fd = new FormData(formRef.current);
    fd.set("file", file);
    if (allowPoorQuality) fd.set("allowPoorQuality", "1");
    try {
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        if (body?.error?.code === "IMAGE_QUALITY") return setQuality(body.error.message);
        setError(body?.error?.message ?? "Upload failed. Please try again.");
        setFieldErrors(body?.error?.fieldErrors ?? {});
        return;
      }
      setOpen(false);
      reset();
      if (body.panelId) {
        const n = body.resultCount as number;
        toast.success(
          `Saved ${n} result${n === 1 ? "" : "s"} from ${body.reportName}` +
            (body.dateFound ? `, ${shortDate(body.collectedAt)}` : ""),
          body.dateFound
            ? undefined
            : {
                description: "No date was printed on the report. You can set it on the next page.",
              },
        );
        router.push(`/labs/reports/${body.panelId}?new=1`);
      } else {
        toast.success("Document saved");
        router.push(`/documents/${body.id}`);
      }
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void send(false);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Upload /> Add a report
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
            <DialogTitle>Add a report or file</DialogTitle>
            <DialogDescription>
              A PDF or a photo, up to {maxMb} MB. Test results on lab reports are read and saved for
              you, with the report&apos;s name and date.
            </DialogDescription>
          </DialogHeader>
          <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
            {error && <FormError message={error} />}
            {quality && (
              <div
                role="alert"
                className="border-warning/40 bg-warning/10 space-y-3 rounded-md border p-4 text-sm"
              >
                <p className="flex gap-2 font-medium">
                  <Camera className="text-warning mt-0.5 size-4 shrink-0" /> {quality}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={retakePhoto}>
                    <Camera /> Take another photo
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => void send(true)}>
                    Save it anyway
                  </Button>
                </div>
              </div>
            )}
            {busy && (
              // Reading a photo can take 10+ seconds: say what's happening, one step at a time.
              <DelayedLoader kind="upload" className="bg-muted min-h-40 rounded-2xl px-4 py-6" />
            )}
            {busy ? null : !file ? (
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
                  "flex flex-col items-center justify-center gap-3 rounded-[var(--radius)] border-2 border-dashed px-4 py-10 text-center transition",
                  dragging ? "border-primary bg-accent" : "border-input",
                )}
              >
                <span className="bg-accent text-accent-foreground flex size-12 items-center justify-center rounded-[var(--radius)]">
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
              <div className="bg-muted/50 flex items-center gap-3 rounded-md border px-3 py-2.5">
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
            {file && !busy && (
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
                    <option value="AUTO">Work it out for me</option>
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
                {busy ? "Reading…" : "Upload"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
