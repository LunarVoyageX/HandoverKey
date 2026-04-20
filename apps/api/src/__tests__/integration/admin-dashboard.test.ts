import request from "supertest";
import app, { appInit } from "../../app";
import { getDatabaseClient } from "@handoverkey/database";
import { SessionService } from "../../services/session-service";
import { initializeRedis, closeRedis } from "../../config/redis";
import { registerVerifyLogin } from "../helpers";

jest.setTimeout(30000);

describe("Admin Dashboard Integration", () => {
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

  it("restricts admin endpoints to configured admin users", async () => {
    const regularUser = await registerVerifyLogin("regular-admin-check");
    process.env.ADMIN_EMAILS = "other-admin@example.com";

    const res = await request(app)
      .get("/api/v1/admin/dashboard")
      .set("Authorization", `Bearer ${regularUser.token}`);

    expect(res.status).toBe(403);
  });

  it("returns dashboard data and unlocks accounts for admin users", async () => {
    const admin = await registerVerifyLogin("admin-user");
    const target = await registerVerifyLogin("admin-target");
    process.env.ADMIN_EMAILS = admin.email;

    const db = getDatabaseClient().getKysely();
    await db
      .updateTable("users")
      .set({
        failed_login_attempts: 5,
        locked_until: new Date(Date.now() + 60 * 60 * 1000),
      })
      .where("id", "=", target.userId)
      .execute();

    const dashboardRes = await request(app)
      .get("/api/v1/admin/dashboard")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(dashboardRes.status).toBe(200);
    expect(dashboardRes.body).toHaveProperty("stats");

    const usersRes = await request(app)
      .get(`/api/v1/admin/users?search=${encodeURIComponent(target.email)}`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(usersRes.status).toBe(200);
    expect(Array.isArray(usersRes.body.users)).toBe(true);
    expect(
      usersRes.body.users.some((u: { id: string }) => u.id === target.userId),
    ).toBe(true);

    const unlockRes = await request(app)
      .post(`/api/v1/admin/users/${target.userId}/unlock`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({});
    expect(unlockRes.status).toBe(200);

    const unlocked = await db
      .selectFrom("users")
      .select(["failed_login_attempts", "locked_until"])
      .where("id", "=", target.userId)
      .executeTakeFirstOrThrow();
    expect(unlocked.failed_login_attempts).toBe(0);
    expect(unlocked.locked_until).toBeNull();
  });
});
