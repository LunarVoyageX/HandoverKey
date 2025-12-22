/* eslint-disable @typescript-eslint/no-explicit-any */
import request from "supertest";
import app, { appInit } from "../../app";
import { getDatabaseClient } from "@handoverkey/database";
import { SessionService } from "../../services/session-service";
import { initializeRedis, closeRedis } from "../../config/redis";

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
    .select("verification_token")
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
  const token = loginRes.body.tokens.accessToken;
  return { token, email };
}

describe("Vault and Successors Integration", () => {
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
});
