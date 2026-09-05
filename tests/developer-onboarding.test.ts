import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readme = readFileSync("README.md", "utf8");
const environmentNames = [
  "OPENAI_API_KEY", "OPENAI_MODEL", "SITE_OWNER_EMAIL",
  "CLIENT_MEASURE_BASE_URL", "PERFORMANCE_BASE_URL",
  "PERFORMANCE_ARTIFACT_PATH", "PERFORMANCE_RUNS",
  "PRODUCTION_SMOKE_ORIGIN", "PRODUCTION_SMOKE_COMMIT_SHA",
  "PRODUCTION_SMOKE_SITES_VERSION", "PRODUCTION_SMOKE_PROVENANCE_FILE",
  "EVIDENCE_CHECK_DATE", "PORT", "CI", "TEST_WORKER_INDEX",
  "CODEX_SANDBOX", "WRANGLER_WRITE_LOGS", "WRANGLER_LOG_PATH",
  "MINIFLARE_REGISTRY_PATH",
] as const;

const verificationCommands = [
  "npm test", "npm run typecheck", "npm run lint",
  "npm run check:generated", "npm run check:evidence-freshness",
  "npm run check:copilot-evaluation",
  "npm audit --omit=dev --audit-level=high", "npm audit --audit-level=high",
  "npm run check:supply-chain", "npm run build",
  "npm run check:performance", "npm run check:performance:d1",
  "npm run check:recovery:d1", "npm run check:links",
  "npm run test:e2e", "npm run test:e2e:cross-browser",
  "npm run test:e2e:visual", "npm run check:production-smoke",
  "git diff --check",
] as const;

describe("developer onboarding", () => {
  it("uses the lockfile-reproducible setup path", () => {
    expect(readme).toContain("npm ci --no-audit");
    expect(readme).toContain("package-lock.json");
  });

  it.each(environmentNames)("documents %s", (name) => {
    expect(readme).toContain(`\`${name}\``);
  });

  it("does not publish application credentials", () => {
    expect(readme).not.toMatch(/^OPENAI_API_KEY=.+$/m);
    expect(readme).not.toMatch(/^SITE_OWNER_EMAIL=.+$/m);
  });

  it.each(verificationCommands)("documents %s", (command) => {
    expect(readme).toContain(command);
  });

  it("links the data, evidence, deployment, and rollback contracts", () => {
    expect(readme).toContain("docs/validation/d1-persistence-recovery.md");
    expect(readme).toContain("docs/validation/README.md");
    expect(readme).toContain("docs/operations/sites-release-runbook.md");
    expect(readme).toContain("docs/operations/sites-release-runbook.md#rollback");
  });
});
