import app, { appInit } from "./app";
import { logger } from "./config/logger";
import { createServer } from "http";
import { realtimeService } from "./services/realtime-service";

const PORT = process.env.API_PORT || 3001;

async function start() {
  await appInit;

  const server = createServer(app);
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

start().catch((err) => {
  logger.fatal({ err }, "Failed to start server");
  process.exit(1);
});

export default app;
