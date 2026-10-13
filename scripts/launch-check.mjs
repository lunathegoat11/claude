#!/usr/bin/env node
/**
 * Is Kosha ready to go live? Checks the server's settings and prints a plain-English
 * checklist. Run it with `npm run launch-check` (or `railway run npm run launch-check`
 * to check the settings of a Railway project). The live server also prints it at start.
 *
 * It reads settings from the environment, and from a .env file if there is one. It never
 * prints secrets: only whether each one is set.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// Settings already in the environment win over the .env file, as they do in the app.
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m || m[1] in process.env) continue;
    process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
  }
}
const env = process.env;
const set = (k) => !!env[k]?.trim();
const onRailway = !!(env.RAILWAY_ENVIRONMENT_NAME || env.RAILWAY_ENVIRONMENT);

const must = []; // problems that must be fixed before real people use Kosha
const good = [];
const todo = []; // things only a person can do; listed as reminders
const check = (ok, okText, problem) => (ok ? good.push(okText) : must.push(problem));

let appUrl;
try {
  appUrl = new URL(env.APP_URL ?? "");
} catch {
  appUrl = null;
}
check(
  appUrl?.protocol === "https:" && !/^(localhost|127\.|0\.0\.0\.0)/.test(appUrl.hostname),
  `Web address: ${appUrl?.origin}`,
  "APP_URL must be your public https:// web address (for example https://kosha.example.in).",
);

const secret = env.APP_SECRET ?? "";
check(
  secret.length >= 32 && !/change-me/i.test(secret),
  "APP_SECRET is long and private",
  "APP_SECRET must be a long random secret. Make one with: openssl rand -hex 32",
);

check(
  env.DEMO_LOGIN_ENABLED !== "true",
  "Demo account is off",
  'Set DEMO_LOGIN_ENABLED="false" (it is ignored on a live server anyway).',
);

const legal = {
  ORGANIZATION_NAME: "your organisation's legal name",
  CONTACT_EMAIL: "a contact email",
  GRIEVANCE_OFFICER_NAME: "the Grievance Officer's name",
  GRIEVANCE_OFFICER_EMAIL: "the Grievance Officer's email",
  GRIEVANCE_OFFICER_ADDRESS: "the Grievance Officer's postal address",
  DATA_LOCATION: "where data is stored (for example: Mumbai, India (AWS))",
  HOSTING_PROVIDERS: "your hosting and storage companies",
  JURISDICTION_CITY: "the city whose courts hear disputes",
  BACKUP_RETENTION_DAYS: "how many days backups are kept",
};
const missing = Object.entries(legal).filter(([k]) => !set(k));
check(
  !missing.length,
  "Privacy Policy and Terms details are filled in",
  `Fill in the legal details: ${missing.map(([k, d]) => `${k} (${d})`).join("; ")}.`,
);
check(
  env.LEGAL_REVIEWED === "true",
  "A lawyer has reviewed the Privacy Policy and Terms",
  'Have a lawyer review the Privacy Policy and Terms, then set LEGAL_REVIEWED="true".',
);

check(
  env.EMAIL_PROVIDER === "resend" &&
    set("RESEND_API_KEY") &&
    set("EMAIL_FROM") &&
    !/example\.com|resend\.dev/.test(env.EMAIL_FROM ?? ""),
  "Email is set up (Resend)",
  'Set up email for password resets: EMAIL_PROVIDER="resend", RESEND_API_KEY and EMAIL_FROM (an address on your own domain, verified in Resend).',
);

const driver = env.STORAGE_DRIVER ?? "local";
if (driver === "s3") {
  check(
    ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"].every(set),
    "Uploaded files go to private S3 storage",
    "STORAGE_DRIVER is s3, so set S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.",
  );
} else if (onRailway) {
  const volume = env.RAILWAY_VOLUME_MOUNT_PATH;
  const dir = path.resolve(env.STORAGE_LOCAL_DIR ?? "./storage");
  check(
    !!volume && (dir + path.sep).startsWith(path.resolve(volume) + path.sep),
    `Uploaded files are kept on a Railway Volume (${volume})`,
    "Attach a Volume to the Kosha service (mount path /app/storage) and set STORAGE_LOCAL_DIR=/app/storage. Without it, uploaded files vanish on every restart, so uploads are switched off.",
  );
} else {
  todo.push(
    "Make sure the folder in STORAGE_LOCAL_DIR is on a disk that is kept and backed up (or use S3).",
  );
}

if (onRailway)
  check(
    !/@(localhost|127\.0\.0\.1)[:/]/.test(env.DATABASE_URL ?? ""),
    "Database is a managed server",
    "DATABASE_URL points at localhost: use your host's PostgreSQL (on Railway: ${{Postgres.DATABASE_URL}}).",
  );

if (set("SIGNUP_INVITE_CODE")) good.push("Sign-up is invite-only (soft launch)");
else if (env.ALLOW_SIGNUP === "false") good.push("New sign-ups are closed");
else
  todo.push(
    "Anyone can sign up. For a soft launch, set SIGNUP_INVITE_CODE and share it with the people you invite.",
  );

todo.push(
  "Turn on automatic database backups with your host (on Railway: the Postgres service → Backups).",
  "Get an independent security test before real patients sign up.",
  'Run a trademark search on the name "Kosha" (India: ipindia.gov.in; classes 9, 42 and 44).',
);

// Is the database reachable, with all updates applied?
try {
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  await db.$queryRaw`SELECT 1`;
  const pending =
    await db.$queryRaw`SELECT count(*)::int AS n FROM "_prisma_migrations" WHERE finished_at IS NULL`;
  await db.$disconnect();
  check(
    pending[0]?.n === 0,
    "Database is reachable and up to date",
    "Some database updates didn't finish. Run: npx prisma migrate deploy",
  );
} catch {
  must.push("Can't reach the database. Check DATABASE_URL, and that the database is running.");
}

const out = [
  "",
  "Kosha launch check",
  "──────────────────",
  ...good.map((t) => `  ✓ ${t}`),
  ...must.map((t) => `  ✗ ${t}`),
  "",
  "Also do (can't be checked automatically):",
  ...todo.map((t) => `  • ${t}`),
  "",
  must.length
    ? `Not ready yet: ${must.length} thing${must.length === 1 ? "" : "s"} to fix (✗ above).`
    : "Ready to go live once the reminders above are done.",
  "",
];
console.log(out.join("\n"));
// At server start this is only advice; run by hand, it fails while something must be fixed.
process.exitCode = must.length && !process.argv.includes("--advice") ? 1 : 0;
