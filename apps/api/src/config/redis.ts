import { createClient, RedisClientType } from "redis";
import { logger } from "./logger";

let redisClient: RedisClientType | null = null;

/**
 * Initialize Redis client
 */
export async function initializeRedis(): Promise<void> {
  if (redisClient) {
    return;
  }

  redisClient = createClient({
    socket: {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      reconnectStrategy: (retries) => {
        const delay = Math.min(Math.pow(2, retries) * 1000, 30000);
        logger.warn({ attempt: retries, delay }, "Retrying Redis connection");
        return delay;
      },
    },
    password: process.env.REDIS_PASSWORD,
  });

  redisClient.on("error", (error) => {
    logger.error({ error }, "Redis client error");
  });

  redisClient.on("connect", () => {
    logger.info("Redis client connected");
  });

  redisClient.on("ready", () => {
    logger.info("Redis client ready");
  });

  redisClient.on("reconnecting", () => {
    logger.warn("Redis client reconnecting");
  });

  await redisClient.connect();
}

/**
 * Get Redis client instance
 */
export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error(
      "Redis client not initialized. Call initializeRedis() first.",
    );
  }
  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info("Redis client closed");
  }
}

/**
 * Check Redis health
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    if (!redisClient) {
      return false;
    }
    await redisClient.ping();
    return true;
  } catch (error) {
    logger.error({ error }, "Redis health check failed");
    return false;
  }
}
