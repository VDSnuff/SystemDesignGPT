import { defineConfig } from "@playwright/test";

const port = 4174;

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: "**/visual-regression.spec.ts",
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  retries: 0,
  reportSlowTests: process.env.CI ? { max: 10, threshold: 10_000 } : null,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "line",
  use: {
    baseURL: `http://localhost:${port}`,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: `http://localhost:${port}/workshop`,
  },
});
