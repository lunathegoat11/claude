import {
  CATEGORY_ORDER,
  byName,
  getBiomarker,
  type BiomarkerCategory,
} from "@/lib/catalog/biomarkers";

/**
 * A report's results under their categories, in the app's category order, with the
 * tests in each category in alphabetical order. Tests Kosha doesn't know go under Other.
 */
export function groupByCategory<T extends { biomarkerCode: string | null; testName: string }>(
  rows: T[],
): { category: BiomarkerCategory; rows: T[] }[] {
  const groups = new Map<BiomarkerCategory, T[]>();
  for (const r of rows) {
    const c = getBiomarker(r.biomarkerCode)?.category ?? "OTHER";
    groups.set(c, [...(groups.get(c) ?? []), r]);
  }
  return CATEGORY_ORDER.filter((c) => groups.has(c)).map((category) => ({
    category,
    rows: groups.get(category)!.sort((a, b) => byName({ name: a.testName }, { name: b.testName })),
  }));
}

/** The same order as a flat list (categories in order, alphabetical within each). */
export function sortByCategory<T extends { biomarkerCode: string | null; testName: string }>(
  rows: T[],
): T[] {
  return groupByCategory(rows).flatMap((g) => g.rows);
}
