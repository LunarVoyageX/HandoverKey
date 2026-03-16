import {
  generateSalt,
  generateIV,
  generateRandomBytes,
  hash,
  toBase64,
  fromBase64,
  constantTimeEqual,
} from "./utils.js";
import { ValidationError } from "./errors.js";

describe("generateSalt", () => {
  it("generates salt with default length (16 bytes)", () => {
    const salt = generateSalt();
    expect(salt).toBeInstanceOf(Uint8Array);
    expect(salt.length).toBe(16);
  });

  it("generates salt with custom length", () => {
    const salt = generateSalt(32);
    expect(salt.length).toBe(32);
  });

  it("throws for salt shorter than 16 bytes", () => {
    expect(() => generateSalt(8)).toThrow(ValidationError);
    expect(() => generateSalt(8)).toThrow("at least 16 bytes");
  });

  it("generates unique salts", () => {
    const a = generateSalt();
    const b = generateSalt();
    expect(a).not.toEqual(b);
  });
});

describe("generateIV", () => {
  it("generates IV with default length (12 bytes)", () => {
    const iv = generateIV();
    expect(iv).toBeInstanceOf(Uint8Array);
    expect(iv.length).toBe(12);
  });

  it("generates IV with custom length", () => {
    const iv = generateIV(16);
    expect(iv.length).toBe(16);
  });

  it("throws for IV shorter than 12 bytes", () => {
    expect(() => generateIV(8)).toThrow(ValidationError);
    expect(() => generateIV(8)).toThrow("at least 12 bytes");
  });
});

describe("generateRandomBytes", () => {
  it("generates the requested number of bytes", () => {
    const bytes = generateRandomBytes(32);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(32);
  });

  it("throws for non-positive length", () => {
    expect(() => generateRandomBytes(0)).toThrow(ValidationError);
    expect(() => generateRandomBytes(-1)).toThrow(ValidationError);
    expect(() => generateRandomBytes(0)).toThrow("must be positive");
  });
});

describe("hash", () => {
  it("hashes a string to hex", async () => {
    const result = await hash("hello");
    expect(typeof result).toBe("string");
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hashes a Uint8Array", async () => {
    const data = new TextEncoder().encode("hello");
    const result = await hash(data);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces consistent output for same input", async () => {
    const a = await hash("test-data");
    const b = await hash("test-data");
    expect(a).toBe(b);
  });

  it("produces different output for different input", async () => {
    const a = await hash("data-1");
    const b = await hash("data-2");
    expect(a).not.toBe(b);
  });

  it("throws for null/undefined", async () => {
    await expect(hash(null as unknown as string)).rejects.toThrow(
      ValidationError,
    );
    await expect(hash(undefined as unknown as string)).rejects.toThrow(
      ValidationError,
    );
  });
});

describe("toBase64 / fromBase64", () => {
  it("round-trips data correctly", () => {
    const original = new Uint8Array([1, 2, 3, 4, 5]);
    const encoded = toBase64(original);
    const decoded = fromBase64(encoded);
    expect(decoded).toEqual(original);
  });

  it("encodes to valid base64", () => {
    const data = new Uint8Array([72, 101, 108, 108, 111]);
    const encoded = toBase64(data);
    expect(encoded).toBe("SGVsbG8=");
  });

  it("toBase64 throws for non-Uint8Array", () => {
    expect(() => toBase64("hello" as unknown as Uint8Array)).toThrow(
      ValidationError,
    );
  });

  it("fromBase64 throws for non-string", () => {
    expect(() => fromBase64(123 as unknown as string)).toThrow(ValidationError);
  });

  it("fromBase64 throws for invalid base64", () => {
    expect(() => fromBase64("not valid base64!!!")).toThrow(ValidationError);
    expect(() => fromBase64("not valid base64!!!")).toThrow("Invalid base64");
  });

  it("handles empty Uint8Array", () => {
    const data = new Uint8Array([]);
    const encoded = toBase64(data);
    const decoded = fromBase64(encoded);
    expect(decoded).toEqual(data);
  });
});

describe("constantTimeEqual", () => {
  it("returns true for identical arrays", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([1, 2, 3]);
    expect(constantTimeEqual(a, b)).toBe(true);
  });

  it("returns false for different arrays", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([1, 2, 4]);
    expect(constantTimeEqual(a, b)).toBe(false);
  });

  it("returns false for arrays of different lengths", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([1, 2]);
    expect(constantTimeEqual(a, b)).toBe(false);
  });

  it("returns true for empty arrays", () => {
    expect(constantTimeEqual(new Uint8Array([]), new Uint8Array([]))).toBe(
      true,
    );
  });

  it("throws for non-Uint8Array inputs", () => {
    expect(() =>
      constantTimeEqual("a" as unknown as Uint8Array, new Uint8Array([1])),
    ).toThrow(ValidationError);
    expect(() =>
      constantTimeEqual(new Uint8Array([1]), null as unknown as Uint8Array),
    ).toThrow(ValidationError);
  });
});
