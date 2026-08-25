import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  bookSections,
  bookSiteMap,
} from "../app/book-content.generated";
import {
  bookChecklistIds,
} from "../app/book-learning.generated";
import {
  bookProgressSections,
  learningPaths,
} from "../app/book-progress.generated";
import {
  bookSearchEntries,
} from "../app/book-search.generated";
import {
  generatedLearningModule,
  generatedModule,
  generatedProgressModule,
  generatedSearchModule,
  parseSections,
  sectionSlug,
  validateGeneratedContent,
} from "../scripts/generate-book.mjs";

const sourcePath = path.join(process.cwd(), "docs", "System_Design_Checklist_Book.md");
const targetPath = path.join(process.cwd(), "app", "book-content.generated.ts");
const learningTargetPath = path.join(process.cwd(), "app", "book-learning.generated.ts");
const progressTargetPath = path.join(process.cwd(), "app", "book-progress.generated.ts");
const searchTargetPath = path.join(process.cwd(), "app", "book-search.generated.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const parsedSections = parseSections(source);

describe("canonical handbook generation", () => {
  it("keeps 31 uniquely routed sections in source order", () => {
    const slugs = parsedSections.map((section) => section.slug);

    expect(parsedSections).toHaveLength(31);
    expect(new Set(slugs)).toHaveProperty("size", 31);
    expect(slugs[0]).toBe("introduction");
    expect(slugs.at(-1)).toBe("references-and-verification-register");
    expect(parsedSections.slice(1).every((section, index) => (
      section.slug === sectionSlug(section.title, index + 1)
    ))).toBe(true);
  });

  it("preserves every source heading and produces the complete site map", () => {
    const sourceHeadings = [...source.matchAll(/^##+ (.+)$/gm)].map((match) => match[0]);
    const generatedHeadings = parsedSections.flatMap((section) => (
      [...section.markdown.matchAll(/^##+ (.+)$/gm)].map((match) => match[0])
    ));
    const expectedMap = bookSections
      .map((section) => `${section.number} ${section.title} (/book/${section.slug})`)
      .join("\n");

    expect(generatedHeadings).toEqual(sourceHeadings);
    expect(bookSiteMap).toBe(expectedMap);
    expect(bookSearchEntries.some((entry) => entry.heading === "14.2 Functional requirements FR — full cycle")).toBe(true);
  });

  it("generates stable unique checklist IDs from the source item", () => {
    const heading = "## 14.2 Functional requirements (FR) — full cycle";
    const shifted = parseSections(source.replace(heading, `Extra context.\n\n${heading}`));
    const firstTask = source.match(/^\s*- \[ \]\s+(.+)$/m)?.[0];
    if (!firstTask) throw new Error("Canonical handbook must contain a checklist item");
    const changed = parseSections(source.replace(firstTask, `${firstTask} updated`));
    const parsedIds = parsedSections.flatMap((section) => section.checklistItems.map((item) => item.id));
    const shiftedIds = shifted.flatMap((section) => section.checklistItems.map((item) => item.id));
    const changedIds = changed.flatMap((section) => section.checklistItems.map((item) => item.id));

    expect(bookChecklistIds).toHaveLength(444);
    expect(bookProgressSections).toHaveLength(31);
    expect(new Set(bookChecklistIds).size).toBe(bookChecklistIds.length);
    expect(shiftedIds).toEqual(parsedIds);
    expect(changedIds[0]).not.toBe(parsedIds[0]);
  });

  it("updates offline search terms when canonical prose changes", () => {
    const edited = parseSections(source.replace("Simple language.", "UniqueSearchToken language."));

    expect(edited[0].searchTerms).toContain("uniquesearchtoken");
  });

  it("keeps every curated path ordered and rejects stale section mappings", () => {
    const slugs = new Set(parsedSections.map((section) => section.slug));

    expect(learningPaths).toHaveLength(3);
    expect(learningPaths.every((path) => path.sectionSlugs.length > 0 && path.sectionSlugs.every((slug) => slugs.has(slug)))).toBe(true);
    expect(() => validateGeneratedContent(parsedSections.filter((section) => section.slug !== "9-security"))).toThrow(/references missing section 9-security/);
  });

  it("reproduces the committed generated module byte for byte", () => {
    expect(generatedModule(parsedSections)).toBe(fs.readFileSync(targetPath, "utf8"));
    expect(generatedLearningModule(parsedSections)).toBe(fs.readFileSync(learningTargetPath, "utf8"));
    expect(generatedProgressModule(parsedSections)).toBe(fs.readFileSync(progressTargetPath, "utf8"));
    expect(generatedSearchModule(parsedSections)).toBe(fs.readFileSync(searchTargetPath, "utf8"));
  });
});
