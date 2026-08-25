import type { BookHeading } from "../book-learning.generated";

export interface GuideArticle {
  readonly headings: readonly BookHeading[];
  readonly markdown: string;
  readonly slug: string;
  readonly wordCount: number;
}

interface GuideArticleInput {
  readonly markdown: string;
  readonly slug: string;
}

function plainText(value: string) {
  return value
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_#>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function headingId(title: string) {
  return plainText(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function articleHeadings(slug: string, markdown: string): readonly BookHeading[] {
  const occurrences = new Map<string, number>();
  return [...markdown.matchAll(/^(#{2,4}) (.+)$/gm)].map((match) => {
    const title = plainText(match[2]);
    const baseId = headingId(title);
    const occurrence = (occurrences.get(baseId) ?? 0) + 1;
    occurrences.set(baseId, occurrence);
    const id = occurrence === 1 ? baseId : `${baseId}-${occurrence}`;
    return { id, title, level: match[1].length, href: `/chapter/${slug}#${id}` };
  });
}

export function defineGuideArticle({ markdown, slug }: GuideArticleInput): GuideArticle {
  const wordCount = plainText(markdown).split(/\s+/).filter(Boolean).length;
  return { headings: articleHeadings(slug, markdown), markdown, slug, wordCount };
}
