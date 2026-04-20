import request from "supertest";
import crypto from "crypto";
import app from "../app";
import { getDatabaseClient } from "@handoverkey/database";

export const DEFAULT_PASSWORD = "Password123!@$";

export interface TestUser {
  userId: string;
  email: string;
  password: string;
  token: string;
}

/**
 * Register a user, verify their email via DB token, log in, and return
 * the user id, email, password, and access-token cookie value.
 */
export async function registerVerifyLogin(
  emailPrefix: string,
  password: string = DEFAULT_PASSWORD,
): Promise<TestUser> {
  const email = `${emailPrefix}-${Date.now()}@example.com`;

  await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Test", email, password, confirmPassword: password });

  const db = getDatabaseClient().getKysely();
  const user = await db
    .selectFrom("users")
    .select(["id", "verification_token"])
    .where("email", "=", email)
    .executeTakeFirstOrThrow();

  await request(app).get(
    `/api/v1/auth/verify-email?token=${user.verification_token}`,
  );

  const loginRes = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password });

  const cookies = loginRes.headers["set-cookie"];
  const accessCookie = (Array.isArray(cookies) ? cookies : [cookies]).find(
    (c: string) => c?.startsWith("accessToken="),
  );
  if (!accessCookie) throw new Error("No accessToken cookie");
  const token = accessCookie.split(";")[0].split("=")[1];

  return { userId: user.id, email, password, token };
}

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Decode(secret: string): Uint8Array {
  const normalized = secret.toUpperCase().replace(/=+$/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error("Invalid base32 secret");
    }
    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(bytes);
}

export function generateTotp(secret: string): string {
  const counter = Math.floor(Date.now() / 1000 / 30);
  const hmac = crypto.createHmac("sha1", Buffer.from(base32Decode(secret)));
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return (binary % 1000000).toString().padStart(6, "0");
}
