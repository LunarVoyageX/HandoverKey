FROM node:20-alpine AS base

FROM base AS pruner
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=@handoverkey/api --docker

FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# First install dependencies (as they change less often)
COPY --from=pruner /app/out/json/ .
# Remove lockfile to force fresh install of Linux binaries (e.g. bcrypt)
RUN rm -f package-lock.json && npm install

# Build the project
COPY --from=pruner /app/out/full/ .
RUN npx turbo run build --filter=@handoverkey/api...

FROM base AS runner
WORKDIR /app

# Don't run as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs
USER expressjs

# Copy node_modules (required for API runtime)
COPY --from=builder /app/node_modules ./node_modules
# Copy built artifacts for the API
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
# Copy built artifacts for internal packages that the API depends on
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/crypto/dist ./packages/crypto/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/database/package.json ./packages/database/package.json
COPY --from=builder /app/packages/crypto/package.json ./packages/crypto/package.json

# Set env
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# Start the application using path from package.json structure
CMD ["node", "apps/api/dist/apps/api/src/index.js"]