import type { QuizQuestion } from "./quiz-contract";

export function correctOptionIndex(question: QuizQuestion) {
  return question.options.findIndex((option) => option.isCorrect);
}

export function scoreQuiz(questions: readonly QuizQuestion[], answers: readonly number[]) {
  return questions.filter((question, index) => answers[index] === correctOptionIndex(question)).length;
}
