import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@handoverkey/shared": path.resolve(
        __dirname,
        "../../packages/shared/src",
      ),
      "@handoverkey/crypto": path.resolve(
        __dirname,
        "../../packages/crypto/src",
      ),
      "@handoverkey/database": path.resolve(
        __dirname,
        "../../packages/database/src",
      ),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
