import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { getDatabaseClient } from "@handoverkey/database";
import {
  securityHeaders,
  rateLimiter,
  corsOptions,
  validateContentType,
  sanitizeInput,
} from "./middleware/security";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { requestIdMiddleware } from "./middleware/request-id";
import { loggingMiddleware } from "./middleware/logging";
import { metricsMiddleware } from "./middleware/metrics";
import { logger } from "./config/logger";
import { getMetrics, getMetricsContentType } from "./config/metrics";
import authRoutes from "./routes/auth-routes";
import vaultRoutes from "./routes/vault-routes";
import activityRoutes from "./routes/activity-routes";
import inactivityRoutes from "./routes/inactivity-routes";
import sessionRoutes from "./routes/session-routes";
import { JobProcessor, JobScheduler } from "./jobs";
import { closeAllQueues } from "./config/queue";
import { SessionService } from "./services/session-service";

dotenv.config();

const app = express();

// Initialize database connection
const dbClient = getDatabaseClient();
dbClient.initialize({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "handoverkey_dev",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  min: 2,
  max: 10,
}).then(() => {
  // Initialize SessionService with database client
  SessionService.initialize(dbClient);
  logger.info("SessionService initialized");
}).catch((error) => {
  logger.fatal({ err: error }, "Failed to initialize database");
  process.exit(1);
});

// Initialize job processors and schedule recurring jobs (only in non-test environment)
if (process.env.NODE_ENV !== "test") {
  JobProcessor.initialize()
    .then(async () => {
      // Schedule recurring jobs
      await JobScheduler.scheduleInactivityCheck();
      await JobScheduler.scheduleSessionCleanup();
      
      logger.info("Job processors initialized and recurring jobs scheduled");
    })
    .catch((error) => {
      logger.error({ err: error }, "Failed to initialize job processors");
      // Don't exit - the app can still function without background jobs
    });
}

// Request ID middleware (must be first)
app.use(requestIdMiddleware);

// Logging middleware (must be early)
app.use(loggingMiddleware);

// Metrics middleware (must be early)
app.use(metricsMiddleware);

// Security middleware
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(rateLimiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }) as express.RequestHandler);
app.use(express.urlencoded({ extended: true, limit: "10mb" }) as express.RequestHandler);
app.use(cookieParser());

// Validation and sanitization middleware
app.use(validateContentType);
app.use(sanitizeInput);

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const dbHealthy = await dbClient.healthCheck();

    res.status(dbHealthy ? 200 : 503).json({
      status: dbHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "0.1.0",
      checks: {
        database: dbHealthy ? "ok" : "failed",
        jobQueue: "ok", // TODO: Add actual queue health check
      },
    });
  } catch {
    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "0.1.0",
      error: "Health check failed",
    });
  }
});

// Prometheus metrics endpoint
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", getMetricsContentType());
    const metrics = await getMetrics();
    res.send(metrics);
  } catch (error) {
    logger.error({ err: error }, "Failed to generate metrics");
    res.status(500).send("Failed to generate metrics");
  }
});

// API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/vault", vaultRoutes);
app.use("/api/v1/activity", activityRoutes);
app.use("/api/v1/inactivity", inactivityRoutes);
app.use("/api/v1/sessions", sessionRoutes);

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  
  // Close job processors and queues
  await JobProcessor.close();
  await closeAllQueues();
  
  // Close database
  await dbClient.close();
  
  logger.info("Shutdown complete");
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  
  // Close job processors and queues
  await JobProcessor.close();
  await closeAllQueues();
  
  // Close database
  await dbClient.close();
  
  logger.info("Shutdown complete");
  process.exit(0);
});

export default app;
