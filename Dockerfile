# ─── Base Node.js Image ───────────────────────────────────────
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.20.0 --activate

# ─── Dependencies Stage ───────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy package manifests
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build & types)
RUN pnpm install --frozen-lockfile

# ─── Builder Stage ────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client & Build Next.js with standalone output
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Placeholder environment variables for build-time safety
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/e_vote"
ENV GOOGLE_CLIENT_ID="placeholder"
ENV GOOGLE_CLIENT_SECRET="placeholder"
ENV SMTP_HOST="smtp.placeholder.com"
ENV SMTP_PORT="587"
ENV SMTP_USER="placeholder"
ENV SMTP_PASS="placeholder"
ENV SCHOOL_NAME="SMK Telkom Malang"
ENV VOTING_LOCATION="Gedung Serbaguna SMK Telkom Malang"
ENV FROM_NAME="Panitia E-Pilketos"

RUN pnpm prisma generate
RUN pnpm build

# ─── Production Runner Stage ──────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.20.0 --activate

# Security: Create non-root system user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public static assets and standalone bundle
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Expose default HTTP port (Railway dynamically injects PORT)
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

USER nextjs

CMD ["node", "server.js"]
