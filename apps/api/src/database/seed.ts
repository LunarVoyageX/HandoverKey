import { getDatabaseClient } from "@handoverkey/database";
import bcrypt from "bcryptjs";

async function seedDatabase(): Promise<void> {
  const dbClient = getDatabaseClient();

  try {
    console.log("Starting database seeding...");

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

    // Check if we're in development mode
    if (process.env.NODE_ENV === "production") {
      console.log("Skipping seed in production environment");
      return;
    }

    // Create a test user for development
    const testEmail = "test@handoverkey.com";
    const testPassword = "TestPassword123!";

    // Check if test user already exists
    const existingUser = await dbClient.query(async (db) => {
      return await db
        .selectFrom("users")
        .select("id")
        .where("email", "=", testEmail)
        .executeTakeFirst();
    });

    if (existingUser) {
      console.log("Test user already exists, skipping seed");
      return;
    }

    // Create test user
    const passwordHash = await bcrypt.hash(testPassword, 12);
    const salt = Buffer.from("test-salt-for-development", "utf8");

    const user = await dbClient.query(async (db) => {
      return await db
        .insertInto("users")
        .values({
          email: testEmail,
          password_hash: passwordHash,
          salt,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    });

    const userId = user.id;
    console.log(`✓ Created test user: ${testEmail}`);

    // Create a test successor
    await dbClient.query(async (db) => {
      return await db
        .insertInto("successors")
        .values({
          user_id: userId,
          email: "successor@handoverkey.com",
          name: "Test Successor",
          verified: true,
          handover_delay_days: 90,
        })
        .execute();
    });

    console.log("✓ Created test successor");

    // Create some test vault entries (encrypted with a test key)
    const testEntries = [
      {
        user_id: userId,
        encrypted_data: Buffer.from("encrypted-password-data", "utf8"),
        iv: Buffer.from("test-iv-12345", "utf8"),
        salt: Buffer.from("test-salt-12345", "utf8"),
        algorithm: "AES-GCM",
        category: "Passwords",
        tags: ["social", "facebook"],
        size_bytes: 23,
      },
      {
        user_id: userId,
        encrypted_data: Buffer.from("encrypted-document-data", "utf8"),
        iv: Buffer.from("test-iv-67890", "utf8"),
        salt: Buffer.from("test-salt-67890", "utf8"),
        algorithm: "AES-GCM",
        category: "Documents",
        tags: ["legal", "important"],
        size_bytes: 23,
      },
    ];

    for (const entry of testEntries) {
      await dbClient.query(async (db) => {
        return await db.insertInto("vault_entries").values(entry).execute();
      });
    }

    console.log("✓ Created test vault entries");

    console.log("Database seeding completed successfully!");
    console.log("");
    console.log("Test credentials:");
    console.log(`Email: ${testEmail}`);
    console.log(`Password: ${testPassword}`);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  } finally {
    await dbClient.close();
  }
}

if (require.main === module) {
  seedDatabase();
}

export { seedDatabase };
