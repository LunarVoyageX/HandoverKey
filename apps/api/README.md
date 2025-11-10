# HandoverKey API

Production-ready REST API for HandoverKey digital legacy platform.

## Overview

The HandoverKey API is built with Express.js and TypeScript, featuring comprehensive observability, type-safe database operations, and reliable background job processing.

## Features

- **RESTful API**: Clean, predictable REST endpoints
- **Type-Safe**: Full TypeScript with Zod runtime validation
- **Observability**: Structured logging (Pino) and metrics (Prometheus)
- **Background Jobs**: BullMQ-powered job queue with Redis
- **Security**: Rate limiting, input validation, CSRF protection
- **Database**: Type-safe queries with Kysely and PostgreSQL
- **Error Handling**: Consistent error responses with request tracing
- **Health Checks**: `/health` and `/metrics` endpoints

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Run database migrations
npm run migrate

# Start development server
npm run dev

# Run tests
npm test
```

## Architecture

```
src/
├── config/           # Configuration (logger, metrics, queue)
├── controllers/      # Request handlers
├── middleware/       # Express middleware
├── routes/           # API routes
├── services/         # Business logic
├── jobs/             # Background jobs
├── validation/       # Zod schemas
├── errors/           # Custom error classes
└── database/         # Database migrations
```

## API Endpoints

### Authentication

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/logout` - Logout user
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/profile` - Get user profile

### Vault

- `GET /api/v1/vault/entries` - List vault entries
- `POST /api/v1/vault/entries` - Create vault entry
- `GET /api/v1/vault/entries/:id` - Get vault entry
- `PUT /api/v1/vault/entries/:id` - Update vault entry
- `DELETE /api/v1/vault/entries/:id` - Delete vault entry

### Activity

- `POST /api/v1/activity/check-in` - Manual check-in

### Inactivity

- `GET /api/v1/inactivity/settings` - Get inactivity settings
- `PUT /api/v1/inactivity/settings` - Update inactivity settings
- `POST /api/v1/inactivity/pause` - Pause dead man's switch
- `POST /api/v1/inactivity/resume` - Resume dead man's switch

### System

- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

## Configuration

### Environment Variables

```bash
# Server
NODE_ENV=development
API_PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=handoverkey_dev
DB_USER=postgres
DB_PASSWORD=postgres
DB_POOL_MIN=2
DB_POOL_MAX=10

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Security
JWT_SECRET=your-secret-key
JWT_EXPIRY=1h
ENCRYPTION_ITERATIONS=100000

# Observability
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Jobs
JOB_CONCURRENCY=5
```

## Observability

### Structured Logging

The API uses Pino for structured JSON logging:

```typescript
import { logger } from './config/logger';

// Basic logging
logger.info('User logged in');
logger.error({ err: error }, 'Failed to process request');

// With context
logger.info({ userId, action: 'login' }, 'User action');
```

**Log Levels:**
- `fatal` - Application cannot continue
- `error` - Error that needs attention
- `warn` - Warning that should be investigated
- `info` - Normal operational messages
- `debug` - Detailed debugging information
- `trace` - Very detailed debugging information

**Features:**
- Request ID correlation
- Automatic PII redaction
- Pretty-printed in development
- JSON in production

### Metrics

Prometheus metrics are exposed at `/metrics`:

**HTTP Metrics:**
- `handoverkey_http_request_duration_seconds` - Request duration
- `handoverkey_http_requests_total` - Total requests
- `handoverkey_http_request_errors_total` - Error count

**Business Metrics:**
- `handoverkey_active_users` - Active users
- `handoverkey_total_users` - Total users
- `handoverkey_vault_entries_total` - Vault entries
- `handoverkey_vault_operations_total` - Vault operations
- `handoverkey_auth_attempts_total` - Auth attempts

**Infrastructure Metrics:**
- `handoverkey_db_connection_pool` - DB pool usage
- `handoverkey_db_query_duration_seconds` - Query duration
- `handoverkey_inactivity_checks_total` - Inactivity checks

### Health Checks

Health check endpoint at `/health`:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "checks": {
    "database": "ok",
    "jobQueue": "ok"
  }
}
```

