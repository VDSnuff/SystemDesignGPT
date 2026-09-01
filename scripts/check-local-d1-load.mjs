import { spawn, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { performance } from "node:perf_hooks";

const PORT = 4176;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const CONFIG_PATH = "dist/server/wrangler.json";
const BUDGET_PATH = "docs/validation/performance-budgets.json";
const OUTPUT_PATH = "performance-results/local-d1-load.json";
const MIGRATION_JOURNAL = "drizzle/meta/_journal.json";
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

async function migrationFiles() {
  const journal = JSON.parse(await readFile(MIGRATION_JOURNAL, "utf8"));
  return journal.entries.map(({ tag }) => `drizzle/${tag}.sql`);
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
      Origin: ORIGIN,
      "Content-Type": "application/json",
      "oai-authenticated-user-email": "performance@example.test",
      "oai-authenticated-user-id": "performance-user",
    },
    body: body ? JSON.stringify(body) : undefined,
  };
}

function learningPayload(pageSlug, marker, expectedUpdatedAt = null) {
  return {
    pageSlug,
    note: marker,
    diagram: { version: 1, nodes: [], connections: [] },
    quizAnswers: [],
    expectedUpdatedAt,
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

function singleRaceResult(writes) {
  const saved = writes.filter(({ status }) => status === 200);
  const conflicts = writes.filter(({ status }) => status === 409);
  if (saved.length !== 1 || conflicts.length !== 1) {
    throw new Error(`Expected one save and one conflict, got ${saved.length}/${conflicts.length}`);
  }
  const winner = writes.findIndex(({ status }) => status === 200);
  return { winner, saved, conflicts };
}

function assertLearningRace(writes, state) {
  const result = singleRaceResult(writes);
  const { winner, saved } = result;
  if (state.body.state?.note !== `race-${winner}` || state.body.revision !== saved[0].body.updatedAt) {
    throw new Error("The concurrent write winner did not match the stored state");
  }
  return result;
}

async function exerciseConcurrency() {
  const pageSlug = "3-concurrency";
  const loaded = await timedRequest(`/api/learning-state?page=${pageSlug}`, authenticatedInit("GET"), [200]);
  const writes = await Promise.all([0, 1].map((index) => timedRequest(
    "/api/learning-state",
    authenticatedInit("PUT", learningPayload(pageSlug, `race-${index}`, loaded.body.revision)),
    [200, 409],
  )));
  const afterRace = await timedRequest(`/api/learning-state?page=${pageSlug}`, authenticatedInit("GET"), [200]);
  const { winner, conflicts } = assertLearningRace(writes, afterRace);
  const retryMarker = `retry-${winner === 0 ? 1 : 0}`;
  const retry = await timedRequest("/api/learning-state", authenticatedInit(
    "PUT", learningPayload(pageSlug, retryMarker, afterRace.body.revision),
  ), [200]);
  const afterRetry = await timedRequest(`/api/learning-state?page=${pageSlug}`, authenticatedInit("GET"), [200]);
  if (!retry.ok || afterRetry.body.state?.note !== retryMarker) throw new Error("Explicit conflict retry did not persist");
  return { conflictStatus: conflicts[0].status, retryStatus: retry.status, lostUpdates: 0 };
}

function progressPayload(sectionSlug, expectedUpdatedAt) {
  return {
    lastRead: { sectionSlug, headingId: null },
    completedSections: [sectionSlug],
    checkedItems: [],
    expectedUpdatedAt,
  };
}

async function exerciseProgressConcurrency() {
  const sections = ["9-security", "3-concurrency"];
  const writes = await Promise.all(sections.map((section) => timedRequest(
    "/api/handbook-progress", authenticatedInit("PUT", progressPayload(section, null)), [200, 409],
  )));
  const afterRace = await timedRequest("/api/handbook-progress", authenticatedInit("GET"), [200]);
  const { winner, saved, conflicts } = singleRaceResult(writes);
  if (afterRace.body.state?.completedSections[0] !== sections[winner]
      || afterRace.body.revision !== saved[0].body.updatedAt) {
    throw new Error("The concurrent progress winner did not match the stored state");
  }
  const retry = await timedRequest("/api/handbook-progress", authenticatedInit(
    "PUT", progressPayload(sections[winner === 0 ? 1 : 0], afterRace.body.revision),
  ), [200]);
  const deletion = await timedRequest("/api/handbook-progress", authenticatedInit("DELETE"), [200]);
  const empty = await timedRequest("/api/handbook-progress", authenticatedInit("GET"), [200]);
  if (!retry.ok || !deletion.ok || empty.body.state !== null) throw new Error("Progress retry or cleanup failed");
  return { conflictStatus: conflicts[0].status, retryStatus: retry.status, lostUpdates: 0 };
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
    const migrations = await migrationFiles();
    for (const migration of migrations) applyMigration(migration, persistencePath);
    server = spawn("npx", [
      "wrangler", "dev", "--config", CONFIG_PATH,
      "--port", String(PORT), "--persist-to", persistencePath,
    ], {
      detached: true,
      stdio: "ignore",
    });
    await waitForServer(server);
    const result = {
      measuredAt: new Date().toISOString(),
      target: "built Worker with isolated local Miniflare D1",
      concurrency: budgets.d1.concurrency,
      migrations,
      learning: await exerciseLearningState(),
      optimisticConcurrency: {
        learning: await exerciseConcurrency(),
        progress: await exerciseProgressConcurrency(),
      },
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
