"use client";

import type { QuizQuestion } from "../section-quiz";

interface SectionQuizProps {
  readonly questions: readonly QuizQuestion[];
  readonly answers: readonly number[];
  readonly onAnswer: (questionIndex: number, optionIndex: number) => void;
}

export function SectionQuiz({ questions, answers, onAnswer }: SectionQuizProps) {
  const isComplete = questions.every((_, index) => (answers[index] ?? -1) >= 0);
  const score = questions.filter((question, index) => answers[index] === question.correctIndex).length;
  return (
    <div className="space-y-5">
      {questions.map((question, questionIndex) => (
        <fieldset className="rounded-2xl border border-ink/15 bg-white/70 p-5" key={question.id}>
          <legend className="px-1 font-serif text-xl font-bold">{questionIndex + 1}. {question.prompt}</legend>
          <div className="mt-3 space-y-2">
            {question.options.map((option, optionIndex) => (
              <label className="flex cursor-pointer gap-3 rounded-xl border border-transparent p-3 text-sm leading-6 hover:border-ink/15 hover:bg-white" key={option}>
                <input checked={answers[questionIndex] === optionIndex} name={`${question.id}-${questionIndex}`} onChange={() => onAnswer(questionIndex, optionIndex)} type="radio" />
                <span>{option}</span>
              </label>
            ))}
          </div>
          {(answers[questionIndex] ?? -1) >= 0 ? (
            <p className={`mt-3 text-sm font-bold ${answers[questionIndex] === question.correctIndex ? "text-[#517700]" : "text-muted"}`}>
              {answers[questionIndex] === question.correctIndex ? "Correct." : "Review the section and try again."}
            </p>
          ) : null}
        </fieldset>
      ))}
      <p className="text-sm font-bold">{isComplete ? `${score} of ${questions.length} correct` : "Answer every question to see your score."}</p>
    </div>
  );
}
