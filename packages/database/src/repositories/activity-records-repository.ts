import { Kysely } from 'kysely';
import { Database, ActivityRecord, NewActivityRecord } from '../types';
import { QueryError } from '../errors';

export class ActivityRecordsRepository {
  constructor(private db: Kysely<Database>) {}

  async create(data: NewActivityRecord): Promise<ActivityRecord> {
    try {
      const record = await this.db
        .insertInto('activity_records')
        .values(data)
        .returningAll()
        .executeTakeFirstOrThrow();

      return record;
    } catch (error) {
      throw new QueryError(
        `Failed to create activity record: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findByUserId(
    userId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<ActivityRecord[]> {
    try {
      const records = await this.db
        .selectFrom('activity_records')
        .selectAll()
        .where('user_id', '=', userId)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();

      return records;
    } catch (error) {
      throw new QueryError(
        `Failed to find activity records: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findLastActivity(userId: string): Promise<ActivityRecord | null> {
    try {
      const record = await this.db
        .selectFrom('activity_records')
        .selectAll()
        .where('user_id', '=', userId)
        .orderBy('created_at', 'desc')
        .limit(1)
        .executeTakeFirst();

      return record ?? null;
    } catch (error) {
      throw new QueryError(
        `Failed to find last activity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findByActivityType(
    userId: string,
    activityType: string,
    limit: number = 100,
  ): Promise<ActivityRecord[]> {
    try {
      const records = await this.db
        .selectFrom('activity_records')
        .selectAll()
        .where('user_id', '=', userId)
        .where('activity_type', '=', activityType)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .execute();

      return records;
    } catch (error) {
      throw new QueryError(
        `Failed to find activity records by type: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
    activityTypes?: string[],
  ): Promise<ActivityRecord[]> {
    try {
      let query = this.db
        .selectFrom('activity_records')
        .selectAll()
        .where('user_id', '=', userId)
        .where('created_at', '>=', startDate)
        .where('created_at', '<=', endDate);

      if (activityTypes && activityTypes.length > 0) {
        query = query.where('activity_type', 'in', activityTypes);
      }

      const records = await query
        .orderBy('created_at', 'desc')
        .execute();

      return records;
    } catch (error) {
      throw new QueryError(
        `Failed to find activity records by date range: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async countByUserId(userId: string): Promise<number> {
    try {
      const result = await this.db
        .selectFrom('activity_records')
        .select((eb) => eb.fn.count<number>('id').as('count'))
        .where('user_id', '=', userId)
        .executeTakeFirstOrThrow();

      return Number(result.count);
    } catch (error) {
      throw new QueryError(
        `Failed to count activity records: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
