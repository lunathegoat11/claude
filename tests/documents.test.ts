import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { setStorageDriver, sniffMime } from "@/server/storage";
import {
  deleteDocument,
  getDocument,
  listDocuments,
  openDocumentFile,
  updateDocument,
  uploadDocument,
} from "@/server/services/documents";
import { getLabPanel } from "@/server/services/labs";
import { assessImage } from "@/server/extraction/image-quality";
import { setAIProvider } from "@/server/ai";
import type { AIProvider, ExtractedReport, ReportInput } from "@/server/ai/types";
import { toDateInputValue } from "@/lib/format";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { AppError } from "@/server/errors";
import { toNum } from "@/lib/utils";
import { labReportPdf, buildPdf } from "../prisma/fixtures/simple-pdf";
import { MemoryStorage } from "./helpers/memory-storage";
import { TZ, cleanup, makeUser } from "./helpers/factory";

const store = new MemoryStorage();
let alice: { id: string };
let bob: { id: string };
beforeAll(async () => {
  setStorageDriver(store);
  alice = await makeUser("Alice");
  bob = await makeUser("Bob");
});
afterAll(() => cleanup(alice.id, bob.id));

const report = () =>
  labReportPdf({
    lab: "Sample Diagnostics, Chennai",
    address: "addr",
    patient: "Test Patient",
    collected: "12/09/2026",
    title: "DIABETES PANEL",
    rows: [
      { test: "HbA1c", value: "5.7", unit: "%", range: "4.0 - 5.6", flag: "H" },
      { test: "Glucose, fasting", value: "109", unit: "mg/dL", range: "70 - 100", flag: "H" },
      { test: "Serum Creatinine", value: "0.81", unit: "mg/dL", range: "0.55 - 1.02" },
    ],
  });
const meta = (extra: Record<string, string> = {}) => ({
  name: "Report",
  type: "LAB_REPORT",
  tags: "lab",
  ...extra,
});
const code = (p: Promise<unknown>, c: string) =>
  expect(p).rejects.toSatisfy((e) => e instanceof AppError && e.code === c);

describe("file validation", () => {
  it("detects real file types from magic bytes", () => {
    expect(sniffMime(report())).toBe("application/pdf");
    expect(sniffMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(
      "image/jpeg",
    );
    expect(sniffMime(Buffer.from("MZ executable pretending to be pdf"))).toBeNull();
  });

  it("rejects disguised, empty and oversized files", async () => {
    await code(
      uploadDocument(
        alice.id,
        {
          buffer: Buffer.from("<script>alert(1)</script> not a pdf"),
          filename: "x.pdf",
          declaredMime: "application/pdf",
        },
        meta(),
        TZ,
      ),
      "UNSUPPORTED_MEDIA",
    );
    await code(
      uploadDocument(
        alice.id,
        { buffer: Buffer.alloc(0), filename: "x.pdf", declaredMime: "application/pdf" },
        meta(),
        TZ,
      ),
      "VALIDATION",
    );
    const big = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(3 * 1024 * 1024)]);
    await code(
      uploadDocument(
        alice.id,
        { buffer: big, filename: "x.pdf", declaredMime: "application/pdf" },
        meta(),
        TZ,
      ),
      "PAYLOAD_TOO_LARGE",
    );
  });
});

describe("upload → results saved instantly", () => {
  let docId: string;
  let panelId: string;

  it("stores the file outside the database and saves every value with its report and date", async () => {
    const res = await uploadDocument(
      alice.id,
      { buffer: report(), filename: "a1c.pdf", declaredMime: "application/pdf" },
      meta({ providerName: "Sample Diagnostics, Chennai" }),
      TZ,
    );
    docId = res.document.id;
    expect(res.extractionStatus).toBe("COMPLETED");
    expect(res.resultCount).toBe(3);
    expect(res.dateFound).toBe(true);
    panelId = res.panelId!;
    expect(store.files.has(res.document.storageKey)).toBe(true);
    expect(res.document.storageKey).not.toContain("a1c");
    expect(res.document.sha256).toMatch(/^[a-f0-9]{64}$/);

    const panel = await getLabPanel(alice.id, panelId);
    expect(panel.documentId).toBe(docId);
    expect(panel.document?.name).toBe("Report");
    expect(panel.source).toBe("PDF_IMPORT");
    expect(panel.labName).toBe("Sample Diagnostics, Chennai");
    expect(toDateInputValue(panel.collectedAt, TZ)).toBe("2026-09-12");
    const a1c = panel.results.find((r) => r.biomarkerCode === "HBA1C")!;
    expect(toNum(a1c.valueNumeric)).toBe(5.7);
    expect(a1c).toMatchObject({ unit: "%", flag: "HIGH", source: "PDF_IMPORT" });
    expect(toNum(a1c.refLow)).toBe(4);
    expect(toNum(a1c.refHigh)).toBe(5.6);
    expect(toDateInputValue(a1c.observedAt, TZ)).toBe("2026-09-12");
    expect(panel.results.find((r) => r.biomarkerCode === "CREAT")).toBeTruthy();
  });

  it("works out the type, date and lab when the user leaves them blank", async () => {
    const res = await uploadDocument(
      alice.id,
      { buffer: report(), filename: "IMG_2041.pdf", declaredMime: "application/pdf" },
      { name: "Scan", type: "AUTO", tags: "" },
      TZ,
    );
    expect(res.document.type).toBe("LAB_REPORT");
    expect(res.document.providerName).toBe("Sample Diagnostics, Chennai");
    expect(toDateInputValue(res.document.documentDate, TZ)).toBe("2026-09-12");
    expect(res.resultCount).toBe(3);
    await deleteDocument(alice.id, res.document.id);
  });

  it("keeps the saved results private to their owner", async () => {
    await code(getLabPanel(bob.id, panelId), "NOT_FOUND");
    expect(await db.labResult.count({ where: { userId: bob.id } })).toBe(0);
  });

  it("does not save values from documents that aren't lab reports", async () => {
    const res = await uploadDocument(
      alice.id,
      { buffer: report(), filename: "rx.pdf", declaredMime: "application/pdf" },
      meta({ type: "PRESCRIPTION", name: "Rx" }),
      TZ,
    );
    expect(res.panelId).toBeNull();
    await deleteDocument(alice.id, res.document.id);
  });

  it("makes extracted text searchable for the owner only", async () => {
    expect((await listDocuments(alice.id, { q: "creatinine" })).total).toBe(1);
    expect((await listDocuments(bob.id, { q: "creatinine" })).total).toBe(0);
  });
});

