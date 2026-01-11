/* eslint-disable @typescript-eslint/no-explicit-any */
import request from "supertest";
import app, { appInit } from "../../app";
import { getDatabaseClient } from "@handoverkey/database";
import { SessionService } from "../../services/session-service";
import { HandoverOrchestrator } from "../../services/handover-orchestrator";
import { initializeRedis, closeRedis } from "../../config/redis";
import { HandoverProcessStatus } from "@handoverkey/shared/src/types/dead-mans-switch";

// Helpers
async function register(email: string) {
  const password = "Password123!@$";

  // Register
  await request(app).post("/api/v1/auth/register").send({
    name: "Test User",
    email,
    password,
    confirmPassword: password,
  });

  // Verify email
  const dbClient = getDatabaseClient();
  const db = dbClient.getKysely();
  const user = await db
    .selectFrom("users")
    .select(["verification_token", "id"])
    .where("email", "=", email)
    .executeTakeFirst();

  if (!user || !user.verification_token)
    throw new Error("User registration failed");

  await request(app).get(
    `/api/v1/auth/verify-email?token=${user.verification_token}`,
  );

  return { email, password, userId: user.id };
}

async function login(email: string) {
  const password = "Password123!@$";
  const loginRes = await request(app).post("/api/v1/auth/login").send({
    email,
    password,
  });
  return loginRes.body.tokens.accessToken;
}

