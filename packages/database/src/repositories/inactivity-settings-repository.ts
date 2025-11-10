import { Kysely } from 'kysely';
import { Database, InactivitySettings, NewInactivitySettings, InactivitySettingsUpdate } from '../types';
import { NotFoundError, QueryError } from '../errors';

export class InactivitySettingsRepository {
  constructor(private db: Kysely<Database>) {}

  async findByUserId(userId: string): Promise<InactivitySettings | null> {
    try {
      const settings = await this.db
        .selectFrom('inactivity_settings')
        .selectAll()
        .where('user_id', '=', userId)
        .executeTakeFirst();

      return settings ?? null;
    } catch (error) {
      throw new QueryError(
        `Failed to find inactivity settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async create(data: NewInactivitySettings): Promise<InactivitySettings> {
    try {
      const settings = await this.db
        .insertInto('inactivity_settings')
        .values(data)
        .returningAll()
        .executeTakeFirstOrThrow();

      return settings;
    } catch (error) {
      throw new QueryError(
        `Failed to create inactivity settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async update(userId: string, data: InactivitySettingsUpdate): Promise<InactivitySettings> {
    try {
      const settings = await this.db
        .updateTable('inactivity_settings')
        .set({
          ...data,
          updated_at: new Date(),
        })
        .where('user_id', '=', userId)
        .returningAll()
        .executeTakeFirst();

      if (!settings) {
        throw new NotFoundError('Inactivity settings');
      }

      return settings;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new QueryError(
        `Failed to update inactivity settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findAllActive(): Promise<InactivitySettings[]> {
    try {
      const settings = await this.db
        .selectFrom('inactivity_settings')
        .selectAll()
        .where((eb) =>
          eb.or([
            eb('is_paused', '=', false),
            eb('paused_until', '<', new Date()),
          ])
        )
        .execute();

      return settings;
    } catch (error) {
      throw new QueryError(
        `Failed to find active inactivity settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
