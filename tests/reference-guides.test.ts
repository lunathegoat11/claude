import { describe, expect, it } from "vitest";
import { NO_INDIAN_RANGE, resolveGuides } from "@/lib/catalog/reference-guides";
import { GUIDE_DATA } from "@/lib/catalog/reference-guides-data";

describe("general reference ranges (India and US)", () => {
  it("gives both sources for fasting glucose, with India's from ICMR", () => {
    const g = resolveGuides("GLU_FASTING", "mg/dL");
    expect(g.india?.source).toMatch(/ICMR/);
    expect(g.us?.source).toMatch(/NIDDK/);
    expect(g.india?.bands.map((b) => b.label)).toEqual(["Normal", "Prediabetes", "Diabetes"]);
    expect(g.india?.bands[2].low).toBe(126);
  });

  it("converts to the unit the results are in", () => {
    const g = resolveGuides("GLU_FASTING", "mmol/L");
    expect(g.india?.bands[2].low).toBeCloseTo(7.0, 1);
    const t = resolveGuides("temperature", "°C");
    expect(t.india?.bands[0].low).toBeCloseTo(38, 1);
    const p = resolveGuides("PLT", "10^3/µL");
    expect(p.us?.bands[0]).toMatchObject({ low: 150, high: 400 });
  });

  it("explains instead of guessing when the unit can't be converted", () => {
    const g = resolveGuides("HBA1C", "mg/dL");
    expect(g.us?.bands).toEqual([]);
    expect(g.us?.unavailable).toMatch(/Published in %/);
  });

  it("uses the profile's sex for ranges that differ, and asks when it's unknown", () => {
    expect(resolveGuides("HGB", "g/dL", "FEMALE").india?.bands[0].high).toBe(12);
    expect(resolveGuides("HGB", "g/dL", "MALE").us?.bands[0]).toMatchObject({
      low: 13.8,
      high: 17.2,
    });
    expect(resolveGuides("HGB", "g/dL", null).india?.unavailable).toMatch(/Add your sex/);
  });

  it("says plainly when India has published no national range", () => {
    const g = resolveGuides("TSH", "µIU/mL");
    expect(g.india?.unavailable).toBe(NO_INDIAN_RANGE);
    expect(g.us?.bands[0]).toMatchObject({ low: 0.4, high: 4.8 });
  });

  it("draws blood pressure as the diagnosis lines each country uses", () => {
    const g = resolveGuides("blood_pressure", "mmHg");
    expect(g.india?.lines).toEqual([140, 90]);
    expect(g.us?.lines).toEqual([130, 80]);
  });

  it("names a source and a link for every published range", () => {
    for (const [key, e] of Object.entries(GUIDE_DATA)) {
      for (const d of [e.india, e.us]) {
        if (!d) continue;
        expect(d.source, key).toBeTruthy();
        expect(d.url, key).toMatch(/^https:\/\//);
        expect(Boolean(d.bands || d.male || d.lines), key).toBe(true);
      }
    }
  });

  it("returns nothing for tests with no published ranges", () => {
    expect(resolveGuides("name:urine colour", null)).toEqual({});
  });
});
