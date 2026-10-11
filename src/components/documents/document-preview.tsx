"use client";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DelayedLoader } from "@/components/shared/delayed-loader";

/** Lazily loads the preview only when asked, so opening a document page doesn't download the file. */
export function DocumentPreview({
  id,
  mimeType,
  name,
}: {
  id: string;
  mimeType: string;
  name: string;
}) {
  const isImage = ["image/jpeg", "image/png", "image/webp"].includes(mimeType);
  const [show, setShow] = useState(isImage);
  const [loaded, setLoaded] = useState(false);
  // Phones show only the first page of a PDF inside a page, so they open it in the
  // phone's own viewer instead.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setNarrow(mq.matches);
    const on = (e: MediaQueryListEvent) => setNarrow(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const src = `/api/documents/${id}/file`;
  const imgRef = useRef<HTMLImageElement>(null);
  // A cached image can finish before React attaches onLoad.
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, [show]);

  if (mimeType === "image/heic") {
    return (
      <p className="bg-muted text-muted-foreground rounded-[var(--radius)] p-6 text-[15px]">
        HEIC photos can&apos;t be shown in most browsers. Download the file to view it.
      </p>
    );
  }

  if (mimeType === "application/pdf" && narrow) {
    return (
      <div className="bg-muted text-muted-foreground flex flex-col items-center justify-center gap-4 rounded-[var(--radius)] px-6 py-12 text-center">
        <FileText className="size-10" strokeWidth={1.4} />
        <Button asChild size="lg">
          <a href={src} target="_blank" rel="noopener">
            <ExternalLink /> Open the PDF
          </a>
        </Button>
      </div>
    );
  }

  if (!show) {
    return (
      <div className="bg-muted text-muted-foreground flex h-72 flex-col items-center justify-center gap-3 rounded-[var(--radius)] sm:h-96">
        <FileText className="size-10" strokeWidth={1.4} />
        <Button variant="outline" onClick={() => setShow(true)}>
          <Eye /> Show preview
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-muted relative overflow-hidden rounded-[var(--radius)]">
      {!loaded && <DelayedLoader kind="document" className="absolute inset-0 z-10" />}
      {mimeType === "application/pdf" ? (
        <iframe
          src={`${src}#view=FitH`}
          title={`Preview of ${name}`}
          onLoad={() => setLoaded(true)}
          className="h-[70vh] min-h-96 w-full"
        />
      ) : (
        // Authenticated, private file — must not go through the public image optimiser.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={src}
          alt={`Preview of ${name}`}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
          className="max-h-[75vh] min-h-40 w-full object-contain"
        />
      )}
    </div>
  );
}
