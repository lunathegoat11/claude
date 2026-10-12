# Production image for Kosha Health (Next.js standalone output + Prisma).

# The official Node.js image, pulled through Google's mirror of Docker Hub so builds
# aren't stopped by Docker Hub's download limits ("429 Too Many Requests").
FROM mirror.gcr.io/library/node:22-bookworm-slim AS base
RUN apt-get -o Acquire::Retries=5 update \
  && apt-get -o Acquire::Retries=5 install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npx next build

# The Prisma CLI, installed on its own with all of its dependencies, to apply database
# migrations when the server starts. (Copying only its own folders misses packages it
# needs, such as "effect", and the server then crashes on start.)
FROM base AS prisma-cli
WORKDIR /prisma-cli
COPY --from=deps /app/node_modules/prisma/package.json ./prisma-version.json
RUN npm init -y >/dev/null \
  && npm install --omit=dev --no-audit --no-fund "prisma@$(node -p "require('./prisma-version.json').version")"

FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 kosha && useradd --system --uid 1001 --gid kosha kosha
COPY --from=build --chown=kosha:kosha /app/.next/standalone ./
COPY --from=build --chown=kosha:kosha /app/.next/static ./.next/static
COPY --from=build --chown=kosha:kosha /app/public ./public
COPY --from=build --chown=kosha:kosha /app/prisma ./prisma
COPY --from=build --chown=kosha:kosha /app/scripts ./scripts
# Prisma client for the app and the launch check; Prisma CLI for `migrate deploy`.
COPY --from=build --chown=kosha:kosha /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=build --chown=kosha:kosha /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=prisma-cli --chown=kosha:kosha /prisma-cli/node_modules ./prisma-cli/node_modules
COPY --chown=kosha:kosha docker-entrypoint.sh ./
RUN mkdir -p /app/storage && chown kosha:kosha /app/storage && chmod +x docker-entrypoint.sh
USER kosha
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
