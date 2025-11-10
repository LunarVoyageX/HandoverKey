import { Kysely } from 'kysely';
import { Database, ActivityLog, NewActivityLog } from '../types';
import { QueryError } from '../errors';

export class ActivityRepository {
  constructor(private db: Kysely<Database>) {}

  async create(data: NewActivityLog): Promise<ActivityLog> {
    try {
      const log = await this.db
        .insertInto('activity_logs')
        .values(data)
        .returningAll()
        .executeTakeFirstOrThrow();

      return log;
    } catch (error) {
      throw new QueryError(
        `Failed to create activity log: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findByUserId(
    userId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<ActivityLog[]> {
    try {
      const logs = await this.db
        .selectFrom('activity_logs')
        .selectAll()
        .where('user_id', '=', userId)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();

      return logs;
    } catch (error) {
      throw new QueryError(
        `Failed to find activity logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findByAction(
    userId: string,
    action: string,
    limit: number = 100,
  ): Promise<ActivityLog[]> {
    try {
      const logs = await this.db
        .selectFrom('activity_logs')
        .selectAll()
        .where('user_id', '=', userId)
        .where('action', '=', action)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .execute();

      return logs;
    } catch (error) {
      throw new QueryError(
        `Failed to find activity logs by action: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findFailedLogins(
    userId: string,
    since: Date,
  ): Promise<ActivityLog[]> {
    try {
      const logs = await this.db
        .selectFrom('activity_logs')
        .selectAll()
        .where('user_id', '=', userId)
        .where('action', '=', 'login')
        .where('success', '=', false)
        .where('created_at', '>=', since)
        .orderBy('created_at', 'desc')
        .execute();

      return logs;
    } catch (error) {
      throw new QueryError(
        `Failed to find failed logins: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async deleteOlderThan(date: Date): Promise<number> {
    try {
      const result = await this.db
        .deleteFrom('activity_logs')
        .where('created_at', '<', date)
        .executeTakeFirst();

      return Number(result.numDeletedRows);
    } catch (error) {
      throw new QueryError(
        `Failed to delete old activity logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
