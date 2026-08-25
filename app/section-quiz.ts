import { bookSections, type BookSection } from "./book-content.generated";
import { quizPolicies } from "./quiz-content";
import { quizPolicySchema, type QuizPolicy } from "./quiz-contract";

export { type QuizPolicy, type QuizQuestion } from "./quiz-contract";
export { correctOptionIndex, scoreQuiz } from "./quiz-scoring";

export function validateQuizPolicies(
  policies: readonly unknown[],
  sectionSlugs: readonly string[],
): ReadonlyMap<string, QuizPolicy> {
  const parsed = policies.map((policy) => quizPolicySchema.parse(policy));
  const policySlugs = parsed.map((policy) => policy.slug);
  const duplicate = policySlugs.find((slug, index) => policySlugs.indexOf(slug) !== index);
  if (duplicate) throw new Error(`Duplicate quiz policy for section: ${duplicate}`);
  const missing = sectionSlugs.filter((slug) => !policySlugs.includes(slug));
  const stale = policySlugs.filter((slug) => !sectionSlugs.includes(slug));
  if (missing.length || stale.length) {
    throw new Error(`Quiz policy mismatch. Missing: ${missing.join(", ") || "none"}. Stale: ${stale.join(", ") || "none"}.`);
  }
  for (const policy of parsed) {
    if (policy.kind !== "quiz") continue;
    const questionIds = policy.questions.map((question) => question.id);
    if (new Set(questionIds).size !== questionIds.length) {
      throw new Error(`Duplicate question ID in quiz policy: ${policy.slug}`);
    }
  }
  return new Map(parsed.map((policy) => [policy.slug, policy]));
}

const policiesBySlug = validateQuizPolicies(quizPolicies, bookSections.map((section) => section.slug));

export function getSectionQuizPolicy(section: BookSection): QuizPolicy {
  const policy = policiesBySlug.get(section.slug);
  if (!policy) throw new Error(`No quiz policy for section: ${section.slug}`);
  return policy;
}
