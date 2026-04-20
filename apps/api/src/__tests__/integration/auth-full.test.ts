import request from "supertest";
import app, { appInit } from "../../app";
import { getDatabaseClient } from "@handoverkey/database";
import { SessionService } from "../../services/session-service";
import { initializeRedis, closeRedis } from "../../config/redis";
import { URL } from "node:url";
import {
  registerVerifyLogin as baseRegisterVerifyLogin,
  generateTotp,
} from "../helpers";

jest.setTimeout(30000);

async function registerVerifyLogin(emailPrefix: string) {
  const result = await baseRegisterVerifyLogin(emailPrefix);

  const loginRes = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: result.email, password: result.password });

  const cookies: string[] = loginRes.headers["set-cookie"] || [];
  const cookieList = Array.isArray(cookies) ? cookies : [cookies];
  const refreshCookie = cookieList.find((c: string) =>
    c?.startsWith("refreshToken="),
  );

  return { ...result, refreshCookie };
}

describe("Auth Full Flow Integration", () => {
  const originalAdminEmails = process.env.ADMIN_EMAILS;

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
    process.env.ADMIN_EMAILS = originalAdminEmails;
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

  it("should return role 'user' for non-admin login and profile", async () => {
    const { token } = await registerVerifyLogin("role-user");
    process.env.ADMIN_EMAILS = "someone-else@example.com";

    const profileRes = await request(app)
      .get("/api/v1/auth/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.user.role).toBe("user");
  });

  it("should return role 'admin' for allowlisted email on login and profile", async () => {
    const { email, password } = await registerVerifyLogin("role-admin");
    process.env.ADMIN_EMAILS = email;

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.role).toBe("admin");

    const cookies = loginRes.headers["set-cookie"];
    const accessCookie = (Array.isArray(cookies) ? cookies : [cookies]).find(
      (c: string) => c?.startsWith("accessToken="),
    );
    const token = accessCookie!.split(";")[0].split("=")[1];

    const profileRes = await request(app)
      .get("/api/v1/auth/profile")
      .set("Authorization", `Bearer ${token}`);
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.user.role).toBe("admin");
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

  it("should enable two-factor auth and require code for login", async () => {
    const { email, password, token } = await registerVerifyLogin("2fa-enable");

    const setupRes = await request(app)
      .post("/api/v1/auth/2fa/setup")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(setupRes.status).toBe(200);
    expect(Array.isArray(setupRes.body.recoveryCodes)).toBe(true);
    expect(setupRes.body.recoveryCodes.length).toBeGreaterThanOrEqual(8);

    const setupUrl = new URL(setupRes.body.otpauthUrl);
    const secret = setupUrl.searchParams.get("secret");
    expect(secret).toBeTruthy();

    const enableRes = await request(app)
      .post("/api/v1/auth/2fa/enable")
      .set("Authorization", `Bearer ${token}`)
      .send({ token: generateTotp(secret!) });
    expect(enableRes.status).toBe(200);

    const loginWithout2fa = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password });
    expect(loginWithout2fa.status).toBe(401);

    const loginWith2fa = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password, twoFactorCode: generateTotp(secret!) });
    expect(loginWith2fa.status).toBe(200);
  });

  it("should allow recovery code login and consume used code", async () => {
    const { email, password, token } =
      await registerVerifyLogin("2fa-recovery");

    const setupRes = await request(app)
      .post("/api/v1/auth/2fa/setup")
      .set("Authorization", `Bearer ${token}`)
      .send({});
    const recoveryCode = setupRes.body.recoveryCodes[0];
    const setupUrl = new URL(setupRes.body.otpauthUrl);
    const secret = setupUrl.searchParams.get("secret");
    expect(secret).toBeTruthy();

    const enableRes = await request(app)
      .post("/api/v1/auth/2fa/enable")
      .set("Authorization", `Bearer ${token}`)
      .send({ token: generateTotp(secret!) });
    expect(enableRes.status).toBe(200);

    const loginWithRecovery = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password, recoveryCode });
    expect(loginWithRecovery.status).toBe(200);

    const reusedRecoveryLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password, recoveryCode });
    expect(reusedRecoveryLogin.status).toBe(401);
  });
});
