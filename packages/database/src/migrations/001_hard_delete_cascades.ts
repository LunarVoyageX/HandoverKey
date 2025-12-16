import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Drop deleted_at columns
  await db.schema.alterTable("users").dropColumn("deleted_at").execute();
  await db.schema
    .alterTable("vault_entries")
    .dropColumn("deleted_at")
    .execute();

  // Let's tackle specific tables linked to users:
  const tables = [
    "sessions",
    "vault_entries",
    "activity_logs",
    "activity_records",
    "inactivity_settings",
    "handover_processes",
    "successors",
    "handover_events",
    "checkin_tokens",
    "notification_deliveries",
  ];

  // Filter tables to only those that exist
  const existingTablesResult = await sql<{ table_name: string }>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ANY(${tables})
    `.execute(db);

  const existingTables = existingTablesResult.rows.map((r) => r.table_name);
  console.log(`Applying cascades to: ${existingTables.join(", ")}`);

  for (const table of existingTables) {
    // Find the actual constraint name
    const result = await sql<{ constraint_name: string }>`
      SELECT kcu.constraint_name
      FROM information_schema.key_column_usage kcu
      JOIN information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name
      WHERE kcu.table_name = ${table}
      AND kcu.column_name = 'user_id'
      AND tc.constraint_type = 'FOREIGN KEY'
    `.execute(db);

    const constraintName = result.rows[0]?.constraint_name;

    if (constraintName) {
      // Drop the specific constraint
      await db.schema
        .alterTable(table)
        .dropConstraint(constraintName)
        .execute();
    } else {
      console.warn(
        `No FK found for ${table}.user_id, proceeding to add cascade constraint...`,
      );
    }

    // Add new constraint with CASCADE
    // We give it a standard name now to ensure future predictability
    const newConstraintName = `${table}_user_id_fkey`;

    // Check if new name already exists (if it was the one we just dropped, it's fine, but if we didn't drop it...)
    // Actually, if we dropped `constraintName` and it WAS `newConstraintName`, we are clear.
    // If we dropped `oldName`, we are clear to add `newConstraintName`.

    // However, if we found NO constraint, but `newConstraintName` exists (unlikely unless it's not on user_id? or invalid state),
    // we might error. But let's assume if no FK on user_id, name is free.

    // To be extra safe against "relation already exists", we can use "if not exists" or catch.
    try {
      await db.schema
        .alterTable(table)
        .addForeignKeyConstraint(newConstraintName, ["user_id"], "users", [
          "id",
        ])
        .onDelete("cascade")
        .execute();
    } catch (e: any) {
      if (e.code === "42710") {
        // duplicate_object
        console.log(
          `Constraint ${newConstraintName} already exists, skipping addition.`,
        );
      } else {
        throw e;
      }
    }
  }

  // Also successors -> handover_process_id ?
  // notification_deliveries -> handover_process_id ?
  // successor_notifications -> handover_process_id ?
  // successor_notifications -> successor_id ?

  // Let's start with user_id cascades as that's the primary blocker for User Hard Delete.
}

export async function down(db: Kysely<any>): Promise<void> {
  // Re-add deleted_at columns
  await db.schema
    .alterTable("users")
    .addColumn("deleted_at", "timestamp")
    .execute();
  await db.schema
    .alterTable("vault_entries")
    .addColumn("deleted_at", "timestamp")
    .execute();

  // Drop CASCADE FKs and add RESTRICT (default)
  const tables = [
    "sessions",
    "vault_entries",
    "activity_logs",
    "activity_records",
    "inactivity_settings",
    "handover_processes",
    "successors",
    "handover_events",
    "checkin_tokens",
    "notification_deliveries",
  ];

  for (const table of tables) {
    await db.schema
      .alterTable(table)
      .dropConstraint(`${table}_user_id_fkey`)
      .execute();

    await db.schema
      .alterTable(table)
      .addForeignKeyConstraint(`${table}_user_id_fkey`, ["user_id"], "users", [
        "id",
      ])
      .onDelete("no action") // or restrict
      .execute();
  }
}
