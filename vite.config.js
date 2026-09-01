import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: false,
    // Allow the sandbox preview host (https://5173-<id>.e2b.app) to reach the dev server.
    allowedHosts: true,
    hmr: { clientPort: 443, protocol: "wss" },
  },
  preview: {
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
