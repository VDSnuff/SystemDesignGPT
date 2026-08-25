import { z } from "zod";

export const quizReferenceSchema = z.object({
  label: z.string().trim().min(1).max(120),
  href: z.string().regex(/^#[a-z0-9-]+$/),
});

export const quizOptionSchema = z.object({
  label: z.string().trim().min(1).max(180),
  feedback: z.string().trim().min(1).max(320),
  isCorrect: z.boolean(),
});

export const quizQuestionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  prompt: z.string().trim().min(1).max(240),
  options: z.array(quizOptionSchema).min(2).max(4),
  reference: quizReferenceSchema,
}).superRefine((question, context) => {
  if (question.options.filter((option) => option.isCorrect).length !== 1) {
    context.addIssue({ code: "custom", message: "Each question must have exactly one correct option." });
  }
});

const authoredPolicySchema = z.object({
  slug: z.string().min(1),
  kind: z.literal("quiz"),
  questions: z.array(quizQuestionSchema).min(2).max(4),
});

const noQuizPolicySchema = z.object({
  slug: z.string().min(1),
  kind: z.literal("none"),
  reason: z.string().trim().min(1).max(240),
});

export const quizPolicySchema = z.discriminatedUnion("kind", [authoredPolicySchema, noQuizPolicySchema]);

export type QuizOption = z.infer<typeof quizOptionSchema>;
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type QuizPolicy = z.infer<typeof quizPolicySchema>;

const optionRotations = [1, 2, 0] as const;

export function answer(label: string, feedback: string, isCorrect = false): QuizOption {
  return { label, feedback, isCorrect };
}

export function question(
  id: string,
  prompt: string,
  reference: QuizQuestion["reference"],
  options: readonly QuizOption[],
): QuizQuestion {
  return { id, prompt, reference, options: [...options] };
}

export function authoredQuiz(slug: string, questions: readonly QuizQuestion[]): QuizPolicy {
  const orderedQuestions = questions.map((item, index) => {
    const shift = optionRotations[index % optionRotations.length] % item.options.length;
    const options = [...item.options.slice(shift), ...item.options.slice(0, shift)];
    return { ...item, options };
  });
  return { slug, kind: "quiz", questions: orderedQuestions };
}
