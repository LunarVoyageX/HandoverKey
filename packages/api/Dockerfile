# Simple API Dockerfile
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/api/package*.json ./packages/api/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY packages/api/dist ./packages/api/dist
COPY packages/shared/dist ./packages/shared/dist

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "packages/api/dist/index.js"]