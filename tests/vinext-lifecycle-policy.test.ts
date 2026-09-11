import fs from "node:fs";
import { describe, expect, it } from "vitest";
import policy from "../docs/operations/vinext-lifecycle-policy.json";
import packageJson from "../package.json";

const codeOwners = fs.readFileSync(".github/CODEOWNERS", "utf8");
const markdown = fs.readFileSync("docs/operations/vinext-lifecycle-policy.md", "utf8");

describe("vinext lifecycle policy", () => {
  it("pins the reviewed adapter version and records its owner and review date", () => {
    expect(policy.package).toBe("vinext");
    expect(packageJson.devDependencies.vinext).toBe(policy.pinnedVersion);
    expect(codeOwners).toContain(`* ${policy.owner}`);
    expect(policy.reviewBy > policy.lastReviewed).toBe(true);
    expect(policy.exitCriteria).toBeTruthy();
    expect(policy.rollbackTriggers.length).toBeGreaterThan(0);
  });

  it("maps every upgrade gate to an executable repository command", () => {
    const required = ["build", "unit", "d1", "browser", "cross-browser", "visual", "hosted-smoke"];
    expect(policy.upgradeMatrix.map(({ id }) => id)).toEqual(required);
    for (const gate of policy.upgradeMatrix) {
      const scripts = [...gate.command.matchAll(/npm (?:run )?([\w:-]+)/g)].map((match) => match[1]);
      expect(scripts.length, gate.id).toBeGreaterThan(0);
      for (const script of scripts) expect(packageJson.scripts, gate.id).toHaveProperty(script);
    }
  });

  it("links the policy to its decision and rollback runbook", () => {
    expect(markdown).toContain("(../adr/0001-use-vinext-for-the-sites-runtime.md)");
    expect(markdown).toContain("(./sites-release-runbook.md#rollback)");
    expect(markdown).toContain("(./vinext-lifecycle-policy.json)");
  });
});
