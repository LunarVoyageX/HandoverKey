/**
 * Pino logger configuration
 *
 * Provides structured JSON logging with proper serializers
 * for requests, responses, and errors.
 */

import pino from "pino";

/**
 * Log level from environment or default to 'info'
 */
const logLevel = process.env.LOG_LEVEL || "info";

/**
 * Determine if we're in development mode
 */

const isDev = process.env.NODE_ENV === "development";

/**
 * Create Pino logger instance with custom configuration
 */
export const logger = pino({
  level: logLevel,
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  }),
  // Custom formatters
  formatters: {
    level: (label) => {
      return { level: label };
    },
    bindings: (bindings) => {
      return {
        pid: bindings.pid,
        hostname: bindings.hostname,
        node_version: process.version,
      };
    },
  },

  // Custom serializers for common objects
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      path: req.path,
      parameters: req.params,
      query: req.query,
      headers: {
        host: req.headers.host,
        "user-agent": req.headers["user-agent"],
        "content-type": req.headers["content-type"],
        "content-length": req.headers["content-length"],
      },
      remoteAddress: req.ip || req.connection?.remoteAddress,
      remotePort: req.connection?.remotePort,
    }),

    res: (res) => ({
      statusCode: res.statusCode,
      headers: {
        "content-type": res.getHeader("content-type"),
        "content-length": res.getHeader("content-length"),
      },
    }),

    err: pino.stdSerializers.err,

    error: pino.stdSerializers.err,
  },

  // Base fields to include in every log
  base: {
    env: process.env.NODE_ENV || "development",
    app: "handoverkey-api",
  },

  // Redact sensitive fields
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.confirmPassword",
      "req.body.currentPassword",
      "req.body.newPassword",
      "req.body.token",
      "req.body.refreshToken",
      "req.body.twoFactorCode",
      "*.password",
      "*.token",
      "*.secret",
    ],
    censor: "[REDACTED]",
  },

  // Timestamp format
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
});

/**
 * Create child logger with additional context
 *
 * @param context - Additional context to include in all logs
 * @returns Child logger instance
 */
export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

/**
 * Log levels for reference
 */
export const LOG_LEVELS = {
  FATAL: "fatal",
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
  TRACE: "trace",
} as const;

export type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];
