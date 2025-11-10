import { Kysely } from 'kysely';
import { Database, NotificationDelivery, NewNotificationDelivery } from '../types';
import { QueryError } from '../errors';

export class NotificationDeliveryRepository {
  constructor(private db: Kysely<Database>) {}

  async create(data: NewNotificationDelivery): Promise<NotificationDelivery> {
    try {
      const delivery = await this.db
        .insertInto('notification_deliveries')
        .values(data)
        .returningAll()
        .executeTakeFirstOrThrow();

      return delivery;
    } catch (error) {
      throw new QueryError(
        `Failed to create notification delivery: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findByUserId(userId: string, limit: number = 100): Promise<NotificationDelivery[]> {
    try {
      const deliveries = await this.db
        .selectFrom('notification_deliveries')
        .selectAll()
        .where('user_id', '=', userId)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .execute();

      return deliveries;
    } catch (error) {
      throw new QueryError(
        `Failed to find notification deliveries: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findLastByType(userId: string, notificationType: string): Promise<NotificationDelivery | null> {
    try {
      const delivery = await this.db
        .selectFrom('notification_deliveries')
        .selectAll()
        .where('user_id', '=', userId)
        .where('notification_type', '=', notificationType)
        .where('status', 'in', ['sent', 'delivered'])
        .orderBy('created_at', 'desc')
        .limit(1)
        .executeTakeFirst();

      return delivery ?? null;
    } catch (error) {
      throw new QueryError(
        `Failed to find last notification delivery: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findPendingRetries(maxRetries: number = 3): Promise<NotificationDelivery[]> {
    try {
      const deliveries = await this.db
        .selectFrom('notification_deliveries')
        .selectAll()
        .where('status', '=', 'pending')
        .where('retry_count', '<', maxRetries)
        .orderBy('created_at', 'asc')
        .execute();

      return deliveries;
    } catch (error) {
      throw new QueryError(
        `Failed to find pending retries: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
