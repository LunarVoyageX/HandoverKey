# STAGE 1: Build the application
FROM node:20-alpine AS builder

# esbuild on Alpine needs libc6-compat
RUN apk add --no-cache libc6-compat

WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
ENV CI=true

RUN npm run build

# STAGE 2: Run the application
FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
ENV PORT=3000
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