describe("photo quality", () => {
  const photo = () => readFileSync("tests/fixtures/lab-report-photo.png");

  it("refuses a blurry photo, stores nothing, and explains what to do", async () => {
    const blurry = await sharp(photo()).resize({ width: 2000 }).blur(6).jpeg().toBuffer();
    const before = store.files.size;
    await expect(
      uploadDocument(
        alice.id,
        { buffer: blurry, filename: "blurry.jpg", declaredMime: "image/jpeg" },
        meta({ name: "Blurry" }),
        TZ,
      ),
    ).rejects.toSatisfy(
      (e) => e instanceof AppError && e.code === "IMAGE_QUALITY" && /blurry/.test(e.message),
    );
    expect(store.files.size).toBe(before);
    // The user can still choose to keep it.
    const kept = await uploadDocument(
      alice.id,
      { buffer: blurry, filename: "blurry.jpg", declaredMime: "image/jpeg" },
      meta({ name: "Blurry" }),
      TZ,
      { allowPoorQuality: true },
    );
    expect(store.files.has(kept.document.storageKey)).toBe(true);
    await deleteDocument(alice.id, kept.document.id);
  }, 120_000);

  it("doesn't call a value high or low when a decimal point may have been lost", async () => {
    const photo2 = await sharp(photo()).resize({ width: 2000 }).png().toBuffer();
    const res = await uploadDocument(
      alice.id,
      { buffer: photo2, filename: "p.png", declaredMime: "image/png" },
      meta({ name: "Photo" }),
      TZ,
    );
    const panel = await getLabPanel(alice.id, res.panelId!);
    for (const r of panel.results.filter((x) => x.notes?.includes("decimal"))) {
      expect(r.flag).toBe("UNKNOWN");
      expect(r.notes).toMatch(/Range as read/);
    }
    expect(panel.results.some((x) => x.notes?.includes("decimal"))).toBe(true);
    await deleteDocument(alice.id, res.document.id);
  }, 60_000);

  it("rates a sharp photo as readable", async () => {
    const sharpPhoto = await sharp(photo()).resize({ width: 2000 }).png().toBuffer();
    expect((await assessImage(sharpPhoto)).problem).toBeNull();
  });
});

