import { describe, expect, it } from "vitest";
import { guideArticles } from "../app/articles";

describe("Scale, performance & caching guide article", () => {
  it("ships substantive, evidence-linked scaling guidance", () => {
    const article = guideArticles.find(({ slug }) => slug === "scale-performance");

    expect(article).toBeDefined();
    expect(article?.wordCount).toBeGreaterThanOrEqual(1_000);
    expect(article?.wordCount).toBeLessThanOrEqual(1_800);
    expect(article?.headings.map(({ title }) => title)).toEqual(expect.arrayContaining([
      "Estimate the few numbers that change a decision",
      "Worked example: size an order-read path",
      "Treat the cache as a data system",
      "Worked cache decision: product catalog reads",
      "Failure modes to challenge",
      "Verify performance with representative load",
      "Scale, performance, and caching review checklist",
      "Review questions",
    ]));
    expect(article?.markdown).toContain("/book/8-scale-capacity-performance-and-caching");
    expect(article?.markdown).toContain("evidence and verification register");
    expect(article?.markdown).toContain("27 August 2026");
    expect(article?.markdown).toMatch(/Evidence: \[S\d+/);
  });
});
