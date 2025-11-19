/**
 * BullMQ job queue configuration
 *
 * Provides reliable background job processing with Redis persistence
 */

import { Queue, Worker, QueueEvents, ConnectionOptions } from "bullmq";
import { logger } from "./logger";

/**
 * Redis connection configuration
 */
export const redisConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  retryStrategy: (times: number) => {
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    const delay = Math.min(Math.pow(2, times) * 1000, 30000);
    logger.warn({ attempt: times, delay }, "Retrying Redis connection");
    return delay;
  },
};

/**
 * Default queue options
 */
export const defaultQueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 1000, // Start with 1 second
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      count: 5000, // Keep max 5000 failed jobs
    },
  },
};

/**
 * Job queue registry
 * Stores all queue instances for cleanup
 */
const queueRegistry = new Map<string, Queue>();
const workerRegistry = new Map<string, Worker>();
const eventsRegistry = new Map<string, QueueEvents>();

/**
 * Create or get a queue instance
 */
export function getQueue(name: string): Queue {
  if (!queueRegistry.has(name)) {
    const queue = new Queue(name, defaultQueueOptions);
    queueRegistry.set(name, queue);

    logger.info({ queueName: name }, "Queue created");
  }

  return queueRegistry.get(name)!;
}

/**
 * Register a worker for a queue
 */
export function registerWorker(name: string, worker: Worker): void {
  if (workerRegistry.has(name)) {
    logger.warn({ queueName: name }, "Worker already registered, replacing");
    workerRegistry.get(name)?.close();
  }

  workerRegistry.set(name, worker);
  logger.info({ queueName: name }, "Worker registered");
}

/**
 * Register queue events listener
 */
export function registerQueueEvents(name: string, events: QueueEvents): void {
  if (eventsRegistry.has(name)) {
    logger.warn(
      { queueName: name },
      "Queue events already registered, replacing",
    );
    eventsRegistry.get(name)?.close();
  }

  eventsRegistry.set(name, events);
  logger.info({ queueName: name }, "Queue events registered");
}

/**
 * Close all queues, workers, and event listeners
 * Should be called on application shutdown
 */
export async function closeAllQueues(): Promise<void> {
  logger.info("Closing all queues, workers, and event listeners");

  // Close all workers first
  const workerPromises = Array.from(workerRegistry.values()).map(
    async (worker) => {
      try {
        await worker.close();
      } catch (error) {
        logger.error({ err: error }, "Error closing worker");
      }
    },
  );

  // Close all event listeners
  const eventsPromises = Array.from(eventsRegistry.values()).map(
    async (events) => {
      try {
        await events.close();
      } catch (error) {
        logger.error({ err: error }, "Error closing queue events");
      }
    },
  );

  // Close all queues
  const queuePromises = Array.from(queueRegistry.values()).map(
    async (queue) => {
      try {
        await queue.close();
      } catch (error) {
        logger.error({ err: error }, "Error closing queue");
      }
    },
  );

  await Promise.all([...workerPromises, ...eventsPromises, ...queuePromises]);

  // Clear registries
  workerRegistry.clear();
  eventsRegistry.clear();
  queueRegistry.clear();

  logger.info("All queues closed");
}

/**
 * Get queue health status
 */
export async function getQueueHealth(queueName: string): Promise<{
  healthy: boolean;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  try {
    const queue = getQueue(queueName);

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      healthy: true,
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  } catch (error) {
    logger.error({ err: error, queueName }, "Failed to get queue health");
    return {
      healthy: false,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    };
  }
}
