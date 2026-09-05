// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { bookSections } from "../app/book-content.generated";
import { GuideHandbookCoverage } from "../app/components/GuideHandbookCoverage";
import { guidePages, masterChecklistSection } from "../app/content";

afterEach(cleanup);

describe("Quick Guide handbook coverage", () => {
  it("maps every canonical chapter except the handbook-only master checklist", () => {
    const canonicalChapters = bookSections.filter(({ title }) => /^\d+[A-C]?\./.test(title));
    const mappedSections = guidePages.flatMap(({ handbookSections }) => handbookSections);
    const mappedHrefs = new Set(mappedSections.map(({ href }) => href));
    const masterChecklist = canonicalChapters.find(({ slug }) => masterChecklistSection.href.endsWith(slug));

    expect(guidePages.every(({ handbookSections }) => handbookSections.length > 0)).toBe(true);
    expect(mappedHrefs.size).toBe(mappedSections.length);
    expect(masterChecklistSection.title).toBe(masterChecklist?.title);
    for (const section of canonicalChapters) {
      const href = `/book/${section.slug}`;
      expect(mappedHrefs.has(href)).toBe(href !== masterChecklistSection.href);
      const mapped = mappedSections.find((item) => item.href === href);
      if (mapped) expect(mapped.title).toBe(section.title);
    }
  });

  it("links all three agentic chapters directly", () => {
    const agentic = guidePages.find(({ slug }) => slug === "agentic-systems");

    expect(agentic?.handbookSections.map(({ href }) => href)).toEqual([
      "/book/15-llm-and-agentic-systems",
      "/book/16-spec-driven-development-for-agentic-systems",
      "/book/17-agent-system-design-review-checklist",
    ]);
  });

  it("signposts canonical and handbook-only material without copying it", () => {
    render(<GuideHandbookCoverage sections={guidePages[0].handbookSections} />);
    const coverage = screen.getByRole("region", { name: "This Quick Guide summarizes" });

    expect(within(coverage).getByRole("link", { name: "Canonical handbook chapter 1: Requirements: FRs, NFRs, Constraints, and Assumptions" })).toBeTruthy();
    expect(within(coverage).getByRole("link", { name: "Handbook-only master system design review checklist" })).toBeTruthy();
    expect(within(coverage).getByText(/focused summary, not a copy/)).toBeTruthy();
  });
});
