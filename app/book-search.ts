import { bookSearchEntries } from "./book-search.generated";

export type BookSearchResult = (typeof bookSearchEntries)[number];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function resultScore(result: BookSearchResult, query: string, terms: readonly string[]) {
  const title = normalize(result.sectionTitle);
  const heading = normalize(result.heading ?? "");
  const searchable = `${title} ${heading} ${result.terms}`;
  if (!terms.every((term) => searchable.includes(term))) return 0;
  let score = result.heading ? 10 : 15;
  if (title === query) score += 120;
  if (heading === query) score += 110;
  if (title.startsWith(query)) score += 70;
  if (heading.startsWith(query)) score += 65;
  if (title.includes(query)) score += 50;
  if (heading.includes(query)) score += 45;
  score += terms.filter((term) => title.includes(term)).length * 12;
  score += terms.filter((term) => heading.includes(term)).length * 10;
  return score;
}

export function rankBookSearch(rawQuery: string, limit = 8) {
  const query = normalize(rawQuery);
  if (!query) return [];
  const terms = query.split(/\s+/);
  return bookSearchEntries
    .map((result) => ({ result, score: resultScore(result, query, terms) }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.result.href.localeCompare(right.result.href))
    .slice(0, limit)
    .map((candidate) => candidate.result);
}
