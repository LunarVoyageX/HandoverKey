import request from "supertest";
import app, { appInit } from "../../app";
import { getDatabaseClient } from "@handoverkey/database";
import { SessionService } from "../../services/session-service";
import { initializeRedis, closeRedis } from "../../config/redis";

jest.setTimeout(30000);

async function registerVerifyLogin(emailPrefix: string) {
  const email = `${emailPrefix}-${Date.now()}@example.com`;
  const password = "Password123!@$";

  await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Test", email, password, confirmPassword: password });

  const db = getDatabaseClient().getKysely();
  const user = await db
    .selectFrom("users")
    .select(["verification_token", "id"])
    .where("email", "=", email)
    .executeTakeFirstOrThrow();

  await request(app).get(
    `/api/v1/auth/verify-email?token=${user.verification_token}`,
  );

  const loginRes = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password });

  const cookies: string[] = loginRes.headers["set-cookie"] || [];
  const cookieList = Array.isArray(cookies) ? cookies : [cookies];
  const accessCookie = cookieList.find((c: string) =>
    c?.startsWith("accessToken="),
  );
  const refreshCookie = cookieList.find((c: string) =>
    c?.startsWith("refreshToken="),
  );
  if (!accessCookie) throw new Error("No accessToken cookie");
  const token = accessCookie.split(";")[0].split("=")[1];

  return { email, password, userId: user.id, token, refreshCookie };
}

describe("Auth Full Flow Integration", () => {
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

  it("should get user profile with valid session", async () => {
    const { token } = await registerVerifyLogin("profile");

    const res = await request(app)
      .get("/api/v1/auth/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty("id");
    expect(res.body.user).toHaveProperty("email");
    expect(res.body.user).toHaveProperty("name");
  });

  it("should reject profile request without auth", async () => {
    const res = await request(app).get("/api/v1/auth/profile");
    expect(res.status).toBe(401);
  });

  it("should logout and invalidate session", async () => {
    const { token } = await registerVerifyLogin("logout");

    const logoutRes = await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(logoutRes.status).toBe(200);

    const profileRes = await request(app)
      .get("/api/v1/auth/profile")
      .set("Authorization", `Bearer ${token}`);
    expect(profileRes.status).toBe(401);
  });

  it("should refresh token via cookie", async () => {
    const { refreshCookie } = await registerVerifyLogin("refresh");

    if (!refreshCookie) {
      return;
    }

    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", refreshCookie)
      .send({});

    expect(res.status).toBe(200);
  });

  it("should resend verification email", async () => {
    const email = `resend-${Date.now()}@example.com`;
    const password = "Password123!@$";

    await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Test", email, password, confirmPassword: password });

    const res = await request(app)
      .post("/api/v1/auth/resend-verification")
      .send({ email });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
  });

  it("should handle forgot-password without leaking user existence", async () => {
    const res = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "nonexistent@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain("If an account exists");
  });

  it("should delete account", async () => {
    const { token } = await registerVerifyLogin("delete-acct");

    const res = await request(app)
      .delete("/api/v1/auth/delete-account")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain("deleted");
  });
});
