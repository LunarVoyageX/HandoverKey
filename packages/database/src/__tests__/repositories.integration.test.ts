import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { Kysely } from "kysely";
import { Database, NewUser } from "../types";
import { DatabaseClient } from "../client";
import { NotFoundError } from "../errors";
import {
  ActivityRepository,
  CheckinTokenRepository,
  HandoverProcessRepository,
  InactivitySettingsRepository,
  NotificationDeliveryRepository,
  SessionRepository,
  SuccessorNotificationRepository,
  SuccessorRepository,
  SuccessorVaultEntryRepository,
  SystemStatusRepository,
  UserRepository,
  VaultRepository,
} from "../repositories";

const DB_NAME = "handoverkey_database_package_test";

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
  "add_encrypted_share_to_successors.sql",
  "add_metadata_to_handover_processes.sql",
  "add_two_factor_recovery_codes.sql",
  "add_successor_vault_assignments.sql",
];

function getDbConnectionConfig(database: string): {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
} {
  return {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    database,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
  };
}

async function recreateDatabase(): Promise<void> {
  const adminPool = new Pool(getDbConnectionConfig("postgres"));

  try {
    await adminPool.query(
      `
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1
        AND pid <> pg_backend_pid();
      `,
      [DB_NAME],
    );
    await adminPool.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
    await adminPool.query(`CREATE DATABASE ${DB_NAME}`);
  } finally {
    await adminPool.end();
  }

  const pool = new Pool(getDbConnectionConfig(DB_NAME));
  const migrationsDir = join(
    __dirname,
    "../../../../apps/api/src/database/schema",
  );

  try {
    for (const migrationFile of MIGRATION_FILES) {
      const migrationPath = join(migrationsDir, migrationFile);
      const migrationSQL = readFileSync(migrationPath, "utf8");

      await pool.query(migrationSQL);

      if (migrationFile !== "migrations_table.sql") {
        await pool.query(
          "INSERT INTO migrations (name, applied_at) VALUES ($1, NOW())",
          [migrationFile],
        );
      }
    }
  } finally {
    await pool.end();
  }
}

async function dropDatabase(): Promise<void> {
  const adminPool = new Pool(getDbConnectionConfig("postgres"));
  try {
    await adminPool.query(
      `
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1
        AND pid <> pg_backend_pid();
      `,
      [DB_NAME],
    );
    await adminPool.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
  } finally {
    await adminPool.end();
  }
}

function buildUserPayload(emailPrefix: string): NewUser {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  return {
    email: `${emailPrefix}-${unique}@example.com`,
    name: `${emailPrefix}-name`,
    password_hash: "hashed-password",
    salt: Buffer.from(`salt-${unique}`),
    verification_token: null,
    email_verified: true,
    two_factor_secret: null,
    two_factor_recovery_codes: null,
  };
}

