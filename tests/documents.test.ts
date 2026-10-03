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
import { confirmImport, discardImport, getImportJob } from "@/server/services/imports";
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

describe("upload → extraction → review → confirm", () => {
  let docId: string;
  let jobId: string;

  it("stores the file outside the database and proposes values without saving them", async () => {
    const res = await uploadDocument(
      alice.id,
      { buffer: report(), filename: "a1c.pdf", declaredMime: "application/pdf" },
      meta({ providerName: "Sample Diagnostics, Chennai" }),
      TZ,
    );
    docId = res.document.id;
    expect(res.extractionStatus).toBe("COMPLETED");
    expect(res.candidateCount).toBe(3);
    expect(res.importJobId).toBeTruthy();
    jobId = res.importJobId!;
    expect(store.files.has(res.document.storageKey)).toBe(true);
    expect(res.document.storageKey).not.toContain("a1c");
    expect(res.document.sha256).toMatch(/^[a-f0-9]{64}$/);
    // Nothing is written to lab results until the user confirms.
    expect(await db.labResult.count({ where: { userId: alice.id } })).toBe(0);
    const job = await getImportJob(alice.id, jobId);
    expect(job.meta.collectedAt).toBe("2026-09-12");
    const a1c = job.candidates.find((c) => c.biomarkerCode === "HBA1C")!;
    expect(a1c).toMatchObject({
      value: "5.7",
      unit: "%",
      refLow: 4,
      refHigh: 5.6,
      labFlag: "HIGH",
    });
  });

  it("prevents other users from reviewing or confirming the import", async () => {
    await code(getImportJob(bob.id, jobId), "NOT_FOUND");
    await code(
      confirmImport(
        bob.id,
        jobId,
        { name: "x", collectedAt: "2026-09-12", results: [{ testName: "HbA1c", value: "9.9" }] },
        TZ,
      ),
      "NOT_FOUND",
    );
    await code(discardImport(bob.id, jobId), "NOT_FOUND");
  });

  it("saves exactly the user-corrected values on confirmation", async () => {
    const panel = await confirmImport(
      alice.id,
      jobId,
      {
        name: "Diabetes panel",
        collectedAt: "2026-09-12",
        labName: "Sample Diagnostics, Chennai",
        results: [{ testName: "HbA1c", value: "5.8", unit: "%", refLow: "4", refHigh: "5.6" }], // user corrected 5.7 → 5.8 and dropped two rows
      },
      TZ,
    );
    const results = await db.labResult.findMany({ where: { panelId: panel.id } });
    expect(results).toHaveLength(1);
    expect(toNum(results[0].valueNumeric)).toBe(5.8);
    expect(results[0].source).toBe("PDF_IMPORT");
    expect(panel.documentId).toBe(docId);
    await code(
      confirmImport(
        alice.id,
        jobId,
        { name: "again", collectedAt: "2026-09-12", results: [{ testName: "TSH", value: "1" }] },
        TZ,
      ),
      "CONFLICT",
    );
  });

  it("makes extracted text searchable for the owner only", async () => {
    expect((await listDocuments(alice.id, { q: "creatinine" })).total).toBe(1);
    expect((await listDocuments(bob.id, { q: "creatinine" })).total).toBe(0);
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
    expect(res.importJobId).toBeNull(); // only lab reports are parsed for values
    await code(openDocumentFile(bob.id, id), "NOT_FOUND");
    await code(getDocument(bob.id, id), "NOT_FOUND");
    await code(updateDocument(bob.id, id, meta({ name: "stolen" }), TZ), "NOT_FOUND");
    await code(deleteDocument(bob.id, id), "NOT_FOUND");
    const file = await openDocumentFile(alice.id, id);
    expect(file.doc.mimeType).toBe("application/pdf");
    await deleteDocument(alice.id, id);
    expect(store.files.has(res.document.storageKey)).toBe(false);
    await code(openDocumentFile(alice.id, id), "NOT_FOUND");
    const row = await db.medicalDocument.findUnique({ where: { id } });
    expect(row?.deletedAt).not.toBeNull();
    expect(row?.extractedText).toBeNull();
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
