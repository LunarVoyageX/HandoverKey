// This service handles client-side encryption/decryption
// In a real app, the key would be derived from the user's password and not stored in localStorage

// Mock implementation using Web Crypto API directly to avoid dependency issues for now
// We will try to match the interface expected by the backend

export interface EncryptedPayload {
  encryptedData: string;
  iv: string;
  salt: string;
  algorithm: string;
}

const ALGORITHM = "AES-GCM";
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

// Generate a random key for the session (DEMO ONLY)
// In production, derive this from user password using PBKDF2
let cachedKey: CryptoKey | null = null;

async function getMasterKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  // Try to get from storage
  const storedKey = localStorage.getItem("demo_master_key");
  if (storedKey) {
    const keyData = Uint8Array.from(atob(storedKey), (c) => c.charCodeAt(0));
    cachedKey = await window.crypto.subtle.importKey(
      "raw",
      keyData,
      ALGORITHM,
      true,
      ["encrypt", "decrypt"],
    );
    return cachedKey;
  }

  // Generate new key
  cachedKey = await window.crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );

  // Export and save (DEMO ONLY - INSECURE)
  const exported = await window.crypto.subtle.exportKey("raw", cachedKey);
  const exportedStr = btoa(String.fromCharCode(...new Uint8Array(exported)));
  localStorage.setItem("demo_master_key", exportedStr);

  return cachedKey;
}

export async function encryptData(data: unknown): Promise<EncryptedPayload> {
  const key = await getMasterKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH)); // Not used for AES-GCM direct, but backend expects it

  const encodedData = new TextEncoder().encode(JSON.stringify(data));

  const encryptedContent = await window.crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv,
    },
    key,
    encodedData,
  );

  return {
    encryptedData: btoa(
      String.fromCharCode(...new Uint8Array(encryptedContent)),
    ),
    iv: btoa(String.fromCharCode(...new Uint8Array(iv))),
    salt: btoa(String.fromCharCode(...new Uint8Array(salt))),
    algorithm: ALGORITHM,
  };
}

export async function decryptData(payload: {
  encryptedData: string;
  iv: string;
}): Promise<unknown> {
  try {
    const key = await getMasterKey();
    const iv = Uint8Array.from(atob(payload.iv), (c) => c.charCodeAt(0));
    const data = Uint8Array.from(atob(payload.encryptedData), (c) =>
      c.charCodeAt(0),
    );

    const decryptedContent = await window.crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      data,
    );

    const decoded = new TextDecoder().decode(decryptedContent);
    return JSON.parse(decoded);
  } catch (error) {
    console.error("Decryption failed:", error);
    return null;
  }
}
