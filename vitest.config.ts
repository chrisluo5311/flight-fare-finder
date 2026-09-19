import { defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config";

// Unit/component tests run in jsdom against the same resolver setup as the app,
// so "@/..." imports and the Tailwind plugin behave exactly as they do in dev.
// Playwright owns everything under e2e/ — keep Vitest out of it.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
      exclude: ["node_modules", "dist", "e2e"],
      restoreMocks: true,
      // The Supabase client throws at first use without these. Tests never reach
      // a real backend (fetch is stubbed), so placeholders satisfy the guard.
      env: {
        VITE_SUPABASE_URL: "https://test.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
        VITE_FLIGHT_API_URL: "https://flight-api.test",
      },
      coverage: {
        provider: "v8",
        reporter: ["text", "lcov"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/components/ui/**", "src/**/*.{test,spec}.{ts,tsx}", "src/test/**"],
      },
    },
  }),
);
