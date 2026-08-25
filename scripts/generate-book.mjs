import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(projectRoot, "docs", "System_Design_Checklist_Book.md");
const targetPath = path.join(projectRoot, "app", "book-content.generated.ts");
const learningTargetPath = path.join(projectRoot, "app", "book-learning.generated.ts");
const progressTargetPath = path.join(projectRoot, "app", "book-progress.generated.ts");
const searchTargetPath = path.join(projectRoot, "app", "book-search.generated.ts");

const learningPathSpecs = [
  {
    id: "interview-preparation",
    title: "Interview preparation",
    purpose: "Practice a repeatable design flow and the trade-offs most often explored in interviews.",
    estimatedScope: "12 sections · 3–5 hours",
    sectionSlugs: [
      "practical-system-design-workflow", "the-12-question-system-design-loop",
      "1-requirements-frs-nfrs-constraints-and-assumptions", "2b-data-modeling-indexing-and-partitioning",
      "3-concurrency", "4-transactions-and-consistency", "5-apis-contracts-and-idempotency",
      "6-messaging-and-asynchronous-work", "7-failure-handling-and-resilience",
      "8-scale-capacity-performance-and-caching", "13-master-system-design-review-checklist",
      "design-review-outcome-template",
    ],
  },
  {
    id: "architecture-review",
    title: "Architecture review",
    purpose: "Review an architecture systematically from boundaries through operability and evolution.",
    estimatedScope: "17 sections · 5–7 hours",
    sectionSlugs: [
      "1-requirements-frs-nfrs-constraints-and-assumptions", "2-boundaries-state-and-data",
      "2a-networking-and-communication", "2b-data-modeling-indexing-and-partitioning",
      "2c-time-clocks-and-ordering", "4-transactions-and-consistency",
      "5-apis-contracts-and-idempotency", "6-messaging-and-asynchronous-work",
      "7-failure-handling-and-resilience", "8-scale-capacity-performance-and-caching", "9-security",
      "10-observability-and-reliability", "11-deployment-migration-and-evolution",
      "12-cost-simplicity-and-operability", "13-master-system-design-review-checklist",
      "architecture-decision-record-short-template", "design-review-outcome-template",
    ],
  },
  {
    id: "agentic-systems",
    title: "Agentic systems",
    purpose: "Design agent and LLM systems with explicit contracts, failure boundaries, and review gates.",
    estimatedScope: "9 sections · 3–4 hours",
    sectionSlugs: [
      "1-requirements-frs-nfrs-constraints-and-assumptions", "5-apis-contracts-and-idempotency",
      "6-messaging-and-asynchronous-work", "7-failure-handling-and-resilience", "9-security",
      "10-observability-and-reliability", "15-llm-and-agentic-systems",
      "16-spec-driven-development-for-agentic-systems", "17-agent-system-design-review-checklist",
    ],
  },
];

