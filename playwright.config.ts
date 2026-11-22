import { defineConfig } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? "4174");
const host = "127.0.0.1";
const baseURL = `http://${host}:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: "**/visual-regression.spec.ts",
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  retries: 0,
  reportSlowTests: process.env.CI ? { max: 10, threshold: 10_000 } : null,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "line",
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: process.env.CI
      ? "npm run start:built-worker"
      : `npm run dev -- --hostname ${host} --port ${port}`,
    env: { PORT: String(port) },
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
    timeout: 120_000,
    url: `${baseURL}/workshop`,
  },
});
