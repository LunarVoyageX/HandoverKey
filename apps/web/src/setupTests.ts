import "@testing-library/jest-dom";
import { webcrypto } from "node:crypto";
import { TextEncoder, TextDecoder } from "node:util";

// @ts-ignore
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
  });
}

// JSDOM doesn't always handle globalThis.crypto well for window.crypto
if (typeof window !== "undefined" && !window.crypto) {
  (window as any).crypto = webcrypto;
}

if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = TextEncoder as any;
}

if (typeof globalThis.TextDecoder === "undefined") {
  globalThis.TextDecoder = TextDecoder as any;
}

// Headless UI / Dialog components often use ResizeObserver
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
