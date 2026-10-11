#!/bin/sh
set -e
# Apply pending database migrations, then start the server.
node node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma
# Print the launch checklist in the logs (advice only; never stops the server).
node scripts/launch-check.mjs --advice || true
exec node server.js
