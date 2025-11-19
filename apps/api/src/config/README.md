# Observability Configuration

This directory contains configuration for the observability stack: logging and metrics.

## Components

### Logging (Pino)

**File**: `logger.ts`

Structured JSON logging using Pino, an open-source, high-performance logging library.

**Features**:

- Structured JSON logs in production
- Pretty-printed logs in development
- Request/response serializers
- Error serializers with stack traces
- Automatic PII redaction (passwords, tokens, etc.)
- Request ID correlation
- Log levels: fatal, error, warn, info, debug, trace

**Configuration**:

```typescript
// Set log level via environment variable
LOG_LEVEL = debug; // Options: fatal, error, warn, info, debug, trace
```

**Usage**:

```typescript
import { logger } from "../config/logger";

// Basic logging
logger.info("User logged in");
logger.error({ err: error }, "Failed to process request");

// With context
logger.info({ userId, action: "login" }, "User action");

// Create child logger with persistent context
const userLogger = logger.child({ userId: "123" });
userLogger.info("User action"); // Automatically includes userId
```

### Metrics (Prometheus)

**File**: `metrics.ts`

Application metrics using prom-client, the official Prometheus client for Node.js.

**Metrics Exposed**:

1. **HTTP Metrics**:
   - `handoverkey_http_request_duration_seconds` - Request duration histogram
   - `handoverkey_http_requests_total` - Total request counter
   - `handoverkey_http_request_errors_total` - Error counter

2. **Business Metrics**:
   - `handoverkey_active_users` - Active users gauge
   - `handoverkey_total_users` - Total users gauge
   - `handoverkey_vault_entries_total` - Vault entries gauge
   - `handoverkey_vault_operations_total` - Vault operations counter
   - `handoverkey_auth_attempts_total` - Authentication attempts counter
   - `handoverkey_handover_events_total` - Handover events counter

3. **Infrastructure Metrics**:
   - `handoverkey_db_connection_pool` - Database connection pool gauge
   - `handoverkey_db_query_duration_seconds` - Database query duration histogram
   - `handoverkey_inactivity_checks_total` - Inactivity check counter

4. **Default Metrics** (automatically collected):
   - Process CPU usage
   - Process memory usage
   - Event loop lag
   - Garbage collection metrics
   - Node.js version info

**Metrics Endpoint**:

```
GET /metrics
```

Returns metrics in Prometheus format.

**Usage**:

```typescript
import { vaultOperations, dbQueryDuration } from "../config/metrics";

// Increment counter
vaultOperations.inc({ operation: "create" });

// Observe histogram
const end = dbQueryDuration.startTimer({ operation: "select", table: "users" });
// ... perform query ...
end(); // Records duration

// Set gauge
activeUsers.set(150);
```

## Middleware

### Request ID Middleware

**File**: `../middleware/request-id.ts`

Generates or extracts a unique request ID for each request. The ID is:

- Added to the request object as `req.id`
- Included in response headers as `X-Request-ID`
- Used for correlating logs and metrics

### Logging Middleware

**File**: `../middleware/logging.ts`

Automatically logs all HTTP requests and responses with:

- Request method, URL, headers
- Response status code, headers
- Request duration
- Request ID for correlation

Also provides helper functions:

- `logSecurityEvent()` - Log security-related events
- `logBusinessEvent()` - Log business-related events

### Metrics Middleware

**File**: `../middleware/metrics.ts`

Automatically collects HTTP metrics for all requests:

- Request duration
- Request count by method, route, and status code
- Error count by type

## Integration

The observability stack is integrated in `app.ts`:

```typescript
// 1. Request ID (must be first)
app.use(requestIdMiddleware);

// 2. Logging (must be early)
app.use(loggingMiddleware);

// 3. Metrics (must be early)
app.use(metricsMiddleware);

// ... other middleware ...
```

## Monitoring Setup

### Viewing Logs

**Development**:
Logs are pretty-printed to stdout with colors.

**Production**:
Logs are output as JSON to stdout. Collect them using:

- Docker logs
- Kubernetes logs
- Log aggregation tools (ELK stack, Loki, etc.)

### Viewing Metrics

**Local Development**:

```bash
curl http://localhost:3001/metrics
```

**Production**:
Set up Prometheus to scrape the `/metrics` endpoint:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: "handoverkey-api"
    static_configs:
      - targets: ["api:3001"]
    metrics_path: "/metrics"
    scrape_interval: 15s
```

### Visualization

Use Grafana to visualize Prometheus metrics:

1. Add Prometheus as a data source
2. Import or create dashboards
3. Set up alerts based on metrics

**Recommended Dashboards**:

- HTTP request rate and latency
- Error rate by endpoint
- Active users over time
- Database connection pool usage
- Memory and CPU usage

## Best Practices

### Logging

1. **Use appropriate log levels**:
   - `fatal` - Application cannot continue
   - `error` - Error that needs attention
   - `warn` - Warning that should be investigated
   - `info` - Normal operational messages
   - `debug` - Detailed debugging information
   - `trace` - Very detailed debugging information

2. **Include context**:

   ```typescript
   logger.info({ userId, action, resource }, "User performed action");
   ```

3. **Log errors with stack traces**:

   ```typescript
   logger.error({ err: error }, "Operation failed");
   ```

4. **Don't log sensitive data**:
   - Passwords, tokens, and secrets are automatically redacted
   - Be careful with user data (PII)

### Metrics

1. **Keep cardinality low**:
   - Don't use user IDs or request IDs as labels
   - Use route patterns instead of full paths
   - Limit the number of unique label values

2. **Use appropriate metric types**:
   - **Counter** - Monotonically increasing values (requests, errors)
   - **Gauge** - Values that can go up or down (active users, queue length)
   - **Histogram** - Distribution of values (request duration, response size)

3. **Name metrics consistently**:
   - Use `handoverkey_` prefix
   - Use snake_case
   - Include unit in name (e.g., `_seconds`, `_bytes`, `_total`)

## Troubleshooting

### High Memory Usage

Check if log level is set too low (trace/debug) in production.

### Missing Metrics

Ensure the metrics middleware is registered before route handlers.

### Request ID Not Appearing

Ensure request ID middleware is registered first, before any other middleware.

## Open Source Stack

All components are 100% open source:

- **Pino** - MIT License
- **prom-client** - Apache 2.0 License
- **Prometheus** - Apache 2.0 License
- **Grafana** - AGPL License (for visualization)

No proprietary services or paid tiers required!
