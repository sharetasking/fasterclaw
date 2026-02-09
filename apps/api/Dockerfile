# Dockerfile for FasterClaw API
FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Set working directory
WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/db ./packages/db
COPY apps/api ./apps/api

# Generate Prisma client
RUN pnpm --filter @fasterclaw/db db:generate

# Build API
RUN pnpm --filter @fasterclaw/api build

# Production stage
FROM node:22-alpine AS production

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy built assets
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/db ./packages/db
COPY --from=base /app/apps/api ./apps/api
COPY --from=base /app/package.json ./
COPY --from=base /app/pnpm-workspace.yaml ./

# Set environment
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

EXPOSE 3001

# Start the server
CMD ["pnpm", "--filter", "@fasterclaw/api", "start"]
