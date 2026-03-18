/* eslint-disable @typescript-eslint/no-explicit-any */
import request from "supertest";
import app, { appInit } from "../../app";
import { getDatabaseClient } from "@handoverkey/database";
import { SessionService } from "../../services/session-service";
import { initializeRedis, closeRedis } from "../../config/redis";
import { HandoverOrchestrator } from "../../services/handover-orchestrator";

// Helpers
async function registerAndLogin() {
  const unique = Date.now();
  const email = `int-${unique}@example.com`;
  const password = "Password123!@$";

  const registerRes = await (
    request(app).post("/api/v1/auth/register") as any
  ).send({ name: "Test User", email, password, confirmPassword: password });

  expect(registerRes.status).toBe(201);

  // Get the verification token from database
  const dbClient = getDatabaseClient();
  const db = dbClient.getKysely();
  const user = await db
    .selectFrom("users")
    .select(["id", "verification_token"])
    .where("email", "=", email)
    .executeTakeFirst();

  expect(user).toBeDefined();
  expect(user!.verification_token).toBeDefined();

  // Verify the email
  const verifyRes = await request(app).get(
    `/api/v1/auth/verify-email?token=${user!.verification_token}`,
  );
  expect(verifyRes.status).toBe(200);

  const loginRes = await (request(app).post("/api/v1/auth/login") as any).send({
    email,
    password,
  });

  expect(loginRes.status).toBe(200);

  const cookies = loginRes.headers["set-cookie"];
  const accessCookie = (Array.isArray(cookies) ? cookies : [cookies]).find(
    (c: string) => c?.startsWith("accessToken="),
  );
  if (!accessCookie) throw new Error("No accessToken cookie in login response");
  const token = accessCookie.split(";")[0].split("=")[1];
  return { token, email, userId: user!.id };
}

describe("Vault and Successors Integration", () => {
  jest.setTimeout(120000);
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

  it("creates and retrieves a vault entry, adds successor, and reads settings", async () => {
    const { token } = await registerAndLogin();
    const auth = { Authorization: `Bearer ${token}` };

    const createRes = await (request(app).post("/api/v1/vault/entries") as any)
      .set(auth)
      .send({
        encryptedData: Buffer.from("demo-secret").toString("base64"),
        iv: Buffer.from("123456789012").toString("base64"), // 12 bytes = 16 chars in base64
        salt: Buffer.from("salt-demo").toString("base64"),
        algorithm: "AES-GCM",
        category: "Login",
        tags: ["test"],
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body).toHaveProperty("id");

    const listRes = await (
      request(app).get("/api/v1/vault/entries") as any
    ).set(auth);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.length).toBeGreaterThanOrEqual(1);

    const successorRes = await (request(app).post("/api/v1/successors") as any)
      .set(auth)
      .send({
        email: "successor@example.com",
        name: "Successor 1",
        handoverDelayDays: 30,
      });
    expect(successorRes.status).toBe(201);

    const getSuccessors = await (
      request(app).get("/api/v1/successors") as any
    ).set(auth);
    expect(getSuccessors.status).toBe(200);
    expect(Array.isArray(getSuccessors.body.successors)).toBe(true);

    const settingsRes = await (
      request(app).get("/api/v1/inactivity/settings") as any
    ).set(auth);
    expect(settingsRes.status).toBe(200);
    expect(settingsRes.body).toHaveProperty("thresholdDays");
  });

  it("exports and re-imports encrypted vault entries", async () => {
    const { token } = await registerAndLogin();
    const auth = { Authorization: `Bearer ${token}` };

    await request(app)
      .post("/api/v1/vault/entries")
      .set(auth)
      .send({
        encryptedData: Buffer.from("export-secret-1").toString("base64"),
        iv: Buffer.from("123456789012").toString("base64"),
        salt: Buffer.from("salt-export-1").toString("base64"),
        algorithm: "AES-GCM",
        category: "Login",
        tags: ["export"],
      });

    await request(app)
      .post("/api/v1/vault/entries")
      .set(auth)
      .send({
        encryptedData: Buffer.from("export-secret-2").toString("base64"),
        iv: Buffer.from("ABCDEFGHIJKL").toString("base64"),
        salt: Buffer.from("salt-export-2").toString("base64"),
        algorithm: "AES-GCM",
        category: "Notes",
        tags: ["backup"],
      });

    const exportRes = await request(app).get("/api/v1/vault/export").set(auth);
    expect(exportRes.status).toBe(200);
    expect(exportRes.body).toHaveProperty("version", "1.0");
    expect(Array.isArray(exportRes.body.entries)).toBe(true);
    expect(exportRes.body.entries.length).toBeGreaterThanOrEqual(2);

    const importRes = await request(app)
      .post("/api/v1/vault/import")
      .set(auth)
      .send({
        mode: "replace",
        entries: exportRes.body.entries,
      });
    expect(importRes.status).toBe(200);
    expect(importRes.body).toHaveProperty(
      "total",
      exportRes.body.entries.length,
    );
  });

  it("applies per-successor entry assignment during successor access", async () => {
    const { token, userId } = await registerAndLogin();
    const auth = { Authorization: `Bearer ${token}` };

    const createFirst = await request(app)
      .post("/api/v1/vault/entries")
      .set(auth)
      .send({
        encryptedData: Buffer.from("assigned-entry").toString("base64"),
        iv: Buffer.from("123456789012").toString("base64"),
        salt: Buffer.from("salt-assigned").toString("base64"),
        algorithm: "AES-GCM",
        category: "Assigned",
        tags: ["assigned"],
      });
    expect(createFirst.status).toBe(201);
    const assignedEntryId = createFirst.body.id as string;

    const createSecond = await request(app)
      .post("/api/v1/vault/entries")
      .set(auth)
      .send({
        encryptedData: Buffer.from("unassigned-entry").toString("base64"),
        iv: Buffer.from("ABCDEFGHIJKL").toString("base64"),
        salt: Buffer.from("salt-unassigned").toString("base64"),
        algorithm: "AES-GCM",
        category: "Unassigned",
        tags: ["unassigned"],
      });
    expect(createSecond.status).toBe(201);

    const successorRes = await request(app)
      .post("/api/v1/successors")
      .set(auth)
      .send({
        email: `successor-${Date.now()}@example.com`,
        name: "Scoped Successor",
        handoverDelayDays: 30,
      });
    expect(successorRes.status).toBe(201);
    const successorId = successorRes.body.successor.id as string;

    const assignmentRes = await request(app)
      .put(`/api/v1/successors/${successorId}/assigned-entries`)
      .set(auth)
      .send({
        entryIds: [assignedEntryId],
        restrictToAssignedEntries: true,
      });
    expect(assignmentRes.status).toBe(200);

    const db = getDatabaseClient().getKysely();
    const verificationTokenRow = await db
      .selectFrom("successors")
      .select("verification_token")
      .where("id", "=", successorId)
      .executeTakeFirstOrThrow();

    const verificationToken = verificationTokenRow.verification_token!;
    await request(app).get(
      `/api/v1/successors/verify?token=${verificationToken}`,
    );

    const orchestrator = new HandoverOrchestrator();
    const process = await orchestrator.initiateHandover(userId);
    await orchestrator.processGracePeriodExpiration(process.id);

    const successorAccess = await request(app).get(
      `/api/v1/vault/successor-access?token=${verificationToken}`,
    );
    expect(successorAccess.status).toBe(200);
    expect(Array.isArray(successorAccess.body.entries)).toBe(true);
    expect(successorAccess.body.entries).toHaveLength(1);
    expect(successorAccess.body.entries[0].id).toBe(assignedEntryId);
  });
});
