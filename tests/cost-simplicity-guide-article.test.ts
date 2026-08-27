import { describe, expect, it } from "vitest";
import { guideArticles } from "../app/articles";

describe("Cost, simplicity & operability guide article", () => {
  it("ships substantive, evidence-linked operability guidance", () => {
    const article = guideArticles.find(({ slug }) => slug === "cost-simplicity");

    expect(article).toBeDefined();
    expect(article?.wordCount).toBeGreaterThanOrEqual(1_000);
    expect(article?.wordCount).toBeLessThanOrEqual(1_800);
    expect(article?.headings.map(({ title }) => title)).toEqual(expect.arrayContaining([
      "Make every component earn its place",
      "Compare build, buy, and managed operation",
      "Worked simplification review: an order-status portal",
      "Connect cost scaling to value",
      "Match the design to ownership capacity",
      "Set removal and consolidation triggers",
      "Failure modes to challenge",
      "Verify cost, simplicity, and operability",
      "Cost, simplicity, and operability review checklist",
      "Review questions",
    ]));
    expect(article?.markdown).toContain("/book/12-cost-simplicity-and-operability");
    expect(article?.markdown).toContain("evidence and verification register");
    expect(article?.markdown).toContain("27 August 2026");
    expect(article?.markdown).toMatch(/Evidence: \[S\d+/);
  });
});
