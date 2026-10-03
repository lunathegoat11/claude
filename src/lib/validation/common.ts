import { z } from "zod";
import { normaliseTags } from "@/lib/utils";

/** Empty strings from HTML forms become undefined. */
export const optionalString = (max = 500) =>
  z.preprocess(
    (v) =>
      typeof v === "string" && v.trim() === "" ? undefined : typeof v === "string" ? v.trim() : v,
    z.string().max(max, `Must be ${max} characters or fewer`).optional(),
  );

export const requiredString = (label: string, max = 200) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z
      .string({ required_error: `${label} is required` })
      .min(1, `${label} is required`)
      .max(max, `${label} must be ${max} characters or fewer`),
  );

/** "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm" as produced by date inputs. */
export const dateInput = (label = "Date") =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z
      .string({ required_error: `${label} is required` })
      .min(1, `${label} is required`)
      .regex(/^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2})?$/, `${label} is not a valid date`),
  );

export const optionalDateInput = (label = "Date") =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2})?$/, `${label} is not a valid date`)
      .optional(),
  );

export const tagsInput = z.preprocess(
  (v) => normaliseTags(v as string | string[] | undefined),
  z.array(z.string()).max(20),
);

/** Numeric form value. Accepts "5,6" (comma decimal) as well as "5.6". */
export const numberInput = (label: string) =>
  z.preprocess(
    (v) =>
      typeof v === "string" ? (v.trim() === "" ? undefined : Number(v.replace(",", "."))) : v,
    z
      .number({
        required_error: `${label} is required`,
        invalid_type_error: `${label} must be a number`,
      })
      .finite(`${label} must be a number`),
  );

export const optionalNumberInput = (label: string) =>
  z.preprocess(
    (v) =>
      typeof v === "string"
        ? v.trim() === ""
          ? undefined
          : Number(v.replace(",", "."))
        : v === null
          ? undefined
          : v,
    z
      .number({ invalid_type_error: `${label} must be a number` })
      .finite(`${label} must be a number`)
      .optional(),
  );

export const uuid = z.string().uuid("Invalid identifier");
