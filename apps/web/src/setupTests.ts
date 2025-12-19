import "@testing-library/jest-dom";
import { webcrypto } from "node:crypto";
import { TextEncoder, TextDecoder } from "node:util";

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
  });
}

// JSDOM doesn't always handle globalThis.crypto well for window.crypto
if (typeof window !== "undefined" && !window.crypto) {
  (window as unknown as { crypto: typeof webcrypto }).crypto = webcrypto;
}

if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder =
    TextEncoder as unknown as typeof globalThis.TextEncoder;
}

if (typeof globalThis.TextDecoder === "undefined") {
  globalThis.TextDecoder =
    TextDecoder as unknown as typeof globalThis.TextDecoder;
}

// Headless UI / Dialog components often use ResizeObserver
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
