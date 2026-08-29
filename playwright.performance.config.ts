import { defineConfig } from "@playwright/test";

const port = 4175;
const externalBaseUrl = process.env.PERFORMANCE_BASE_URL;

export default defineConfig({
  testDir: "./tests/performance",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  outputDir: "performance-results/playwright",
  use: {
    baseURL: externalBaseUrl ?? `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
  },
  webServer: externalBaseUrl ? undefined : {
    command: `npm run start -- --port ${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
    url: `http://127.0.0.1:${port}/`,
  },
});
