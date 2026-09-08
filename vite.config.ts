import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // import.meta.dirname, not __dirname -- Vite 8's native config loader
      // does not provide CommonJS globals.
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    // 5173 belongs to the public site (awc-ui). strictPort matters here:
    // without it Vite silently falls back to the next free port, which the
    // API's CORS allowlist does not include, and every request fails with an
    // opaque CORS error instead of a clear "port in use".
    port: 5180,
    strictPort: true,
  },
});
