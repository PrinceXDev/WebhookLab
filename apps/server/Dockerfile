FROM node:20-alpine AS base
RUN npm install -g pnpm

# ---- deps ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
ENV HUSKY=0
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM deps AS builder
WORKDIR /app
COPY packages/shared/ ./packages/shared/
COPY apps/server/ ./apps/server/
RUN pnpm --filter @webhooklab/shared build 2>/dev/null || true
RUN pnpm --filter server build

# ---- runtime ----
FROM node:20-alpine AS runner
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
ENV HUSKY=0
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY apps/server/prisma ./apps/server/prisma

WORKDIR /app/apps/server
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "dist/index.js"]
