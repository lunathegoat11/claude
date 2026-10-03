"use client";
import { useState } from "react";
import { Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const [show, setShow] = useState(mimeType.startsWith("image/") && mimeType !== "image/heic");
  const src = `/api/documents/${id}/file`;
  if (!show) {
    return (
      <div className="bg-muted/50 text-muted-foreground flex h-72 flex-col items-center justify-center gap-3 rounded-2xl border sm:h-96">
        <FileText className="size-10" strokeWidth={1.4} />
        <Button variant="outline" onClick={() => setShow(true)}>
          <Eye /> Show preview
        </Button>
      </div>
    );
  }
  if (mimeType === "application/pdf") {
    return (
      <iframe
        src={`${src}#view=FitH`}
        title={`Preview of ${name}`}
        className="bg-muted h-[70vh] min-h-96 w-full rounded-2xl border"
      />
    );
  }
  if (mimeType === "image/heic") {
    return (
      <p className="bg-muted/50 text-muted-foreground rounded-2xl border p-6 text-sm">
        HEIC images can&apos;t be previewed in most browsers. Download the file to view it.
      </p>
    );
  }
  return (
    // Authenticated, private file — must not go through the public image optimiser.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`Preview of ${name}`}
      className="bg-muted max-h-[75vh] w-full rounded-2xl border object-contain"
    />
  );
}
