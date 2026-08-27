import { guideArticles } from "./articles";
import type { BookSearchEntry } from "./book-search.generated";
import { guidePages } from "./content";

const guidePagesBySlug = new Map(guidePages.map((page) => [page.slug, page]));

function searchEntriesForArticle(article: (typeof guideArticles)[number]): readonly BookSearchEntry[] {
  const page = guidePagesBySlug.get(article.slug);
  if (!page) throw new Error(`Guide article ${article.slug} has no matching page`);
  const sectionTitle = `${page.label} · Quick Guide`;
  const overview: BookSearchEntry = {
    sectionSlug: article.slug,
    sectionTitle,
    heading: null,
    href: `/chapter/${article.slug}`,
    terms: `${page.title} ${page.lead} ${page.overview}`,
  };
  const headings = article.headings.map((heading) => ({
    sectionSlug: article.slug,
    sectionTitle,
    heading: heading.title,
    href: heading.href,
    terms: heading.title,
  }));
  return [overview, ...headings];
}

export const guideSearchEntries = guideArticles.flatMap(searchEntriesForArticle);
