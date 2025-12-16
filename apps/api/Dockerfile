FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Install global dependencies
RUN npm install -g turbo

# Copy root configuration
COPY package.json package-lock.json turbo.json ./

# Copy all packages and apps (simpler for monorepo than selective copy)
COPY . .

# Install dependencies based on lockfile
RUN npm ci

# Build the API
RUN turbo run build --filter=@handoverkey/api...

# --- Runtime Stage ---
FROM node:22-alpine AS runner

WORKDIR /app

# Copy built application and node_modules from builder
# Ideally we would prune dev dependencies, but for simplicity/speed we copy.
# A more advanced setup would reinstall prod deps only.
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/packages ./packages

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "apps/api/dist/apps/api/src/index.js"]