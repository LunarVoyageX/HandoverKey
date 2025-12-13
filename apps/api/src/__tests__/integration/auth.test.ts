/* eslint-disable @typescript-eslint/no-explicit-any */
import request from "supertest";
import { AuthenticationError } from "../../errors";

// Mocks must be defined before imports
const mockDbClient = {
  initialize: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  getKysely: jest.fn(),
};

const mockUserRepo = {
  update: jest.fn().mockResolvedValue(undefined),
};

jest.mock("@handoverkey/database", () => ({
  getDatabaseClient: jest.fn(() => mockDbClient),
  DatabaseClient: jest.fn(),
  UserRepository: jest.fn(() => mockUserRepo),
}));

jest.mock("../../config/redis", () => ({
  initializeRedis: jest.fn().mockResolvedValue(undefined),
  closeRedis: jest.fn().mockResolvedValue(undefined),
  checkRedisHealth: jest.fn().mockResolvedValue(true),
  getRedisClient: jest.fn().mockReturnValue({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
  }),
}));

jest.mock("../../services/user-service", () => ({
  UserService: {
    createUser: jest.fn().mockImplementation((data) =>
      Promise.resolve({
        id: "user-123",
        email: data.email,
        createdAt: new Date(),
        updatedAt: new Date(),
        salt: Buffer.from("salt"),
        twoFactorEnabled: false,
      }),
    ),
    authenticateUser: jest.fn().mockImplementation((login) => {
      if (login.password === "WrongPassword123!") {
        return Promise.reject(
          new AuthenticationError("Invalid email or password"),
        );
      }
      return Promise.resolve({
        id: "user-123",
        email: login.email,
        passwordHash: "hashed",
        salt: Buffer.from("salt"),
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }),
    findUserByEmail: jest.fn().mockResolvedValue(null),
    logActivity: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("../../services/session-service", () => ({
  SessionService: {
    initialize: jest.fn(),
    createSession: jest.fn().mockResolvedValue("session-123"),
    hashToken: jest.fn().mockReturnValue("hashed-token"),
  },
}));

jest.mock("../../auth/jwt", () => ({
  JWTManager: {
    generateAccessToken: jest.fn().mockResolvedValue({
      token: "mock-access-token",
      sessionId: "session-123",
    }),
    generateRefreshToken: jest.fn().mockReturnValue("mock-refresh-token"),
  },
}));

import app, { appInit } from "../../app";

describe("Auth Integration", () => {
  beforeAll(async () => {
    await appInit;
  });

  afterAll(async () => {
    // No need to close real DB
  });

  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: "Password123!@$",
    confirmPassword: "Password123!@$",
  };

  it("should register a new user", async () => {
    const res = await (request(app).post("/api/v1/auth/register") as any).send(
      testUser,
    );

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("user");
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body).toHaveProperty("tokens");
  });

  it("should login with the registered user", async () => {
    const res = await (request(app).post("/api/v1/auth/login") as any).send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("tokens");
    expect(res.body.tokens).toHaveProperty("accessToken");
  });

  it("should fail login with wrong password", async () => {
    const res = await (request(app).post("/api/v1/auth/login") as any).send({
      email: testUser.email,
      password: "WrongPassword123!",
    });

    expect(res.status).toBe(401);
  });
});
