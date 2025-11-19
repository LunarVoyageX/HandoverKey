/**
 * Prometheus metrics middleware
 *
 * Collects HTTP request metrics for monitoring
 */

import { Request, Response, NextFunction } from "express";
import {
  httpRequestDuration,
  httpRequestTotal,
  httpRequestErrors,
} from "../config/metrics";

/**
 * Metrics middleware
 *
 * Records HTTP request duration, count, and errors
 */
export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();

  // Record metrics when response finishes
  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const route = getRoute(req);
    const method = req.method;
    const statusCode = res.statusCode.toString();

    // Record request duration
    httpRequestDuration.observe(
      { method, route, status_code: statusCode },
      duration,
    );

    // Record request count
    httpRequestTotal.inc({ method, route, status_code: statusCode });

    // Record errors (4xx and 5xx)
    if (res.statusCode >= 400) {
      const errorType = res.statusCode >= 500 ? "server_error" : "client_error";
      httpRequestErrors.inc({
        method,
        route,
        status_code: statusCode,
        error_type: errorType,
      });
    }
  });

  next();
}

/**
 * Extract route pattern from request
 *
 * Converts /api/v1/vault/123 to /api/v1/vault/:id
 * to avoid high cardinality in metrics
 */
function getRoute(req: Request): string {
  // Use route if available (from Express router)
  if (req.route && req.route.path) {
    const baseUrl = req.baseUrl || "";
    return baseUrl + req.route.path;
  }

  // Fallback to path with UUID replacement
  let path = req.path;

  // Replace UUIDs with :id
  path = path.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ":id",
  );

  // Replace numeric IDs with :id
  path = path.replace(/\/\d+/g, "/:id");

  return path;
}
