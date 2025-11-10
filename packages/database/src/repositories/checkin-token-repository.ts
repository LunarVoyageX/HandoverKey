import { Kysely } from 'kysely';
import { Database, CheckinToken, NewCheckinToken } from '../types';
import { NotFoundError, QueryError } from '../errors';

export class CheckinTokenRepository {
  constructor(private db: Kysely<Database>) {}

  async findByTokenHash(tokenHash: string): Promise<CheckinToken | null> {
    try {
      const token = await this.db
        .selectFrom('checkin_tokens')
        .selectAll()
        .where('token_hash', '=', tokenHash)
        .executeTakeFirst();

      return token ?? null;
    } catch (error) {
      throw new QueryError(
        `Failed to find checkin token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async create(data: NewCheckinToken): Promise<CheckinToken> {
    try {
      const token = await this.db
        .insertInto('checkin_tokens')
        .values(data)
        .returningAll()
        .executeTakeFirstOrThrow();

      return token;
    } catch (error) {
      throw new QueryError(
        `Failed to create checkin token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async markAsUsed(tokenHash: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      const result = await this.db
        .updateTable('checkin_tokens')
        .set({
          used_at: new Date(),
          ip_address: ipAddress ?? null,
          user_agent: userAgent ?? null,
        })
        .where('token_hash', '=', tokenHash)
        .executeTakeFirst();

      if (result.numUpdatedRows === 0n) {
        throw new NotFoundError('Checkin token');
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new QueryError(
        `Failed to mark checkin token as used: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async deleteExpired(): Promise<number> {
    try {
      const result = await this.db
        .deleteFrom('checkin_tokens')
        .where('expires_at', '<', new Date())
        .executeTakeFirst();

      return Number(result.numDeletedRows);
    } catch (error) {
      throw new QueryError(
        `Failed to delete expired checkin tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
