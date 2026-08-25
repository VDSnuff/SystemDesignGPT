import type { GuideArticle } from "./article";
import { requirementsArticle } from "./requirements";

const guideArticles: readonly GuideArticle[] = [requirementsArticle];

export function findGuideArticle(slug: string) {
  return guideArticles.find((article) => article.slug === slug);
}

export { guideArticles };
