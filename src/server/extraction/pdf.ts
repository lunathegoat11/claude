import "server-only";
import { extractText, getDocumentProxy } from "unpdf";

/** Extract the text layer of a PDF. Scanned PDFs without a text layer return "". */
export async function extractPdfText(buf: Buffer, maxPages = 20): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  try {
    const { text } = await extractText(pdf, { mergePages: false });
    const pages = Array.isArray(text) ? text.slice(0, maxPages) : [text];
    return pages.join("\n").slice(0, 200_000);
  } finally {
    await pdf.cleanup().catch(() => undefined);
  }
}
