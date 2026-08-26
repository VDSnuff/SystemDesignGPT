import type { GuideArticle } from "./article";
import { apisIdempotencyArticle } from "./apis-idempotency";
import { boundariesStateDataArticle } from "./boundaries-state-data";
import { concurrencyArticle } from "./concurrency";
import { dataModelingArticle } from "./data-modeling";
import { messagingArticle } from "./messaging";
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
  apisIdempotencyArticle,
  messagingArticle,
];

export function findGuideArticle(slug: string) {
  return guideArticles.find((article) => article.slug === slug);
}

export { guideArticles };