describe("Handover Flow Integration", () => {
  jest.setTimeout(30000);
  beforeAll(async () => {
    const dbClient = getDatabaseClient();
    await dbClient.initialize({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: "handoverkey_test",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      min: 2,
      max: 10,
    });

    SessionService.initialize(dbClient);
    await initializeRedis();
    await appInit;
  });

  afterAll(async () => {
    await closeRedis();
    await getDatabaseClient().close();
  });

  it("should store encrypted key share when adding a successor", async () => {
    const email = `share-test-${Date.now()}@example.com`;
    await register(email);
    const token = await login(email);
    const auth = { Authorization: `Bearer ${token}` };

    // 1. Create a Vault Entry
    await request(app).post("/api/v1/vault/entries").set(auth).send({
      encryptedData: "test-data",
      iv: "test-iv",
      algorithm: "AES-GCM",
      category: "Login",
      tags: ["test"],
    });

    // 2. Add Successor with Encrypted Share
    const share = "encrypted-shamir-share-v1";
    const res = await request(app)
      .post("/api/v1/successors")
      .set(auth)
      .send({
        email: "successor-share@example.com",
        name: "Key Share Holder",
        handoverDelayDays: 14,
        encryptedShare: share,
      });

    expect(res.status).toBe(201);

    // 3. Verify Share Persisted
    const listRes = await request(app).get("/api/v1/successors").set(auth);
    expect(listRes.status).toBe(200);
    const successor = listRes.body.successors.find(
      (s: any) => s.email === "successor-share@example.com",
    );
    expect(successor).toBeDefined();
    expect(successor.encryptedShare).toBe(share);
  });

  it("should initiate handover, cancel it, and verify status", async () => {
    const email = `handover-test-${Date.now()}@example.com`;
    const { userId } = await register(email);
    const orchestrator = new HandoverOrchestrator();

    // 1. Manually Initiate Handover
    const process = await orchestrator.initiateHandover(userId);
    expect(process).toBeDefined();
    expect(process.status).toBe(HandoverProcessStatus.GRACE_PERIOD);

    // 2. Cancel Handover
    await orchestrator.cancelHandover(
      userId,
      "User manually cancelled",
    );

    // 3. Verify Status via direct DB check since getHandoverStatus might return null for cancelled
    const dbClient = getDatabaseClient();
    const db = dbClient.getKysely();
    const cancelledProcess = await db
      .selectFrom("handover_processes")
      .selectAll()
      .where("user_id", "=", userId)
      .where("status", "=", HandoverProcessStatus.CANCELLED)
      .executeTakeFirst();

    expect(cancelledProcess).toBeDefined();
    expect(cancelledProcess!.status).toBe(HandoverProcessStatus.CANCELLED);
    expect(cancelledProcess!.cancellation_reason).toBe(
      "User manually cancelled",
    );
    expect(cancelledProcess!.cancelled_at).toBeDefined();
  });

  it("should process grace period expiration", async () => {
    const email = `grace-test-${Date.now()}@example.com`;
    const { userId } = await register(email);
    const token = await login(email);

    // 1. Add Successor
    const res = await request(app)
      .post("/api/v1/successors")
      .set({ Authorization: `Bearer ${token}` })
      .send({
        email: "grace-successor@example.com",
        name: "Grace Successor",
        handoverDelayDays: 7,
        encryptedShare: "share-data",
      });
    expect(res.status).toBe(201);

    const orchestrator = new HandoverOrchestrator();

    // 2. Initiate Handover
    const process = await orchestrator.initiateHandover(userId);
    expect(process.status).toBe(HandoverProcessStatus.GRACE_PERIOD);

    // 3. Process Expiration
    await orchestrator.processGracePeriodExpiration(process.id);

    // 4. Verify Status Transition to AWAITING_SUCCESSORS
    const updated = await orchestrator.getHandoverStatus(userId);
    expect(updated).toBeDefined();
    expect(updated!.status).toBe(HandoverProcessStatus.AWAITING_SUCCESSORS);

    // 5. Verify Notification (Optional: Check logs or mock email service if not already mocked globally)
    // Since we are monitoring logs in the run output, we can see if it worked.
  }, 10000);

  it("should deny successor access during grace period and allow after expiration", async () => {
    const email = `access-test-${Date.now()}@example.com`;
    const { userId } = await register(email);
    const token = await login(email);

    // 1. Create a Vault Entry (so there is something to retrieve)
    await request(app)
      .post("/api/v1/vault/entries")
      .set({ Authorization: `Bearer ${token}` })
      .send({
        encryptedData: Buffer.from("secret-data").toString("base64"),
        iv: "c2VjcmV0LWl2LTEy", // 16 chars base64 = 12 bytes
        salt: Buffer.from("salt").toString("base64"),
        algorithm: "AES-GCM",
        category: "Notes",
        tags: ["secret"],
      });

    // 2. Add Successor
    await request(app)
      .post("/api/v1/successors")
      .set({ Authorization: `Bearer ${token}` })
      .send({
        email: "access-successor@example.com",
        name: "Access Successor",
        handoverDelayDays: 7,
      });

    // 3. Get Successor Verification Token directly from DB
    const db = getDatabaseClient().getKysely();
    const successor = await db
      .selectFrom("successors")
      .select("verification_token")
      .where("user_id", "=", userId)
      .executeTakeFirstOrThrow();

    const verificationToken = successor.verification_token;

    // 4. Initiate Handover (Status: GRACE_PERIOD)
    const orchestrator = new HandoverOrchestrator();
    const process = await orchestrator.initiateHandover(userId);
    expect(process.status).toBe(HandoverProcessStatus.GRACE_PERIOD);

    // 5. Successor tries to verify/access -> Should fail (403 or logic specific)
    // Actually, verify endpoint might work (to show status), but access endpoint should fail.
    const verifyRes = await request(app).get(
      `/api/v1/successors/verify?token=${verificationToken}`,
    );
    expect(verifyRes.status).toBe(200);

    // 6. Successor tries to GET vault entries -> Should be 403 Forbidden
    const accessRes = await request(app).get(
      `/api/v1/vault/successor-access?token=${verificationToken}`,
    );
    expect(accessRes.status).toBe(403);
    expect(accessRes.body.error).toMatch(/not yet open/i);

    // 7. Expire Grace Period
    await orchestrator.processGracePeriodExpiration(process.id);

    // 8. Successor tries to GET vault entries -> Should be 200 OK
    const accessResAllowed = await request(app).get(
      `/api/v1/vault/successor-access?token=${verificationToken}`,
    );
    expect(accessResAllowed.status).toBe(200);
    expect(accessResAllowed.body.entries).toHaveLength(1);
    expect(accessResAllowed.body.entries[0].encryptedData).toBe(
      Buffer.from("secret-data").toString("base64"),
    );
  });

  it("should handle bulk update of successor shares", async () => {
    const email = `bulk-test-${Date.now()}@example.com`;
    await register(email);
    const token = await login(email);
    const auth = { Authorization: `Bearer ${token}` };

    // 1. Add 3 Successors
    const successors = [];
    for (let i = 1; i <= 3; i++) {
      const res = await request(app)
        .post("/api/v1/successors")
        .set(auth)
        .send({
          email: `successor-${i}@example.com`,
          name: `Successor ${i}`,
        });
      successors.push(res.body.successor);
    }

    // 2. Bulk Update Shares
    const shareUpdates = successors.map((s, index) => ({
      id: s.id,
      encryptedShare: `share-for-${index + 1}`,
    }));

    const updateRes = await request(app)
      .put("/api/v1/successors/shares")
      .set(auth)
      .send({ shares: shareUpdates });

    expect(updateRes.status).toBe(200);

    // 3. Verify Updates in DB
    const listRes = await request(app).get("/api/v1/successors").set(auth);
    const updatedSuccessors = listRes.body.successors;

    expect(updatedSuccessors).toHaveLength(3);
    updatedSuccessors.forEach((s: any) => {
      // Find expected share
      const expected = shareUpdates.find((u) => u.id === s.id);
      expect(s.encryptedShare).toBe(expected!.encryptedShare);
    });
  });
});