describe("Database repositories integration", () => {
  jest.setTimeout(120000);

  let dbClient: DatabaseClient;
  let db: Kysely<Database>;

  let userRepository: UserRepository;
  let sessionRepository: SessionRepository;
  let vaultRepository: VaultRepository;
  let successorRepository: SuccessorRepository;
  let successorVaultEntryRepository: SuccessorVaultEntryRepository;
  let handoverProcessRepository: HandoverProcessRepository;
  let inactivitySettingsRepository: InactivitySettingsRepository;
  let activityRepository: ActivityRepository;
  let checkinTokenRepository: CheckinTokenRepository;
  let notificationDeliveryRepository: NotificationDeliveryRepository;
  let systemStatusRepository: SystemStatusRepository;
  let successorNotificationRepository: SuccessorNotificationRepository;

  beforeAll(async () => {
    await recreateDatabase();

    dbClient = new DatabaseClient();
    await dbClient.initialize({
      ...getDbConnectionConfig(DB_NAME),
      connectionTimeoutMillis: 10000,
    });

    db = dbClient.getKysely();
    userRepository = new UserRepository(db);
    sessionRepository = new SessionRepository(db);
    vaultRepository = new VaultRepository(db);
    successorRepository = new SuccessorRepository(db);
    successorVaultEntryRepository = new SuccessorVaultEntryRepository(db);
    handoverProcessRepository = new HandoverProcessRepository(db);
    inactivitySettingsRepository = new InactivitySettingsRepository(db);
    activityRepository = new ActivityRepository(db);
    checkinTokenRepository = new CheckinTokenRepository(db);
    notificationDeliveryRepository = new NotificationDeliveryRepository(db);
    systemStatusRepository = new SystemStatusRepository(db);
    successorNotificationRepository = new SuccessorNotificationRepository(db);
  });

  afterAll(async () => {
    await dbClient.close();
    await dropDatabase();
  });

  it("covers user, session, inactivity, and activity repositories", async () => {
    const primaryUser = await userRepository.create(
      buildUserPayload("primary"),
    );
    const secondaryUser = await userRepository.create(
      buildUserPayload("secondary"),
    );

    expect(await userRepository.findByEmail(primaryUser.email)).not.toBeNull();
    expect(await userRepository.findById(primaryUser.id)).not.toBeNull();

    await userRepository.incrementFailedAttempts(primaryUser.id);
    await userRepository.lockAccount(
      primaryUser.id,
      new Date(Date.now() + 5 * 60 * 1000),
    );

    let refreshedPrimary = await userRepository.findById(primaryUser.id);
    expect(refreshedPrimary?.failed_login_attempts).toBe(1);
    expect(refreshedPrimary?.locked_until).not.toBeNull();

    await userRepository.updateLastLogin(primaryUser.id);
    refreshedPrimary = await userRepository.findById(primaryUser.id);
    expect(refreshedPrimary?.failed_login_attempts).toBe(0);
    expect(refreshedPrimary?.locked_until).toBeNull();
    expect(refreshedPrimary?.last_login).not.toBeNull();

    const updatedPrimary = await userRepository.update(primaryUser.id, {
      name: "updated-name",
    });
    expect(updatedPrimary.name).toBe("updated-name");

    await userRepository.update(secondaryUser.id, {
      last_login: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
    });
    const inactiveUsers = await userRepository.findInactiveUsers(90);
    expect(inactiveUsers.map((user) => user.id)).toContain(secondaryUser.id);

    const activeSession = await sessionRepository.create({
      user_id: primaryUser.id,
      token_hash: `active-token-${randomUUID()}`,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      ip_address: "127.0.0.1",
      user_agent: "jest-active-agent",
    });

    await sessionRepository.create({
      user_id: primaryUser.id,
      token_hash: `expired-token-${randomUUID()}`,
      expires_at: new Date(Date.now() - 60 * 1000),
      ip_address: "127.0.0.1",
      user_agent: "jest-expired-agent",
    });

    expect(await sessionRepository.findById(activeSession.id)).not.toBeNull();
    expect(
      await sessionRepository.findByTokenHash(activeSession.token_hash),
    ).not.toBeNull();

    const activeSessions = await sessionRepository.findByUserId(primaryUser.id);
    expect(activeSessions).toHaveLength(1);

    await sessionRepository.updateLastActivity(activeSession.id);
    const sessionAfterActivity = await sessionRepository.findById(
      activeSession.id,
    );
    expect(sessionAfterActivity?.last_activity).not.toBeNull();

    const deletedExpiredSessions = await sessionRepository.deleteExpired();
    expect(deletedExpiredSessions).toBeGreaterThanOrEqual(1);

    await expect(
      sessionRepository.delete("00000000-0000-0000-0000-000000000001"),
    ).rejects.toBeInstanceOf(NotFoundError);

    await inactivitySettingsRepository.create({
      user_id: primaryUser.id,
      threshold_days: 60,
      require_majority: true,
      notification_methods: ["email", "sms"],
      emergency_contacts: {
        contacts: [{ name: "Emergency Contact" }],
      },
      is_paused: false,
      pause_reason: null,
      paused_until: null,
    });

    await inactivitySettingsRepository.create({
      user_id: secondaryUser.id,
      threshold_days: 120,
      require_majority: false,
      notification_methods: ["email"],
      emergency_contacts: null,
      is_paused: true,
      pause_reason: "vacation",
      paused_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const primarySettings = await inactivitySettingsRepository.findByUserId(
      primaryUser.id,
    );
    expect(primarySettings?.threshold_days).toBe(60);

    await inactivitySettingsRepository.update(primaryUser.id, {
      threshold_days: 75,
      is_paused: false,
    });

    const activeSettings = await inactivitySettingsRepository.findAllActive();
    const activeSettingsUserIds = activeSettings.map(
      (settings) => settings.user_id,
    );
    expect(activeSettingsUserIds).toContain(primaryUser.id);
    expect(activeSettingsUserIds).not.toContain(secondaryUser.id);

    const oldActivity = await activityRepository.create({
      user_id: primaryUser.id,
      activity_type: "LOGIN_FAILED_PASSWORD",
      ip_address: "127.0.0.1",
      user_agent: "jest-old-activity",
      metadata: { reason: "wrong password" },
      signature: "manual-signature-1",
    });

    await db
      .updateTable("activity_records")
      .set({ created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) })
      .where("id", "=", oldActivity.id)
      .execute();

    await activityRepository.create({
      user_id: primaryUser.id,
      activity_type: "LOGIN_SUCCESS",
      ip_address: "127.0.0.1",
      user_agent: "jest-recent-activity",
      metadata: { source: "integration-test" },
      signature: "manual-signature-2",
    });

    const activityByUser = await activityRepository.findByUserId(
      primaryUser.id,
      10,
      0,
    );
    expect(activityByUser.length).toBeGreaterThanOrEqual(2);
    expect(
      await activityRepository.countByUserId(primaryUser.id),
    ).toBeGreaterThanOrEqual(2);

    const lastActivity = await activityRepository.findLastActivity(
      primaryUser.id,
    );
    expect(lastActivity?.activity_type).toBe("LOGIN_SUCCESS");

    const failedLogins = await activityRepository.findFailedLogins(
      primaryUser.id,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    );
    expect(failedLogins.map((activity) => activity.activity_type)).toContain(
      "LOGIN_FAILED_PASSWORD",
    );

    const byAction = await activityRepository.findByAction(
      primaryUser.id,
      "LOGIN_SUCCESS",
      5,
    );
    expect(byAction).toHaveLength(1);

    const inDateRange = await activityRepository.findByDateRange(
      primaryUser.id,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date(),
      ["LOGIN_SUCCESS"],
    );
    expect(inDateRange.map((activity) => activity.activity_type)).toEqual([
      "LOGIN_SUCCESS",
    ]);

    const deletedOldActivityRows = await activityRepository.deleteOlderThan(
      new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    );
    expect(deletedOldActivityRows).toBeGreaterThanOrEqual(1);
  });

  it("covers vault, successor, and successor assignment repositories", async () => {
    const owner = await userRepository.create(buildUserPayload("vault-owner"));

    const firstEntry = await vaultRepository.create({
      user_id: owner.id,
      encrypted_data: Buffer.from("ciphertext-1"),
      iv: Buffer.from("iv-1"),
      salt: Buffer.from("salt-1"),
      algorithm: "AES-256-GCM",
      category: "finance",
      tags: ["important", "banking"],
      version: 1,
    });

    const secondEntry = await vaultRepository.create({
      user_id: owner.id,
      encrypted_data: Buffer.from("ciphertext-2"),
      iv: Buffer.from("iv-2"),
      salt: Buffer.from("salt-2"),
      algorithm: "AES-256-GCM",
      category: "legal",
      tags: ["documents"],
      version: 1,
    });

    expect(
      await vaultRepository.findById(firstEntry.id, owner.id),
    ).not.toBeNull();

    const allEntries = await vaultRepository.findByUserId(owner.id);
    expect(allEntries).toHaveLength(2);

    const financeEntries = await vaultRepository.findByUserId(owner.id, {
      category: "finance",
    });
    expect(financeEntries).toHaveLength(1);
    expect(financeEntries[0]?.id).toBe(firstEntry.id);

    const taggedEntries = await vaultRepository.findByUserId(owner.id, {
      tag: "documents",
    });
    expect(taggedEntries).toHaveLength(1);
    expect(taggedEntries[0]?.id).toBe(secondEntry.id);

    const entriesByIds = await vaultRepository.findByIds(owner.id, [
      firstEntry.id,
      secondEntry.id,
      randomUUID(),
    ]);
    expect(entriesByIds).toHaveLength(2);

    const categories = await vaultRepository.getCategories(owner.id);
    expect(categories).toEqual(["finance", "legal"]);

    const tags = await vaultRepository.getTags(owner.id);
    expect(tags).toEqual(["banking", "documents", "important"]);

    expect(await vaultRepository.getCount(owner.id)).toBe(2);

    const updatedEntry = await vaultRepository.update(firstEntry.id, owner.id, {
      category: "updated-finance",
      tags: ["banking", "updated"],
    });
    expect(updatedEntry.category).toBe("updated-finance");
    expect(updatedEntry.tags).toEqual(["banking", "updated"]);

    await vaultRepository.delete(secondEntry.id, owner.id);
    expect(await vaultRepository.getCount(owner.id)).toBe(1);

    await expect(
      vaultRepository.delete(secondEntry.id, owner.id),
    ).rejects.toBeInstanceOf(NotFoundError);

    const successor = await successorRepository.create({
      user_id: owner.id,
      email: `successor-${Date.now()}@example.com`,
      name: "Primary Successor",
      verification_token: randomUUID(),
      verified: false,
      encrypted_share: "encrypted-share",
      restrict_to_assigned_entries: false,
      handover_delay_days: 7,
    });

    expect(await successorRepository.findById(successor.id)).not.toBeNull();
    expect((await successorRepository.findByUserId(owner.id)).length).toBe(1);

    const updatedSuccessor = await successorRepository.update(successor.id, {
      verified: true,
      restrict_to_assigned_entries: true,
    });
    expect(updatedSuccessor.verified).toBe(true);
    expect(updatedSuccessor.restrict_to_assigned_entries).toBe(true);

    await successorVaultEntryRepository.replaceBySuccessorId(successor.id, [
      firstEntry.id,
    ]);
    let assignedEntries = await successorVaultEntryRepository.findBySuccessorId(
      successor.id,
    );
    expect(assignedEntries).toHaveLength(1);
    expect(assignedEntries[0]?.vault_entry_id).toBe(firstEntry.id);

    await successorVaultEntryRepository.replaceBySuccessorId(successor.id, []);
    assignedEntries = await successorVaultEntryRepository.findBySuccessorId(
      successor.id,
    );
    expect(assignedEntries).toHaveLength(0);

    await successorRepository.delete(successor.id);
    expect(await successorRepository.findById(successor.id)).toBeNull();
  });

  it("covers handover, delivery, check-in, system status, and successor notification repositories", async () => {
    const owner = await userRepository.create(
      buildUserPayload("handover-owner"),
    );
    const successor = await successorRepository.create({
      user_id: owner.id,
      email: `handover-successor-${Date.now()}@example.com`,
      name: "Handover Successor",
      verification_token: randomUUID(),
      verified: true,
      encrypted_share: "encrypted-share",
      restrict_to_assigned_entries: false,
      handover_delay_days: 5,
    });

    const activeProcess = await handoverProcessRepository.create({
      user_id: owner.id,
      status: "grace_period",
      grace_period_ends: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      completed_at: null,
      cancelled_at: null,
      cancellation_reason: null,
      metadata: { source: "manual-trigger" },
    });

    const expiredUppercaseProcess = await handoverProcessRepository.create({
      user_id: owner.id,
      status: "GRACE_PERIOD",
      grace_period_ends: new Date(Date.now() - 24 * 60 * 60 * 1000),
      completed_at: null,
      cancelled_at: null,
      cancellation_reason: null,
      metadata: { source: "legacy-status" },
    });

    expect(
      await handoverProcessRepository.findById(activeProcess.id),
    ).not.toBeNull();
    expect(
      (await handoverProcessRepository.findByUserId(owner.id)).length,
    ).toBe(2);

    const activeForUser = await handoverProcessRepository.findActiveByUserId(
      owner.id,
    );
    expect(activeForUser).not.toBeNull();

    const byStatus =
      await handoverProcessRepository.findByStatus("grace_period");
    expect(byStatus.map((process) => process.id)).toContain(activeProcess.id);

    const expiredGracePeriods =
      await handoverProcessRepository.findExpiredGracePeriods();
    expect(expiredGracePeriods.map((process) => process.id)).toContain(
      expiredUppercaseProcess.id,
    );

    const completedProcess = await handoverProcessRepository.update(
      activeProcess.id,
      {
        status: "completed",
        completed_at: new Date(),
      },
    );
    expect(completedProcess.status).toBe("completed");

    const successorNotification = await successorNotificationRepository.create({
      handover_process_id: expiredUppercaseProcess.id,
      successor_id: successor.id,
      response_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      verification_status: "PENDING",
      verification_token: randomUUID(),
      verified_at: null,
    });
    expect(successorNotification.id).toBeDefined();

    const notificationsByProcess =
      await successorNotificationRepository.findByHandoverProcess(
        expiredUppercaseProcess.id,
      );
    expect(notificationsByProcess).toHaveLength(1);

    const pendingVerifications =
      await successorNotificationRepository.findPendingVerifications();
    expect(
      pendingVerifications.map((notification) => notification.id),
    ).toContain(successorNotification.id);

    const verifiedNotification = await successorNotificationRepository.update(
      expiredUppercaseProcess.id,
      successor.id,
      {
        verification_status: "VERIFIED",
        verified_at: new Date(),
      },
    );
    expect(verifiedNotification.verification_status).toBe("VERIFIED");

    const sentDelivery = await notificationDeliveryRepository.create({
      user_id: owner.id,
      handover_process_id: expiredUppercaseProcess.id,
      notification_type: "first_reminder",
      method: "email",
      recipient: owner.email,
      status: "sent",
      delivered_at: new Date(),
      retry_count: 0,
      error_message: null,
    });
    expect(sentDelivery.id).toBeDefined();

    await notificationDeliveryRepository.create({
      user_id: owner.id,
      handover_process_id: expiredUppercaseProcess.id,
      notification_type: "second_reminder",
      method: "email",
      recipient: owner.email,
      status: "pending",
      delivered_at: null,
      retry_count: 1,
      error_message: null,
    });

    const deliveriesByUser = await notificationDeliveryRepository.findByUserId(
      owner.id,
      10,
    );
    expect(deliveriesByUser).toHaveLength(2);

    const lastReminder = await notificationDeliveryRepository.findLastByType(
      owner.id,
      "first_reminder",
    );
    expect(lastReminder?.id).toBe(sentDelivery.id);

    const pendingRetries =
      await notificationDeliveryRepository.findPendingRetries(3);
    expect(
      pendingRetries.map((delivery) => delivery.notification_type),
    ).toContain("second_reminder");

    const activeTokenHash = `checkin-${randomUUID()}`;
    await checkinTokenRepository.create({
      user_id: owner.id,
      token_hash: activeTokenHash,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      used_at: null,
      ip_address: null,
      user_agent: null,
    });

    expect(
      await checkinTokenRepository.findByTokenHash(activeTokenHash),
    ).not.toBeNull();

    await checkinTokenRepository.markAsUsed(
      activeTokenHash,
      "127.0.0.1",
      "jest-checkin-agent",
    );
    const usedToken =
      await checkinTokenRepository.findByTokenHash(activeTokenHash);
    expect(usedToken?.used_at).not.toBeNull();
    expect(usedToken?.ip_address).toBe("127.0.0.1");

    const expiredTokenHash = `expired-checkin-${randomUUID()}`;
    await checkinTokenRepository.create({
      user_id: owner.id,
      token_hash: expiredTokenHash,
      expires_at: new Date(Date.now() - 60 * 1000),
      used_at: null,
      ip_address: null,
      user_agent: null,
    });
    const deletedExpiredCheckinTokens =
      await checkinTokenRepository.deleteExpired();
    expect(deletedExpiredCheckinTokens).toBeGreaterThanOrEqual(1);

    await expect(
      checkinTokenRepository.markAsUsed(`missing-token-${randomUUID()}`),
    ).rejects.toBeInstanceOf(NotFoundError);

    await systemStatusRepository.create({
      status: "maintenance",
      downtime_start: new Date(Date.now() - 2 * 60 * 60 * 1000),
      downtime_end: null,
      reason: "scheduled maintenance window",
    });

    expect((await systemStatusRepository.getCurrent())?.status).toBe(
      "maintenance",
    );

    await systemStatusRepository.endCurrentDowntime();

    await systemStatusRepository.create({
      status: "operational",
      downtime_start: null,
      downtime_end: null,
      reason: null,
    });

    const currentStatus = await systemStatusRepository.getCurrent();
    expect(currentStatus?.status).toBe("operational");

    const downtimeEntries = await systemStatusRepository.getDowntimeSince(
      new Date(Date.now() - 24 * 60 * 60 * 1000),
    );
    expect(downtimeEntries.map((entry) => entry.status)).toContain(
      "maintenance",
    );
    expect(downtimeEntries.every((entry) => entry.downtime_end !== null)).toBe(
      true,
    );
  });
});
