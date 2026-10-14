"use client";
import Link from "next/link";
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
import { useT } from "@/i18n/client";
import { DOCUMENT_TYPE_KEYS } from "@/i18n/messages/files-labels";
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
  readBy,
}: {
  records: { id: string; title: string }[];
  maxMb: number;
  today: string;
  providers: string[];
  /** Who reads the report, as a whole sentence, already translated. */
  readBy: string;
}) {
  const t = useT();
  const router = useRouter();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("AUTO");
  const [quality, setQuality] = useState<string | null>(null);
  const [limit, setLimit] = useState<string | null>(null);
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
        return setError(t("files.upload.tooBig", { size: formatBytes(f.size), max: maxMb }));
      if (f.type && !ACCEPT.split(",").includes(f.type)) return setError(t("files.upload.badType"));
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
    [maxMb, t],
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
    if (!file || !formRef.current) return setError(t("files.upload.chooseFirst"));
    setBusy(true);
    setError(null);
    setQuality(null);
    setLimit(null);
    setFieldErrors({});
    const fd = new FormData(formRef.current);
    fd.set("file", file);
    if (allowPoorQuality) fd.set("allowPoorQuality", "1");
    try {
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        if (body?.error?.code === "IMAGE_QUALITY") return setQuality(body.error.message);
        if (body?.error?.code === "PLAN_LIMIT") return setLimit(body.error.message);
        setError(body?.error?.message ?? t("files.upload.failed"));
        setFieldErrors(body?.error?.fieldErrors ?? {});
        return;
      }
      setOpen(false);
      reset();
      if (body.panelId) {
        const n = body.resultCount as number;
        toast.success(
          t.n("files.upload.savedResults", n, { name: body.reportName }) +
            (body.dateFound ? `, ${shortDate(body.collectedAt)}` : ""),
          body.dateFound
            ? undefined
            : {
                description: t("files.upload.noDate"),
              },
        );
        router.push(`/labs/reports/${body.panelId}?new=1`);
      } else {
        toast.success(t("files.upload.saved"));
        router.push(`/documents/${body.id}`);
      }
      router.refresh();
    } catch {
      setError(t("files.upload.offline"));
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
        <Upload /> {t("files.docs.addReport")}
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
            <DialogTitle>{t("files.upload.title")}</DialogTitle>
            <DialogDescription>
              {t("files.upload.desc.size", { max: maxMb })} {readBy} {t("files.upload.desc.check")}
            </DialogDescription>
          </DialogHeader>
          <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
            {error && <FormError message={error} />}
            {limit && (
              <div
                role="alert"
                className="border-primary/30 bg-primary/5 space-y-3 rounded-2xl border p-4 text-sm"
              >
                <p>{limit}</p>
                <Button asChild size="sm">
                  <Link href="/settings?tab=plan" onClick={() => setOpen(false)}>
                    {t("files.upload.seePlus")}
                  </Link>
                </Button>
              </div>
            )}
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
                    <Camera /> {t("files.upload.retake")}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => void send(true)}>
                    {t("files.upload.saveAnyway")}
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
                  <span className="font-medium">{t("files.upload.drag")}</span>{" "}
                  <span className="text-muted-foreground">{t("files.upload.or")}</span>
                </div>
                <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
                  {t("files.upload.choose")}
                </Button>
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPT}
                  className="sr-only"
                  onChange={(e) => pick(e.target.files?.[0])}
                  aria-label={t("files.upload.choose")}
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
                  aria-label={t("files.upload.remove")}
                >
                  <X />
                </Button>
              </div>
            )}
            {file && !busy && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t("files.field.name")}
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
                <Field label={t("files.field.type")} htmlFor="doc-type" error={fieldErrors.type}>
                  <NativeSelect
                    id="doc-type"
                    name="type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="AUTO">{t("files.upload.auto")}</option>
                    {DOCUMENT_TYPES.map((d) => (
                      <option key={d} value={d}>
                        {t(DOCUMENT_TYPE_KEYS[d])}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field
                  label={t("files.field.documentDate")}
                  htmlFor="doc-date"
                  optional
                  error={fieldErrors.documentDate}
                >
                  <Input id="doc-date" name="documentDate" type="date" max={today} />
                </Field>
                <Field
                  label={t("files.field.provider")}
                  htmlFor="doc-provider"
                  optional
                  className="sm:col-span-2"
                >
                  <Input
                    id="doc-provider"
                    name="providerName"
                    list="doc-providers"
                    placeholder={t("files.upload.providerPlaceholder")}
                  />
                  <datalist id="doc-providers">
                    {providers.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </Field>
                <Field label={t("files.field.attachRecord")} htmlFor="doc-record" optional>
                  <NativeSelect id="doc-record" name="recordId" defaultValue={presetRecord}>
                    <option value="">{t("files.common.none")}</option>
                    {records.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field
                  label={t("files.field.tags")}
                  htmlFor="doc-tags"
                  optional
                  hint={t("files.field.tagsHint")}
                >
                  <Input id="doc-tags" name="tags" />
                </Field>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {t("files.common.cancel")}
              </Button>
              <Button type="submit" disabled={!file || busy}>
                {busy ? t("files.upload.reading") : t("files.upload.upload")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
