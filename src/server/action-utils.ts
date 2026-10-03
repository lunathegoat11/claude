import "server-only";
import { unstable_rethrow } from "next/navigation";
import { logger } from "./logger";
import { toSafeError } from "./errors";

export interface ActionState<T = unknown> {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  data?: T;
}

/**
 * Wrap a server action body: re-throws Next.js control flow (redirect/notFound),
 * converts every other error into a user-safe message, and logs internals
 * without any request content.
 */
export async function runAction<T>(
  name: string,
  fn: () => Promise<ActionState<T>>,
): Promise<ActionState<T>> {
  try {
    return await fn();
  } catch (err) {
    unstable_rethrow(err);
    const safe = toSafeError(err);
    if (safe.code === "INTERNAL") logger.error(`action.${name}.failed`, { err });
    return { ok: false, error: safe.message, fieldErrors: safe.fieldErrors };
  }
}

export function formToObject(fd: FormData): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v !== "string") continue;
    if (k.startsWith("$ACTION")) continue;
    const existing = out[k];
    if (existing === undefined) out[k] = v;
    else out[k] = Array.isArray(existing) ? [...existing, v] : [existing, v];
  }
  return out;
}
