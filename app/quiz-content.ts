import { agentQuizPolicies } from "./quiz-content-agent";
import { distributedQuizPolicies } from "./quiz-content-distributed";
import { foundationsQuizPolicies } from "./quiz-content-foundations";
import { operationsQuizPolicies } from "./quiz-content-operations";
import type { QuizPolicy } from "./quiz-contract";

const noQuizPolicies: readonly QuizPolicy[] = [
  { slug: "introduction", kind: "none", reason: "This cover page introduces the handbook and contains no teaching claim to assess." },
  { slug: "book-plan", kind: "none", reason: "This navigation and usage reference is best applied during reviews rather than scored as a quiz." },
  { slug: "13-master-system-design-review-checklist", kind: "none", reason: "This is an application checklist; use it on a real design instead of recalling it as isolated answers." },
  { slug: "17-agent-system-design-review-checklist", kind: "none", reason: "This is an end-to-end review checklist intended for direct use on an agent system." },
  { slug: "architecture-decision-record-short-template", kind: "none", reason: "This page is a fill-in template, so completing an ADR is the meaningful exercise." },
  { slug: "design-review-outcome-template", kind: "none", reason: "This page is a decision-record template intended for use during an actual review." },
  { slug: "compact-glossary", kind: "none", reason: "This page is a lookup reference; the chapter assessments test the terms in context." },
  { slug: "about-the-diagrams", kind: "none", reason: "This short page explains the Mermaid source format and does not need a scored assessment." },
  { slug: "references-and-verification-register", kind: "none", reason: "This is the handbook evidence register; source evaluation belongs in the relevant chapter assessment." },
];

export const quizPolicies: readonly QuizPolicy[] = [
  ...noQuizPolicies,
  ...foundationsQuizPolicies,
  ...distributedQuizPolicies,
  ...operationsQuizPolicies,
  ...agentQuizPolicies,
];
