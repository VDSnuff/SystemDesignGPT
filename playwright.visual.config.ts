import { defineConfig, devices } from "@playwright/test";

const port = 4177;

if (process.platform !== "linux" && process.env.VISUAL_RUNTIME !== "native") {
  throw new Error("Visual baselines are Linux Chromium only; run `npm run test:e2e:visual` to use the canonical container, or set VISUAL_RUNTIME=native for a diagnostic run that never writes snapshots.");
}

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "visual-regression.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["line"], ["html", { open: "never" }]],
  outputDir: "test-results/visual-regression",
  snapshotPathTemplate: "{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}",
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.002,
    },
  },
  use: {
    ...devices["Desktop Chrome"],
    ...{ reducedMotion: "reduce" as const },
    baseURL: `http://127.0.0.1:${port}`,
    colorScheme: "light",
    locale: "en-US",
    screenshot: "only-on-failure",
    timezoneId: "UTC",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run start:built-worker",
    reuseExistingServer: false,
    timeout: 120_000,
    url: `http://127.0.0.1:${port}/workshop`,
    env: { PORT: String(port) },
  },
});
