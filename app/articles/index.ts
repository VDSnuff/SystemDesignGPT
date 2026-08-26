import type { GuideArticle } from "./article";
import { boundariesStateDataArticle } from "./boundaries-state-data";
import { requirementsArticle } from "./requirements";

const guideArticles: readonly GuideArticle[] = [requirementsArticle, boundariesStateDataArticle];

export function findGuideArticle(slug: string) {
  return guideArticles.find((article) => article.slug === slug);
}

export { guideArticles };
