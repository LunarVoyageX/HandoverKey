/**
 * HTTP request/response logging middleware
 *
 * Logs all HTTP requests and responses with timing information,
 * status codes, and other relevant metadata.
 */

import { Request, Response, NextFunction } from "express";
import pinoHttp from "pino-http";
import { logger } from "../config/logger";

/**
 * Create pino-http middleware instance
 */
const httpLogger = pinoHttp({
  logger,

  // Use request ID from our middleware
  genReqId: (req) => req.id,

  // Custom request logging
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) {
      return "error";
    }
    if (res.statusCode >= 400) {
      return "warn";
    }
    if (res.statusCode >= 300) {
      return "info";
    }
    return "info";
  },

  // Custom success message
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },

  // Custom error message
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
  },

  // Custom attribute keys
  customAttributeKeys: {
    req: "request",
    res: "response",
    err: "error",
    responseTime: "duration",
  },

  // Serialize request
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      params: req.params,
      headers: {
        host: req.headers.host,
        "user-agent": req.headers["user-agent"],
        "content-type": req.headers["content-type"],
      },
      remoteAddress: req.ip,
    }),

    res: (res) => ({
      statusCode: res.statusCode,
      headers: {
        "content-type":
          typeof res.getHeader === "function"
            ? res.getHeader("content-type")
            : undefined,
        "content-length":
          typeof res.getHeader === "function"
            ? res.getHeader("content-length")
            : undefined,
      },
    }),
  },

  // Don't log health check endpoints to reduce noise
  autoLogging: {
    ignore: (req) => {
      return req.url === "/health" || req.url === "/metrics";
    },
  },
});

/**
 * Logging middleware wrapper
 *
 * Wraps pino-http middleware and adds additional context
 */
export const loggingMiddleware = httpLogger as unknown as (
  req: Request,
  res: Response,
  next: NextFunction,
) => void;

/**
 * Log security events
 *
 * Helper function to log security-relevant events with consistent format
 */
export function logSecurityEvent(
  req: Request,
  event: string,
  details: Record<string, unknown>,
): void {
  logger.warn(
    {
      event: "security",
      type: event,
      requestId: req.id,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      ...details,
    },
    `Security event: ${event}`,
  );
}

/**
 * Log business events
 *
 * Helper function to log business-relevant events with consistent format
 */
export function logBusinessEvent(
  event: string,
  details: Record<string, unknown>,
): void {
  logger.info(
    {
      event: "business",
      type: event,
      ...details,
    },
    `Business event: ${event}`,
  );
}
