# syntax=docker/dockerfile:1.7
# Production image for Kosha Health (Next.js standalone output + Prisma).

FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npx next build

FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 kosha && useradd --system --uid 1001 --gid kosha kosha
COPY --from=build --chown=kosha:kosha /app/.next/standalone ./
COPY --from=build --chown=kosha:kosha /app/.next/static ./.next/static
COPY --from=build --chown=kosha:kosha /app/public ./public
COPY --from=build --chown=kosha:kosha /app/prisma ./prisma
# Prisma CLI + engines for `migrate deploy` at start-up.
COPY --from=build --chown=kosha:kosha /app/node_modules/prisma ./node_modules/prisma
COPY --from=build --chown=kosha:kosha /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build --chown=kosha:kosha /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=kosha:kosha docker-entrypoint.sh ./
RUN mkdir -p /app/storage && chown kosha:kosha /app/storage && chmod +x docker-entrypoint.sh
USER kosha
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
