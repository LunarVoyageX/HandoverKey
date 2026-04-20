import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { RedisStore, type SendCommandFn } from "rate-limit-redis";
import { logger } from "../config/logger";

let cachedSendCommand: SendCommandFn | null = null;

async function getSendCommand(): Promise<SendCommandFn> {
  if (!cachedSendCommand) {
    const { getRedisClient } = await import("../config/redis");
    const client = getRedisClient();
    cachedSendCommand = ((...args: string[]) =>
      client.sendCommand(args)) as SendCommandFn;
  }
  return cachedSendCommand;
}

const useRedisStore =
  process.env.NODE_ENV === "production" ||
  process.env.RATE_LIMIT_STORE === "redis";

/**
 * Creates a rate limiter. In production, uses a Redis-backed store so
 * rate-limit state survives deploys. Falls back to in-memory otherwise.
 */
export function createRateLimiter(
  windowMs: number,
  max: number,
  message: string,
  redisPrefix?: string,
) {
  const opts: Parameters<typeof rateLimit>[0] = {
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  };

  if (redisPrefix && useRedisStore) {
    opts.store = new RedisStore({
      sendCommand: async (...args: string[]) => {
        const fn = await getSendCommand();
        return fn(...args);
      },
      prefix: redisPrefix,
    });
  }

  return rateLimit(opts);
}

export const rateLimiter = createRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"),
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  "Too many requests from this IP, please try again later.",
  "rl:global:",
) as unknown as (req: Request, res: Response, next: NextFunction) => void;

export const authRateLimiter = createRateLimiter(
  15 * 60 * 1000,
  process.env.NODE_ENV === "production" ? 5 : 1000,
  "Too many authentication attempts, please try again later.",
  "rl:auth:",
);

export const registerRateLimiter = createRateLimiter(
  60 * 60 * 1000,
  process.env.NODE_ENV === "production" ? 20 : 1000,
  "Too many accounts created from this IP, please try again later.",
  "rl:register:",
);

export const contactRateLimiter = createRateLimiter(
  60 * 60 * 1000,
  process.env.NODE_ENV === "development" ? 1000 : 3,
  "Too many contact form submissions, please try again later.",
  "rl:contact:",
);

export const validateContentType = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
    const contentType = req.headers["content-type"];
    if (!contentType || !contentType.includes("application/json")) {
      res.status(400).json({ error: "Content-Type must be application/json" });
      return;
    }
  }
  next();
};

// Enhanced input sanitization function
const sanitizeString = (input: unknown, maxLength: number = 10000): string => {
  // Handle null, undefined, and non-string inputs first
  if (input === null || input === undefined || typeof input !== "string") {
    return "";
  }

  // Convert to string and trim
  let result = String(input).trim();

  // Return empty if only whitespace
  if (result === "") {
    return "";
  }

  // Limit length to prevent DoS attacks
  if (result.length > maxLength) {
    result = result.substring(0, maxLength);
  }

  // Decode HTML entities first
  result = result
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");

  // Remove HTML tags iteratively to handle nested tags
  let previousLength;
  do {
    previousLength = result.length;
    result = result.replace(/<[^>]*>/g, "");
  } while (result.length !== previousLength && result.length > 0);

  // Remove remaining angle brackets
  result = result.replace(/[<>]/g, "");

  // Remove dangerous protocols iteratively
  const dangerousProtocols = ["javascript:", "vbscript:", "data:"];
  let protocolsFound = true;
  while (protocolsFound) {
    protocolsFound = false;
    for (const protocol of dangerousProtocols) {
      const beforeLength = result.length;
      result = result.replace(new RegExp(protocol, "gi"), "");
      if (result.length !== beforeLength) {
        protocolsFound = true;
      }
    }
  }

  // Remove event handlers iteratively
  const eventHandlers = [
    "onclick",
    "onload",
    "onerror",
    "onmouseover",
    "onmouseout",
    "onfocus",
    "onblur",
  ];
  let handlersFound = true;
  while (handlersFound) {
    handlersFound = false;
    for (const handler of eventHandlers) {
      const beforeLength = result.length;
      result = result.replace(new RegExp(handler + "\\s*=", "gi"), "");
      if (result.length !== beforeLength) {
        handlersFound = true;
      }
    }
  }

  // Remove control characters and null bytes
  // eslint-disable-next-line no-control-regex
  result = result.replace(/[\x00-\x1F\x7F]/g, "");

  return result;
};

