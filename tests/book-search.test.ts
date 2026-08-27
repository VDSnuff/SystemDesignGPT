import { describe, expect, it } from "vitest";
import { rankBookSearch, rankSiteSearch } from "../app/book-search";
import { guideSearchEntries } from "../app/guide-search";

describe("offline handbook search ranking", () => {
  it("ranks an exact section title first", () => {
    expect(rankBookSearch("9 Security")[0]).toMatchObject({
      sectionSlug: "9-security",
      heading: null,
    });
  });

  it("finds exact and partial heading terms with anchor links", () => {
    const exact = rankBookSearch("14.2 Functional requirements FR full cycle")[0];
    const partial = rankBookSearch("14.2 functional requ")[0];

    expect(exact.heading).toBe("14.2 Functional requirements FR — full cycle");
    expect(exact.href).toMatch(/#14-2-functional-requirements-fr-full-cycle$/);
    expect(partial.href).toBe(exact.href);
  });

  it("finds plain-text terms and returns no result for absent content", () => {
    expect(rankBookSearch("poison messages").some((result) => result.sectionSlug === "6-messaging-and-asynchronous-work")).toBe(true);
    expect(rankBookSearch("zxqv nonexistent phrase")).toEqual([]);
  });

  it("indexes every authored guide article and heading at its rendered route", () => {
    const articleRoutes = new Set(guideSearchEntries.map(({ href }) => href.split("#")[0]));

    expect(articleRoutes.size).toBe(18);
    expect([...articleRoutes].every((href) => href.startsWith("/chapter/"))).toBe(true);
    expect(guideSearchEntries.filter(({ heading }) => heading).length).toBeGreaterThan(100);
  });

  it("ranks enriched guide headings with their exact chapter anchors", () => {
    expect(rankSiteSearch("bounded order cancellation agent", guideSearchEntries)[0]).toMatchObject({
      sectionSlug: "agentic-systems",
      heading: "Worked example: a bounded order-cancellation agent",
      href: "/chapter/agentic-systems#worked-example-a-bounded-order-cancellation-agent",
    });
  });
});
