#!/bin/sh
set -e

# Explain, in plain words, any setting that's missing before trying to start.
missing=""
[ -z "$DATABASE_URL" ] && missing="$missing
  - DATABASE_URL: add a PostgreSQL database to the project, then set
    DATABASE_URL=\${{Postgres.DATABASE_URL}} in this service's Variables."
if [ -z "$APP_SECRET" ] || [ "${#APP_SECRET}" -lt 32 ]; then
  missing="$missing
  - APP_SECRET: a long random secret. Make one on a Mac with: openssl rand -hex 32"
fi
if [ -n "$missing" ]; then
  echo ""
  echo "Kosha can't start yet. These settings are missing:$missing"
  echo ""
  exit 1
fi

# Apply pending database migrations, then start the server.
node prisma-cli/node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma
# Print the launch checklist in the logs (advice only; never stops the server).
node scripts/launch-check.mjs --advice || true
exec node server.js
