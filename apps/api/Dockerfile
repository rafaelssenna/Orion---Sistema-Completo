FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @orion/api...

# Copy source
COPY apps/api/ apps/api/
COPY packages/shared/ packages/shared/

# Generate Prisma
RUN cd apps/api && npx prisma generate

# Build
RUN cd apps/api && npx tsc || true

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["npx", "tsx", "src/index.ts"]
