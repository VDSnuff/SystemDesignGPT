import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { bookSections } from "../app/book-content.generated";
import { guidePages } from "../app/content";
import branchProtection from "../.github/branch-protection.json";
import manifest from "../docs/validation/manifest.json";
import packageJson from "../package.json";

function testFiles(directory = "tests"): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) return testFiles(filePath);
    return /\.(?:test\.(?:ts|tsx)|spec\.ts)$/.test(entry.name) ? [filePath] : [];
  });
}

function routeGroup(id: string) {
  const group = manifest.routeGroups.find((candidate) => candidate.id === id);
  if (!group) throw new Error(`Validation route group ${id} is missing`);
  return group;
}

function mappedTestFiles() {
  return manifest.testMappings.flatMap(({ files }) => files);
}

describe("release validation manifest", () => {
  it("tracks every guide and canonical handbook route", () => {
    expect(routeGroup("quick-guide").routes).toEqual(
      guidePages.map(({ slug }) => `/chapter/${slug}`),
    );
    expect(routeGroup("canonical-handbook").routes).toEqual(
      bookSections.map(({ slug }) => slug === "introduction" ? "/" : `/book/${slug}`),
    );
    expect(routeGroup("public-static").routes).toEqual(["/", "/workshop", "/owner/comments"]);
    expect(routeGroup("api").routes).toEqual([
      "/api/chat", "/api/handbook-progress", "/api/learning-comments", "/api/learning-state",
    ]);
  });

  it("maps every current automated test exactly once", () => {
    const mappedFiles = mappedTestFiles();
    expect(new Set(mappedFiles).size).toBe(mappedFiles.length);
    expect(mappedFiles.toSorted()).toEqual(testFiles().toSorted());
  });

  it("uses declared actors and risk owners throughout the matrix", () => {
    const actorIds = new Set(manifest.actors);
    const environmentIds = new Set(manifest.environments);
    const riskIds = new Set(manifest.riskDomains.map(({ id }) => id));
    expect(manifest.riskDomains.every(({ ownerIssue }) => ownerIssue >= 60 && ownerIssue <= 69)).toBe(true);
    for (const group of manifest.routeGroups) {
      expect(group.actors.every((actor) => actorIds.has(actor))).toBe(true);
      expect(group.environments.every((environment) => environmentIds.has(environment))).toBe(true);
      expect(group.risks.every((risk) => riskIds.has(risk))).toBe(true);
      expect(group.ownerIssues.every((issue) => issue >= 60 && issue <= 69)).toBe(true);
      expect(group.testTypes.length).toBeGreaterThan(0);
      expect(group.artifacts.length).toBeGreaterThan(0);
    }
    for (const mapping of manifest.testMappings) {
      expect(mapping.risks.every((risk) => riskIds.has(risk))).toBe(true);
    }
  });

  it("keeps executable commands and planned gaps explicit", () => {
    const requiredCommands = [
      "unit-component", "typecheck", "lint", "generated-content", "evidence-freshness", "copilot-evaluation", "production-audit", "full-audit",
      "supply-chain", "build", "client-js", "performance-browser", "performance-d1-load", "d1-recovery", "browser",
      "cross-browser",
      "visual-regression",
      "accessibility", "diff", "link-health", "production-smoke",
    ];
    expect(manifest.commands.map(({ id }) => id)).toEqual(requiredCommands);
    for (const item of manifest.commands) {
      if (item.status === "planned") {
        expect(item.command).toBeNull();
        expect(item.ownerIssue).toBeGreaterThan(59);
        continue;
      }
      expect(item.command).toBeTruthy();
      const scriptName = item.command?.match(/npm run ([\w:-]+)/)?.[1];
      if (scriptName) expect(packageJson.scripts).toHaveProperty(scriptName);
    }
  });

  it("tracks every generated handbook artifact", () => {
    const [generated] = manifest.generatedArtifacts;
    expect(generated.source).toBe("docs/System_Design_Checklist_Book.md");
    expect(generated.targets).toEqual([
      "app/book-content.generated.ts", "app/book-learning.generated.ts",
      "app/book-progress.generated.ts", "app/book-search.generated.ts",
    ]);
    expect([generated.source, ...generated.targets].every(fs.existsSync)).toBe(true);
  });

  it("keeps dependency and repository governance executable", () => {
    expect(packageJson.scripts).toHaveProperty("typecheck");
    expect(packageJson.scripts).toHaveProperty("check:supply-chain");
    expect(packageJson.scripts).toHaveProperty("test:e2e:cross-browser");
    expect(packageJson.scripts).toHaveProperty("test:e2e:visual");
    expect(packageJson.scripts).toHaveProperty("start:built-worker");
    expect(fs.existsSync("docs/validation/dependency-policy.json")).toBe(true);
    expect(fs.existsSync(".github/dependabot.yml")).toBe(true);
    expect(fs.existsSync(".github/branch-protection.json")).toBe(true);
    expect(fs.existsSync("SECURITY.md")).toBe(true);
  });

  it("keeps the review policy payload aligned with ADR-0008", () => {
    const adr = fs.readFileSync(
      "docs/adr/0008-accept-single-maintainer-merges-under-automated-gates.md", "utf8",
    );
    const reviewBy = adr.match(/^- \*\*Review by:\*\* (\d{4}-\d{2}-\d{2})$/m)?.[1];
    const riskOwner = adr.match(/^- \*\*Risk owner:\*\* (@\S+)$/m)?.[1];
    const codeOwners = fs.readFileSync(".github/CODEOWNERS", "utf8");

    expect(adr).toMatch(/^- \*\*Status:\*\* Accepted$/m);
    expect(reviewBy).toBeTruthy();
    expect(riskOwner).toBeTruthy();
    expect(codeOwners).toContain(`* ${riskOwner}`);
    expect(branchProtection.required_status_checks.strict).toBe(true);
    expect(branchProtection.required_status_checks.contexts).toEqual([
      "Test, lint, generated content, audit, and build",
      "Responsive browser contracts",
    ]);
    expect(branchProtection.enforce_admins).toBe(true);
    expect(branchProtection.required_linear_history).toBe(true);
    expect(branchProtection.allow_force_pushes).toBe(false);
    expect(branchProtection.allow_deletions).toBe(false);
    expect(branchProtection.required_conversation_resolution).toBe(true);
    expect(branchProtection.required_pull_request_reviews).toEqual({
      dismiss_stale_reviews: true,
      require_code_owner_reviews: false,
      required_approving_review_count: 0,
      require_last_push_approval: false,
    });
  });
});
