/**
 * Job processor
 *
 * Handles processing of all background jobs
 */

import { Job, Worker, QueueEvents } from "bullmq";
import { logger } from "../config/logger";
import {
  redisConnection,
  registerWorker,
  registerQueueEvents,
} from "../config/queue";
import {
  JobType,
  JobData,
  JobResult,
  InactivityCheckJobData,
  SendReminderJobData,
  ExecuteHandoverJobData,
  CleanupSessionsJobData,
} from "./types";
import { InactivityService } from "../services/inactivity-service";
import { inactivityChecks } from "../config/metrics";

/**
 * Job processor class
 * Handles registration and processing of all job types
 */
export class JobProcessor {
  private static workers: Map<string, Worker> = new Map();

  /**
   * Initialize all job processors
   */
  static async initialize(): Promise<void> {
    logger.info("Initializing job processors");

    // Create worker for each job type queue
    const queueNames = Object.values(JobType).map((type) =>
      this.getQueueName(type),
    );
    const uniqueQueues = [...new Set(queueNames)];

    for (const queueName of uniqueQueues) {
      await this.createWorker(queueName);
    }

    logger.info({ queues: uniqueQueues.length }, "Job processors initialized");
  }

  /**
   * Create a worker for a queue
   */
  private static async createWorker(queueName: string): Promise<void> {
    const worker = new Worker(
      queueName,
      async (job: Job) => {
        return await this.processJob(job);
      },
      {
        connection: redisConnection,
        concurrency: parseInt(process.env.JOB_CONCURRENCY || "5"),
        limiter: {
          max: 10, // Max 10 jobs
          duration: 1000, // Per second
        },
      },
    );

    // Register event handlers
    worker.on("completed", (job: Job, result: JobResult) => {
      logger.info(
        {
          jobId: job.id,
          jobName: job.name,
          result,
          duration: job.finishedOn
            ? job.finishedOn - (job.processedOn || 0)
            : 0,
        },
        "Job completed",
      );
    });

    worker.on("failed", (job: Job | undefined, error: Error) => {
      logger.error(
        {
          jobId: job?.id,
          jobName: job?.name,
          err: error,
          attemptsMade: job?.attemptsMade,
          attemptsMax: job?.opts.attempts,
        },
        "Job failed",
      );
    });

    worker.on("error", (error: Error) => {
      logger.error({ err: error, queueName }, "Worker error");
    });

    // Register queue events for monitoring
    const queueEvents = new QueueEvents(queueName, {
      connection: redisConnection,
    });

    queueEvents.on("waiting", ({ jobId }) => {
      logger.debug({ jobId, queueName }, "Job waiting");
    });

    queueEvents.on("active", ({ jobId }) => {
      logger.debug({ jobId, queueName }, "Job active");
    });

    queueEvents.on("stalled", ({ jobId }) => {
      logger.warn({ jobId, queueName }, "Job stalled");
    });

    // Register worker and events
    registerWorker(queueName, worker);
    registerQueueEvents(queueName, queueEvents);

    this.workers.set(queueName, worker);

    logger.info({ queueName }, "Worker created");
  }

  /**
   * Process a job based on its type
   */
  private static async processJob(job: Job<JobData>): Promise<JobResult> {
    const startTime = Date.now();

    logger.info(
      {
        jobId: job.id,
        jobName: job.name,
        jobData: job.data,
        attemptsMade: job.attemptsMade,
      },
      "Processing job",
    );

    try {
      let result: JobResult;

      switch (job.name as JobType) {
        case JobType.INACTIVITY_CHECK:
          result = await this.processInactivityCheck(
            job.data as InactivityCheckJobData,
          );
          break;

        case JobType.SEND_REMINDER:
          result = await this.processSendReminder(
            job.data as SendReminderJobData,
          );
          break;

        case JobType.EXECUTE_HANDOVER:
          result = await this.processExecuteHandover(
            job.data as ExecuteHandoverJobData,
          );
          break;

        case JobType.CLEANUP_SESSIONS:
          result = await this.processCleanupSessions(
            job.data as CleanupSessionsJobData,
          );
          break;

        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }

      const duration = Date.now() - startTime;
      logger.info(
        {
          jobId: job.id,
          jobName: job.name,
          duration,
          result,
        },
        "Job processed successfully",
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
        {
          jobId: job.id,
          jobName: job.name,
          duration,
          err: error,
        },
        "Job processing failed",
      );

      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Process inactivity check job
   */
  private static async processInactivityCheck(
    _data: InactivityCheckJobData,
  ): Promise<JobResult> {
    try {
      await InactivityService.checkAllUsers();

      // Update metrics
      inactivityChecks.inc({ result: "success" });

      return {
        success: true,
        message: "Inactivity check completed",
      };
    } catch (error) {
      inactivityChecks.inc({ result: "failure" });
      throw error;
    }
  }

  /**
   * Process send reminder job
   */
  private static async processSendReminder(
    data: SendReminderJobData,
  ): Promise<JobResult> {
    logger.info(
      {
        userId: data.userId,
        level: data.level,
        daysRemaining: data.daysRemaining,
      },
      "Sending reminder notification",
    );

    // TODO: Implement actual notification sending
    // For now, just log it

    return {
      success: true,
      message: "Reminder sent",
      data: {
        userId: data.userId,
        level: data.level,
      },
    };
  }

  /**
   * Process execute handover job
   */
  private static async processExecuteHandover(
    data: ExecuteHandoverJobData,
  ): Promise<JobResult> {
    logger.info(
      {
        userId: data.userId,
        reason: data.reason,
      },
      "Executing handover",
    );

    // TODO: Implement actual handover execution
    // This would involve:
    // 1. Splitting vault encryption keys using Shamir's Secret Sharing
    // 2. Distributing shares to successors
    // 3. Sending notifications
    // 4. Updating handover status

    return {
      success: true,
      message: "Handover executed",
      data: {
        userId: data.userId,
        reason: data.reason,
      },
    };
  }

  /**
   * Process cleanup sessions job
   */
  private static async processCleanupSessions(
    data: CleanupSessionsJobData,
  ): Promise<JobResult> {
    const olderThanDays = data.olderThanDays || 30;

    logger.info({ olderThanDays }, "Cleaning up old sessions");

    // Import SessionService dynamically to avoid circular dependencies
    const { SessionService } = await import("../services/session-service");

    // Clean up expired sessions
    const deletedCount = await SessionService.cleanupExpiredSessions();

    return {
      success: true,
      message: "Sessions cleaned up",
      data: {
        olderThanDays,
        deletedCount,
      },
    };
  }

  /**
   * Get queue name for a job type
   */
  private static getQueueName(jobType: JobType): string {
    // Group related jobs into the same queue
    if (jobType.startsWith("inactivity:")) {
      return "inactivity";
    }
    if (jobType.startsWith("notification:")) {
      return "notifications";
    }
    if (jobType.startsWith("handover:")) {
      return "handover";
    }
    if (jobType.startsWith("maintenance:")) {
      return "maintenance";
    }
    return "default";
  }

  /**
   * Close all workers
   */
  static async close(): Promise<void> {
    logger.info("Closing all job processors");

    const closePromises = Array.from(this.workers.values()).map((worker) =>
      worker.close(),
    );

    await Promise.all(closePromises);
    this.workers.clear();

    logger.info("All job processors closed");
  }
}
