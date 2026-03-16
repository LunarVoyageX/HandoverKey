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
  if (!accessCookie) throw new Error("No accessToken cookie");
  const token = accessCookie.split(";")[0].split("=")[1];

  return { email, password, userId: user.id, token };
}

describe("Sessions & Activity Integration", () => {
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

  it("should list active sessions", async () => {
    const { token } = await registerVerifyLogin("sessions");

    const res = await request(app)
      .get("/api/v1/sessions")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.sessions)).toBe(true);
    expect(res.body.sessions.length).toBeGreaterThanOrEqual(1);
  });

  it("should invalidate other sessions", async () => {
    const { email, password, token } =
      await registerVerifyLogin("multi-session");

    await request(app).post("/api/v1/auth/login").send({ email, password });

    const beforeRes = await request(app)
      .get("/api/v1/sessions")
      .set("Authorization", `Bearer ${token}`);

    const sessionCount = beforeRes.body.sessions.length;
    expect(sessionCount).toBeGreaterThanOrEqual(2);

    const invalidateRes = await request(app)
      .post("/api/v1/sessions/invalidate-others")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(invalidateRes.status).toBe(200);
    expect(invalidateRes.body).toHaveProperty("invalidatedCount");

    const afterRes = await request(app)
      .get("/api/v1/sessions")
      .set("Authorization", `Bearer ${token}`);

    expect(afterRes.body.sessions.length).toBe(1);
  });

  it("should list activity logs", async () => {
    const { token } = await registerVerifyLogin("activity");

    const res = await request(app)
      .get("/api/v1/activity")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty("pagination");
  });

  it("should record a check-in", async () => {
    const { token } = await registerVerifyLogin("checkin");

    const res = await request(app)
      .post("/api/v1/activity/check-in")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(200);
  });

  it("should update inactivity settings", async () => {
    const { token } = await registerVerifyLogin("inactivity");

    // GET first to auto-create default settings for this user
    const defaultRes = await request(app)
      .get("/api/v1/inactivity/settings")
      .set("Authorization", `Bearer ${token}`);
    expect(defaultRes.status).toBe(200);

    const res = await request(app)
      .put("/api/v1/inactivity/settings")
      .set("Authorization", `Bearer ${token}`)
      .send({ thresholdDays: 60 });

    expect(res.status).toBe(200);

    const getRes = await request(app)
      .get("/api/v1/inactivity/settings")
      .set("Authorization", `Bearer ${token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.thresholdDays).toBe(60);
  });
});
