import type { BiomarkerCategory } from "./biomarkers";

/** Message keys for category names (see src/i18n/messages/labs.ts). */
export const CATEGORY_KEYS = {
  CBC: "labs.category.CBC",
  CBC_MORPHOLOGY: "labs.category.CBC_MORPHOLOGY",
  SUGAR: "labs.category.SUGAR",
  LIPID: "labs.category.LIPID",
  VITAMINS: "labs.category.VITAMINS",
  HORMONES: "labs.category.HORMONES",
  IRON: "labs.category.IRON",
  LIVER: "labs.category.LIVER",
  KIDNEY: "labs.category.KIDNEY",
  ELECTROLYTES: "labs.category.ELECTROLYTES",
  MINERALS: "labs.category.MINERALS",
  OTHER: "labs.category.OTHER",
  CLOTTING: "labs.category.CLOTTING",
  HEART: "labs.category.HEART",
  URINE: "labs.category.URINE",
  MALARIA: "labs.category.MALARIA",
  TYPHOID: "labs.category.TYPHOID",
  DENGUE: "labs.category.DENGUE",
} as const satisfies Record<BiomarkerCategory, string>;
