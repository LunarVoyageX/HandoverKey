import QRCode from "qrcode";
import crypto from "crypto";

const TWO_FACTOR_ISSUER = process.env.TWO_FACTOR_ISSUER || "HandoverKey";
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export interface TwoFactorSetupData {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
  recoveryCodes: string[];
}

export class TwoFactorService {
  static async generateSetupData(email: string): Promise<TwoFactorSetupData> {
    const secret = this.generateBase32Secret(20);
    const otpauthUrl = this.generateOtpAuthUrl(email, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    const recoveryCodes = this.generateRecoveryCodes();

    return {
      secret,
      otpauthUrl,
      qrCodeDataUrl,
      recoveryCodes,
    };
  }

  static verifyTotpCode(secret: string, token: string): boolean {
    const normalizedToken = token.replace(/\s+/g, "");
    if (!/^\d{6}$/.test(normalizedToken)) {
      return false;
    }

    const secretBytes = this.base32Decode(secret);
    const now = Math.floor(Date.now() / 1000);
    const currentCounter = Math.floor(now / TOTP_STEP_SECONDS);

    for (let delta = -TOTP_WINDOW; delta <= TOTP_WINDOW; delta++) {
      const candidate = this.generateTotp(secretBytes, currentCounter + delta);
      if (candidate === normalizedToken) {
        return true;
      }
    }

    return false;
  }

  static generateRecoveryCodes(count = 8): string[] {
    const recoveryCodes: string[] = [];
    for (let i = 0; i < count; i++) {
      const left = crypto.randomBytes(3).toString("hex").toUpperCase();
      const right = crypto.randomBytes(3).toString("hex").toUpperCase();
      recoveryCodes.push(`${left}-${right}`);
    }
    return recoveryCodes;
  }

  private static generateOtpAuthUrl(email: string, secret: string): string {
    const issuer = encodeURIComponent(TWO_FACTOR_ISSUER);
    const label = encodeURIComponent(email);
    return `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`;
  }

  private static generateTotp(secret: Uint8Array, counter: number): string {
    const hmac = crypto.createHmac("sha1", Buffer.from(secret));
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

    const otp = binary % 10 ** TOTP_DIGITS;
    return otp.toString().padStart(TOTP_DIGITS, "0");
  }

  private static generateBase32Secret(byteLength: number): string {
    const random = crypto.randomBytes(byteLength);
    return this.base32Encode(random);
  }

  private static base32Encode(bytes: Uint8Array): string {
    let bits = 0;
    let value = 0;
    let output = "";

    for (const byte of bytes) {
      value = (value << 8) | byte;
      bits += 8;

      while (bits >= 5) {
        output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }

    return output;
  }

  private static base32Decode(base32: string): Uint8Array {
    const normalized = base32.toUpperCase().replace(/=+$/g, "");
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];

    for (const char of normalized) {
      const index = BASE32_ALPHABET.indexOf(char);
      if (index === -1) {
        throw new Error("Invalid Base32 secret");
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
}
