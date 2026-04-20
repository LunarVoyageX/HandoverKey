/* eslint-disable @typescript-eslint/no-explicit-any */
import request from "supertest";
import app, { appInit } from "../../app";
import { getDatabaseClient } from "@handoverkey/database";
import { SessionService } from "../../services/session-service";
import { initializeRedis, closeRedis } from "../../config/redis";
import { registerVerifyLogin } from "../helpers";

jest.setTimeout(30000);

let authToken: string;
let entryId: string;

describe("Vault CRUD Integration", () => {
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

    ({ token: authToken } = await registerVerifyLogin("vault-crud"));
  });

  afterAll(async () => {
    await closeRedis();
    await getDatabaseClient().close();
  });

  it("should create a vault entry", async () => {
    const res = await request(app)
      .post("/api/v1/vault/entries")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        encryptedData: Buffer.from("secret-payload").toString("base64"),
        iv: Buffer.from("123456789012").toString("base64"),
        salt: Buffer.from("test-salt").toString("base64"),
        algorithm: "AES-GCM",
        category: "Login",
        tags: ["e2e"],
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    entryId = res.body.id;
  });

  it("should get a single vault entry by ID", async () => {
    const res = await request(app)
      .get(`/api/v1/vault/entries/${entryId}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(entryId);
    expect(res.body).toHaveProperty("encryptedData");
  });

  it("should update a vault entry", async () => {
    const res = await request(app)
      .put(`/api/v1/vault/entries/${entryId}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        encryptedData: Buffer.from("updated-payload").toString("base64"),
        iv: Buffer.from("123456789012").toString("base64"),
        algorithm: "AES-GCM",
        category: "Notes",
        tags: ["updated"],
      });

    expect(res.status).toBe(200);

    const getRes = await request(app)
      .get(`/api/v1/vault/entries/${entryId}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(getRes.body.category).toBe("Notes");
  });

  it("should soft-delete a vault entry", async () => {
    const res = await request(app)
      .delete(`/api/v1/vault/entries/${entryId}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);

    const listRes = await request(app)
      .get("/api/v1/vault/entries")
      .set("Authorization", `Bearer ${authToken}`);

    const found = listRes.body.find((e: any) => e.id === entryId);
    expect(found).toBeUndefined();
  });

  it("should reject vault access without auth", async () => {
    const res = await request(app).get("/api/v1/vault/entries");
    expect(res.status).toBe(401);
  });
});
