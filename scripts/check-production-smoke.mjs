import { pathToFileURL } from "node:url";
import { loadProductionProvenance, verifyProductionProvenance } from "./production-provenance.mjs";

const REQUEST_TIMEOUT_MS = 15_000;
const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const VERSION_PATTERN = /^\d+$/;
const browserHeaders = {
  "content-security-policy": "frame-ancestors 'self' https://chatgpt.com",
  "permissions-policy": "camera=(), geolocation=(), microphone=()",
  "referrer-policy": "strict-origin-when-cross-origin",
  "strict-transport-security": "max-age=31536000",
  "x-content-type-options": "nosniff",
};
const apiHeaders = { ...browserHeaders, "cache-control": "no-store", "x-robots-tag": "noindex" };

export const smokeRoutes = [
  { id: "home", path: "/", status: 200, body: "System Design Checklist Book", headers: browserHeaders },
  { id: "guide", path: "/chapter/requirements", status: 200, body: "Design from requirements", headers: browserHeaders },
  { id: "handbook", path: "/book/1-requirements-frs-nfrs-constraints-and-assumptions", status: 200, body: "Requirements: FRs", headers: browserHeaders },
  { id: "mermaid-source", path: "/book/practical-system-design-workflow", status: 200, body: "Practical system-design workflow", headers: browserHeaders },
  { id: "workshop", path: "/workshop", status: 200, body: "Diagram workshop", headers: browserHeaders },
  { id: "owner", path: "/owner/comments", status: 200, body: "Learning comments", headers: { ...browserHeaders, "x-robots-tag": "noindex" } },
  { id: "chat-status", path: "/api/chat", status: 200, body: "authentication-required", headers: apiHeaders },
  { id: "progress-auth", path: "/api/handbook-progress", status: 401, body: "Sign in", headers: apiHeaders },
  { id: "comments-auth", path: "/api/learning-comments", status: 401, body: "Sign in", headers: apiHeaders },
  { id: "learning-auth", path: "/api/learning-state?page=workshop", status: 401, body: "Sign in", headers: apiHeaders },
  { id: "book-404", path: "/book/not-a-real-section", status: 404, body: "Page not found", headers: browserHeaders },
  { id: "route-404", path: "/not-a-real-route", status: 404, body: "Page not found", headers: browserHeaders },
];

function argument(name, envName, argv, env) {
  const direct = argv.find((value) => value.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : env[envName];
}

export function productionConfig(argv = process.argv.slice(2), env = process.env) {
  const config = {
    origin: argument("origin", "PRODUCTION_SMOKE_ORIGIN", argv, env),
    commitSha: argument("commit-sha", "PRODUCTION_SMOKE_COMMIT_SHA", argv, env),
    sitesVersion: argument("sites-version", "PRODUCTION_SMOKE_SITES_VERSION", argv, env),
    provenanceFile: argument("provenance-file", "PRODUCTION_SMOKE_PROVENANCE_FILE", argv, env),
  };
  validateConfig(config);
  return config;
}

export function validateConfig(config) {
  if (!config.origin || !config.commitSha || !config.sitesVersion || !config.provenanceFile) {
    throw new Error("origin, commit SHA, Sites version, and provenance file are required");
  }
  const origin = new URL(config.origin);
  if (origin.protocol !== "https:" || origin.pathname !== "/" || origin.search || origin.hash) {
    throw new Error("origin must be an HTTPS origin without a path");
  }
  if (!SHA_PATTERN.test(config.commitSha)) throw new Error("commit SHA must be 40 hexadecimal characters");
  if (!VERSION_PATTERN.test(config.sitesVersion)) throw new Error("Sites version must be numeric");
}

function headerFailures(response, expected) {
  return Object.entries(expected).flatMap(([name, value]) => {
    const actual = response.headers.get(name) ?? "";
    return actual.toLowerCase().includes(value.toLowerCase()) ? [] : [`${name} missing ${value}`];
  });
}

async function fetchRoute(origin, route, fetchImpl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(new URL(route.path, origin), {
      headers: { "User-Agent": "SystemDesignStudio-ProductionSmoke/1.0" },
      redirect: "follow",
      signal: controller.signal,
    });
    const body = await response.text();
    const failures = [
      ...(response.status === route.status ? [] : [`status ${response.status}, expected ${route.status}`]),
      ...(body.includes(route.body) ? [] : [`body missing ${route.body}`]),
      ...headerFailures(response, route.headers),
    ];
    return { id: route.id, path: route.path, status: response.status, result: failures.length ? "FAIL" : "PASS", failures };
  } catch (error) {
    return { id: route.id, path: route.path, status: null, result: "FAIL", failures: [error instanceof Error ? error.message : String(error)] };
  } finally {
    clearTimeout(timeout);
  }
}

export async function runProductionSmoke(config, { fetchImpl = fetch, provenance = {}, now = Date.now() } = {}) {
  const resolved = verifyProductionProvenance(config, provenance, now);
  const results = [];
  for (const route of smokeRoutes) results.push(await fetchRoute(config.origin, route, fetchImpl));
  return {
    checkedAt: new Date().toISOString(),
    origin: config.origin,
    commitSha: resolved.commitSha,
    sitesVersion: String(resolved.sitesVersion),
    authoritativeProvenance: {
      lookupTime: resolved.lookupTime,
      projectId: resolved.projectId,
      versionId: resolved.versionId,
      deploymentId: resolved.deploymentId,
      deploymentUpdatedAt: resolved.deploymentUpdatedAt,
    },
    result: results.every((item) => item.result === "PASS") ? "PASS" : "FAIL",
    results,
    limitations: ["Mermaid browser rendering and authenticated persistence require their separate browser/real-account gates."],
  };
}

async function main() {
  try {
    const config = productionConfig();
    const provenance = loadProductionProvenance(config.provenanceFile);
    const report = await runProductionSmoke(config, { provenance });
    console.log(JSON.stringify(report, null, 2));
    if (report.result !== "PASS") process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main();
