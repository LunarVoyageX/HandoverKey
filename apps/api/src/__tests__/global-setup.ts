import { readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";

const MIGRATION_FILES = [
  "migrations_table.sql",
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

export default async function globalSetup() {
  console.log("Running global test setup - database migrations...");

  const dbName = "handoverkey_test";

  // First connect to postgres database to drop and recreate test database
  const adminPool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    database: "postgres",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
  });

  try {
    // Terminate existing connections to the test database
    console.log(`  Terminating existing connections to ${dbName}...`);
    await adminPool.query(
      `
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1
        AND pid <> pg_backend_pid();
    `,
      [dbName],
    );

    // Drop test database if it exists (to ensure clean state)
    console.log(`  Dropping database ${dbName} if exists...`);
    await adminPool.query(`DROP DATABASE IF EXISTS ${dbName}`);

    // Create fresh test database
    console.log(`  Creating database ${dbName}...`);
    await adminPool.query(`CREATE DATABASE ${dbName}`);
    console.log(`✓ Database ${dbName} created`);
  } catch (error) {
    console.error("Failed to create database:", error);
    throw error;
  } finally {
    await adminPool.end();
  }

  // Now connect to the test database
  const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    database: dbName,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
  });

  try {
    // Run all migrations
    for (const migrationFile of MIGRATION_FILES) {
      const migrationPath = join(
        __dirname,
        "../database/schema",
        migrationFile,
      );
      const migrationSQL = readFileSync(migrationPath, "utf8");

      console.log(`  Running ${migrationFile}...`);
      await pool.query(migrationSQL);

      // Record migration (except for migrations_table itself)
      if (migrationFile !== "migrations_table.sql") {
        await pool.query(
          "INSERT INTO migrations (name, applied_at) VALUES ($1, NOW())",
          [migrationFile],
        );
      }
    }

    console.log("✓ Database migrations completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}
