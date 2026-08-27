import type { GuideArticle } from "./article";
import { agenticSystemsArticle } from "./agentic-systems";
import { apisIdempotencyArticle } from "./apis-idempotency";
import { boundariesStateDataArticle } from "./boundaries-state-data";
import { concurrencyArticle } from "./concurrency";
import { costSimplicityArticle } from "./cost-simplicity";
import { dataModelingArticle } from "./data-modeling";
import { deliveryLifecycleArticle } from "./delivery-lifecycle";
import { messagingArticle } from "./messaging";
import { networkingArticle } from "./networking";
import { observabilityArticle } from "./observability";
import { realtimeWorkArticle } from "./realtime-work";
import { requirementsArticle } from "./requirements";
import { resilienceArticle } from "./resilience";
import { scalePerformanceArticle } from "./scale-performance";
import { securityArticle } from "./security";
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
  realtimeWorkArticle,
  resilienceArticle,
  scalePerformanceArticle,
  securityArticle,
  observabilityArticle,
  costSimplicityArticle,
  deliveryLifecycleArticle,
  agenticSystemsArticle,
];

export function findGuideArticle(slug: string) {
  return guideArticles.find((article) => article.slug === slug);
}

export { guideArticles };