const sanitizeObject = (
  obj: unknown,
  depth: number = 0,
  keyName: string = "",
): unknown => {
  // Prevent deep recursion attacks
  if (depth > 10) {
    return {};
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    // Allow larger limits for encrypted data fields
    const isEncryptedField =
      keyName === "encryptedData" || keyName === "iv" || keyName === "salt";
    const limit = isEncryptedField ? 10 * 1024 * 1024 : 10000; // 10MB for encrypted data (e.g. large PDFs)
    return sanitizeString(obj, limit);
  }

  if (typeof obj === "number" || typeof obj === "boolean") {
    return obj;
  }

  if (Array.isArray(obj)) {
    // Limit array size to prevent DoS
    return obj.slice(0, 1000).map((item) => sanitizeObject(item, depth + 1));
  }

  if (typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};
    const keys = Object.keys(obj as object);

    // Limit number of keys to prevent DoS
    const limitedKeys = keys.slice(0, 100);

    for (const key of limitedKeys) {
      // Sanitize key names to prevent prototype pollution
      const sanitizedKey = sanitizeString(key);

      // Prevent prototype pollution
      if (
        key === "__proto__" ||
        key === "constructor" ||
        key === "prototype" ||
        sanitizedKey === "__proto__" ||
        sanitizedKey === "constructor" ||
        sanitizedKey === "prototype"
      ) {
        continue;
      }

      sanitized[sanitizedKey] = sanitizeObject(
        (obj as Record<string, unknown>)[key],
        depth + 1,
        key,
      );
    }

    return sanitized;
  }

  return obj;
};

export const sanitizeInput = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    // Check for suspicious patterns BEFORE sanitization
    // Use a safe stringify to avoid circular reference issues
    const safeStringify = (obj: unknown): string => {
      try {
        return JSON.stringify(obj, (key, value) => {
          if (typeof value === "object" && value !== null) {
            // Avoid circular references by limiting depth
            if (
              key === "self" ||
              key === "parent" ||
              key === "window" ||
              key === "global"
            ) {
              return "[Circular]";
            }
          }
          return value;
        });
      } catch {
        return String(obj);
      }
    };

    const originalRequestString = safeStringify({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Check for common attack patterns using safe string methods
    const suspiciousPatterns: (string | RegExp)[] = [
      "javascript:",
      "vbscript:",
      // "__proto__", // Removed as it triggers false positives in stringified JSON
      // "constructor", // Removed as it triggers false positives in stringified JSON
      "eval(",
      "function(",
      // Match <script followed by whitespace or > to avoid false positives
      /<script(\s|>)/i,
    ];

    // Check patterns in stringified content
    let foundPattern = null;
    for (const pattern of suspiciousPatterns) {
      if (pattern instanceof RegExp) {
        if (pattern.test(originalRequestString)) {
          foundPattern = pattern.toString();
          break;
        }
      } else if (
        originalRequestString.toLowerCase().includes(pattern.toLowerCase())
      ) {
        foundPattern = pattern;
        break;
      }
    }

    // Also check for prototype pollution directly
    if (!foundPattern) {
      const checkPrototypePollution = (obj: unknown): string | null => {
        if (!obj || typeof obj !== "object") return null;

        // Check for __proto__ as a string key
        if (Object.prototype.hasOwnProperty.call(obj, "__proto__")) {
          return "__proto__";
        }

        // Check for constructor pollution
        if (
          (obj as Record<string, unknown>)["constructor"] !== undefined &&
          (obj as Record<string, unknown>)["constructor"] !==
            Object.prototype.constructor
        ) {
          return "constructor";
        }

        // Check for prototype pollution
        if ((obj as Record<string, unknown>)["prototype"] !== undefined) {
          return "prototype";
        }

        return null;
      };

      foundPattern =
        checkPrototypePollution(req.body) ||
        checkPrototypePollution(req.query) ||
        checkPrototypePollution(req.params);
    }

    if (foundPattern) {
      // Only log warnings in non-test environments
      if (process.env.NODE_ENV !== "test") {
        logger.warn(
          {
            ip: req.ip,
            userAgent: req.get("User-Agent"),
            path: req.path,
            method: req.method,
            pattern: foundPattern,
            timestamp: new Date().toISOString(),
          },
          "Suspicious input detected",
        );
      }
    }

    // Now sanitize request body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters (these are read-only so we need to modify in place)
    if (req.query && typeof req.query === "object") {
      try {
        const sanitized = sanitizeObject(req.query) as Record<string, unknown>;
        Object.keys(req.query).forEach(
          (key) => delete (req.query as Record<string, unknown>)[key],
        );
        Object.assign(req.query, sanitized);
      } catch (err) {
        // Ignore errors if query is immutable
        if (process.env.NODE_ENV !== "test") {
          logger.warn({ err }, "Failed to sanitize query parameters");
        }
      }
    }

    // Sanitize URL parameters (these are read-only so we need to modify in place)
    if (req.params && typeof req.params === "object") {
      try {
        const sanitized = sanitizeObject(req.params) as Record<string, unknown>;
        Object.keys(req.params).forEach(
          (key) => delete (req.params as Record<string, unknown>)[key],
        );
        Object.assign(req.params, sanitized);
      } catch (err) {
        // Ignore errors if params is immutable
        if (process.env.NODE_ENV !== "test") {
          logger.warn({ err }, "Failed to sanitize params");
        }
      }
    }

    next();
  } catch (error) {
    // Only log errors in non-test environments
    if (process.env.NODE_ENV !== "test") {
      logger.error({ err: error }, "Input sanitization error");
    }
    res.status(400).json({
      error: {
        message: "Invalid input format",
        code: "INVALID_INPUT",
      },
    });
  }
};
