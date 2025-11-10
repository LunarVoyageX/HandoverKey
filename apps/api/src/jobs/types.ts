/**
 * Job type definitions
 * 
 * Defines all background job types and their data structures
 */

/**
 * Job type enum
 * Defines all available job types in the system
 */
export enum JobType {
  // Inactivity monitoring
  INACTIVITY_CHECK = 'inactivity:check',
  
  // Notifications
  SEND_REMINDER = 'notification:reminder',
  SEND_WARNING = 'notification:warning',
  
  // Handover
  EXECUTE_HANDOVER = 'handover:execute',
  
  // Maintenance
  CLEANUP_SESSIONS = 'maintenance:cleanup-sessions',
  ARCHIVE_LOGS = 'maintenance:archive-logs',
}

/**
 * Base job data interface
 */
export interface BaseJobData {
  jobId?: string;
  createdAt?: string;
}

/**
 * Inactivity check job data
 */
export interface InactivityCheckJobData extends BaseJobData {
  // Placeholder for future fields
  _placeholder?: never;
}

/**
 * Send reminder job data
 */
export interface SendReminderJobData extends BaseJobData {
  userId: string;
  level: 'info' | 'warning' | 'critical';
  daysRemaining: number;
  thresholdDays: number;
}

/**
 * Send warning job data
 */
export interface SendWarningJobData extends BaseJobData {
  userId: string;
  email: string;
  warningType: 'inactivity' | 'handover_pending';
  details: Record<string, unknown>;
}

/**
 * Execute handover job data
 */
export interface ExecuteHandoverJobData extends BaseJobData {
  userId: string;
  reason: 'inactivity' | 'manual';
}

/**
 * Cleanup sessions job data
 */
export interface CleanupSessionsJobData extends BaseJobData {
  olderThanDays?: number;
}

/**
 * Archive logs job data
 */
export interface ArchiveLogsJobData extends BaseJobData {
  olderThanDays: number;
  logType: 'activity' | 'audit' | 'all';
}

/**
 * Union type of all job data types
 */
export type JobData =
  | InactivityCheckJobData
  | SendReminderJobData
  | SendWarningJobData
  | ExecuteHandoverJobData
  | CleanupSessionsJobData
  | ArchiveLogsJobData;

/**
 * Job result interface
 */
export interface JobResult {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
  error?: string;
}

/**
 * Job options interface
 */
export interface JobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  repeat?: {
    pattern?: string; // Cron pattern
    every?: number; // Milliseconds
    limit?: number; // Max number of times to repeat
  };
}
