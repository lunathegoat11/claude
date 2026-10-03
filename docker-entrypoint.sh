#!/bin/sh
set -e
# Apply pending database migrations, then start the server.
node node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma
exec node server.js
