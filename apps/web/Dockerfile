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
FROM nginx:alpine AS runner

# Copy built assets to Nginx html directory
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Default Nginx config usually serves port 80. 
# For SPA routing (React Router), we might need a custom nginx.conf later.
CMD ["nginx", "-g", "daemon off;"]
