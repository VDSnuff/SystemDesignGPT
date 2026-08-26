import type { GuideArticle } from "./article";
import { boundariesStateDataArticle } from "./boundaries-state-data";
import { dataModelingArticle } from "./data-modeling";
import { networkingArticle } from "./networking";
import { requirementsArticle } from "./requirements";

const guideArticles: readonly GuideArticle[] = [
  requirementsArticle,
  boundariesStateDataArticle,
  networkingArticle,
  dataModelingArticle,
];

export function findGuideArticle(slug: string) {
  return guideArticles.find((article) => article.slug === slug);
}

export { guideArticles };
