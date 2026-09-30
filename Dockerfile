# A.E.G.I.S. — Multi-stage Docker build
# Port 3001

FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package*.json ./
RUN npm ci

# ── Builder stage ──────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Runner stage ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public      ./public
COPY --from=builder /app/vault       ./vault
COPY --from=builder /app/.next       ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.env.local  ./.env.local

# Fix permissions for Next.js cache, vault writes, and persistent study-tools data
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/.next /app/vault /app/data

USER nextjs

EXPOSE 3001

CMD ["node_modules/.bin/next", "start", "-p", "3001"]
