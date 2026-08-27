import { describe, expect, it } from "vitest";
import { guideArticles } from "../app/articles";

describe("Observability & reliability guide article", () => {
  it("ships substantive, evidence-linked observability guidance", () => {
    const article = guideArticles.find(({ slug }) => slug === "observability");

    expect(article).toBeDefined();
    expect(article?.wordCount).toBeGreaterThanOrEqual(1_000);
    expect(article?.wordCount).toBeLessThanOrEqual(1_800);
    expect(article?.headings.map(({ title }) => title)).toEqual(expect.arrayContaining([
      "Define SLIs, SLOs, and error-budget decisions",
      "Worked SLO: checkout confirmation",
      "Choose telemetry for the question",
      "Bound cardinality, sampling, and retention",
      "Worked diagnosis: follow one failed checkout",
      "Design health signals and actionable alerts",
      "Prove backup, restore, and operational ownership",
      "Failure modes to challenge",
      "Verify reliability evidence",
      "Observability and reliability review checklist",
      "Review questions",
    ]));
    expect(article?.markdown).toContain("/book/10-observability-and-reliability");
    expect(article?.markdown).toContain("evidence and verification register");
    expect(article?.markdown).toContain("27 August 2026");
    expect(article?.markdown).toMatch(/Evidence: \[S\d+/);
  });
});
