import { InactivityMonitorService } from "./inactivity-monitor";
import { logger } from "../config/logger";

export class JobManager {
  private static instance: JobManager;
  private inactivityMonitor: InactivityMonitorService;
  private isStarted: boolean = false;

  constructor() {
    this.inactivityMonitor = InactivityMonitorService.getInstance();
  }

  static getInstance(): JobManager {
    if (!JobManager.instance) {
      JobManager.instance = new JobManager();
    }
    return JobManager.instance;
  }

  /**
   * Starts all background jobs
   */
  start(): void {
    if (this.isStarted) {
      logger.info("JobManager is already started");
      return;
    }

    logger.info("Starting JobManager...");

    // Start the inactivity monitor
    this.inactivityMonitor.start();

    this.isStarted = true;
    logger.info("JobManager started successfully");
  }

  /**
   * Stops all background jobs
   */
  stop(): void {
    if (!this.isStarted) {
      logger.info("JobManager is not started");
      return;
    }

    logger.info("Stopping JobManager...");

    // Stop the inactivity monitor
    this.inactivityMonitor.stop();

    this.isStarted = false;
    logger.info("JobManager stopped successfully");
  }

  /**
   * Gets the health status of all jobs
   */
  async getHealthStatus(): Promise<{
    isHealthy: boolean;
    jobs: {
      inactivityMonitor: {
        isHealthy: boolean;
        stats: unknown;
      };
    };
  }> {
    const inactivityMonitorStats = await this.inactivityMonitor.getStats();
    const inactivityMonitorHealthy = this.inactivityMonitor.isHealthy();

    return {
      isHealthy: inactivityMonitorHealthy,
      jobs: {
        inactivityMonitor: {
          isHealthy: inactivityMonitorHealthy,
          stats: inactivityMonitorStats,
        },
      },
    };
  }

  /**
   * Manually trigger inactivity check for all users
   */
  async triggerInactivityCheck(): Promise<void> {
    logger.info("Manually triggering inactivity check...");
    await this.inactivityMonitor.checkAllUsers();
  }

  /**
   * Manually trigger inactivity check for a specific user
   */
  async triggerUserInactivityCheck(userId: string): Promise<void> {
    logger.info(`Manually triggering inactivity check for user ${userId}...`);
    await this.inactivityMonitor.checkUserInactivity(userId);
  }
}
