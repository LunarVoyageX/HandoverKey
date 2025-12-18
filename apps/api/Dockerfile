# STAGE 1: Build the application
FROM node:20-alpine AS builder

# esbuild on Alpine needs libc6-compat
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package.json ./

# Create packages directory and copy internal dependencies
# This is necessary because the Docker build context is now the apps/api folder
COPY packages ./packages

# Install dependencies including devDependencies for the build step
ENV NODE_ENV=development
RUN npm install

# Copy source code
COPY . .

# Build the production bundle (this runs esbuild and copies schemas as defined in package.json)
RUN npm run build:prod

# STAGE 2: Run the application
FROM node:20-alpine AS runner
WORKDIR /app

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

# Copy only the necessary files from the builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Don't run as root
USER expressjs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# Start the application using a script that runs migrations first
CMD ["npm", "run", "start:prod"]