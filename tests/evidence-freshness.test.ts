import fs from "node:fs";
import { describe, expect, it } from "vitest";
import ledger from "../docs/evidence-freshness.json";
import { formatReport, validateFreshness } from "../scripts/check-evidence-freshness.mjs";

const markdown = fs.readFileSync("docs/System_Design_Checklist_Book.md", "utf8");

function copyLedger() {
  return structuredClone(ledger);
}

describe("evidence freshness", () => {
  it("keeps the live ledger current and connected to canonical sources", () => {
    expect(validateFreshness(ledger, markdown, "2026-09-04")).toEqual([]);
  });

  it("requires reviews for sources marked fast-moving in the handbook", () => {
    const changed = copyLedger();
    changed.sources = changed.sources.filter(({ id }) => id !== "S71");
    expect(validateFreshness(changed, markdown, "2026-09-04")).toContain(
      "S71 is marked fast-moving but has no freshness review",
    );
  });

  it("expires calendar reviews instead of silently preserving PASS", () => {
    expect(validateFreshness(ledger, markdown, "2026-10-04")).toContain(
      "S46 review due on 2026-10-04",
    );
    expect(validateFreshness(ledger, markdown, "2026-12-05")).toContain(
      "S1 review due on 2026-12-03",
    );
  });

  it("blocks material content work and requires an actionable issue", () => {
    const changed = copyLedger();
    changed.sources[0].semantic.result = "ACTION_REQUIRED";
    const withoutIssue = validateFreshness(changed, markdown, "2026-09-04");
    expect(withoutIssue).toContain("S1 material change requires a GitHub content issue");
    expect(withoutIssue).toContain("S1 has actionable content work");

    Object.assign(changed.sources[0].semantic, {
      contentIssue: "https://github.com/example/project/issues/123",
    });
    expect(validateFreshness(changed, markdown, "2026-09-04")).toContain(
      "S1 has actionable content work: https://github.com/example/project/issues/123",
    );
  });

  it("reports the three verification layers independently", () => {
    const report = formatReport(ledger);
    expect(report).toContain("AUTOMATED URL\tBROWSER\tSEMANTIC EDITORIAL REVIEW");
    expect(report).toContain("S1\tUNVERIFIED\tPASS\tCURRENT");
  });
});
