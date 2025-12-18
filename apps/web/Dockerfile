FROM node:20-alpine AS base

FROM base AS pruner
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=@handoverkey/web --docker

FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# First install dependencies (as they change less often)
COPY --from=pruner /app/out/json/ .
RUN rm -f package-lock.json && npm install

# Build the project
COPY --from=pruner /app/out/full/ .

# Pass build args
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npx turbo run build --filter=@handoverkey/web...

FROM base AS runner
WORKDIR /app

# Install serve to run the application
RUN npm install -g serve

COPY --from=builder /app/apps/web/dist ./dist

ENV PORT=3000
EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
