# Kosha Health

**All of your important health information in one clean, understandable place.**

Kosha is a personal health-record and health-monitoring web app built for people in India. You can store medical records, upload reports and prescriptions, track readings like blood sugar and blood pressure, follow lab results across reports, and ask an AI assistant to summarise and explain your own records in plain language.

> Kosha organises information. It does **not** diagnose, give treatment or dosing advice, or replace a doctor. It is not integrated with ABDM or any government or hospital system, and it is not certified as compliant with any health-data regulation. See [Compliance status](#compliance-status).

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Quick start (development)](#quick-start-development)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Testing](#testing)
- [Production deployment](#production-deployment)
- [Architecture](#architecture)
- [Data model](#data-model)
- [AI assistant design & safety](#ai-assistant-design--safety)
- [Security & privacy](#security--privacy)
- [External services](#external-services)
- [Known limitations](#known-limitations)

---

## Features

| Area                         | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Home**                     | Leads with your latest lab report (every result with a range strip against the report's own range), then ledgers of readings and tests over time with change since last time, recent additions, and a shortcut to ask about your records.                                                                                                                                                                                                                                                                                                                                                         |
| **Medical records**          | Doctor visits, diagnoses, procedures, hospitalisations, prescriptions, vaccinations, allergies, conditions, family history, other. Search, filter by type/tag, sort, edit, soft-delete, tags, attachments, list and year-grouped timeline views. Progressive-disclosure form.                                                                                                                                                                                                                                                                                                                     |
| **Documents**                | Upload PDF/JPG/PNG/WebP/HEIC (magic-byte verified, size-limited). Name, type, date, provider, tags, notes, record link. Lazy preview, download, edit, delete (removes the file from storage). Text from PDFs is extracted for search and for the assistant.                                                                                                                                                                                                                                                                                                                                       |
| **Lab results**              | Manual entry with panel templates (CBC, sugar, lipid, LFT, KFT, thyroid) or any free-text test. Each result stores value (numeric or text), unit, the **reference range printed on that report**, date, lab, source and notes. "By test" and "By report" views, previous-value comparison, per-test history (`5.4 → 5.6 → 5.5 → 5.7`) with chart.                                                                                                                                                                                                                                                 |
| **Reading reports**          | Upload a PDF or photo and every test result is **saved straight away** with the report name, lab and date (type, date and lab are filled in from the document if left blank). With an AI key, the PDF/photo is read by the model as validated JSON (all tests, including ones outside the catalogue); otherwise PDF text / on-server OCR plus the built-in parser. Values that may be misread (missing decimals, odd ranges, low confidence) are marked to check, and every report links back to its original. Blurry, dark or tiny photos are refused with a request to retake (or keep anyway). |
| **AI helper keys**           | Settings, AI helper: each user can add their own Claude or OpenAI key. Encrypted with AES-256-GCM (key derived from `APP_SECRET`, bound to the user id), never sent back to the browser, only used for that user. A switch controls whether uploads may be sent to the provider. Photos are resized and stripped of metadata (e.g. GPS) before sending.                                                                                                                                                                                                                                           |
| **General ranges on charts** | Every lab and reading chart can show general reference ranges from **India** (on by default: ICMR Standard Treatment Workflows, MoHFW programmes, Indian Guidelines on Hypertension) and the **USA** (NIH MedlinePlus/NIDDK/NHLBI/ODS, CDC, AHA). India is drawn as shaded zones, the US as dashed lines; each names and links its source, converts units, uses the profile's sex where ranges differ, and says plainly when India has published no national range (ICMR's reference-interval study is still under way). Never used for High/Low flags.                                           |
| **Health tracking**          | Built-in metrics (blood glucose, blood pressure, heart rate, SpO₂, temperature, weight, height, sleep, exercise) plus **user-defined custom metrics**. Glucose contexts: fasting, before meal, after meal, random, bedtime, custom. Unit conversion (mg/dL ↔ mmol/L, kg ↔ lb, °F ↔ °C). Plausibility checks catch typos. CSV import with preview.                                                                                                                                                                                                                                                 |
| **Charts**                   | Interactive line charts with 7D/30D/3M/6M/1Y/All ranges, context filter, hover/tap tooltips (value, date, time, context, notes), BP as two series with a legend. Lab charts shade a range only when every point shares the same printed range. Recharts is lazy-loaded.                                                                                                                                                                                                                                                                                                                           |
| **AI assistant**             | Answers questions like "What were my glucose readings over the last month?", "What changed between my last two lab reports?", "What documents mention my blood pressure?". Retrieves only relevant records, cites them with clickable references (`[L3]`), labels calculated vs recorded vs general information. Works offline without an API key.                                                                                                                                                                                                                                                |
| **Timeline**                 | Unified chronological feed grouped by month and day, filters by category, optional individual readings, cursor pagination.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Search**                   | Global search across records, documents (including text inside PDFs), lab results, measurements and providers. Synonyms (sugar → glucose, BP, SGPT → ALT…), Indian date queries (`12/09/2026`, `Sep 2026`), numeric value search, type and date-range filters.                                                                                                                                                                                                                                                                                                                                    |
| **Profile & settings**       | Optional profile (DOB, sex, blood group, height, Indian phone, city/state, emergency contact), conditions/medications/allergies, unit preferences, light/dark/system theme, password change, signed-in devices, sign out other devices, recent account activity, **full JSON data export**, permanent account deletion.                                                                                                                                                                                                                                                                           |
| **Accounts**                 | Email/password sign-up with **explicit consent** (Terms + health-data processing, version and time recorded), **email verification**, **"forgot password" by email** (single-use, 1-hour links that sign out all devices).                                                                                                                                                                                                                                                                                                                                                                        |
| **Legal pages**              | Plain-language **Privacy Policy** and **Terms of Use** templates written around DPDP Act 2023 concepts, filled from environment variables and clearly marked as drafts until `LEGAL_REVIEWED=true`.                                                                                                                                                                                                                                                                                                                                                                                               |
| **Mobile**                   | Phone-first layouts checked at 360/375 px, bottom navigation, bottom-sheet dialogs, 16 px form fields (no iOS zoom), **installable to the home screen** (web app manifest + icons).                                                                                                                                                                                                                                                                                                                                                                                                               |
| **India-first**              | IST time zone, day-month-year dates, Indian digit grouping (1,50,000), INR formatter, Indian phone validation, all states/UTs, city suggestions, Indian lab naming (SGPT, PPBS, TLC, lakh/µL…), emergency numbers 112/108 and Tele-MANAS 14416.                                                                                                                                                                                                                                                                                                                                                   |

A shared **demo account** with a clearly fictional patient (Ananya Sharma) is created by the seed script and is labelled as sample data everywhere.

## Tech stack

- **Next.js 15** (App Router, Server Components, Server Actions, Route Handlers), **React 19**, **TypeScript** (strict)
- **Tailwind CSS v4**, shadcn/ui-style components on **Radix UI**, **Lucide** icons, **Recharts**, **sonner** toasts, **next-themes**
- **PostgreSQL** + **Prisma 6**
- **Zod** validation, **Argon2id** password hashing (`@node-rs/argon2`)
- File storage abstraction: local disk or any **S3-compatible** bucket (`@aws-sdk/client-s3`)
- AI provider abstraction: offline grounded provider, **Anthropic Claude** (`@anthropic-ai/sdk`), or any **OpenAI-compatible** endpoint
- PDF text extraction with **unpdf**
- **Vitest** (integration tests against real PostgreSQL), **ESLint**, **Prettier**

## Quick start (development)

Prerequisites: Node.js ≥ 20.9 (22 recommended) and PostgreSQL ≥ 13 (needs the `pg_trgm` extension, included in standard Postgres packages).

```bash
# 1. Install dependencies
npm install

# 2. Create a database and user (example)
psql -U postgres -c "CREATE USER kosha WITH PASSWORD 'kosha' CREATEDB;"
psql -U postgres -c "CREATE DATABASE kosha OWNER kosha;"

# 3. Configure environment
cp .env.example .env
# set APP_SECRET to a long random value: openssl rand -base64 48

# 4. Create the schema and load demo data
npx prisma migrate deploy
npm run db:seed

# 5. Run
npm run dev
```

Open http://localhost:3000 and either create an account or click **Explore the demo account** (email `demo@kosha.example`, password `demo-password-123`).

To start without demo data: `SEED_DEMO=false npm run db:seed` (still creates the built-in metric definitions, which the app would also create on first use).

## Environment variables

All variables are documented in [`.env.example`](.env.example) and validated at start-up (`src/server/env.ts`).

| Variable                                                                                                   | Required        | Default                 | Purpose                                                                                |
| ---------------------------------------------------------------------------------------------------------- | --------------- | ----------------------- | -------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                                             | yes             | —                       | PostgreSQL connection string                                                           |
| `APP_SECRET`                                                                                               | yes             | —                       | ≥ 32 chars. Encrypts saved AI keys and signs tokens                         |
| `APP_URL`                                                                                                  | no              | `http://localhost:3000` | Public origin, used for same-origin checks                                             |
| `ALLOW_SIGNUP`                                                                                             | no              | `true`                  | Set `false` to close registration                                                      |
| `DEMO_LOGIN_ENABLED`                                                                                       | no              | `false`                 | Shows the "Explore the demo account" button. **Keep off in production**                |
| `STORAGE_DRIVER`                                                                                           | no              | `local`                 | `local` or `s3`                                                                        |
| `STORAGE_LOCAL_DIR`                                                                                        | no              | `./storage`             | Directory for local files (created with 0700/0600 permissions)                         |
| `MAX_UPLOAD_MB`                                                                                            | no              | `15`                    | Upload size limit                                                                      |
| `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE` | for `s3`        | —                       | Any S3-compatible store (AWS `ap-south-1`, Cloudflare R2, MinIO…)                      |
| `AI_PROVIDER`                                                                                              | no              | `demo`                  | `demo` (offline), `anthropic`, or `openai`                                             |
| `AI_MODEL`                                                                                                 | no              | provider default        | e.g. `claude-opus-5-5` (Anthropic default)                                             |
| `ANTHROPIC_API_KEY`                                                                                        | for `anthropic` | —                       | Claude API key                                                                         |
| `OPENAI_API_KEY`, `OPENAI_BASE_URL`                                                                        | for `openai`    | —                       | Any OpenAI-compatible Chat Completions endpoint                                        |
| `AI_VISION_EXTRACTION`                                                                                     | no              | `false`                 | Let a vision-capable provider transcribe photos of lab reports                         |
| `EMAIL_PROVIDER`                                                                                           | no              | `console`               | `console` prints emails (with links) in the server terminal; `resend` sends real email |
| `EMAIL_FROM`, `RESEND_API_KEY`                                                                             | for `resend`    | —                       | Sender address (must be on a domain verified with Resend) and API key                  |
| `OCR_ENABLED`                                                                                              | no              | `true`                  | On-server OCR for photos of lab reports                                                |
| `ORGANIZATION_NAME`, `CONTACT_EMAIL`, `GRIEVANCE_OFFICER_NAME`, `GRIEVANCE_OFFICER_EMAIL`                  | for launch      | —                       | Shown in the Privacy Policy and Terms                                                  |
| `LEGAL_REVIEWED`                                                                                           | no              | `false`                 | Set `true` after a lawyer has reviewed the legal pages to remove the "draft" notice    |
| `LOG_LEVEL`                                                                                                | no              | `info`                  | `debug`/`info`/`warn`/`error`                                                          |

If `AI_PROVIDER` is set but its key is missing, the app logs a warning and uses the offline provider.

## Scripts

| Command                       | Description                                                                 |
| ----------------------------- | --------------------------------------------------------------------------- |
| `npm run dev`                 | Development server                                                          |
| `npm run build` / `npm start` | Production build / server (see deployment for the standalone server)        |
| `npm run setup`               | Install dependencies, apply database migrations, generate the Prisma client |
| `npm run update`              | `git pull` + `npm run setup` — get the latest version of a git checkout     |
| `npm run lint`                | ESLint (includes a `no-console` rule to keep health data out of logs)       |
| `npm run typecheck`           | `tsc --noEmit`                                                              |
| `npm test`                    | Vitest (integration + unit)                                                 |
| `npm run format`              | Prettier                                                                    |
| `npm run db:migrate`          | Create/apply a migration in development                                     |
| `npm run db:deploy`           | Apply migrations (production)                                               |
| `npm run db:seed`             | System metrics + demo account (`SEED_DEMO=false` to skip demo)              |
| `npm run db:reset`            | Drop, re-migrate and re-seed the dev database                               |

## Testing

Tests run against a **real PostgreSQL test database** (default `postgresql://kosha:kosha@localhost:5432/kosha_test`, override with `TEST_DATABASE_URL`). Migrations are applied automatically before the run.

```bash
createdb -U kosha kosha_test   # once
npm test
```

Tests cover:

- **Authentication** – Argon2id hashing, password policy, registration, duplicate emails, sign-in, password change, hashed session tokens, expiry.
- **Authorization / ownership** – a second user cannot read, update, delete or link another user's records, lab panels, test history, measurements, custom metrics, conversations, medications or documents, even with valid IDs; soft-delete behaviour.
- **Lab results** – reference-range parsing, flags only from the stored range, numeric vs text values, validation (negative values, inverted ranges, future dates, empty panels), previous-value comparison, edits and soft deletes, timeline sync.
- **Health measurements** – glucose contexts, mmol/L → mg/dL, °C/lb conversion, IST time handling, BP validation, plausibility bounds, CSV preview/import.
- **Documents** – magic-byte verification, size limits, storage keys without PII, results saved instantly with report name/lab/date, type/date/lab filled in from the document, blurry photos refused (and kept on request), AI-read reports including uncatalogued tests, photos sent to AI resized and without metadata, owner-only results and files, searchable extracted text, blob removed on delete.
- **Report reading** – numbered rows, values on the next line, uncatalogued tests, patient details not mistaken for results, Indian dates, AI output re-checked locally.
- **AI keys** – encryption round-trip, tamper and cross-user rejection, keys never returned, wrong/malformed keys rejected, owner-only use.
- **Age** – 18+ confirmation required to sign up and sign in.
- **Search** – synonyms, Indian date formats, numeric search, type filters, user scoping.
- **AI** – question analysis and time ranges, bounded retrieval scoped to the user, emergency/dosing/diagnosis detection, removal of invented citations and dosing advice, unverified-number flagging, provider failure fallback, "nothing found" behaviour.
- **Account recovery & consent** – both consents required and recorded, single-use hashed email-verification and reset links, newest-link-only, expiry, all sessions revoked on reset, no account enumeration, no health data in emails.
- **Photo reading** – OCR of a sample report photo offline, "double-check" confidence for photo values, missing-decimal and inverted-range warnings, HEIC handled gracefully.
- **Upload origin check** – accepted behind a hosting proxy, rejected from other sites.
- **Migrations** – the initial migration always sorts first.
- **Unit** – lab-report text parser, Indian formatting and phone validation, Zod schemas, safe error messages, CSV parsing.

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and a production build against a Postgres service container.

## Production deployment

### Option A — Railway (simplest)

`railway.json` tells Railway to build the `Dockerfile` and health-check `/api/health`. In a Railway project: add **PostgreSQL**, add this repo (pick the branch), add a **Volume** mounted at `/app/storage`, generate a domain, and set variables:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
APP_URL=https://<your-domain>
APP_SECRET=<openssl rand -hex 32>
STORAGE_DRIVER=local
STORAGE_LOCAL_DIR=/app/storage
DEMO_LOGIN_ENABLED=false
RAILWAY_RUN_UID=0
```

Migrations run automatically on every start.

### Option B — Docker

```bash
export APP_SECRET="$(openssl rand -base64 48)"
docker compose up --build
```

The image (`Dockerfile`) uses Next.js standalone output, runs as a non-root user, applies `prisma migrate deploy` on start (`docker-entrypoint.sh`) and stores uploads in a volume. To create the built-in metrics without demo data you don't need to do anything — they are created on first use.

### Option C — Node server / PaaS

```bash
npm ci
npx prisma generate
npm run build
npx prisma migrate deploy
SEED_DEMO=false npm run db:seed      # optional; creates built-in metrics
cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
node .next/standalone/server.js      # PORT/HOSTNAME env vars supported
```

Platforms with managed Next.js support (e.g. Vercel) also work; use `STORAGE_DRIVER=s3` there because the filesystem is ephemeral.

### Production checklist

- Serve **only over HTTPS** (cookies are `Secure`, `__Host-` prefixed and HSTS is sent in production).
- Strong `APP_SECRET`; secrets from your platform's secret manager, never committed.
- `DEMO_LOGIN_ENABLED=false`; consider `ALLOW_SIGNUP=false` for closed pilots.
- Managed PostgreSQL with encryption at rest, automated backups and private networking. For data residency in India, choose an India region (e.g. AWS `ap-south-1` Mumbai / `ap-south-2` Hyderabad).
- `STORAGE_DRIVER=s3` with a **private** bucket (block all public access), SSE (objects are written with `AES256`; switch to SSE-KMS if required), versioning and lifecycle rules.
- Multiple instances: plug a shared store (Redis) into `src/server/rate-limit.ts` via `setRateLimitStore`.
- Ship structured logs (`src/server/logger.ts` writes JSON to stdout with sensitive keys redacted) to your log platform; route audit logs to long-term storage.
- Configure the AI provider's data-retention/processing terms appropriately before sending health data to a third-party model.

## Architecture

```
src/
├── app/                      Next.js routes
│   ├── (marketing)/          Landing page
│   ├── (auth)/               Sign in / sign up
│   ├── (app)/                Authenticated app (dashboard, records, labs, tracking,
│   │                         assistant, timeline, documents, search, settings)
│   └── api/                  Route handlers: document upload/list, file streaming, data export
├── actions/                  Server Actions (thin: auth → service → audit → revalidate)
├── components/
│   ├── ui/                   Design-system primitives (button, card, dialog, …)
│   ├── layout/               App shell, sidebar, mobile bottom nav, search box
│   ├── charts/               Sparkline, lazy Recharts trend chart, range selector
│   ├── forms/                Field, submit button, confirm-delete, action-form hook
│   └── <feature>/            Feature components (records, labs, tracking, assistant, …)
├── lib/                      Isomorphic code: formatting (IST), India helpers, catalogues,
│                             Zod schemas, lab-range logic, utilities
└── server/                   Server-only code
    ├── auth/                 Password hashing, sessions, account service
    ├── services/             Business logic & DB access (every query scoped by userId)
    ├── ai/                   Provider interface, providers, question analysis,
    │                         retrieval, prompts, safety layer
    ├── extraction/           PDF text, lab-report parser, CSV parser, pipeline
    ├── storage/              Storage driver interface, local & S3 drivers
    ├── api.ts                Route-handler guard (auth, same-origin, rate limit, safe errors)
    ├── action-utils.ts       Server-action wrapper (safe errors, no content in logs)
    ├── audit.ts              Audit log writer
    ├── rate-limit.ts         Pluggable rate limiter
    ├── errors.ts             AppError + safe error mapping
    ├── logger.ts             Redacting JSON logger
    └── env.ts                Validated configuration
prisma/                       Schema, migrations, seed, fictional PDF fixtures
tests/                        Vitest suites
```

Layering: **UI → Server Actions / Route Handlers → services → Prisma**. Pages are Server Components that call services directly and stream HTML; client components are used only where interaction is needed (forms, dialogs, charts, chat). Services take an explicit `userId` and never trust IDs from the client.

## Data model

Normalised Prisma schema (`prisma/schema.prisma`), UUID keys, timestamps, foreign keys with cascade rules, soft deletes (`deletedAt`) on clinical tables, and B-tree, GIN (tags) and trigram (search) indexes.

| Model                                | Notes                                                                                                                       |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `User`, `Account`, `Session`         | `Account` is ready for OAuth/OIDC providers; sessions store only a SHA-256 hash of the token                                |
| `Profile`                            | Optional personal details and unit preferences                                                                              |
| `Provider`                           | User-owned free-text doctors, hospitals, labs (no external registry implied)                                                |
| `MedicalRecord`                      | Typed records with tags, provider link, soft delete                                                                         |
| `MedicalDocument`                    | Metadata only — storage key, MIME type, size, SHA-256, extracted text, extraction status. **No file bytes in the database** |
| `LabPanel`, `LabResult`              | Results keep value (numeric or text), unit, **report-specific reference range**, flag, source, lab                          |
| `HealthMetric`, `HealthMeasurement`  | Metric definitions (system or user-defined) and readings with context; stored in canonical units                            |
| `Medication`, `Allergy`, `Condition` | Health summary (medication doses are recorded as written, never suggested)                                                  |
| `TimelineEvent`                      | Denormalised feed, written in the same transaction as its source entity                                                     |
| `AIConversation`, `AIMessage`        | Messages store citations and safety annotations                                                                             |
| `ImportJob`                          | Holds extracted candidate values awaiting user confirmation                                                                 |
| `AuditLog`                           | Who did what to which entity; never clinical content                                                                        |

The biomarker catalogue (`src/lib/catalog/biomarkers.ts`) maps Indian lab naming to codes and has plain-language descriptions but **deliberately no reference ranges**.

## AI assistant design & safety

1. **Analyse** the question deterministically (`src/server/ai/analyse.ts`): intents, metrics, biomarkers, time range.
2. **Retrieve** only the relevant slices for that user with hard caps (`retrieval.ts`): e.g. the last 30 readings plus DB-computed statistics for the period, up to 12 results per lab test, the latest 2–3 reports, up to 6 matching documents with snippets, up to 8 records. Every item gets a citation ref (`M1`, `L3`, `P1`, `D2`, `R4`).
3. **Generate** with the configured provider. The system prompt (`prompts.ts`) restricts answers to the supplied records, requires citations, separates recorded data / calculated observations / general information, and forbids diagnosis, dosing and treatment advice.
4. **Enforce** with a provider-independent safety layer (`safety.ts`):
   - emergencies and self-harm are answered with 112/108/Tele-MANAS guidance **without calling the model**;
   - citations not present in the retrieved context are stripped;
   - sentences giving medication/dose instructions or diagnostic claims are removed and the user is told why;
   - numbers with health units that can't be matched to the records (or derived from them) are flagged in the UI;
   - dosing and diagnosis questions get an explicit notice.
5. If the provider fails or refuses, the answer falls back to the **offline grounded provider**, which composes summaries directly from the records (and is the default without an API key).

The assistant cannot modify records — it has no write path.

## Data minimisation

- Sessions keep only a coarse device label ("Chrome on Android"), never the full user-agent.
- The activity log stores what happened and when: no IP address (not even hashed) and no browser details.
- Uploaded photos are stored upright, at most 3000 px, with all metadata (GPS location, phone model, time stamps) removed. Photos sent to an AI provider are resized and stripped the same way.
- Automatic clean-up (every few hours, on sign-in): expired sessions, used or expired email links, unconfirmed read values after 30 days, activity log after one year.
- Only name, email and password are required; every other profile field is optional.
- Deleting anything removes it for good at once (row, file and text read from it); editing a report replaces the old values instead of keeping them.
- **Learning from corrections (opt-in):** when someone who agreed corrects values read from a report, the before/after rows are compared in memory and dropped. Only anonymous patterns are kept in `ReadingPattern`: misread characters (e.g. `1`→`7`), and keyed hashes of line labels people delete or rename, stored only after three different people make the same correction (until then held in memory for at most a day). The reader skips learned junk lines, links learned labels to tests, and suggests likely misread digits without ever changing a value. See `src/server/services/reading-patterns.ts`.

## Low-end devices

- Pages are server-rendered; charts (Recharts) load only on the pages that draw them, with animations off.
- Document lists use ~6 KB thumbnails instead of full photos; long lists use `content-visibility` so off-screen rows aren't laid out.
- No backdrop blurs; only three font weights are downloaded.

## Security & privacy

- **Authentication:** email/password with Argon2id (OWASP parameters), timing-equalised failed lookups, generic error messages, password policy.
- **Sessions:** random 256-bit tokens in `HttpOnly`, `SameSite=Lax`, `Secure` (prod), `__Host-` cookies; only token hashes stored; 30-day sliding expiry; revoke other devices; password change signs out other sessions.
- **Authorization:** every service query includes `userId`; IDs from other users behave exactly like non-existent IDs (404). Covered by tests.
- **CSRF:** Server Actions' built-in origin check, plus an explicit same-origin check on mutating route handlers.
- **Files:** magic-byte type detection, size limits, random storage keys without names or PII, private storage, owner-checked streaming with `no-store`, `nosniff`, locked-down CSP for images; deletion removes the object.
- **Input validation:** Zod on every action and route; plausibility checks for readings; lab values validated; CSV preview before import.
- **Headers:** CSP, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options`, HSTS (prod).
- **Rate limiting:** sign-in (per IP and per email), sign-up, AI, uploads, export, API; pluggable store.
- **Audit log:** sign-in/out, failures, record/lab/document/measurement changes, document views/downloads, exports, AI queries (metadata only), account deletion; no IP addresses or browser details are stored.
- **Logging & errors:** JSON logger redacts sensitive keys; users only ever see safe messages; client error boundary reports only an opaque digest; ESLint forbids `console.log` in app code.
- **Account recovery:** reset and verification links are random, stored only as hashes, single-use, short-lived (1 h / 24 h), rate-limited, and never reveal whether an email is registered; a reset signs out every device.
- **Consent:** Terms and health-data consent are required at sign-up and stored with a version and timestamp; withdrawing consent = deleting the account.
- **Data rights:** full JSON export and permanent account deletion (including stored files).

## Compliance status

Kosha includes technical controls that help towards health-data protection requirements, but **it has not been audited or certified**. It is **not** claimed to be compliant with HIPAA, India's DPDP Act 2023 and its Rules, ABDM/NDHM health data management policy, or any other regulation. Before production use with real patients you will need, at minimum: a lawyer-reviewed privacy notice and consent wording (draft templates and the consent flow are included), a data-processing and retention policy, grievance redressal, breach-notification procedures, vendor agreements (hosting, storage, AI provider), security testing, and legal review.

**ABDM:** there is no ABDM, ABHA, PHR-app or Health Information Exchange integration. The data model (provider entities, `Account` for external identities, typed documents and lab panels with sources, consent-ready audit trail) was designed so that an ABDM-certified integration — including consent artefacts and HIP/HIU flows — could be added later, but none exists today.

## External services

| Service               | Needed?      | Notes                                                                                           |
| --------------------- | ------------ | ----------------------------------------------------------------------------------------------- |
| PostgreSQL            | **Required** | Any managed Postgres ≥ 13                                                                       |
| S3-compatible storage | Optional     | Recommended for production; local disk otherwise                                                |
| Anthropic API         | Optional     | `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY`                                                    |
| OpenAI-compatible API | Optional     | `AI_PROVIDER=openai`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`                                       |
| Resend (email)        | Optional     | `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM` — needed for real password-reset emails |

With none of the optional services, the full app — including the assistant (offline grounded mode), PDF import and photo OCR — works. Without an email service, reset/verification links are printed in the server terminal.

## Known limitations

- **Photo reading without an AI key is approximate.** On-server OCR often drops decimal points on small print (e.g. 5.2 → 52); such values are saved with a "check this" note, and users can correct them with Edit. Adding an AI key in Settings is much more accurate. HEIC photos, and scanned PDFs without a text layer when no AI key is set, are not read automatically.
- **Changing `APP_SECRET` makes saved AI keys unreadable.** Users are told to paste their key again.
- **The built-in lab parser** is heuristic and line-based; it handles common Indian report layouts (numbered rows, values on the next line, tests outside the catalogue) but can miss values in complex tables.
- **Assistant retrieval** is keyword/intent-based rather than semantic (no embeddings). Unusual phrasing may retrieve less context; the assistant then says it couldn't find the information rather than guessing.
- **Offline provider** produces structured summaries, not free-form conversation; follow-up questions are answered independently.
- **Rate limiting** is in-memory per instance by default.
- **Email** needs an email service (Resend) for real delivery; email verification is encouraged with a banner but not enforced.
- **No OAuth providers configured** — the `Account` model is ready for them.
- **Single-user accounts** — no family/caregiver sharing or doctor access yet.
- **Units:** lab results keep the unit printed on each report; values in different units are listed but not charted together. No automatic lab unit conversion.
- **Time zone** is IST by default (stored on the profile); there is no UI to change it yet.
- The Docker image was written and the standalone server it runs was verified, but the image itself was not built in the development sandbox (no Docker daemon was available).
