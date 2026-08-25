import { describe, expect, it } from "vitest";
import { bookSections } from "../app/book-content.generated";
import { quizPolicies } from "../app/quiz-content";
import { getSectionQuizPolicy, scoreQuiz, validateQuizPolicies } from "../app/section-quiz";

function headingId(value: string) {
  return value.toLowerCase().replace(/[—–]/g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

describe("authored section quizzes", () => {
  it("defines one complete and current policy for every canonical section", () => {
    const slugs = bookSections.map((section) => section.slug);
    const policies = validateQuizPolicies(quizPolicies, slugs);

    expect(policies.size).toBe(31);
    expect([...policies.values()].filter((policy) => policy.kind === "quiz")).toHaveLength(22);
    expect([...policies.values()].filter((policy) => policy.kind === "none")).toHaveLength(9);
  });

  it("rejects missing, stale, and duplicate policy mappings", () => {
    const valid = quizPolicies[0];
    expect(() => validateQuizPolicies([], ["required"])).toThrow(/Missing: required/);
    expect(() => validateQuizPolicies([valid], [])).toThrow(/Stale:/);
    expect(() => validateQuizPolicies([valid, valid], [valid.slug])).toThrow(/Duplicate quiz policy/);
  });

  it("keeps every authored question concise, unambiguous, explanatory, and linked to its section", () => {
    for (const section of bookSections) {
      const policy = getSectionQuizPolicy(section);
      if (policy.kind === "none") {
        expect(policy.reason.length).toBeGreaterThan(20);
        continue;
      }
      expect(policy.questions.length).toBeGreaterThanOrEqual(2);
      const headingIds = [...section.markdown.matchAll(/^##+ (.+)$/gm)].map((match) => headingId(match[1]));
      for (const question of policy.questions) {
        expect(question.options.filter((option) => option.isCorrect)).toHaveLength(1);
        expect(question.options.every((option) => option.label.length <= 180 && !option.label.includes("\n"))).toBe(true);
        expect(question.options.every((option) => option.feedback.length > 20)).toBe(true);
        if (question.reference.href !== "#section-content") {
          expect(headingIds).toContain(question.reference.href.slice(1));
        }
      }
    }
  });

  it("scores deterministically without reordering authored answers", () => {
    const section = bookSections.find((item) => item.slug === "5-apis-contracts-and-idempotency");
    if (!section) throw new Error("Expected API section.");
    const first = getSectionQuizPolicy(section);
    const second = getSectionQuizPolicy(section);
    if (first.kind !== "quiz" || second.kind !== "quiz") throw new Error("Expected authored quiz.");
    const answers = first.questions.map((question) => question.options.findIndex((option) => option.isCorrect));

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(scoreQuiz(first.questions, answers)).toBe(first.questions.length);
    expect(scoreQuiz(first.questions, answers.map(() => -1))).toBe(0);
  });

  it("varies correct answer positions in a stable authored cycle", () => {
    const positions = quizPolicies.flatMap((policy) => policy.kind === "quiz"
      ? policy.questions.map((question) => question.options.findIndex((option) => option.isCorrect))
      : []);

    expect(new Set(positions)).toEqual(new Set([0, 1, 2]));
  });
});
