import { Kysely } from 'kysely';
import { Database, HandoverProcess, NewHandoverProcess, HandoverProcessUpdate } from '../types';
import { NotFoundError, QueryError } from '../errors';

export class HandoverProcessRepository {
  constructor(private db: Kysely<Database>) {}

  async findById(id: string): Promise<HandoverProcess | null> {
    try {
      const process = await this.db
        .selectFrom('handover_processes')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

      return process ?? null;
    } catch (error) {
      throw new QueryError(
        `Failed to find handover process: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findByUserId(userId: string): Promise<HandoverProcess[]> {
    try {
      const processes = await this.db
        .selectFrom('handover_processes')
        .selectAll()
        .where('user_id', '=', userId)
        .orderBy('created_at', 'desc')
        .execute();

      return processes;
    } catch (error) {
      throw new QueryError(
        `Failed to find handover processes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findActiveByUserId(userId: string): Promise<HandoverProcess | null> {
    try {
      const process = await this.db
        .selectFrom('handover_processes')
        .selectAll()
        .where('user_id', '=', userId)
        .where('status', 'not in', ['completed', 'cancelled'])
        .orderBy('created_at', 'desc')
        .limit(1)
        .executeTakeFirst();

      return process ?? null;
    } catch (error) {
      throw new QueryError(
        `Failed to find active handover process: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async create(data: NewHandoverProcess): Promise<HandoverProcess> {
    try {
      const process = await this.db
        .insertInto('handover_processes')
        .values(data)
        .returningAll()
        .executeTakeFirstOrThrow();

      return process;
    } catch (error) {
      throw new QueryError(
        `Failed to create handover process: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async update(id: string, data: HandoverProcessUpdate): Promise<HandoverProcess> {
    try {
      const process = await this.db
        .updateTable('handover_processes')
        .set({
          ...data,
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst();

      if (!process) {
        throw new NotFoundError('Handover process');
      }

      return process;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new QueryError(
        `Failed to update handover process: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findByStatus(status: string): Promise<HandoverProcess[]> {
    try {
      const processes = await this.db
        .selectFrom('handover_processes')
        .selectAll()
        .where('status', '=', status)
        .orderBy('created_at', 'desc')
        .execute();

      return processes;
    } catch (error) {
      throw new QueryError(
        `Failed to find handover processes by status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findExpiredGracePeriods(): Promise<HandoverProcess[]> {
    try {
      const processes = await this.db
        .selectFrom('handover_processes')
        .selectAll()
        .where('status', '=', 'GRACE_PERIOD')
        .where('grace_period_ends', '<', new Date())
        .execute();

      return processes;
    } catch (error) {
      throw new QueryError(
        `Failed to find expired grace periods: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
