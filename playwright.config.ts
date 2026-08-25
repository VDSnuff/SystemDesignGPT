import { defineConfig } from "@playwright/test";

const port = 4174;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "line",
  use: {
    baseURL: `http://localhost:${port}`,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: `http://localhost:${port}/workshop`,
  },
});
