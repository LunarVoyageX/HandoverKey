import app, { appInit, shutdownServices } from "./app";
import { logger } from "./config/logger";
import { createServer, Server } from "http";
import { realtimeService } from "./services/realtime-service";

const PORT = process.env.API_PORT || 3001;
const SHUTDOWN_TIMEOUT_MS = 15_000;

let server: Server | undefined;
let shuttingDown = false;

async function start() {
  await appInit;

  server = createServer(app);
  realtimeService.initialize(server);

  server.listen(PORT, () => {
    logger.info(`HandoverKey API server running on port ${PORT}`);
    if (process.env.NODE_ENV !== "production") {
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`Auth endpoints: http://localhost:${PORT}/api/v1/auth`);
      logger.info(`Realtime websocket: ws://localhost:${PORT}/ws`);
    }
  });
}

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`${signal} received, shutting down gracefully`);

  const timeout = setTimeout(() => {
    logger.error("Shutdown timed out, forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  try {
    realtimeService.close();

    if (server) {
      await new Promise<void>((resolve) => {
        server!.close(() => resolve());
      });
    }

    await shutdownServices();

    logger.info("Shutdown complete");
  } catch (err) {
    logger.error({ err }, "Error during shutdown");
  } finally {
    clearTimeout(timeout);
    process.exit(0);
  }
}

process.on("SIGTERM", () => {
  shutdown("SIGTERM").catch((err) => {
    logger.error({ err }, "Unhandled error in SIGTERM shutdown");
    process.exit(1);
  });
});
process.on("SIGINT", () => {
  shutdown("SIGINT").catch((err) => {
    logger.error({ err }, "Unhandled error in SIGINT shutdown");
    process.exit(1);
  });
});

start().catch((err) => {
  logger.fatal({ err }, "Failed to start server");
  process.exit(1);
});

export default app;
