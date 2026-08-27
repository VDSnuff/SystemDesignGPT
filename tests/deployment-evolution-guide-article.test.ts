import { describe, expect, it } from "vitest";
import { guideArticles } from "../app/articles";

describe("Deployment & evolution guide article", () => {
  it("ships substantive, evidence-linked deployment guidance", () => {
    const article = guideArticles.find(({ slug }) => slug === "deployment-evolution");

    expect(article).toBeDefined();
    expect(article?.wordCount).toBeGreaterThanOrEqual(1_000);
    expect(article?.wordCount).toBeLessThanOrEqual(1_800);
    expect(article?.headings.map(({ title }) => title)).toEqual(expect.arrayContaining([
      "Design the mixed-version period first",
      "Separate deployment from release",
      "Choose a rollout and recovery strategy",
      "Evolve APIs, events, schemas, and data compatibly",
      "Worked migration: rename a customer field without downtime",
      "Treat stateful rollback as a separate design",
      "Make release evidence a gate",
      "Failure modes to challenge",
      "Deployment and evolution review checklist",
      "Review questions",
    ]));
    expect(article?.markdown).toContain("/book/11-deployment-migration-and-evolution");
    expect(article?.markdown).toContain("evidence and verification register");
    expect(article?.markdown).toContain("27 August 2026");
    expect(article?.markdown).toMatch(/Evidence: \[S\d+/);
  });
});
