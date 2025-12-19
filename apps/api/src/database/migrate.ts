import { readFileSync } from "fs";
import { join } from "path";
import { getDatabaseClient } from "@handoverkey/database";

const MIGRATION_FILES = [
  "users.sql",
  "successors.sql",
  "vault.sql",
  "sessions.sql",
  "simplified_schema.sql",
  "add_vault_salt.sql",
  "add_missing_user_columns.sql",
  "fix_schema_mismatch.sql",
  "add_missing_dms_tables.sql",
  "ensure_last_activity.sql",
  "add_require_majority.sql",
  "add_vault_deleted_at.sql",
  "add_name_to_users.sql",
  "add_email_verification_to_users.sql",
];

import { Generated } from "kysely";

interface Migration {
  id: Generated<number>;
  name: string;
  applied_at: Date;
}

async function runMigrations(): Promise<void> {
  const dbClient = getDatabaseClient();

  try {
    console.log("Starting database migrations...");

    // Initialize database connection
    await dbClient.initialize({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "handoverkey_dev",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      min: 2,
      max: 10,
    });

    const isConnected = await dbClient.healthCheck();
    if (!isConnected) {
      throw new Error("Failed to connect to database");
    }

    console.log("Database connection established");

    // Ensure the migrations table exists before proceeding
    const createMigrationsTableSQL = readFileSync(
      join(__dirname, "schema", "migrations_table.sql"),
      "utf8",
    );

    await dbClient.query(async (db) => {
      // Execute raw SQL using sql template tag
      const { sql } = await import("kysely");
      await sql.raw(createMigrationsTableSQL).execute(db);
    });
    console.log("✓ Ensured migrations table exists");

    for (const migrationFile of MIGRATION_FILES) {
      if (migrationFile === "migrations_table.sql") {
        continue; // Skip the migrations_table.sql as it's handled separately
      }

      const existingMigration = await dbClient.query(async (db) => {
        // We need to cast db to include the migrations table since it's not in the main schema
        return await db
          .withTables<{ migrations: Migration }>()
          .selectFrom("migrations")
          .selectAll()
          .where("name", "=", migrationFile)
          .executeTakeFirst();
      });

      if (existingMigration) {
        console.log(`Skipping migration: ${migrationFile} (already applied)`);
        continue;
      }

      console.log(`Running migration: ${migrationFile}`);

      const migrationPath = join(__dirname, "schema", migrationFile);
      const migrationSQL = readFileSync(migrationPath, "utf8");

      await dbClient.query(async (db) => {
        // Execute raw SQL using sql template tag
        const { sql } = await import("kysely");
        await sql.raw(migrationSQL).execute(db);
        await db
          .withTables<{ migrations: Migration }>()
          .insertInto("migrations")
          .values({ name: migrationFile, applied_at: new Date() })
          .execute();
      });

      console.log(`✓ Completed migration: ${migrationFile}`);
    }

    console.log("All migrations completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await dbClient.close();
  }
}

if (require.main === module) {
  runMigrations();
}

export { runMigrations };
