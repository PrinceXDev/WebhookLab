FROM node:20-alpine AS base
ENV HUSKY=0
RUN npm install -g pnpm

# ---- deps ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
RUN pnpm install --frozen-lockfile --ignore-scripts

# ---- build ----
FROM deps AS builder
WORKDIR /app
COPY packages/shared/ ./packages/shared/
COPY apps/server/ ./apps/server/
RUN pnpm --filter @webhooklab/server exec prisma generate
# Build shared (emits dist/*.js) BEFORE the server, since the server's compiled
# output imports @webhooklab/shared at runtime — it must resolve to JS, not .ts.
RUN pnpm --filter @webhooklab/shared build
RUN pnpm --filter @webhooklab/server build

# ---- runtime ----
FROM base AS runner
WORKDIR /app
# Copy manifests + the fully-installed node_modules from the builder.
# This preserves pnpm's symlinked layout AND the generated Prisma client
# (which lives inside node_modules/.pnpm), avoiding a re-install that would
# drop the generated client.
COPY package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY apps/server/prisma ./apps/server/prisma

WORKDIR /app/apps/server
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "dist/index.js"]
