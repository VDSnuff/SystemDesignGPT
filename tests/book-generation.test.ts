import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { bookSections, bookSiteMap } from "../app/book-content.generated";
import { generatedModule, parseSections, sectionSlug } from "../scripts/generate-book.mjs";

const sourcePath = path.join(process.cwd(), "docs", "System_Design_Checklist_Book.md");
const targetPath = path.join(process.cwd(), "app", "book-content.generated.ts");
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
  });

  it("reproduces the committed generated module byte for byte", () => {
    expect(generatedModule(parsedSections)).toBe(fs.readFileSync(targetPath, "utf8"));
  });
});
