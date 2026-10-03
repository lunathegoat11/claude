import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA"
  | "AI_UNAVAILABLE"
  | "STORAGE"
  | "INTERNAL";

const STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA: 415,
  AI_UNAVAILABLE: 503,
  STORAGE: 500,
  INTERNAL: 500,
};

/**
 * An error whose message is safe to show to the user. Anything that is not an
 * AppError is treated as internal and replaced with a generic message.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(code: ErrorCode, message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS[code];
    this.fieldErrors = fieldErrors;
  }
}

export const notFound = (what = "Record") => new AppError("NOT_FOUND", `${what} not found.`);
export const unauthenticated = () => new AppError("UNAUTHENTICATED", "Please sign in to continue.");

export interface SafeError {
  code: ErrorCode;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

/** Convert any thrown value into a message that is safe to expose. */
export function toSafeError(err: unknown): SafeError {
  if (err instanceof AppError) {
    return { code: err.code, message: err.message, fieldErrors: err.fieldErrors };
  }
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    let formError: string | undefined;
    for (const issue of err.issues) {
      if (!issue.path.length) {
        formError ??= issue.message;
        continue;
      }
      const key = issue.path.join(".");
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return {
      code: "VALIDATION",
      message:
        formError ?? Object.values(fieldErrors)[0]?.[0] ?? "Some fields need your attention.",
      fieldErrors,
    };
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") return { code: "NOT_FOUND", message: "Record not found." };
    if (err.code === "P2002") return { code: "CONFLICT", message: "This item already exists." };
  }
  return { code: "INTERNAL", message: "Something went wrong on our side. Please try again." };
}

export function statusFor(code: ErrorCode): number {
  return STATUS[code];
}
