import { z } from "zod";
import { quizAnswersSchema } from "./learning-types";

export const QUIZ_STORAGE_VERSION = 2;

const storedQuizSchema = z.object({
  version: z.literal(QUIZ_STORAGE_VERSION),
  answers: quizAnswersSchema,
});

function parseJson(value: string) {
  try { return JSON.parse(value) as unknown; } catch { return null; }
}

export function serializeQuizAnswers(answers: readonly number[]) {
  return JSON.stringify(storedQuizSchema.parse({ version: QUIZ_STORAGE_VERSION, answers }));
}

export function decodeQuizAnswers(value: string) {
  const parsedJson = parseJson(value);
  if (Array.isArray(parsedJson)) {
    return {
      answers: [],
      warning: "Saved answers used the retired generated quiz format and were cleared for this authored assessment.",
    };
  }
  const stored = storedQuizSchema.safeParse(parsedJson);
  if (stored.success) return { answers: stored.data.answers, warning: undefined };
  return { answers: [], warning: "The saved quiz answers were invalid and have been cleared." };
}
