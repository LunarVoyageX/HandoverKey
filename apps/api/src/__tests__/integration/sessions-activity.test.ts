import request from "supertest";
import app, { appInit } from "../../app";
import { getDatabaseClient } from "@handoverkey/database";
import { SessionService } from "../../services/session-service";
import { initializeRedis, closeRedis } from "../../config/redis";
import { NotificationService } from "../../services/notification-service";
import { URL } from "node:url";
import { registerVerifyLogin } from "../helpers";

jest.setTimeout(30000);

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

  it("should validate and process public check-in links", async () => {
    const { userId } = await registerVerifyLogin("public-checkin");

    const notificationService = new NotificationService();
    const checkInLink = await notificationService.generateCheckInLink(
      userId,
      30 * 60 * 1000,
    );
    const checkInToken = new URL(checkInLink).searchParams.get("token");
    expect(checkInToken).toBeTruthy();

    const validateRes = await request(app).get(
      `/api/v1/activity/check-in-link?token=${checkInToken}`,
    );
    expect(validateRes.status).toBe(200);
    expect(validateRes.body.success).toBe(true);

    const checkInRes = await request(app)
      .post("/api/v1/activity/check-in-link")
      .send({ token: checkInToken });
    expect(checkInRes.status).toBe(200);
    expect(checkInRes.body.success).toBe(true);

    const db = getDatabaseClient().getKysely();
    const activity = await db
      .selectFrom("activity_records")
      .select(["activity_type"])
      .where("user_id", "=", userId)
      .where("activity_type", "=", "MANUAL_CHECKIN")
      .orderBy("created_at", "desc")
      .executeTakeFirst();

    expect(activity?.activity_type).toBe("MANUAL_CHECKIN");
  });
});
