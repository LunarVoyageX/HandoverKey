/**
 * Job scheduler
 * 
 * Provides high-level API for scheduling and managing jobs
 */

import { Job } from 'bullmq';
import { getQueue } from '../config/queue';
import { logger } from '../config/logger';
import {
  JobType,
  JobData,
  JobOptions,
  InactivityCheckJobData,
  SendReminderJobData,
  ExecuteHandoverJobData,
  CleanupSessionsJobData,
} from './types';

/**
 * Job scheduler class
 * Provides methods to schedule and manage background jobs
 */
export class JobScheduler {
  /**
   * Schedule a job
   */
  static async scheduleJob<T extends JobData>(
    jobType: JobType,
    data: T,
    options?: JobOptions
  ): Promise<Job<T>> {
    const queueName = this.getQueueName(jobType);
    const queue = getQueue(queueName);
    
    const job = await queue.add(jobType, data, {
      priority: options?.priority,
      delay: options?.delay,
      attempts: options?.attempts,
      backoff: options?.backoff,
      repeat: options?.repeat,
    });
    
    logger.info(
      { 
        jobId: job.id, 
        jobType, 
        queueName,
        data,
        options,
      },
      'Job scheduled'
    );
    
    return job as Job<T>;
  }
  
  /**
   * Schedule inactivity check job
   * Runs hourly by default
   */
  static async scheduleInactivityCheck(
    data: InactivityCheckJobData = {},
    options?: JobOptions
  ): Promise<Job> {
    return this.scheduleJob(
      JobType.INACTIVITY_CHECK,
      {
        ...data,
        createdAt: new Date().toISOString(),
      },
      {
        ...options,
        repeat: options?.repeat || {
          pattern: '0 * * * *', // Every hour at minute 0
        },
      }
    );
  }
  
  /**
   * Schedule reminder notification
   */
  static async scheduleReminder(
    data: SendReminderJobData,
    options?: JobOptions
  ): Promise<Job> {
    return this.scheduleJob(
      JobType.SEND_REMINDER,
      {
        ...data,
        createdAt: new Date().toISOString(),
      },
      options
    );
  }
  
  /**
   * Schedule handover execution
   */
  static async scheduleHandover(
    data: ExecuteHandoverJobData,
    options?: JobOptions
  ): Promise<Job> {
    return this.scheduleJob(
      JobType.EXECUTE_HANDOVER,
      {
        ...data,
        createdAt: new Date().toISOString(),
      },
      {
        ...options,
        priority: 1, // High priority
      }
    );
  }
  
  /**
   * Schedule session cleanup job
   * Runs daily by default
   */
  static async scheduleSessionCleanup(
    data: CleanupSessionsJobData = {},
    options?: JobOptions
  ): Promise<Job> {
    return this.scheduleJob(
      JobType.CLEANUP_SESSIONS,
      {
        ...data,
        createdAt: new Date().toISOString(),
      },
      {
        ...options,
        repeat: options?.repeat || {
          pattern: '0 2 * * *', // Every day at 2 AM
        },
      }
    );
  }
  
  /**
   * Get job by ID
   */
  static async getJob(jobType: JobType, jobId: string): Promise<Job | undefined> {
    const queueName = this.getQueueName(jobType);
    const queue = getQueue(queueName);
    
    return queue.getJob(jobId);
  }
  
  /**
   * Get job status
   */
  static async getJobStatus(jobType: JobType, jobId: string): Promise<{
    id: string;
    state: string;
    progress: number;
    attemptsMade: number;
    failedReason?: string;
    finishedOn?: number;
    processedOn?: number;
  } | null> {
    const job = await this.getJob(jobType, jobId);
    
    if (!job) {
      return null;
    }
    
    const state = await job.getState();
    
    return {
      id: job.id!,
      state,
      progress: job.progress as number,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
    };
  }
  
  /**
   * Remove a job
   */
  static async removeJob(jobType: JobType, jobId: string): Promise<void> {
    const job = await this.getJob(jobType, jobId);
    
    if (job) {
      await job.remove();
      logger.info({ jobId, jobType }, 'Job removed');
    }
  }
  
  /**
   * Remove all jobs from a queue
   */
  static async removeAllJobs(jobType: JobType): Promise<void> {
    const queueName = this.getQueueName(jobType);
    const queue = getQueue(queueName);
    
    await queue.drain();
    logger.info({ jobType, queueName }, 'All jobs removed from queue');
  }
  
  /**
   * Get queue name for a job type
   */
  private static getQueueName(jobType: JobType): string {
    // Group related jobs into the same queue
    if (jobType.startsWith('inactivity:')) {
      return 'inactivity';
    }
    if (jobType.startsWith('notification:')) {
      return 'notifications';
    }
    if (jobType.startsWith('handover:')) {
      return 'handover';
    }
    if (jobType.startsWith('maintenance:')) {
      return 'maintenance';
    }
    return 'default';
  }
  
  /**
   * Get all repeatable jobs
   */
  static async getRepeatableJobs(jobType: JobType): Promise<Array<{
    key: string;
    name: string;
    id: string;
    endDate: number | null;
    tz: string | null;
    pattern: string | null;
    every: string | null;
  }>> {
    const queueName = this.getQueueName(jobType);
    const queue = getQueue(queueName);
    
    return queue.getRepeatableJobs();
  }
  
  /**
   * Remove a repeatable job
   */
  static async removeRepeatableJob(
    jobType: JobType,
    repeatJobKey: string
  ): Promise<void> {
    const queueName = this.getQueueName(jobType);
    const queue = getQueue(queueName);
    
    await queue.removeRepeatableByKey(repeatJobKey);
    logger.info({ jobType, repeatJobKey }, 'Repeatable job removed');
  }
}
