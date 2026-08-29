import { spawn, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { performance } from "node:perf_hooks";

const PORT = 4176;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const COOKIE = "__sites_local_auth=1";
const CONFIG_PATH = "dist/server/wrangler.json";
const BUDGET_PATH = "docs/validation/performance-budgets.json";
const OUTPUT_PATH = "performance-results/local-d1-load.json";
const MIGRATIONS = [
  "drizzle/0000_demonic_deadpool.sql",
  "drizzle/0001_careful_master_mold.sql",
  "drizzle/0002_glamorous_chat.sql",
];
const PAGE_SLUGS = [
  "diagram-workshop",
  "1-requirements-frs-nfrs-constraints-and-assumptions",
  "2-boundaries-state-and-data",
  "2a-networking-and-communication",
  "2b-data-modeling-indexing-and-partitioning",
  "2c-time-clocks-and-ordering",
  "4-transactions-and-consistency",
  "6-messaging-and-asynchronous-work",
];

function percentile(values, fraction) {
  const sorted = values.toSorted((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] ?? 0;
}

function summarize(samples) {
  const latencies = samples.map(({ durationMs }) => durationMs);
  return {
    requests: samples.length,
    errors: samples.filter(({ ok }) => !ok).length,
    p50Ms: percentile(latencies, 0.5),
    p95Ms: percentile(latencies, 0.95),
    p99Ms: percentile(latencies, 0.99),
  };
}

function applyMigration(file, persistencePath) {
  const result = spawnSync("npx", [
    "wrangler", "d1", "execute", "site-creator-d1", "--local",
    "--config", CONFIG_PATH, "--persist-to", persistencePath, "--file", file,
  ], { encoding: "utf8", stdio: "pipe" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
}

async function waitForServer(server) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Local server exited with ${server.exitCode}`);
    try {
      const response = await fetch(`${ORIGIN}/api/chat`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for the local D1 server");
}

async function timedRequest(url, init, expectedStatuses) {
  const startedAt = performance.now();
  const response = await fetch(`${ORIGIN}${url}`, init);
  const body = await response.json().catch(() => ({}));
  return {
    body,
    durationMs: Math.round(performance.now() - startedAt),
    ok: expectedStatuses.includes(response.status),
    status: response.status,
    cacheControl: response.headers.get("cache-control"),
  };
}

function authenticatedInit(method, body) {
  return {
    method,
    headers: {
      Cookie: COOKIE,
      Origin: ORIGIN,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  };
}

function learningPayload(pageSlug, marker) {
  return {
    pageSlug,
    note: marker,
    diagram: { version: 1, nodes: [], connections: [] },
    quizAnswers: [],
  };
}

async function exerciseLearningState() {
  const writes = await Promise.all(PAGE_SLUGS.map((pageSlug, index) => timedRequest(
    "/api/learning-state",
    authenticatedInit("PUT", learningPayload(pageSlug, `perf-${index}`)),
    [200],
  )));
  const reads = await Promise.all(PAGE_SLUGS.map((pageSlug, index) => timedRequest(
    `/api/learning-state?page=${encodeURIComponent(pageSlug)}`,
    authenticatedInit("GET"),
    [200],
  ).then((sample) => ({
    ...sample,
    ok: sample.ok && sample.body.state?.note === `perf-${index}`,
  }))));
  return { reads: summarize(reads), writes: summarize(writes) };
}

async function exerciseRateLimit() {
  const submissions = await Promise.all(Array.from({ length: 6 }, (_, index) => timedRequest(
    "/api/learning-comments",
    authenticatedInit("POST", {
      pageSlug: "1-requirements-frs-nfrs-constraints-and-assumptions",
      body: `Synthetic performance comment ${index}`,
    }),
    [201, 429],
  )));
  const created = submissions.filter(({ status }) => status === 201);
  const limited = submissions.filter(({ status }) => status === 429);
  if (created.length !== 5 || limited.length !== 1) {
    throw new Error(`Expected five accepted comments and one 429, got ${created.length}/${limited.length}`);
  }
  await Promise.all(created.map(({ body }) => timedRequest(
    "/api/learning-comments",
    authenticatedInit("DELETE", { id: body.id }),
    [200],
  )));
  return { ...summarize(submissions), accepted: created.length, limited: limited.length };
}

async function cleanupLearningState() {
  const deletion = await timedRequest("/api/learning-state", authenticatedInit("DELETE"), [200]);
  const recovery = await timedRequest(
    `/api/learning-state?page=${encodeURIComponent(PAGE_SLUGS[0])}`,
    authenticatedInit("GET"),
    [200],
  );
  if (!deletion.ok || !recovery.ok || recovery.body.state !== null) {
    throw new Error("Synthetic learning-state cleanup did not recover to an empty state");
  }
  return { cleanupStatus: deletion.status, recoveryMs: recovery.durationMs };
}

function assertBudgets(result, budget) {
  for (const metric of [result.learning.reads, result.learning.writes, result.rateLimit]) {
    const errorRate = metric.errors / metric.requests;
    if (errorRate > budget.errorRate) throw new Error(`D1 error-rate budget exceeded: ${errorRate}`);
    if (metric.p95Ms > budget.p95Ms) throw new Error(`D1 p95 budget exceeded: ${metric.p95Ms}ms`);
  }
}

function stopServer(server) {
  if (!server?.pid || server.exitCode !== null) return;
  try { process.kill(-server.pid, "SIGTERM"); } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}

async function main() {
  const persistencePath = await mkdtemp(path.join(tmpdir(), "system-design-d1-load-"));
  const budgets = JSON.parse(await readFile(BUDGET_PATH, "utf8"));
  let server;
  try {
    for (const migration of MIGRATIONS) applyMigration(migration, persistencePath);
    server = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(PORT)], {
      detached: true,
      env: {
        ...process.env,
        LOCAL_D1_PERSISTENCE_PATH: persistencePath,
        MINIFLARE_REGISTRY_PATH: path.join(persistencePath, "registry"),
      },
      stdio: "ignore",
    });
    await waitForServer(server);
    const result = {
      measuredAt: new Date().toISOString(),
      target: "isolated local Miniflare D1",
      concurrency: budgets.d1.concurrency,
      learning: await exerciseLearningState(),
      rateLimit: await exerciseRateLimit(),
      recovery: await cleanupLearningState(),
    };
    await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify(result, null, 2));
    assertBudgets(result, budgets.d1);
  } finally {
    stopServer(server);
    await rm(persistencePath, { recursive: true, force: true });
  }
}

await main();
