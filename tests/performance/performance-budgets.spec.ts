import { expect, test } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  batchedRequests,
  measureInteractions,
  measureRoute,
  percentile,
  type ApiRoute,
  type Profile,
  type RouteBudget,
} from "./performance-helpers";

const budgets = JSON.parse(readFileSync("docs/validation/performance-budgets.json", "utf8")) as {
  profiles: Record<string, Profile>;
  routes: RouteBudget[];
  interactionMs: Record<string, number>;
  api: { samples: number; concurrency: number; p95Ms: number; errorRate: number };
};
const outputPath = process.env.PERFORMANCE_ARTIFACT_PATH ?? "performance-results/browser-performance.json";
const runCount = Number(process.env.PERFORMANCE_RUNS ?? 1);
const hostedTarget = Boolean(process.env.PERFORMANCE_BASE_URL);

function initialResults() {
  if (Number(process.env.TEST_WORKER_INDEX ?? 0) === 0) return [];
  try {
    return JSON.parse(readFileSync(outputPath, "utf8")).results ?? [];
  } catch {
    return [];
  }
}

const results: Record<string, unknown>[] = initialResults();

function persistResults() {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify({ measuredAt: new Date().toISOString(), results }, null, 2)}\n`);
}

function assertRoute(measurement: Awaited<ReturnType<typeof measureRoute>>, route: RouteBudget, profile: Profile) {
  expect(measurement.status).toBe(200);
  expect(measurement.lcpMs).toBeLessThanOrEqual(profile.lcpMs);
  expect(measurement.cls, route.id).toBeLessThanOrEqual(profile.cls);
  expect(measurement.tbtMs).toBeLessThanOrEqual(profile.tbtMs);
  expect(measurement.ttfbMs).toBeLessThanOrEqual(profile.ttfbMs);
  expect(measurement.rawJsBytes).toBeLessThanOrEqual(route.rawJsBytes);
  expect(measurement.gzipJsBytes).toBeLessThanOrEqual(route.gzipJsBytes);
  expect(measurement.mermaidParserFetched).toBe(Boolean(route.mermaid));
}

function apiRoutes(): ApiRoute[] {
  return [
    { id: "home", path: "/", statuses: [200] },
    ...(hostedTarget ? [
      { id: "chat-status", path: "/api/chat", statuses: [200] },
      { id: "progress", path: "/api/handbook-progress", statuses: [401] },
      { id: "state", path: "/api/learning-state?page=diagram-workshop", statuses: [401] },
      { id: "comments", path: "/api/learning-comments", statuses: [401] },
    ] : []),
  ];
}

test.afterAll(persistResults);

for (const [profileName, profile] of Object.entries(budgets.profiles)) {
  test(`${profileName} route budgets`, async ({ browser }) => {
    for (let run = 1; run <= runCount; run += 1) {
      for (const route of budgets.routes) {
        const measurement = await measureRoute(browser, route, profile);
        results.push({ kind: "route", profile: profileName, route: route.id, run, ...measurement });
        persistResults();
        assertRoute(measurement, route, profile);
      }
    }
  });
}

test("interaction latency budgets", async ({ browser }) => {
  const measurement = await measureInteractions(browser);
  results.push({ kind: "interactions", ...measurement });
  persistResults();
  for (const [name, duration] of Object.entries(measurement)) {
    expect(duration).toBeLessThanOrEqual(budgets.interactionMs[name]);
  }
});

test("public and signed-out API load budgets", async ({ request }) => {
  for (const route of apiRoutes()) {
    const cold = await batchedRequests(request, route, 1, 1);
    const samples = await batchedRequests(request, route, budgets.api.concurrency, budgets.api.samples);
    const latencies = samples.map(({ durationMs }) => durationMs);
    const measurement = {
      kind: "api", route: route.id, coldMs: cold[0]?.durationMs,
      p50Ms: percentile(latencies, 0.5), p95Ms: percentile(latencies, 0.95),
      p99Ms: percentile(latencies, 0.99),
      errorRate: samples.filter(({ ok }) => !ok).length / samples.length,
      recoveryStatus: (await request.get(route.path)).status(),
    };
    results.push(measurement);
    persistResults();
    expect(measurement.p95Ms).toBeLessThanOrEqual(budgets.api.p95Ms);
    expect(measurement.errorRate).toBe(budgets.api.errorRate);
    expect(route.statuses).toContain(measurement.recoveryStatus);
    if (route.id !== "home") expect(samples.every(({ cacheControl }) => cacheControl === "no-store")).toBe(true);
  }
});
