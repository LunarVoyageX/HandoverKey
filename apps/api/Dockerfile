# STAGE 1: Build the application
FROM node:20-alpine AS builder

# esbuild on Alpine needs libc6-compat
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy root configuration
COPY package.json package-lock.json* turbo.json tsconfig.json ./

# Copy workspace package.json files
COPY apps/api/package.json ./apps/api/
COPY packages/crypto/package.json ./packages/crypto/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/

# Install dependencies
RUN npm install

# Copy source code
COPY apps/api ./apps/api
COPY packages/crypto ./packages/crypto
COPY packages/shared ./packages/shared
COPY packages/database ./packages/database

# Build the production bundle
WORKDIR /app/apps/api
RUN npm run build:prod

# STAGE 2: Run the application
FROM node:20-alpine AS runner
WORKDIR /app

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

# Copy only the necessary files from the builder
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./package.json

# Don't run as root
USER expressjs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# Start the application using a script that runs migrations first
CMD ["npm", "run", "start:prod"]