import { ValidationError } from "./errors.js";

/**
 * Shamir's Secret Sharing implementation
 * Splits a secret into N shares where any K shares can reconstruct the secret
 */

const PRIME = 2n ** 256n - 189n; // Large prime for finite field arithmetic

/**
 * Evaluates a polynomial at a given x value
 */
function evaluatePolynomial(coefficients: bigint[], x: bigint): bigint {
  let result = 0n;
  for (let i = coefficients.length - 1; i >= 0; i--) {
    result = (result * x + coefficients[i]) % PRIME;
  }
  return result;
}

/**
 * Performs modular inverse using Extended Euclidean Algorithm
 */
function modInverse(a: bigint, m: bigint): bigint {
  let [old_r, r] = [a, m];
  let [old_s, s] = [1n, 0n];

  while (r !== 0n) {
    const quotient = old_r / r;
    [old_r, r] = [r, old_r - quotient * r];
    [old_s, s] = [s, old_s - quotient * s];
  }

  return old_s < 0n ? old_s + m : old_s;
}

/**
 * Lagrange interpolation to reconstruct secret from shares
 */
function lagrangeInterpolation(shares: Array<[bigint, bigint]>): bigint {
  let secret = 0n;

  for (let i = 0; i < shares.length; i++) {
    const [xi, yi] = shares[i];
    let numerator = 1n;
    let denominator = 1n;

    for (let j = 0; j < shares.length; j++) {
      if (i !== j) {
        const [xj] = shares[j];
        numerator = (numerator * (0n - xj)) % PRIME;
        denominator = (denominator * (xi - xj)) % PRIME;
      }
    }

    // Ensure positive modulo
    if (numerator < 0n) numerator += PRIME;
    if (denominator < 0n) denominator += PRIME;

    const lagrangeCoeff = (numerator * modInverse(denominator, PRIME)) % PRIME;
    secret = (secret + yi * lagrangeCoeff) % PRIME;
  }

  return secret < 0n ? secret + PRIME : secret;
}

/**
 * Converts Uint8Array to bigint
 */
function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (let i = 0; i < bytes.length; i++) {
    result = (result << 8n) | BigInt(bytes[i]);
  }
  return result;
}

/**
 * Converts bigint to Uint8Array
 */
function bigIntToBytes(value: bigint, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let temp = value;

  for (let i = length - 1; i >= 0; i--) {
    bytes[i] = Number(temp & 0xffn);
    temp = temp >> 8n;
  }

  return bytes;
}

/**
 * Splits a secret into N shares where any K shares can reconstruct it
 *
 * @param secret - The secret to split (Uint8Array)
 * @param totalShares - Total number of shares to create (N)
 * @param threshold - Minimum number of shares needed to reconstruct (K)
 * @returns Array of shares
 * @throws {ValidationError} If parameters are invalid
 */
export function splitSecret(
  secret: Uint8Array,
  totalShares: number,
  threshold: number,
): Uint8Array[] {
  // Validate inputs
  if (!(secret instanceof Uint8Array) || secret.length === 0) {
    throw new ValidationError("Secret must be a non-empty Uint8Array");
  }

  if (!Number.isInteger(totalShares) || totalShares < 2) {
    throw new ValidationError("Total shares must be at least 2");
  }

  if (!Number.isInteger(threshold) || threshold < 2) {
    throw new ValidationError("Threshold must be at least 2");
  }

  if (threshold > totalShares) {
    throw new ValidationError("Threshold cannot exceed total shares");
  }

  if (totalShares > 255) {
    throw new ValidationError("Total shares cannot exceed 255");
  }

  // Convert secret to bigint
  const secretValue = bytesToBigInt(secret);

  if (secretValue >= PRIME) {
    throw new ValidationError("Secret is too large for the finite field");
  }

  // Generate random coefficients for polynomial
  const coefficients: bigint[] = [secretValue];
  for (let i = 1; i < threshold; i++) {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const randomValue = bytesToBigInt(randomBytes) % PRIME;
    coefficients.push(randomValue);
  }

  // Generate shares by evaluating polynomial at x = 1, 2, 3, ..., N
  const shares: Uint8Array[] = [];
  for (let x = 1; x <= totalShares; x++) {
    const y = evaluatePolynomial(coefficients, BigInt(x));

    // Encode share as: [x (1 byte)] + [secret_length (1 byte)] + [y (32 bytes)]
    const shareBytes = new Uint8Array(34);
    shareBytes[0] = x;
    shareBytes[1] = secret.length; // Store original secret length
    shareBytes.set(bigIntToBytes(y, 32), 2);

    shares.push(shareBytes);
  }

  return shares;
}

/**
 * Reconstructs a secret from K or more shares
 *
 * @param shares - Array of shares (at least K shares)
 * @returns The reconstructed secret
 * @throws {ValidationError} If shares are invalid or insufficient
 */
export function reconstructSecret(shares: Uint8Array[]): Uint8Array {
  // Validate inputs
  if (!Array.isArray(shares) || shares.length < 2) {
    throw new ValidationError("At least 2 shares are required");
  }

  // Parse shares
  const parsedShares: Array<[bigint, bigint]> = [];
  let secretLength = 0;

  for (const share of shares) {
    if (!(share instanceof Uint8Array)) {
      throw new ValidationError("All shares must be Uint8Arrays");
    }

    if (share.length !== 34) {
      throw new ValidationError("Invalid share format");
    }

    const x = BigInt(share[0]);
    const length = share[1];
    const y = bytesToBigInt(share.slice(2));

    if (secretLength === 0) {
      secretLength = length;
    } else if (secretLength !== length) {
      throw new ValidationError("Inconsistent secret length in shares");
    }

    parsedShares.push([x, y]);
  }

  // Check for duplicate x values
  const xValues = new Set(parsedShares.map(([x]) => x));
  if (xValues.size !== parsedShares.length) {
    throw new ValidationError("Duplicate shares detected");
  }

  // Reconstruct secret using Lagrange interpolation
  const secretValue = lagrangeInterpolation(parsedShares);

  // Convert back to bytes using original length
  return bigIntToBytes(secretValue, secretLength);
}

/**
 * Verifies that a set of shares can reconstruct a secret
 *
 * @param shares - Array of shares to verify
 * @returns True if shares are valid and consistent
 */
export function verifyShares(shares: Uint8Array[]): boolean {
  try {
    reconstructSecret(shares);
    return true;
  } catch {
    return false;
  }
}
