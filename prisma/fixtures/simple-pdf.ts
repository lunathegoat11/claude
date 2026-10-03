/**
 * Tiny dependency-free PDF writer used to generate fictional sample documents
 * (seed data and tests). Produces a real PDF with a text layer using the
 * standard Helvetica font. ASCII text only.
 */
export interface PdfLine {
  text: string;
  size?: number;
  bold?: boolean;
  gap?: number; // extra space before the line
}

function esc(s: string) {
  return s
    .replace(/[^\x20-\x7e]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

export function buildPdf(lines: PdfLine[]): Buffer {
  const pageH = 842,
    pageW = 595,
    margin = 56;
  const pages: string[] = [];
  let ops: string[] = [];
  let y = pageH - margin;
  for (const l of lines) {
    const size = l.size ?? 10.5;
    y -= (l.gap ?? 0) + size * 1.45;
    if (y < margin) {
      pages.push(ops.join("\n"));
      ops = [];
      y = pageH - margin - size * 1.45;
    }
    ops.push(
      `BT /${l.bold ? "F2" : "F1"} ${size} Tf ${margin} ${y.toFixed(1)} Td (${esc(l.text)}) Tj ET`,
    );
  }
  pages.push(ops.join("\n"));

  const objects: string[] = [];
  const add = (body: string) => {
    objects.push(body);
    return objects.length;
  };
  const catalogId = add("");
  const pagesId = add("");
  const f1 = add(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  );
  const f2 = add(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  );
  const pageIds: number[] = [];
  for (const content of pages) {
    const stream = add(
      `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
    );
    pageIds.push(
      add(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${stream} 0 R >>`,
      ),
    );
  }
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] =
    `<< /Type /Pages /Kids [${pageIds.map((i) => `${i} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let out = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n `).join("\n")}\n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

/** Lab-report style PDF: header, patient block, and result rows. */
export function labReportPdf(opts: {
  lab: string;
  address: string;
  patient: string;
  collected: string; // dd/mm/yyyy
  title: string;
  rows: { test: string; value: string; unit: string; range: string; flag?: string }[];
  footer?: string;
}): Buffer {
  const lines: PdfLine[] = [
    { text: opts.lab, size: 16, bold: true },
    { text: opts.address, size: 9 },
    {
      text: "SAMPLE DOCUMENT - FICTIONAL DEMO DATA - NOT A REAL MEDICAL REPORT",
      size: 8,
      bold: true,
      gap: 4,
    },
    { text: `Patient: ${opts.patient}`, gap: 10 },
    { text: `Sample collected on: ${opts.collected}` },
    { text: opts.title, size: 13, bold: true, gap: 14 },
    {
      text: "Test                              Result      Unit        Reference range",
      bold: true,
      gap: 6,
    },
    ...opts.rows.map((r) => ({
      text: `${r.test} ${r.value}${r.flag ? ` ${r.flag}` : ""} ${r.unit} ${r.range}`,
    })),
    {
      text: opts.footer ?? "Reference ranges are specific to this laboratory and method.",
      size: 9,
      gap: 16,
    },
    { text: "Results should be interpreted by a qualified medical practitioner.", size: 9 },
  ];
  return buildPdf(lines);
}
