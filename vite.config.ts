import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Plain Vite + React SPA. `vite build` emits a static bundle to dist/;
// Vercel serves it with a SPA fallback (see vercel.json) so deep links
// like /app are resolved by React Router on the client.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Resolves the "@/*" alias from tsconfig.json.
    tsconfigPaths: true,
  },
  server: {
    host: true,
    port: 8080,
  },
  build: {
    outDir: "dist",
  },
});
