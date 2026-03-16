import { DatabaseClient, getDatabaseClient } from "../client";
import { ConnectionError } from "../errors";

describe("DatabaseClient", () => {
  describe("getKysely", () => {
    it("throws ConnectionError when not initialized", () => {
      const client = new DatabaseClient();
      expect(() => client.getKysely()).toThrow(ConnectionError);
      expect(() => client.getKysely()).toThrow("Database not initialized");
    });
  });

  describe("query", () => {
    it("throws ConnectionError when not initialized", async () => {
      const client = new DatabaseClient();
      await expect(client.query(async () => {})).rejects.toThrow(
        ConnectionError,
      );
    });
  });

  describe("transaction", () => {
    it("throws ConnectionError when not initialized", async () => {
      const client = new DatabaseClient();
      await expect(client.transaction(async () => {})).rejects.toThrow(
        ConnectionError,
      );
    });
  });

  describe("healthCheck", () => {
    it("returns false when pool is not initialized", async () => {
      const client = new DatabaseClient();
      const result = await client.healthCheck();
      expect(result).toBe(false);
    });
  });

  describe("close", () => {
    it("handles closing when not initialized", async () => {
      const client = new DatabaseClient();
      await expect(client.close()).resolves.toBeUndefined();
    });
  });

  describe("initialize", () => {
    it("throws ConnectionError when connecting to invalid host", async () => {
      const client = new DatabaseClient();
      await expect(
        client.initialize({
          host: "invalid-host-that-does-not-exist",
          port: 59999,
          database: "nonexistent",
          user: "nouser",
          password: "nopass",
          connectionTimeoutMillis: 1000,
        }),
      ).rejects.toThrow(ConnectionError);
    });
  });
});

describe("getDatabaseClient", () => {
  it("returns a singleton instance", () => {
    const client1 = getDatabaseClient();
    const client2 = getDatabaseClient();
    expect(client1).toBe(client2);
    expect(client1).toBeInstanceOf(DatabaseClient);
  });
});
