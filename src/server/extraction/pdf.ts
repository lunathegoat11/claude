import "server-only";
import { getDocumentProxy } from "unpdf";

/** Extract the text layer of a PDF. Scanned PDFs without a text layer return "". */
export async function extractPdfText(buf: Buffer, maxPages = 20): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  try {
    // Read only the first pages one by one, so a PDF with thousands of pages can't tie up
    // the server; lab reports are a few pages long.
    const pages: string[] = [];
    for (let i = 1; i <= Math.min(pdf.numPages, maxPages); i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(
        content.items.map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : " ") : "")).join(""),
      );
      page.cleanup();
    }
    return pages.join("\n").slice(0, 200_000);
  } finally {
    await pdf.cleanup().catch(() => undefined);
  }
}
