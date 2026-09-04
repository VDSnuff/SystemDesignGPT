import { describe, expect, it } from "vitest";
import { productionConfig, runProductionSmoke, smokeRoutes } from "../scripts/check-production-smoke.mjs";

const config = {
  origin: "https://system-design.example",
  commitSha: "a".repeat(40),
  sitesVersion: "42",
  provenanceFile: "/tmp/sites-provenance.json",
};

const lookupTime = "2026-09-04T12:00:00.000Z";
const now = Date.parse(lookupTime);
const provenance = {
  lookupTime,
  site: { projectId: "site-1", origin: config.origin, latestVersion: 42 },
  version: { id: "version-42", number: 42, commitSha: config.commitSha },
  deployment: {
    id: "deployment-42", versionId: "version-42", status: "succeeded",
    origin: config.origin, updatedAt: "2026-09-04T11:59:00.000Z",
  },
};

async function passingResponse(input: URL | RequestInfo) {
  const url = new URL(input instanceof URL ? input : String(input));
  const route = smokeRoutes.find(({ path }) => path === `${url.pathname}${url.search}`);
  if (!route) return new Response("unexpected route", { status: 500 });
  return new Response(route.body, { status: route.status, headers: route.headers });
}

describe("production smoke", () => {
  it("fails closed unless exact deployment identity is supplied", () => {
    expect(() => productionConfig([], { NODE_ENV: "test" })).toThrow("origin, commit SHA, Sites version, and provenance file are required");
    expect(() => productionConfig([
      "--origin", "http://system-design.example", "--commit-sha", config.commitSha,
      "--sites-version", config.sitesVersion, "--provenance-file", config.provenanceFile,
    ], { NODE_ENV: "test" })).toThrow("origin must be an HTTPS origin");
  });

  it("checks the public route, signed-out API, header, and 404 matrix", async () => {
    const report = await runProductionSmoke(config, { fetchImpl: passingResponse, provenance, now });

    expect(report.result).toBe("PASS");
    expect(report.results).toHaveLength(smokeRoutes.length);
    expect(report.results.map(({ id }) => id)).toEqual(smokeRoutes.map(({ id }) => id));
    expect(report.authoritativeProvenance).toMatchObject({ lookupTime, versionId: "version-42" });
  });

  it.each([
    ["commit SHA", { ...config, commitSha: "b".repeat(40) }],
    ["Sites version", { ...config, sitesVersion: "43" }],
  ])("fails before route checks when the expected %s is wrong", async (_label, wrongConfig) => {
    let fetchCount = 0;
    const fetchImpl = async (input: URL | RequestInfo) => { fetchCount += 1; return passingResponse(input); };

    await expect(runProductionSmoke(wrongConfig, { fetchImpl, provenance, now })).rejects.toThrow(/does not match/);
    expect(fetchCount).toBe(0);
  });

  it("rejects a provenance snapshot containing secret fields", async () => {
    const unsafe = { ...provenance, site: { ...provenance.site, token: "do-not-store" } };

    await expect(runProductionSmoke(config, { provenance: unsafe, now })).rejects.toThrow("forbidden secret field");
  });

  it("fails when a required response differs from the contract", async () => {
    const fetchWithBroken404 = async (input: URL | RequestInfo) => {
      const url = new URL(input instanceof URL ? input : String(input));
      if (url.pathname === "/not-a-real-route") return new Response("Page not found", { status: 200 });
      return passingResponse(input);
    };
    const report = await runProductionSmoke(config, { fetchImpl: fetchWithBroken404, provenance, now });

    expect(report.result).toBe("FAIL");
    expect(report.results.find(({ id }) => id === "route-404")?.failures).toContain("status 200, expected 404");
  });
});
