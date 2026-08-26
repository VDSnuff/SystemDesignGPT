import type { GuideArticle } from "./article";
import { boundariesStateDataArticle } from "./boundaries-state-data";
import { concurrencyArticle } from "./concurrency";
import { dataModelingArticle } from "./data-modeling";
import { networkingArticle } from "./networking";
import { requirementsArticle } from "./requirements";
import { timeOrderingArticle } from "./time-ordering";
import { transactionsConsistencyArticle } from "./transactions-consistency";

const guideArticles: readonly GuideArticle[] = [
  requirementsArticle,
  boundariesStateDataArticle,
  networkingArticle,
  dataModelingArticle,
  timeOrderingArticle,
  concurrencyArticle,
  transactionsConsistencyArticle,
];

export function findGuideArticle(slug: string) {
  return guideArticles.find((article) => article.slug === slug);
}

export { guideArticles };