## Background Jobs

The API uses BullMQ for reliable background job processing:

### Job Types

- **Inactivity Check**: Runs hourly to check for inactive users
- **Send Reminder**: Sends reminder notifications
- **Execute Handover**: Executes vault handover
- **Cleanup Sessions**: Daily cleanup of expired sessions

### Job Configuration

```typescript
import { JobScheduler } from './jobs';

// Schedule recurring job
await JobScheduler.scheduleInactivityCheck();

// Schedule one-time job
await JobScheduler.scheduleReminder({
  userId: 'user-id',
  level: 'warning',
  daysRemaining: 7,
  thresholdDays: 90,
});
```

### Job Monitoring

Jobs can be monitored via:
- Prometheus metrics
- Structured logs
- Job status API (planned)

## Validation

All API inputs are validated using Zod schemas:

```typescript
import { z } from 'zod';

const CreateVaultEntrySchema = z.object({
  encryptedData: z.string().min(1).max(10485760),
  iv: z.string().regex(/^[A-Za-z0-9+/]+=*$/),
  salt: z.string().regex(/^[A-Za-z0-9+/]+=*$/),
  algorithm: z.literal('AES-256-GCM'),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});
```

**Features:**
- Runtime type validation
- Automatic input sanitization
- Consistent error responses
- Type inference for TypeScript

## Error Handling

Custom error classes for consistent error handling:

```typescript
import {
  ValidationError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
} from './errors';

// Throw custom errors
throw new ValidationError('Invalid input');
throw new AuthenticationError('Invalid credentials');
throw new NotFoundError('User');
throw new RateLimitError(60); // Retry after 60 seconds
```

**Error Response Format:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "requestId": "abc-123"
  }
}
```

## Security

### Rate Limiting

- **Global**: 100 requests per 15 minutes per IP
- **Auth**: 5 requests per 15 minutes per IP
- **Per-User**: Configurable per endpoint

### Input Validation

- Zod schema validation
- Input sanitization (XSS prevention)
- File upload validation
- SQL injection prevention (parameterized queries)

### Security Headers

- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection

### Authentication

- JWT tokens with 1-hour expiry
- Refresh tokens for extended sessions
- Bcrypt password hashing (cost factor 12)
- 2FA support (planned)

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- path/to/test.ts

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

**Test Coverage:**
- Unit tests for services and utilities
- Integration tests for API endpoints
- Validation tests for Zod schemas
- Error handling tests

**Current Coverage:** 227 tests passing

## Development

### Running Locally

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Run migrations
npm run migrate

# Start dev server (with hot reload)
npm run dev
```

### Database Migrations

```bash
# Run migrations
npm run migrate

# Create new migration
# Add file to src/database/migrations/
```

### Code Quality

```bash
# Lint code
npm run lint

# Type check
npm run type-check

# Format code
npm run format
```

## Deployment

### Production Build

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

### Docker

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

### Environment

Ensure all environment variables are set:
- Database credentials
- Redis connection
- JWT secret
- Log level (info or warn)

### Monitoring

Set up monitoring for:
- `/health` endpoint (every 30s)
- `/metrics` endpoint (Prometheus scraping)
- Error logs (centralized logging)
- Job queue metrics

## Performance

- **Connection Pooling**: 2-10 database connections
- **Redis Caching**: Session and rate limit data
- **Job Queue**: Async processing for heavy operations
- **Response Time**: < 500ms for 95% of requests

## Troubleshooting

### Database Connection Issues

```bash
# Check database is running
docker ps

# Test connection
psql -h localhost -U postgres -d handoverkey_dev

# Check logs
npm run dev | grep -i database
```

### Redis Connection Issues

```bash
# Check Redis is running
docker ps

# Test connection
redis-cli ping

# Check logs
npm run dev | grep -i redis
```

### Job Queue Issues

```bash
# Check job queue health
curl http://localhost:3001/health

# View job metrics
curl http://localhost:3001/metrics | grep job
```

## Contributing

See the main [Contributing Guidelines](../../CONTRIBUTING.md).

## License

MIT
