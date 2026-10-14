import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { createLabPanel, reapplyRanges } from "@/server/services/labs";
import { updatePreferences, updateProfile } from "@/server/services/profile";
import {
  INDIA_RANGES,
  STANDARD_RANGES,
  flagAgainst,
  regionFor,
  standardRangeFor,
} from "@/lib/catalog/standard-ranges";
import { BIOMARKERS, matchBiomarker } from "@/lib/catalog/biomarkers";
import { formatTestName } from "@/lib/test-name";
import { TZ, cleanup, makeUser } from "./helpers/factory";

describe("test names", () => {
  it("writes ordinary words in sentence case and abbreviations in their standard form", () => {
    const cases: [string, string][] = [
      ["BASOPHILS", "Basophils"],
      ["basophils", "Basophils"],
      ["hba1c", "HbA1c"],
      ["HBA1C", "HbA1c"],
      ["egfr", "eGFR"],
      ["TOTAL WBC COUNT", "Total WBC count"],
      ["ABSOLUTE NEUTROPHIL COUNT", "Absolute neutrophil count"],
      ["NON-HDL CHOLESTEROL", "Non-HDL cholesterol"],
      ["VITAMIN B12", "Vitamin B12"],
      ["SGPT (ALT)", "SGPT (ALT)"],
      ["hs crp", "hs-CRP"],
      ["RATIO OF AST TO ALT", "Ratio of AST to ALT"],
      ["Lp (a)", "Lp(a)"],
      ["NT-proBNP", "NT-proBNP"],
    ];
    for (const [raw, want] of cases) expect(formatTestName(raw)).toBe(want);
  });

  it("knows the whole differential count, so names like BASOPHILS link to a test", () => {
    expect(matchBiomarker("BASOPHILS")?.code).toBe("BASO");
    expect(matchBiomarker("Absolute Eosinophil Count")?.code).toBe("AEC");
    expect(matchBiomarker("BUN")?.code).toBe("BUN");
    expect(matchBiomarker("Blood Urea")?.code).toBe("UREA");
  });
});

describe("standard ranges", () => {
  it("cites a government source for every range, and every code exists", () => {
    const codes = new Set(BIOMARKERS.map((b) => b.code));
    for (const [code, r] of Object.entries(STANDARD_RANGES)) {
      expect(codes.has(code), code).toBe(true);
      expect(r.url).toMatch(
        /^https:\/\/(medlineplus\.gov|www\.(niddk|nhlbi|ncbi\.nlm)\.nih\.gov|ods\.od\.nih\.gov)\//,
      );
    }
  });

  it("uses the person's sex, and the widest range when it isn't known", () => {
    expect(standardRangeFor("HGB", "g/dL", { sex: "FEMALE" })).toMatchObject({
      low: 12.1,
      high: 15.1,
    });
    expect(standardRangeFor("HGB", "g/dL", { sex: "MALE" })).toMatchObject({
      low: 13.8,
      high: 17.2,
    });
    expect(standardRangeFor("HGB", "g/dL", {})).toMatchObject({ low: 12.1, high: 17.2 });
  });

  it("converts to the result's unit, and steps aside for units it can't convert or children", () => {
    expect(standardRangeFor("GLU_FASTING", "mmol/L")).toMatchObject({ low: 3.885, high: 5.495 });
    expect(standardRangeFor("PLT", "lakh/µL")).toMatchObject({ low: 1.5, high: 4 });
    expect(standardRangeFor("WBC", "cells/cumm")).toMatchObject({ low: 4500, high: 11000 });
    expect(standardRangeFor("ALT", "IU/L")).toMatchObject({ low: 4, high: 36 });
    expect(standardRangeFor("NEUT", "/µL")).toBeNull(); // a count, not a percentage
    const child = { dateOfBirth: new Date("2015-01-01"), on: new Date("2026-01-01") };
    expect(standardRangeFor("HGB", "g/dL", child)).toBeNull();
  });

  it("treats 'under' limits as published: total cholesterol of 200 is high", () => {
    const chol = standardRangeFor("CHOL", "mg/dL")!;
    expect(chol.text).toBe("Under 200");
    expect(flagAgainst(199, chol)).toBe("NORMAL");
    expect(flagAgainst(200, chol)).toBe("HIGH");
    const a1c = standardRangeFor("HBA1C", "%")!;
    expect(flagAgainst(5.7, a1c)).toBe("HIGH");
    expect(flagAgainst(5.6, a1c)).toBe("NORMAL");
    const esrOld = {
      sex: "FEMALE",
      dateOfBirth: new Date("1960-01-01"),
      on: new Date("2026-01-01"),
    };
    expect(standardRangeFor("ESR", "mm/hr", esrOld)?.text).toBe("Under 30");
  });
});

