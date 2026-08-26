import { describe, expect, it } from "vitest";
import { guideArticles } from "../app/articles";

describe("Failures & resilience guide article", () => {
  it("ships substantive, evidence-linked resilience guidance", () => {
    const article = guideArticles.find(({ slug }) => slug === "resilience");

    expect(article).toBeDefined();
    expect(article?.wordCount).toBeGreaterThanOrEqual(1_000);
    expect(article?.wordCount).toBeLessThanOrEqual(1_800);
    expect(article?.headings.map(({ title }) => title)).toEqual(expect.arrayContaining([
      "Allocate end-to-end time and retry budgets",
      "Worked example: dependency outage during checkout",
      "Degrade deliberately and recover completely",
      "Failure modes to challenge",
      "Verify recovery evidence",
      "Resilience review checklist",
      "Review questions",
    ]));
    expect(article?.markdown).toContain("/book/7-failure-handling-and-resilience");
    expect(article?.markdown).toContain("evidence and verification register");
    expect(article?.markdown).toContain("26 August 2026");
    expect(article?.markdown).toMatch(/Evidence: \[S\d+/);
  });
});
