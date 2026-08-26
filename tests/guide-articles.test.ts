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

  it("ships Boundaries, state & data as a substantive evidence-linked article", () => {
    const article = guideArticles.find(({ slug }) => slug === "boundaries-state-data");

    expect(article).toBeDefined();
    expect(article?.wordCount).toBeGreaterThanOrEqual(1_000);
    expect(article?.wordCount).toBeLessThanOrEqual(1_800);
    expect(article?.headings.map(({ title }) => title)).toEqual(expect.arrayContaining([
      "Worked example: an order-status flow",
      "Choose coupling deliberately",
      "Failure modes that diagrams often hide",
      "Review a boundary diagram in seven passes",
      "Review questions",
    ]));
    expect(article?.markdown).toContain("/book/2-boundaries-state-and-data");
    expect(article?.markdown).toContain("evidence and verification register");
    expect(article?.markdown).toMatch(/Evidence: \[S\d+/);
  });

  it("ships Networking & communication as a substantive evidence-linked article", () => {
    const article = guideArticles.find(({ slug }) => slug === "networking");

    expect(article).toBeDefined();
    expect(article?.wordCount).toBeGreaterThanOrEqual(1_000);
    expect(article?.wordCount).toBeLessThanOrEqual(1_800);
    expect(article?.headings.map(({ title }) => title)).toEqual(expect.arrayContaining([
      "Match the communication mode to the contract",
      "Worked example: export progress",
      "Treat partial failure and backpressure as normal",
      "Diagnose the path, not only the service",
      "Network-failure review checklist",
      "Review questions",
    ]));
    expect(article?.markdown).toContain("/book/2a-networking-and-communication");
    expect(article?.markdown).toContain("evidence and verification register");
    expect(article?.markdown).toMatch(/Evidence: \[S\d+/);
  });

  it("ships Data modeling & partitioning as a substantive evidence-linked article", () => {
    const article = guideArticles.find(({ slug }) => slug === "data-modeling");

    expect(article).toBeDefined();
    expect(article?.wordCount).toBeGreaterThanOrEqual(1_000);
    expect(article?.wordCount).toBeLessThanOrEqual(1_800);
    expect(article?.headings.map(({ title }) => title)).toEqual(expect.arrayContaining([
      "Choose storage from invariants and access shape",
      "Worked example: tenant order history",
      "Make pagination a stable data contract",
      "Partition only for a concrete limit",
      "Evolve the schema through compatible states",
      "Data-model review checklist",
      "Review questions",
    ]));
    expect(article?.markdown).toContain("/book/2b-data-modeling-indexing-and-partitioning");
    expect(article?.markdown).toContain("evidence and verification register");
    expect(article?.markdown).toMatch(/Evidence: \[S\d+/);
  });

  it("ships Time, clocks & ordering as a substantive evidence-linked article", () => {
    const article = guideArticles.find(({ slug }) => slug === "time-ordering");

    expect(article).toBeDefined();
    expect(article?.wordCount).toBeGreaterThanOrEqual(1_000);
    expect(article?.wordCount).toBeLessThanOrEqual(1_800);
    expect(article?.headings.map(({ title }) => title)).toEqual(expect.arrayContaining([
      "Separate the clocks and ordering signals",
      "Store instants and civil intentions differently",
      "Worked example: a ticket hold and payment",
      "Choose the smallest useful ordering guarantee",
      "Define expiry as a state transition",
      "Time-and-order review checklist",
      "Review questions",
    ]));
    expect(article?.markdown).toContain("/book/2c-time-clocks-and-ordering");
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
