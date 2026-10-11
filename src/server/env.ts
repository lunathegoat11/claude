import "server-only";
import { z } from "zod";

const bool = z
  .string()
  .optional()
  .transform((v) => v === "true" || v === "1");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  APP_SECRET: z.string().min(32, "APP_SECRET must be at least 32 characters"),
  ALLOW_SIGNUP: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
  // The shared demo account never works on a live website, whatever this is set to:
  // anyone could put real health data into it and everyone else would see it.
  DEMO_LOGIN_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true" && process.env.NODE_ENV !== "production"),
  /**
   * Invite-only sign-up for a soft launch: when set, new accounts need this code.
   * Share it only with the people you invite.
   */
  SIGNUP_INVITE_CODE: z.string().optional(),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("./storage"),
  MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(100).default(15),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: bool,
  AI_PROVIDER: z.enum(["demo", "anthropic", "openai"]).default("demo"),
  AI_MODEL: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  AI_VISION_EXTRACTION: bool,
  // Email (password reset, verification)
  EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
  EMAIL_FROM: z.string().default("Kosha <no-reply@example.com>"),
  RESEND_API_KEY: z.string().optional(),
  // On-device OCR for photos of lab reports (no external service)
  OCR_ENABLED: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
  // Shown in the Privacy Policy / Terms
  ORGANIZATION_NAME: z.string().optional(),
  CONTACT_EMAIL: z.string().optional(),
  GRIEVANCE_OFFICER_NAME: z.string().optional(),
  GRIEVANCE_OFFICER_EMAIL: z.string().optional(),
  GRIEVANCE_OFFICER_ADDRESS: z.string().optional(),
  /** Where the database and files are kept, e.g. "Mumbai, India (Amazon Web Services)". */
  DATA_LOCATION: z.string().optional(),
  /** Companies that host or store data for this server, e.g. "Railway (hosting), AWS (files)". */
  HOSTING_PROVIDERS: z.string().optional(),
  /** City whose courts hear disputes under the Terms. */
  JURISDICTION_CITY: z.string().optional(),
  /** How long database backups are kept, in days. */
  BACKUP_RETENTION_DAYS: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.coerce.number().int().min(0).max(365).optional(),
  ),
  LEGAL_REVIEWED: bool,
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Validated server environment. Throws once, at first use, with a clear message. */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** For tests that mutate process.env. */
export function resetEnvCache() {
  cached = undefined;
}
