import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? "4176");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["line"], ["html", { open: "never" }]],
  outputDir: "test-results/cross-browser",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: devices["Desktop Chrome"] },
    { name: "firefox", use: devices["Desktop Firefox"] },
    { name: "webkit", use: devices["Desktop Safari"] },
  ],
  webServer: {
    command: "npm run start:built-worker",
    reuseExistingServer: false,
    timeout: 120_000,
    url: `http://127.0.0.1:${port}/workshop`,
  },
});
