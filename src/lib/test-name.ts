/**
 * Write a lab test's name the way it is properly spelled: ordinary words in sentence
 * case ("BASOPHILS" → "Basophils"), and abbreviations in their standard form ("hba1c",
 * "HBA1C" → "HbA1c"; "egfr" → "eGFR"). Reports print names in every style, so every name
 * Kosha saves or shows goes through this.
 */
const FORMS = [
  // Blood count
  "Hb HbA1c HbA1 HbF HCT PCV RBC RBCs WBC WBCs TLC TC DLC DC PLT MCV MCH MCHC RDW " +
    "RDW-CV RDW-SD MPV PDW PCT P-LCR P-LCC ESR ANC ALC AMC AEC ABC NLR IG NRBC NRBCs " +
    "CBC CBP HGB",
  // Chemistry
  "LDL HDL VLDL IDL LDL-C HDL-C Non-HDL Lp(a) Apo ApoA1 ApoB GT ALT AST SGPT SGOT " +
    "ALP GGT GGTP LDH CK CPK CK-MB BUN GFR eGFR CO2 TCO2 HCO3 pH pCO2 pO2 A/G BNP " +
    "NT-proBNP FBS PPBS RBS FBG PPBG GTT OGTT FPG eAG HOMA-IR Na K Cl Ca Mg Zn Cu Fe",
  // Hormones, vitamins, iron
  "TSH T3 T4 FT3 FT4 TPO Anti-TPO TG TRAb FSH LH AMH hCG β-hCG PTH ACTH DHEA DHEA-S " +
    "DHEAS IGF-1 PSA fPSA SHBG B1 B2 B3 B6 B9 B12 D2 D3 OH 25-OH TIBC UIBC TSAT",
  // Inflammation, clotting, infection, immunity
  "CRP hs-CRP hsCRP PT INR aPTT APTT PTT TT ASO RA ANA dsDNA DNA RNA HIV HBsAg " +
    "HBeAg HCV HAV HEV VDRL RPR TPHA NS1 IgA IgE IgG IgM G6PD HLA HLA-B27 CD4 CD8 TB " +
    "COVID-19 SARS-CoV-2 RT-PCR PCR ELISA",
].flatMap((group) => group.split(" "));
const CANON = new Map(FORMS.map((f) => [f.toLowerCase(), f]));
// Spellings that are standard in another form.
CANON.set("apptt", "aPTT").set("aptt", "aPTT").set("hgb", "Hb").set("hscrp", "hs-CRP");
CANON.set("hs crp", "hs-CRP").set("ldl c", "LDL-C").set("hdl c", "HDL-C");
// Small words that stay lower case inside a name.
const SMALL = new Set(["of", "and", "or", "in", "to", "by", "per", "for", "with", "on", "at"]);

function word(w: string, first: boolean): string {
  const known = CANON.get(w.toLowerCase());
  if (known) return known;
  // Hyphenated or slashed groups: format each part ("NON-HDL" → "Non-HDL").
  if (/[-/]/.test(w) && w.length > 1) {
    return w
      .split(/([-/])/)
      .map((p, i) => (p === "-" || p === "/" || !p ? p : word(p, first && i === 0)))
      .join("");
  }
  if (/\d/.test(w)) return w.toUpperCase(); // T3, B12, 25OH
  if (w.length === 1) return w.toUpperCase(); // Vitamin D, Hepatitis B
  const lower = w.toLowerCase();
  // An unknown word printed in mixed case on purpose (e.g. "proBNP") is kept as is.
  if (w !== lower && w !== w.toUpperCase() && w[0] !== w[0].toUpperCase()) return w;
  if (!first && SMALL.has(lower)) return lower;
  return first ? lower[0].toUpperCase() + lower.slice(1) : lower;
}

export function formatTestName(name: string | null | undefined): string {
  const s = (name ?? "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  // Check whole two-word forms first ("hs crp").
  const whole = CANON.get(s.toLowerCase());
  if (whole) return whole;
  let first = true;
  return s
    .replace(/lp\s*\(\s*a\s*\)/gi, "Lp(a)")
    .replace(/Lp\(a\)|[A-Za-zÀ-ÿβ0-9]+(?:[-/][A-Za-zÀ-ÿβ0-9]+)*/g, (m) => {
      const out = m === "Lp(a)" ? m : word(m, first);
      first = false;
      return out;
    });
}
