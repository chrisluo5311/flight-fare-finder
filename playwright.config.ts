import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const baseURL = `http://127.0.0.1:${PORT}`;

/*
 * E2E runs against the production bundle (`vite build` → `vite preview`), not
 * the dev server: a broken build or a bad SPA rewrite is exactly what these
 * tests exist to catch before Vercel ships it.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  // Serial on CI (shared runner, one preview server); local default is auto.
  ...(process.env["CI"] ? { workers: 1 } : {}),
  reporter: process.env["CI"] ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --host 127.0.0.1 --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env["CI"],
    timeout: 180_000,
    /*
     * Vite inlines these at build time. Real credentials are never needed: the
     * suite only exercises anonymous paths, where a reachable-but-wrong backend
     * and an unreachable one both land the visitor on /auth. CI can still
     * override them if a future test needs a real session.
     */
    env: {
      VITE_SUPABASE_URL: process.env["VITE_SUPABASE_URL"] ?? "https://e2e.supabase.invalid",
      VITE_SUPABASE_PUBLISHABLE_KEY:
        process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "sb_publishable_e2e",
      VITE_FLIGHT_API_URL: process.env["VITE_FLIGHT_API_URL"] ?? "https://flight-api.invalid",
    },
  },
});
