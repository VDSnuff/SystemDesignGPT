import { describe, expect, it } from "vitest";
import { guideArticles } from "../app/articles";
import { bookSections } from "../app/book-content.generated";
import { guidePages } from "../app/content";

describe("authored Quick Guide articles", () => {
  it("keeps authored slugs aligned with the guide registry", () => {
    const guideSlugs = new Set(guidePages.map((page) => page.slug));
    const articleSlugs = guideArticles.map((article) => article.slug);

    expect(new Set(articleSlugs).size).toBe(articleSlugs.length);
    expect(articleSlugs.every((slug) => guideSlugs.has(slug))).toBe(true);
  });

  it("ships Requirements as a substantive evidence-linked article", () => {
    const article = guideArticles.find(({ slug }) => slug === "requirements");

    expect(article).toBeDefined();
    expect(article?.wordCount).toBeGreaterThanOrEqual(1_000);
    expect(article?.wordCount).toBeLessThanOrEqual(1_800);
    expect(article?.headings.map(({ title }) => title)).toEqual(expect.arrayContaining([
      "Worked example: order cancellation",
      "Resolve conflicts instead of hiding them",
      "Common failure modes",
      "Compact requirements worksheet",
      "Review questions",
    ]));
    expect(article?.markdown).toContain("/book/1-requirements-frs-nfrs-constraints-and-assumptions");
    expect(article?.markdown).toContain("evidence and verification register");
    expect(article?.markdown).toMatch(/Evidence: \[S\d+/);
  });

  it("keeps article handbook links and evidence IDs canonical", () => {
    const bookSlugs = new Set(bookSections.map(({ slug }) => slug));
    const referenceSection = bookSections.find(({ slug }) => slug === "references-and-verification-register");
    const evidenceIds = new Set(
      [...(referenceSection?.markdown.matchAll(/^\| (S\d+) \|/gm) ?? [])].map((match) => match[1]),
    );

    for (const article of guideArticles) {
      const linkedSlugs = [...article.markdown.matchAll(/\]\(\/book\/([^#)]+)/g)].map((match) => match[1]);
      const citedIds = [...article.markdown.matchAll(/\[(S\d+) —/g)].map((match) => match[1]);

      expect(linkedSlugs.length).toBeGreaterThan(0);
      expect(linkedSlugs.every((slug) => bookSlugs.has(slug))).toBe(true);
      expect(citedIds.length).toBeGreaterThan(0);
      expect(citedIds.every((id) => evidenceIds.has(id))).toBe(true);
    }
  });
});
