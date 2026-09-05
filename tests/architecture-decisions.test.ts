import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const adrDirectory = "docs/adr";
const adrFiles = fs.readdirSync(adrDirectory)
  .filter((name) => /^\d{4}-.+\.md$/.test(name))
  .toSorted();
const requiredSections = [
  "Context",
  "Decision",
  "Alternatives considered",
  "Consequences",
  "Evidence",
  "Supersession rule",
] as const;

function documentLinks(filePath: string, markdown: string) {
  return [...markdown.matchAll(/\[[^\]]+\]\(([^)#]+)(?:#[^)]+)?\)/g)]
    .map((match) => path.resolve(path.dirname(filePath), match[1] ?? ""));
}

describe("architecture decision records", () => {
  it("indexes the complete numbered decision set", () => {
    const index = fs.readFileSync(path.join(adrDirectory, "README.md"), "utf8");
    const normalizedIndex = index.replace(/\s+/g, " ");

    expect(adrFiles.length).toBeGreaterThanOrEqual(7);
    for (const file of adrFiles) expect(index).toContain(`](${file})`);
    expect(normalizedIndex).toContain("update its current ADR or add the superseding ADR");
  });

  it.each(adrFiles)("keeps %s complete and evidence-linked", (file) => {
    const filePath = path.join(adrDirectory, file);
    const markdown = fs.readFileSync(filePath, "utf8");

    expect(markdown).toMatch(/^- \*\*Status:\*\* (Proposed|Accepted|Deprecated|Superseded by ADR-\d{4})$/m);
    expect(markdown).toMatch(/^- \*\*Date:\*\* \d{4}-\d{2}-\d{2}$/m);
    expect(markdown).toMatch(/^- \*\*Owners:\*\* \S.+$/m);
    for (const section of requiredSections) expect(markdown).toContain(`## ${section}`);
    const links = documentLinks(filePath, markdown);
    expect(links.length).toBeGreaterThanOrEqual(3);
    for (const link of links) expect(fs.existsSync(link), link).toBe(true);
  });

  it("provides a stable template with the same lifecycle fields", () => {
    const template = fs.readFileSync(path.join(adrDirectory, "template.md"), "utf8");

    expect(template).toContain("**Status:** Proposed");
    expect(template).toContain("**Date:** YYYY-MM-DD");
    expect(template).toContain("**Owners:** Repository maintainers");
    for (const section of requiredSections) expect(template).toContain(`## ${section}`);
  });
});