describe("reading reports with the user's AI", () => {
  const extracted: ExtractedReport = {
    readable: true,
    problem: null,
    reportName: "Thyroid Profile",
    labName: "Metro Labs, Pune",
    collectedAt: "2026-07-03",
    results: [
      { testName: "TSH", value: "3.1", unit: "uIU/mL", refText: "0.4 - 4.5", flag: null },
      { testName: "Anti-TPO antibodies", value: "12", unit: "IU/mL", refText: "< 34", flag: null },
      { testName: "Free T4", value: "1.9", unit: "ng/dL", refText: "0.8 - 1.8", flag: "HIGH" },
    ],
    transcript: "Metro Labs, Pune\nTSH 3.1 uIU/mL 0.4 - 4.5",
  };
  const fake = (r: ExtractedReport): AIProvider => ({
    name: "fake",
    model: "fake-1",
    supportsVision: true,
    generate: async () => "",
    extractReport: async () => r,
  });
  afterAll(() => setAIProvider(undefined));

  it("saves every test the AI read, including ones not in the built-in list", async () => {
    setAIProvider(fake(extracted));
    const res = await uploadDocument(
      alice.id,
      {
        buffer: readFileSync("tests/fixtures/lab-report-photo.png"),
        filename: "thyroid.png",
        declaredMime: "image/png",
      },
      { name: "Thyroid", type: "AUTO", tags: "" },
      TZ,
    );
    const panel = await getLabPanel(alice.id, res.panelId!);
    expect(panel.name).toBe("Thyroid Profile");
    expect(panel.labName).toBe("Metro Labs, Pune");
    expect(panel.source).toBe("IMAGE_IMPORT");
    expect(toDateInputValue(panel.collectedAt, TZ)).toBe("2026-07-03");
    expect(panel.results.map((r) => r.testName)).toEqual(["TSH", "Anti-TPO antibodies", "Free T4"]);
    expect(panel.results[0].biomarkerCode).toBe("TSH");
    expect(panel.results[2].flag).toBe("HIGH");
    expect(panel.results[1].flag).toBe("NORMAL"); // 12 is under the printed "< 34"
    await deleteDocument(alice.id, res.document.id);
  });

  it("sends the AI a resized copy of a photo without its hidden location data", async () => {
    let sent: ReportInput | null = null;
    setAIProvider({
      ...fake(extracted),
      extractReport: async (input) => {
        sent = input;
        return extracted;
      },
    });
    const big = await sharp(readFileSync("tests/fixtures/lab-report-photo.png"))
      .resize({ width: 3600 })
      .withExif({ IFD0: { Make: "Phone", Artist: "Someone" } })
      .jpeg()
      .toBuffer();
    expect((await sharp(big).metadata()).exif).toBeTruthy();
    const res = await uploadDocument(
      alice.id,
      { buffer: big, filename: "big.jpg", declaredMime: "image/jpeg" },
      meta({ name: "Big photo" }),
      TZ,
    );
    expect(sent).toMatchObject({ kind: "image", mimeType: "image/jpeg" });
    const m = await sharp((sent as unknown as { data: Buffer }).data).metadata();
    expect(m.width).toBeLessThanOrEqual(2400);
    expect(m.exif).toBeUndefined();
    await deleteDocument(alice.id, res.document.id);
  });

  it("asks for a new photo when the AI can't read it", async () => {
    setAIProvider(fake({ ...extracted, readable: false, problem: "BLURRY", results: [] }));
    await code(
      uploadDocument(
        alice.id,
        {
          buffer: readFileSync("tests/fixtures/lab-report-photo.png"),
          filename: "x.png",
          declaredMime: "image/png",
        },
        meta(),
        TZ,
      ),
      "IMAGE_QUALITY",
    );
  });

  it("ignores impossible dates from the AI", async () => {
    setAIProvider(fake({ ...extracted, collectedAt: "2099-01-01" }));
    const res = await uploadDocument(
      alice.id,
      { buffer: report(), filename: "r.pdf", declaredMime: "application/pdf" },
      meta({ name: "Future" }),
      TZ,
    );
    expect(res.dateFound).toBe(false);
    const panel = await getLabPanel(alice.id, res.panelId!);
    expect(panel.notes).toMatch(/No date was found/);
    await deleteDocument(alice.id, res.document.id);
  });
});

describe("document access control", () => {
  it("serves files only to their owner and deletes the blob on delete", async () => {
    const res = await uploadDocument(
      alice.id,
      {
        buffer: buildPdf([{ text: "Prescription: rest and fluids" }]),
        filename: "rx.pdf",
        declaredMime: "application/pdf",
      },
      meta({ type: "PRESCRIPTION", name: "Rx" }),
      TZ,
    );
    const id = res.document.id;
    expect(res.panelId).toBeNull(); // only lab reports are parsed for values
    await code(openDocumentFile(bob.id, id), "NOT_FOUND");
    await code(getDocument(bob.id, id), "NOT_FOUND");
    await code(updateDocument(bob.id, id, meta({ name: "stolen" }), TZ), "NOT_FOUND");
    await code(deleteDocument(bob.id, id), "NOT_FOUND");
    const file = await openDocumentFile(alice.id, id);
    expect(file.doc.mimeType).toBe("application/pdf");
    await deleteDocument(alice.id, id);
    expect(store.files.has(res.document.storageKey)).toBe(false);
    await code(openDocumentFile(alice.id, id), "NOT_FOUND");
    // Removed for good: no row, no text read from it.
    expect(await db.medicalDocument.findUnique({ where: { id } })).toBeNull();
  });

  it("cannot attach a document to another user's record", async () => {
    const rec = await db.medicalRecord.create({
      data: { userId: alice.id, type: "OTHER", title: "x", date: new Date() },
    });
    await code(
      uploadDocument(
        bob.id,
        {
          buffer: buildPdf([{ text: "hello" }]),
          filename: "b.pdf",
          declaredMime: "application/pdf",
        },
        meta({ recordId: rec.id }),
        TZ,
      ),
      "NOT_FOUND",
    );
  });
});
