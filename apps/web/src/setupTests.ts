import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";
import { webcrypto } from "crypto";

// Polyfill for Web Crypto API in Jest/jsdom environment
global.TextEncoder = TextEncoder as typeof global.TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Use Node.js Web Crypto API implementation
Object.defineProperty(global, "crypto", {
  value: webcrypto,
  writable: true,
  configurable: true,
});

// Make CryptoKey available globally
// Make CryptoKey available globally
Object.defineProperty(global, "CryptoKey", {
  value: (webcrypto as unknown as { CryptoKey: unknown }).CryptoKey,
  writable: true,
  configurable: true,
});