describe("applying them outside India", () => {
  let user: { id: string };
  beforeAll(async () => {
    user = await makeUser();
    await db.profile.update({ where: { userId: user.id }, data: { timezone: "America/New_York" } });
  });
  afterAll(() => cleanup(user.id));

  it("judges results by the standard range instead of the printed one", async () => {
    const panel = await createLabPanel(
      user.id,
      {
        name: "CBC",
        collectedAt: "2026-06-01",
        results: [
          // The report says 0 - 2, but the standard range is 0.5 to 1.
          { testName: "BASOPHILS", value: "1.5", unit: "%", refText: "0 - 2" },
          // No standard range: the report's range is used.
          { testName: "PDW", value: "19", unit: "fL", refText: "9 - 17" },
        ],
      },
      TZ,
    );
    const rows = await db.labResult.findMany({
      where: { panelId: panel.id },
      orderBy: { testName: "asc" },
    });
    expect(rows[0]).toMatchObject({
      testName: "Basophils",
      biomarkerCode: "BASO",
      flag: "HIGH",
      stdText: "0.5 – 1",
      refText: "0 - 2",
    });
    expect(rows[1]).toMatchObject({ testName: "PDW", flag: "HIGH", stdText: null });
  });

  it("re-checks saved results when ranges change or the person's sex is set", async () => {
    const panel = await createLabPanel(
      user.id,
      {
        name: "Hb",
        collectedAt: "2026-06-01",
        results: [{ testName: "HAEMOGLOBIN", value: "13", unit: "g/dL" }],
      },
      TZ,
    );
    const hb = () => db.labResult.findFirstOrThrow({ where: { panelId: panel.id } });
    // Sex unknown: 12.1 to 17.2, so 13 is normal.
    expect((await hb()).flag).toBe("NORMAL");
    await updateProfile(user.id, { fullName: "Test User", sex: "MALE" }, TZ);
    expect(await hb()).toMatchObject({ flag: "LOW", stdText: "13.8 – 17.2" });

    // Results saved before the current ranges (e.g. old rows in capitals) are updated.
    await db.labResult.update({
      where: { id: (await hb()).id },
      data: { rangeVersion: 0, testName: "HAEMOGLOBIN", stdText: null, flag: "UNKNOWN" },
    });
    await reapplyRanges();
    expect(await hb()).toMatchObject({ flag: "LOW", testName: "Hemoglobin" });
  });
});

describe("applying them in India", () => {
  let user: { id: string };
  beforeAll(async () => {
    user = await makeUser(); // time zone Asia/Kolkata
  });
  afterAll(() => cleanup(user.id));

  it("prefers the printed range, then India's national range, then the US one", async () => {
    const panel = await createLabPanel(
      user.id,
      {
        name: "Mixed",
        collectedAt: "2026-06-01",
        results: [
          // Printed range 0 - 2: used as printed, so 1.5 is normal.
          { testName: "BASOPHILS", value: "1.5", unit: "%", refText: "0 - 2" },
          // No printed range: ICMR's (normal up to 5.6).
          { testName: "HbA1c", value: "5.8", unit: "%" },
          // No printed range and no Indian one: the US range (4 to 36).
          { testName: "SGPT", value: "40", unit: "U/L" },
        ],
      },
      TZ,
    );
    const get = (code: string) =>
      db.labResult.findFirstOrThrow({ where: { panelId: panel.id, biomarkerCode: code } });
    expect(await get("BASO")).toMatchObject({ flag: "NORMAL", stdText: null });
    const a1c = await get("HBA1C");
    expect(a1c).toMatchObject({ flag: "HIGH", stdText: "Up to 5.6" });
    expect(a1c.stdSource).toMatch(/ICMR/);
    const alt = await get("ALT");
    expect(alt).toMatchObject({ flag: "HIGH", stdText: "4 – 36" });
    expect(alt.stdSource).toMatch(/MedlinePlus/);

    // Switching to international ranges re-checks everything against the US ranges.
    const prefs = { glucoseUnit: "MG_DL", weightUnit: "KG", temperatureUnit: "F" };
    await updatePreferences(user.id, { ...prefs, rangeRegion: "INTERNATIONAL" });
    expect(await get("BASO")).toMatchObject({ flag: "HIGH", stdText: "0.5 – 1" });
    expect((await get("HBA1C")).stdSource).toMatch(/MedlinePlus/);
    // And back to automatic (India, from the time zone).
    await updatePreferences(user.id, { ...prefs, rangeRegion: "AUTO" });
    expect(await get("BASO")).toMatchObject({ flag: "NORMAL", stdText: null });
  });

  it("follows the time zone when set to automatic", () => {
    expect(regionFor(null, "Asia/Kolkata")).toBe("INDIA");
    expect(regionFor(null, "Asia/Calcutta")).toBe("INDIA");
    expect(regionFor(null, "America/Chicago")).toBe("INTERNATIONAL");
    expect(regionFor("INTERNATIONAL", "Asia/Kolkata")).toBe("INTERNATIONAL");
    expect(regionFor("INDIA", "Europe/London")).toBe("INDIA");
  });

  it("names a source for every Indian range", () => {
    for (const r of Object.values(INDIA_RANGES)) {
      expect(r.source).toMatch(/ICMR|Ministry of Health|National Nutrition Survey/);
      expect(r.url).toMatch(/^https:\/\//);
    }
  });
});
