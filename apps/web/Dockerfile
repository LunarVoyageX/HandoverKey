FROM node:22-alpine AS builder

WORKDIR /app

# Install global dependencies
RUN npm install -g turbo

# Copy root configuration
COPY package.json package-lock.json turbo.json ./

# Copy source
COPY . .

# Install dependencies
RUN npm ci

# Build the Web app
# Important: Env vars must be passed at build time for Vite if they are embedded
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN turbo run build --filter=@handoverkey/web...

# --- Runtime Stage ---
FROM node:22-alpine AS runner

WORKDIR /app

# Install simple static server
RUN npm install -g serve

# Copy built assets
COPY --from=builder /app/apps/web/dist ./dist

# Expose port
EXPOSE 3000

# Start serve
CMD ["serve", "-s", "dist", "-l", "3000"]
