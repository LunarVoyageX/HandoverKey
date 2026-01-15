import { Kysely, PostgresDialect, Transaction } from "kysely";
import { Pool, PoolConfig } from "pg";
import { Database } from "./types";
import { ConnectionError, QueryError, TransactionError } from "./errors";

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  min?: number;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export class DatabaseClient {
  private pool: Pool | null = null;
  private kysely: Kysely<Database> | null = null;
  private config: DatabaseConfig | null = null;

  /**
   * Initializes the database connection pool
   */
  async initialize(config: DatabaseConfig): Promise<void> {
    if (this.pool) {
      throw new ConnectionError("Database already initialized");
    }

    this.config = config;

    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      min: config.min ?? 2,
      max: config.max ?? 10,
      idleTimeoutMillis: config.idleTimeoutMillis ?? 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis ?? 30000,
    };

    try {
      this.pool = new Pool(poolConfig);

      // Test connection
      const client = await this.pool.connect();
      client.release();

      // Initialize Kysely
      this.kysely = new Kysely<Database>({
        dialect: new PostgresDialect({
          pool: this.pool,
        }),
      });
    } catch (error) {
      throw new ConnectionError(
        `Failed to initialize database: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Gets the Kysely instance
   */
  getKysely(): Kysely<Database> {
    if (!this.kysely) {
      throw new ConnectionError("Database not initialized");
    }
    return this.kysely;
  }

  /**
   * Executes a query with automatic retry logic
   */
  async query<T>(
    queryFn: (db: Kysely<Database>) => Promise<T>,
    maxRetries: number = 3,
  ): Promise<T> {
    if (!this.kysely) {
      throw new ConnectionError("Database not initialized");
    }

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        return await queryFn(this.kysely);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error");
        attempt++;

        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw new QueryError(`Query failed: ${lastError.message}`, lastError);
        }

        // Exponential backoff
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new QueryError(
      `Query failed after ${maxRetries} attempts: ${lastError?.message}`,
      lastError ?? undefined,
    );
  }

  /**
   * Executes a transaction
   */
  async transaction<T>(
    txFn: (trx: Transaction<Database>) => Promise<T>,
  ): Promise<T> {
    if (!this.kysely) {
      throw new ConnectionError("Database not initialized");
    }

    try {
      return await this.kysely.transaction().execute(txFn);
    } catch (error) {
      throw new TransactionError(
        `Transaction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.pool) {
      return false;
    }

    try {
      const client = await this.pool.connect();
      await client.query("SELECT 1");
      client.release();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Closes the database connection
   */
  async close(): Promise<void> {
    if (this.kysely) {
      await this.kysely.destroy();
      this.kysely = null;
    }

    if (this.pool) {
      try {
        await this.pool.end();
      } catch {
        // Ignore error if pool is already closed
      }
      this.pool = null;
    }
  }

  /**
   * Determines if an error should not be retried
   */
  private isNonRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message.toLowerCase();

    // Don't retry on syntax errors, constraint violations, etc.
    return (
      message.includes("syntax error") ||
      message.includes("constraint") ||
      message.includes("duplicate key") ||
      message.includes("foreign key") ||
      message.includes("not null violation")
    );
  }
}

// Singleton instance
let dbClient: DatabaseClient | null = null;

export function getDatabaseClient(): DatabaseClient {
  if (!dbClient) {
    dbClient = new DatabaseClient();
  }
  return dbClient;
}
