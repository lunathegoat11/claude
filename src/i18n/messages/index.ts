/**
 * All of Kosha's screen text, one module per area of the app. Each module has the
 * English text (`en`, which every key must have) and its Hindi, Marathi and Telugu
 * translations. A missing translation shows the English text.
 *
 * To add an area: create a module like common.ts and add it to AREAS below.
 */
import type { Locale } from "../config";
import { account } from "./account";
import { app } from "./app";
import { common } from "./common";
import { files } from "./files";
import { labs } from "./labs";
import { marketing } from "./marketing";

const AREAS = [common, labs, files, account, app, marketing] as const;

type Area = (typeof AREAS)[number];
/** Every message key, taken from the English text of every area. */
export type MessageKey = Area extends { en: infer E } ? keyof E & string : never;

export const DICTIONARIES = Object.fromEntries(
  (["en", "hi", "mr", "te"] as const).map((l) => [
    l,
    Object.assign({}, ...AREAS.map((a) => (a as Record<Locale, Record<string, string>>)[l])),
  ]),
) as Record<Locale, Partial<Record<MessageKey, string>>>;
