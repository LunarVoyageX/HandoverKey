import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import { validateEnv } from "./config/env";
import { getDatabaseClient } from "@handoverkey/database";

if (process.env.NODE_ENV !== "test") {
  validateEnv();
}

const app = express();
app.set("trust proxy", 1);

import {
  rateLimiter,
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
import vaultRoutes, { publicVaultRouter } from "./routes/vault-routes";
import activityRoutes, { publicActivityRouter } from "./routes/activity-routes";
import inactivityRoutes from "./routes/inactivity-routes";
import sessionRoutes from "./routes/session-routes";
import successorRoutes, { verifyRouter } from "./routes/successor-routes";
import adminRoutes from "./routes/admin-routes";
import contactRoutes from "./routes/contact-routes";
import { JobProcessor, JobScheduler } from "./jobs";
import { closeAllQueues, getQueueHealth } from "./config/queue";
import { SessionService } from "./services/session-service";
import { initializeRedis, closeRedis, checkRedisHealth } from "./config/redis";
import { JobManager } from "./services/job-manager";
import { realtimeService } from "./services/realtime-service";

// Initialize database connection
const dbClient = getDatabaseClient();
const jobManager = JobManager.getInstance();
export let appInit: Promise<void> = Promise.resolve();

if (process.env.NODE_ENV !== "test") {
  appInit = dbClient
    .initialize({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "handoverkey_dev",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      min: 2,
      max: 10,
    })
    .then(async () => {
      // Initialize SessionService with database client
      SessionService.initialize(dbClient);
      logger.info("SessionService initialized");

      // Initialize Redis
      await initializeRedis();
      logger.info("Redis initialized");

      // Initialize job processors and schedule recurring jobs
      await JobProcessor.initialize();
      await JobScheduler.scheduleInactivityCheck();
      await JobScheduler.scheduleSessionCleanup();
      await JobScheduler.scheduleArchiveLogs();
      jobManager.start();
      logger.info("Job processors initialized and recurring jobs scheduled");
    })
    .catch((error) => {
      logger.fatal({ err: error }, "Failed to initialize application");
      process.exit(1);
    });
}

// Request ID middleware (must be first)
app.use(requestIdMiddleware);

const ALLOWED_ORIGINS = (
  process.env.CORS_ORIGINS ||
  process.env.FRONTEND_URL ||
  "http://localhost:5173"
)
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "DNT",
      "Cache-Control",
      "X-Request-ID",
    ],
  }),
);

// Logging middleware (must be early)
app.use(loggingMiddleware);

// Metrics middleware (must be early)
app.use(metricsMiddleware);

// Security middleware (rate limiter only)
app.use(rateLimiter as unknown as express.RequestHandler);

// Body parsing middleware
app.use(express.json({ limit: "1mb" }) as express.RequestHandler);
app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  }) as express.RequestHandler,
);
app.use(cookieParser() as unknown as express.RequestHandler);

// Validation and sanitization middleware
app.use(validateContentType);
app.use(sanitizeInput);

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const [dbHealthy, redisHealthy] = await Promise.all([
      dbClient.healthCheck(),
      checkRedisHealth(),
    ]);

    const queueNames = [
      "inactivity",
      "notifications",
      "handover",
      "maintenance",
    ];
    const queueHealthResults = await Promise.all(
      queueNames.map((name) => getQueueHealth(name)),
    );
    const jobQueueHealthy = queueHealthResults.every(
      (result) => result.healthy,
    );
    const managerHealth = await jobManager.getHealthStatus();

    const allHealthy =
      dbHealthy && redisHealthy && jobQueueHealthy && managerHealth.isHealthy;

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "0.1.0",
      checks: {
        database: dbHealthy ? "ok" : "failed",
        redis: redisHealthy ? "ok" : "failed",
        jobQueue: jobQueueHealthy ? "ok" : "degraded",
        inactivityMonitor: managerHealth.jobs.inactivityMonitor.isHealthy
          ? "ok"
          : "degraded",
      },
      queueStats: queueNames.reduce<Record<string, unknown>>(
        (acc, name, index) => {
          acc[name] = queueHealthResults[index];
          return acc;
        },
        {},
      ),
      backgroundJobs: managerHealth.jobs,
      realtime: realtimeService.getStats(),
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
app.use("/api/v1/vault", publicVaultRouter);
app.use("/api/v1/vault", vaultRoutes);
app.use("/api/v1/activity", publicActivityRouter);
app.use("/api/v1/activity", activityRoutes);
app.use("/api/v1/inactivity", inactivityRoutes);
app.use("/api/v1/sessions", sessionRoutes);
app.use("/api/v1/successors", verifyRouter); // Public verify route (no auth)
app.use("/api/v1/successors", successorRoutes); // Protected routes
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/contact", contactRoutes);

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");

  jobManager.stop();
  realtimeService.close();

  // Close job processors and queues
  await JobProcessor.close();
  await closeAllQueues();

  // Close Redis
  await closeRedis();

  // Close database
  await dbClient.close();

  logger.info("Shutdown complete");
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");

  jobManager.stop();
  realtimeService.close();

  // Close job processors and queues
  await JobProcessor.close();
  await closeAllQueues();

  // Close Redis
  await closeRedis();

  // Close database
  await dbClient.close();

  logger.info("Shutdown complete");
  process.exit(0);
});

export default app;
