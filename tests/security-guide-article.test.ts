import { describe, expect, it } from "vitest";
import { guideArticles } from "../app/articles";

describe("Security guide article", () => {
  it("ships substantive, evidence-linked security guidance", () => {
    const article = guideArticles.find(({ slug }) => slug === "security");

    expect(article).toBeDefined();
    expect(article?.wordCount).toBeGreaterThanOrEqual(1_000);
    expect(article?.wordCount).toBeLessThanOrEqual(1_800);
    expect(article?.headings.map(({ title }) => title)).toEqual(expect.arrayContaining([
      "Turn threats and abuse cases into requirements",
      "Separate identity from resource authorization",
      "Worked threat model: export customer invoices",
      "Protect data, secrets, and retention",
      "Secure privileged operations and the software supply chain",
      "Failure modes to challenge",
      "Verify controls and residual risk",
      "Security review checklist",
      "Review questions",
    ]));
    expect(article?.markdown).toContain("/book/9-security");
    expect(article?.markdown).toContain("evidence and verification register");
    expect(article?.markdown).toContain("27 August 2026");
    expect(article?.markdown).toContain("OWASP ASVS 5.0.0");
    expect(article?.markdown).toMatch(/Evidence: \[S\d+/);
  });
});
