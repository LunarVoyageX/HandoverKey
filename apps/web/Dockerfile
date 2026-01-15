# STAGE 1: Build the application
FROM node:20-alpine AS builder

# esbuild on Alpine needs libc6-compat
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy root configuration
COPY package.json package-lock.json* turbo.json tsconfig.json ./

# Copy workspace package.json files
COPY apps/web/package.json ./apps/web/
COPY packages/crypto/package.json ./packages/crypto/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN npm install

# Copy source code
COPY apps/web ./apps/web
COPY packages/crypto ./packages/crypto
COPY packages/shared ./packages/shared

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
ENV CI=true

# Build the web application
WORKDIR /app/apps/web
RUN npm run build

# STAGE 2: Run the application
FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/apps/web/dist ./dist
ENV PORT=3000
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