export function sectionSlug(title, index) {
  if (index === 0) return "introduction";
  return title
    .toLowerCase()
    .replace(/[—–]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}

export function sectionSummary(markdown) {
  const paragraph = markdown
    .split(/\n\s*\n/)
    .map((value) => value.replace(/^>\s?/gm, "").trim())
    .find((value) => value && !value.startsWith("#") && !value.startsWith("|") && !value.startsWith("```"));
  return (paragraph ?? "Open this section of the complete handbook.").replace(/[*_`]/g, " ").slice(0, 240);
}

function plainText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_`|~\[\](){}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function searchTerms(value) {
  const terms = plainText(value).toLowerCase().match(/[a-z0-9][a-z0-9.+/-]*/g) ?? [];
  return [...new Set(terms)].join(" ");
}

function contentId(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function anchorSlug(title) {
  return plainText(title)
    .toLowerCase()
    .replace(/[—–]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseHeadings(markdown, sectionSlugValue) {
  const matches = [...markdown.matchAll(/^(#{2,4}) (.+)$/gm)];
  const occurrences = new Map();
  return matches.map((match, index) => {
    const title = plainText(match[2]);
    const baseId = anchorSlug(title);
    const occurrence = (occurrences.get(baseId) ?? 0) + 1;
    occurrences.set(baseId, occurrence);
    const bodyStart = (match.index ?? 0) + match[0].length;
    const bodyEnd = matches[index + 1]?.index ?? markdown.length;
    return {
      id: occurrence === 1 ? baseId : `${baseId}-${occurrence}`,
      title,
      level: match[1].length,
      terms: searchTerms(markdown.slice(bodyStart, bodyEnd)),
    };
  }).map((heading) => ({
    ...heading,
    href: `/book/${sectionSlugValue}#${heading.id}`,
  }));
}

function parseChecklistItems(markdown, sectionSlugValue) {
  const occurrences = new Map();
  return [...markdown.matchAll(/^\s*- \[[ xX]\]\s+(.+)$/gm)].map((match) => {
    const label = plainText(match[1]);
    const baseId = `check-${sectionSlugValue}-${contentId(label.toLowerCase())}`;
    const occurrence = (occurrences.get(baseId) ?? 0) + 1;
    occurrences.set(baseId, occurrence);
    return { id: occurrence === 1 ? baseId : `${baseId}-${occurrence}`, label };
  });
}

function sectionSearchTerms(markdown) {
  const firstHeading = markdown.search(/^#{2,4} /m);
  return searchTerms(firstHeading === -1 ? markdown : markdown.slice(0, firstHeading));
}

export function parseSections(source) {
  const matches = [...source.matchAll(/^# (.+)$/gm)];
  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? source.length;
    const markdown = source.slice(start, end).trim();
    const slug = sectionSlug(match[1], index);
    return {
      slug,
      number: String(index + 1).padStart(2, "0"),
      title: match[1].trim(),
      summary: sectionSummary(markdown),
      markdown,
      headings: parseHeadings(markdown, slug),
      checklistItems: parseChecklistItems(markdown, slug),
      searchTerms: sectionSearchTerms(markdown),
    };
  });
}

export function validateGeneratedContent(sections) {
  const sectionSlugs = new Set(sections.map((section) => section.slug));
  const checklistIds = sections.flatMap((section) => section.checklistItems.map((item) => item.id));
  if (sectionSlugs.size !== sections.length) throw new Error("Generated handbook section slugs are not unique.");
  if (new Set(checklistIds).size !== checklistIds.length) throw new Error("Generated checklist IDs are not unique.");
  for (const learningPath of learningPathSpecs) {
    const staleSlug = learningPath.sectionSlugs.find((slug) => !sectionSlugs.has(slug));
    if (staleSlug) throw new Error(`Learning path ${learningPath.id} references missing section ${staleSlug}.`);
  }
}

function generatedArray(values) {
  return `[\n${values.map((value) => `  ${JSON.stringify(value)}`).join(",\n")}\n]`;
}

export function generatedModule(sections) {
  validateGeneratedContent(sections);
  const content = sections.map(({ slug, number, title, summary, markdown }) => ({ slug, number, title, summary, markdown }));
  return `// Generated by scripts/generate-book.mjs. Do not edit manually.\n\nexport interface BookSection {\n  readonly slug: string;\n  readonly number: string;\n  readonly title: string;\n  readonly summary: string;\n  readonly markdown: string;\n}\n\nexport const bookSections = ${JSON.stringify(content, null, 2)} as const satisfies readonly BookSection[];\n\nexport function findBookSection(slug: string) {\n  return bookSections.find((section) => section.slug === slug);\n}\n\nexport const bookSiteMap = bookSections.map((section) => \`${"${section.number}"} ${"${section.title}"} (/book/${"${section.slug}"})\`).join(\"\\n\");\n`;
}

function learningSections(sections) {
  return sections.map((section) => ({
    slug: section.slug,
    title: section.title,
    href: section.slug === "introduction" ? "/" : `/book/${section.slug}`,
    headings: section.headings.map(({ id, title, level, href }) => ({
      id, title, level,
      href: section.slug === "introduction" ? `/#${id}` : href,
    })),
    checklistItems: section.checklistItems,
  }));
}

function searchEntries(sections) {
  return sections.flatMap((section) => [
    { sectionSlug: section.slug, sectionTitle: section.title, heading: null, href: section.slug === "introduction" ? "/" : `/book/${section.slug}`, terms: section.searchTerms },
    ...section.headings.map((heading) => ({ sectionSlug: section.slug, sectionTitle: section.title, heading: heading.title, href: section.slug === "introduction" ? `/#${heading.id}` : heading.href, terms: heading.terms })),
  ]);
}

export function generatedLearningModule(sections) {
  validateGeneratedContent(sections);
  const types = `export interface BookHeading {\n  readonly id: string;\n  readonly title: string;\n  readonly level: number;\n  readonly href: string;\n}\n\nexport interface BookChecklistItem {\n  readonly id: string;\n  readonly label: string;\n}\n\nexport interface BookLearningSection {\n  readonly slug: string;\n  readonly title: string;\n  readonly href: string;\n  readonly headings: readonly BookHeading[];\n  readonly checklistItems: readonly BookChecklistItem[];\n}`;
  const values = `export const bookLearningSections = ${generatedArray(learningSections(sections))} as const satisfies readonly BookLearningSection[];`;
  const helpers = `export const bookChecklistIds = bookLearningSections.flatMap((section) => section.checklistItems.map((item) => item.id));\n\nexport function findBookLearningSection(slug: string) {\n  return bookLearningSections.find((section) => section.slug === slug);\n}`;
  return `// Generated by scripts/generate-book.mjs. Do not edit manually.\n\n${types}\n\n${values}\n\n${helpers}\n`;
}

export function generatedProgressModule(sections) {
  validateGeneratedContent(sections);
  const progressSections = learningSections(sections).map(({ slug, title, href }) => ({ slug, title, href }));
  const types = `export interface BookProgressSection {\n  readonly slug: string;\n  readonly title: string;\n  readonly href: string;\n}\n\nexport interface LearningPath {\n  readonly id: string;\n  readonly title: string;\n  readonly purpose: string;\n  readonly estimatedScope: string;\n  readonly sectionSlugs: readonly string[];\n}`;
  const values = `export const bookProgressSections = ${generatedArray(progressSections)} as const satisfies readonly BookProgressSection[];\n\nexport const learningPaths = ${generatedArray(learningPathSpecs)} as const satisfies readonly LearningPath[];`;
  return `// Generated by scripts/generate-book.mjs. Do not edit manually.\n\n${types}\n\n${values}\n`;
}

export function generatedSearchModule(sections) {
  validateGeneratedContent(sections);
  const type = `export interface BookSearchEntry {\n  readonly sectionSlug: string;\n  readonly sectionTitle: string;\n  readonly heading: string | null;\n  readonly href: string;\n  readonly terms: string;\n}`;
  const values = `export const bookSearchEntries = ${generatedArray(searchEntries(sections))} as const satisfies readonly BookSearchEntry[];`;
  return `// Generated by scripts/generate-book.mjs. Do not edit manually.\n\n${type}\n\n${values}\n`;
}

export function generateBook() {
  const sections = parseSections(fs.readFileSync(sourcePath, "utf8"));
  fs.writeFileSync(targetPath, generatedModule(sections));
  fs.writeFileSync(learningTargetPath, generatedLearningModule(sections));
  fs.writeFileSync(progressTargetPath, generatedProgressModule(sections));
  fs.writeFileSync(searchTargetPath, generatedSearchModule(sections));
  console.log(`Generated ${sections.length} book sections.`);
}

const isMainModule = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) generateBook();
