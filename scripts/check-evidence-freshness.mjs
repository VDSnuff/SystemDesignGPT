import fs from "node:fs";
import { pathToFileURL } from "node:url";

const BOOK_PATH = "docs/System_Design_Checklist_Book.md";
const LEDGER_PATH = "docs/evidence-freshness.json";
const REQUIRED_CHAPTERS = [15, 16, 17];
const MARKED_PATTERN = /paid standard|revision is underway|roadmap|remain in development|current release linked/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const AUTOMATED_RESULTS = new Set(["PASS", "UNVERIFIED", "FAIL"]);
const REVIEW_RESULTS = new Set(["PASS"]);
const SEMANTIC_RESULTS = new Set(["CURRENT", "ACTION_REQUIRED"]);

function dateValue(value) {
  if (!DATE_PATTERN.test(value ?? "")) return Number.NaN;
  return Date.parse(`${value}T00:00:00Z`);
}

export function bookSources(markdown) {
  const sources = new Map();
  const rows = markdown.matchAll(/^\| (S\d+) \| \[[^\]]+\]\((https?:\/\/[^)]+)\) \| ([^|]+) \|/gm);
  for (const [, id, url, note] of rows) sources.set(id, { url, note: note.trim() });
  return sources;
}

function requireText(errors, item, field, label) {
  if (typeof item[field] !== "string" || !item[field].trim()) errors.push(`${label}.${field} is required`);
}

function validateDates(errors, item, label, today) {
  const checked = dateValue(item.lastChecked);
  const review = dateValue(item.reviewAfter);
  if (!Number.isFinite(checked)) errors.push(`${label}.lastChecked must be YYYY-MM-DD`);
  if (!Number.isFinite(review)) errors.push(`${label}.reviewAfter must be YYYY-MM-DD`);
  if (review <= checked) errors.push(`${label}.reviewAfter must follow lastChecked`);
  if (review <= dateValue(today)) errors.push(`${label} review due on ${item.reviewAfter}`);
}

function validateEvidence(errors, source, label) {
  if (!AUTOMATED_RESULTS.has(source.automated?.result)) errors.push(`${label}.automated.result is invalid`);
  if (!REVIEW_RESULTS.has(source.browser?.result)) errors.push(`${label}.browser.result is invalid`);
  if (!SEMANTIC_RESULTS.has(source.semantic?.result)) errors.push(`${label}.semantic.result is invalid`);
  for (const layer of ["automated", "browser", "semantic"]) {
    if (!Number.isFinite(dateValue(source[layer]?.checkedAt))) errors.push(`${label}.${layer}.checkedAt must be YYYY-MM-DD`);
    if (source[layer]?.checkedAt !== source.lastChecked) errors.push(`${label}.${layer}.checkedAt must match lastChecked`);
  }
  requireText(errors, source.semantic ?? {}, "summary", `${label}.semantic`);
  if (source.semantic?.result !== "ACTION_REQUIRED") return;
  if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+$/.test(source.semantic.contentIssue ?? "")) {
    errors.push(`${label} material change requires a GitHub content issue`);
  }
  errors.push(`${label} has actionable content work${source.semantic.contentIssue ? `: ${source.semantic.contentIssue}` : ""}`);
}

function validateChapter(errors, chapter, today) {
  const label = `chapter ${chapter.chapter ?? "unknown"}`;
  requireText(errors, chapter, "owner", label);
  requireText(errors, chapter, "nextReviewTrigger", label);
  validateDates(errors, chapter, label, today);
  if (!SEMANTIC_RESULTS.has(chapter.semanticStatus)) errors.push(`${label}.semanticStatus is invalid`);
  if (chapter.semanticStatus === "ACTION_REQUIRED") errors.push(`${label} has actionable content work`);
}

function validateSource(errors, source, canonical, today) {
  const label = source.id ?? "source unknown";
  requireText(errors, source, "owner", label);
  requireText(errors, source, "nextReviewTrigger", label);
  validateDates(errors, source, label, today);
  if (!Array.isArray(source.reasons) || source.reasons.length === 0) errors.push(`${label}.reasons is required`);
  if (!canonical.has(source.id)) errors.push(`${label} is missing from the canonical register`);
  if (canonical.get(source.id)?.url !== source.url) errors.push(`${label}.url does not match the canonical register`);
  validateEvidence(errors, source, label);
}

export function validateFreshness(ledger, markdown, today = new Date().toISOString().slice(0, 10)) {
  const errors = [];
  const canonical = bookSources(markdown);
  const chapters = ledger.reviewedChapters ?? [];
  const sources = ledger.sources ?? [];
  const chapterNumbers = chapters.map(({ chapter }) => chapter);
  const sourceIds = sources.map(({ id }) => id);
  for (const chapter of REQUIRED_CHAPTERS) {
    if (!chapterNumbers.includes(chapter)) errors.push(`chapter ${chapter} freshness review is missing`);
  }
  if (new Set(chapterNumbers).size !== chapterNumbers.length) errors.push("chapter reviews must be unique");
  if (new Set(sourceIds).size !== sourceIds.length) errors.push("source reviews must be unique");
  for (const [id, { note }] of canonical) {
    if (MARKED_PATTERN.test(note) && !sourceIds.includes(id)) errors.push(`${id} is marked fast-moving but has no freshness review`);
  }
  for (const chapter of chapters) validateChapter(errors, chapter, today);
  for (const source of sources) validateSource(errors, source, canonical, today);
  return errors;
}

export function formatReport(ledger) {
  const lines = [
    "ID\tAUTOMATED URL\tBROWSER\tSEMANTIC EDITORIAL REVIEW\tLAST CHECKED\tNEXT REVIEW",
  ];
  for (const source of ledger.sources) {
    lines.push([
      source.id,
      source.automated.result,
      source.browser.result,
      source.semantic.result,
      source.lastChecked,
      source.reviewAfter,
    ].join("\t"));
  }
  return lines.join("\n");
}

function main() {
  const markdown = fs.readFileSync(BOOK_PATH, "utf8");
  const ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, "utf8"));
  const errors = validateFreshness(ledger, markdown, process.env.EVIDENCE_CHECK_DATE);
  console.log(`# Evidence freshness ${new Date().toISOString()}`);
  console.log(formatReport(ledger));
  if (errors.length === 0) return console.log(`PASS\t${ledger.sources.length} sources and ${ledger.reviewedChapters.length} chapters are current`);
  for (const error of errors) console.error(`FAIL\t${error}`);
  process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main();
