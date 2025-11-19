/**
 * Prometheus metrics configuration
 *
 * Provides application metrics for monitoring and alerting.
 * Metrics are exposed at /metrics endpoint in Prometheus format.
 */

import {
  Registry,
  Histogram,
  Gauge,
  Counter,
  collectDefaultMetrics,
} from "prom-client";

/**
 * Create a new Prometheus registry
 */
export const register = new Registry();

/**
 * Collect default metrics (CPU, memory, event loop, etc.)
 */
collectDefaultMetrics({
  register,
  prefix: "handoverkey_",
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

/**
 * HTTP request duration histogram
 * Tracks response time for all HTTP requests
 */
export const httpRequestDuration = new Histogram({
  name: "handoverkey_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 1, 2, 5],
  registers: [register],
});

/**
 * HTTP request counter
 * Tracks total number of HTTP requests
 */
export const httpRequestTotal = new Counter({
  name: "handoverkey_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

/**
 * HTTP request errors counter
 * Tracks total number of HTTP errors (4xx and 5xx)
 */
export const httpRequestErrors = new Counter({
  name: "handoverkey_http_request_errors_total",
  help: "Total number of HTTP request errors",
  labelNames: ["method", "route", "status_code", "error_type"],
  registers: [register],
});

/**
 * Active users gauge
 * Tracks number of currently active users
 */
export const activeUsers = new Gauge({
  name: "handoverkey_active_users",
  help: "Number of active users (logged in within last 24 hours)",
  registers: [register],
});

/**
 * Total users gauge
 * Tracks total number of registered users
 */
export const totalUsers = new Gauge({
  name: "handoverkey_total_users",
  help: "Total number of registered users",
  registers: [register],
});

/**
 * Vault entries gauge
 * Tracks total number of vault entries
 */
export const vaultEntries = new Gauge({
  name: "handoverkey_vault_entries_total",
  help: "Total number of vault entries",
  registers: [register],
});

/**
 * Vault operations counter
 * Tracks vault CRUD operations
 */
export const vaultOperations = new Counter({
  name: "handoverkey_vault_operations_total",
  help: "Total number of vault operations",
  labelNames: ["operation"], // create, read, update, delete
  registers: [register],
});

/**
 * Authentication attempts counter
 * Tracks login attempts (successful and failed)
 */
export const authAttempts = new Counter({
  name: "handoverkey_auth_attempts_total",
  help: "Total number of authentication attempts",
  labelNames: ["result"], // success, failure
  registers: [register],
});

/**
 * Database connection pool gauge
 * Tracks database connection pool usage
 */
export const dbConnectionPool = new Gauge({
  name: "handoverkey_db_connection_pool",
  help: "Database connection pool metrics",
  labelNames: ["state"], // idle, active, waiting
  registers: [register],
});

/**
 * Database query duration histogram
 * Tracks database query execution time
 */
export const dbQueryDuration = new Histogram({
  name: "handoverkey_db_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: ["operation", "table"],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

/**
 * Inactivity checks counter
 * Tracks inactivity check job executions
 */
export const inactivityChecks = new Counter({
  name: "handoverkey_inactivity_checks_total",
  help: "Total number of inactivity checks performed",
  labelNames: ["result"], // success, failure
  registers: [register],
});

/**
 * Handover events counter
 * Tracks handover events (triggered, completed, failed)
 */
export const handoverEvents = new Counter({
  name: "handoverkey_handover_events_total",
  help: "Total number of handover events",
  labelNames: ["event_type"], // triggered, completed, failed
  registers: [register],
});

/**
 * Get all metrics in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Get metrics content type
 */
export function getMetricsContentType(): string {
  return register.contentType;
}
