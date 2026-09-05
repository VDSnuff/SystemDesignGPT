import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { observeRoute } from "./e2e/route-diagnostics";

const config = readFileSync("playwright.config.ts", "utf8");
const workflow = readFileSync(".github/workflows/quality.yml", "utf8");

describe("browser CI reliability", () => {
  it("serializes constrained CI execution without retries", () => {
    expect(config).toContain("workers: process.env.CI ? 1 : undefined");
    expect(config).toContain("retries: 0");
    expect(config).toContain("reportSlowTests: process.env.CI");
  });

  it("records resource use without requiring a missing performance artifact", () => {
    expect(workflow).toContain("/usr/bin/time --verbose npm run test:e2e");
    expect(workflow).toContain("always() && hashFiles('performance-results/**') != ''");
  });

  it("emits structured diagnostics for a slow route", async () => {
    vi.useFakeTimers();
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await observeRoute("/book/example", async () => {
      vi.advanceTimersByTime(5_000);
    });

    expect(JSON.parse(String(info.mock.calls[0]?.[0]))).toMatchObject({
      event: "browser.route.slow",
      route: "/book/example",
      durationMs: 5_000,
    });
    info.mockRestore();
    vi.useRealTimers();
  });

  it("preserves route results and failures", async () => {
    await expect(observeRoute("/ok", async () => "ready")).resolves.toBe("ready");
    await expect(observeRoute("/failure", async () => {
      throw new Error("request failed");
    })).rejects.toThrow("request failed");
  });
});
