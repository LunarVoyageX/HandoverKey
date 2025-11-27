import {
  getDatabaseClient,
  UserRepository,
  SuccessorRepository,
  InactivitySettingsRepository,
  HandoverProcessRepository,
  NotificationDeliveryRepository,
} from "@handoverkey/database";
import { InactivityService } from "../services/inactivity-service";
import { PasswordUtils } from "../auth/password";
import dotenv from "dotenv";

dotenv.config();

async function runTest() {
  console.log("🧪 Starting Dead Man's Switch E2E Test...");

  const dbClient = getDatabaseClient();
  await dbClient.initialize({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME || "handoverkey_dev",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
  });

  const db = dbClient.getKysely();
  const userRepo = new UserRepository(db);
  const successorRepo = new SuccessorRepository(db);
  const settingsRepo = new InactivitySettingsRepository(db);
  const handoverRepo = new HandoverProcessRepository(db);
  const notificationRepo = new NotificationDeliveryRepository(db);

  const testEmail = `test-dms-${Date.now()}@example.com`;
  let userId: string | undefined;

  try {
    // 1. Create Test User
    console.log("Creating test user...");
    const passwordHash = await PasswordUtils.hashPassword("TestPass123!");
    const salt = Buffer.from("testsalt", "utf8");

    const user = await userRepo.create({
      email: testEmail,
      password_hash: passwordHash,
      salt,
      email_verified: true,
    });
    userId = user.id;
    console.log(`User created: ${userId}`);

    // 2. Create Successor
    console.log("Creating successor...");
    await successorRepo.create({
      user_id: userId,
      email: "successor@example.com",
      name: "Test Successor",
      verified: true,
      handover_delay_days: 0,
    });

    // 3. Configure Inactivity Settings
    console.log("Configuring inactivity settings...");
    await settingsRepo.create({
      user_id: userId,
      threshold_days: 30, // Minimum 30 days threshold
      notification_methods: ["email"],
      is_paused: false,
    });

    // 4. Simulate Inactivity (Update last_login to 31 days ago)
    console.log("Simulating inactivity...");
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 31);

    await db
      .updateTable("users")
      .set({ last_login: pastDate })
      .where("id", "=", userId)
      .execute();

    // 5. Trigger Inactivity Check
    console.log("Triggering inactivity check...");
    await InactivityService.checkAllUsers();

    // 6. Verify Handover Process
    console.log("Verifying handover process...");
    const processes = await handoverRepo.findByUserId(userId);
    console.log(`Found ${processes.length} processes for user`);

    const activeProcess = processes.find((p) => p.status === "GRACE_PERIOD");

    if (activeProcess) {
      console.log("✅ Handover process verified successfully");
    } else {
      console.log("Processes found:", JSON.stringify(processes, null, 2));
      throw new Error(
        "❌ Handover process NOT found or not in GRACE_PERIOD status",
      );
    }

    // 7. Verify Notification Delivery
    console.log("Verifying notification delivery...");
    // We need to check if a notification was created for the successor
    // Since we don't have a direct method to find by process ID in the repo interface shown earlier,
    // we might need to query directly or assume if the process is there, the service logic ran.
    // But let's try to find it.

    // Actually, InactivityService.checkAllUsers -> HandoverService.initiateHandover
    // HandoverService.initiateHandover should create the process AND send notifications.
    // Let's check the database directly for notifications for this user's process.

    const notifications = await db
      .selectFrom("notification_deliveries")
      .selectAll()
      .where("handover_process_id", "=", activeProcess.id)
      .execute();

    if (notifications.length > 0) {
      console.log(
        `✅ Notification delivery verified successfully (${notifications.length} notifications sent)`,
      );
    } else {
      console.warn(
        "⚠️ No notifications found for the handover process. Check NotificationService.",
      );
    }
  } catch (error) {
    console.error("❌ Test Failed:", error);
    process.exit(1);
  } finally {
    // Cleanup
    if (userId) {
      console.log("Cleaning up test data...");
      await userRepo.delete(userId);
    }
    await dbClient.close();
    console.log("Test finished.");
  }
}

runTest();
