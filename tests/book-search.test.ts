import { describe, expect, it } from "vitest";
import { rankBookSearch } from "../app/book-search";

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
});
