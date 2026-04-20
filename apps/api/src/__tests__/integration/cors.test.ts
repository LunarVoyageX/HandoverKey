import request from "supertest";
import app, { buildAllowedOrigins } from "../../app";

describe("CORS", () => {
  const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

  it("allows requests from the configured FRONTEND_URL", async () => {
    const res = await request(app)
      .options("/api/v1/auth/profile")
      .set("Origin", allowedOrigin)
      .set("Access-Control-Request-Method", "GET");

    expect(res.headers["access-control-allow-origin"]).toBe(allowedOrigin);
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("allows the www variant for apex domains", () => {
    const origins = buildAllowedOrigins("https://handoverkey.com");

    expect(origins.has("https://handoverkey.com")).toBe(true);
    expect(origins.has("https://www.handoverkey.com")).toBe(true);
  });

  it("strips www for www-prefixed apex domains", () => {
    const origins = buildAllowedOrigins("https://www.handoverkey.com");

    expect(origins.has("https://www.handoverkey.com")).toBe(true);
    expect(origins.has("https://handoverkey.com")).toBe(true);
  });

  it("does not add www variant for subdomains", () => {
    const origins = buildAllowedOrigins("https://app.example.com");

    expect(origins.has("https://app.example.com")).toBe(true);
    expect(origins.has("https://www.app.example.com")).toBe(false);
  });

  it("normalises origins via url.origin", () => {
    const origins = buildAllowedOrigins("https://Example.COM:443/path/");

    expect(origins.has("https://example.com")).toBe(true);
  });

  it("skips malformed origins", () => {
    const origins = buildAllowedOrigins("not-a-url, https://valid.com");

    expect(origins.has("not-a-url")).toBe(false);
    expect(origins.has("https://valid.com")).toBe(true);
  });

  it("rejects requests from disallowed origins", async () => {
    const res = await request(app)
      .options("/api/v1/auth/profile")
      .set("Origin", "https://evil.example.com")
      .set("Access-Control-Request-Method", "GET");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("passes requests with no Origin header through CORS", async () => {
    const res = await request(app)
      .get("/api/v1/auth/profile")
      .set("Accept", "application/json");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    expect(res.status).not.toBe(500);
  });
});
