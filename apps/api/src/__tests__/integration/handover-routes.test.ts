import request from "supertest";
import app, { appInit } from "../../app";
import { getDatabaseClient } from "@handoverkey/database";
import { SessionService } from "../../services/session-service";
import { HandoverOrchestrator } from "../../services/handover-orchestrator";
import { initializeRedis, closeRedis } from "../../config/redis";
import { registerVerifyLogin, type TestUser } from "../helpers";

jest.setTimeout(60000);

let owner: TestUser;

describe("Handover Routes Integration", () => {
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

    owner = await registerVerifyLogin("handover-routes");
  });

  afterAll(async () => {
    await closeRedis();
    await getDatabaseClient().close();
  });

  describe("GET /api/v1/handover/status", () => {
    it("should return 401 without authentication", async () => {
      const res = await request(app).get("/api/v1/handover/status");
      expect(res.status).toBe(401);
    });

    it("should return active: false when no handover is active", async () => {
      const res = await request(app)
        .get("/api/v1/handover/status")
        .set("Authorization", `Bearer ${owner.token}`);

      expect(res.status).toBe(200);
      expect(res.body.active).toBe(false);
      expect(res.body.handover).toBeNull();
    });

    it("should return active handover details when one exists", async () => {
      const user = await registerVerifyLogin("handover-status-active");
      const orchestrator = new HandoverOrchestrator();
      await orchestrator.initiateHandover(user.userId);

      const res = await request(app)
        .get("/api/v1/handover/status")
        .set("Authorization", `Bearer ${user.token}`);

      expect(res.status).toBe(200);
      expect(res.body.active).toBe(true);
      expect(res.body.handover).toHaveProperty("id");
      expect(res.body.handover).toHaveProperty("status");
      expect(res.body.handover).toHaveProperty("initiatedAt");
    });
  });

  describe("POST /api/v1/handover/cancel", () => {
    it("should return 401 without authentication", async () => {
      const res = await request(app).post("/api/v1/handover/cancel").send({});
      expect(res.status).toBe(401);
    });

    it("should return 404 when no active handover exists", async () => {
      const res = await request(app)
        .post("/api/v1/handover/cancel")
        .set("Authorization", `Bearer ${owner.token}`)
        .send({});

      expect(res.status).toBe(404);
    });

    it("should cancel an active handover", async () => {
      const user = await registerVerifyLogin("handover-cancel");
      const orchestrator = new HandoverOrchestrator();
      await orchestrator.initiateHandover(user.userId);

      const res = await request(app)
        .post("/api/v1/handover/cancel")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ reason: "Changed my mind" });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/cancelled/i);

      const statusRes = await request(app)
        .get("/api/v1/handover/status")
        .set("Authorization", `Bearer ${user.token}`);
      expect(statusRes.body.active).toBe(false);
    });
  });

  describe("POST /api/v1/handover/respond", () => {
    it("should return 400 with missing fields", async () => {
      const res = await request(app).post("/api/v1/handover/respond").send({});

      expect(res.status).toBe(400);
    });

    it("should return 401 with an invalid token", async () => {
      const res = await request(app)
        .post("/api/v1/handover/respond")
        .send({ token: "invalid-token-value", accepted: true });

      expect(res.status).toBe(401);
    });

    it("should accept a handover via valid successor token", async () => {
      const user = await registerVerifyLogin("handover-respond");
      const auth = { Authorization: `Bearer ${user.token}` };

      const s1 = await request(app).post("/api/v1/successors").set(auth).send({
        email: "respond-succ-1@example.com",
        name: "Respond Successor 1",
        handoverDelayDays: 7,
        encryptedShare: "share-1",
      });
      const s2 = await request(app).post("/api/v1/successors").set(auth).send({
        email: "respond-succ-2@example.com",
        name: "Respond Successor 2",
        handoverDelayDays: 7,
        encryptedShare: "share-2",
      });

      expect(s1.status).toBe(201);
      expect(s2.status).toBe(201);

      const orchestrator = new HandoverOrchestrator();
      const handover = await orchestrator.initiateHandover(user.userId);
      await orchestrator.processGracePeriodExpiration(handover.id);

      const db = getDatabaseClient().getKysely();

      const successor = await db
        .selectFrom("successors")
        .select("verification_token")
        .where("user_id", "=", user.userId)
        .executeTakeFirstOrThrow();

      const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const successorRows = await db
        .selectFrom("successors")
        .select("id")
        .where("user_id", "=", user.userId)
        .execute();

      await db
        .insertInto("successor_notifications")
        .values(
          successorRows.map((s) => ({
            handover_process_id: handover.id,
            successor_id: s.id,
            response_deadline: deadline,
            verification_token: null,
          })),
        )
        .execute();

      const res = await request(app).post("/api/v1/handover/respond").send({
        token: successor.verification_token,
        accepted: true,
        message: "I accept",
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/accepted/i);
      expect(res.body.handoverId).toBe(handover.id);
    });
  });
});
