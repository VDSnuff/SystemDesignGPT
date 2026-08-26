import type { GuideArticle } from "./article";
import { boundariesStateDataArticle } from "./boundaries-state-data";
import { dataModelingArticle } from "./data-modeling";
import { networkingArticle } from "./networking";
import { requirementsArticle } from "./requirements";
import { timeOrderingArticle } from "./time-ordering";

const guideArticles: readonly GuideArticle[] = [
  requirementsArticle,
  boundariesStateDataArticle,
  networkingArticle,
  dataModelingArticle,
  timeOrderingArticle,
];

export function findGuideArticle(slug: string) {
  return guideArticles.find((article) => article.slug === slug);
}

export { guideArticles };
