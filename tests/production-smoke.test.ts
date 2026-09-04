import { describe, expect, it } from "vitest";
import { productionConfig, runProductionSmoke, smokeRoutes } from "../scripts/check-production-smoke.mjs";

const config = {
  origin: "https://system-design.example",
  commitSha: "a".repeat(40),
  sitesVersion: "42",
};

async function passingResponse(input: URL | RequestInfo) {
  const url = new URL(input instanceof URL ? input : String(input));
  const route = smokeRoutes.find(({ path }) => path === `${url.pathname}${url.search}`);
  if (!route) return new Response("unexpected route", { status: 500 });
  return new Response(route.body, { status: route.status, headers: route.headers });
}

describe("production smoke", () => {
  it("fails closed unless exact deployment identity is supplied", () => {
    expect(() => productionConfig([], { NODE_ENV: "test" })).toThrow("origin, commit SHA, and Sites version are required");
    expect(() => productionConfig([
      "--origin", "http://system-design.example", "--commit-sha", config.commitSha,
      "--sites-version", config.sitesVersion,
    ], { NODE_ENV: "test" })).toThrow("origin must be an HTTPS origin");
  });

  it("checks the public route, signed-out API, header, and 404 matrix", async () => {
    const report = await runProductionSmoke(config, passingResponse);

    expect(report.result).toBe("PASS");
    expect(report.results).toHaveLength(smokeRoutes.length);
    expect(report.results.map(({ id }) => id)).toEqual(smokeRoutes.map(({ id }) => id));
  });

  it("fails when a required response differs from the contract", async () => {
    const fetchWithBroken404 = async (input: URL | RequestInfo) => {
      const url = new URL(input instanceof URL ? input : String(input));
      if (url.pathname === "/not-a-real-route") return new Response("Page not found", { status: 200 });
      return passingResponse(input);
    };
    const report = await runProductionSmoke(config, fetchWithBroken404);

    expect(report.result).toBe("FAIL");
    expect(report.results.find(({ id }) => id === "route-404")?.failures).toContain("status 200, expected 404");
  });
});
