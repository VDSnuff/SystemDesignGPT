"use client";

import type { QuizPolicy, QuizQuestion } from "../quiz-contract";
import { correctOptionIndex, scoreQuiz } from "../quiz-scoring";

interface SectionQuizProps {
  readonly policy: QuizPolicy;
  readonly answers: readonly number[];
  readonly onAnswer: (questionIndex: number, optionIndex: number) => void;
  readonly onRetry: () => void;
}

function NoQuiz({ reason }: Readonly<{ reason: string }>) {
  return (
    <div className="rounded-2xl border border-ink/15 bg-white/70 p-5">
      <h3 className="font-serif text-2xl font-bold">Practice this section directly</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{reason}</p>
    </div>
  );
}

function QuizFeedback({ answerIndex, question }: Readonly<{ answerIndex: number; question: QuizQuestion }>) {
  const isCorrect = answerIndex === correctOptionIndex(question);
  return (
    <div className="mt-3 text-sm leading-6">
      <p className={`font-bold ${isCorrect ? "text-[#517700]" : "text-muted"}`}>{isCorrect ? "Correct." : "Not quite."}</p>
      <p>{question.options[answerIndex]?.feedback}</p>
      <a className="font-bold underline decoration-ink/30 underline-offset-4" href={question.reference.href}>{question.reference.label}</a>
    </div>
  );
}

function QuestionCard({ answerIndex, index, onAnswer, question }: Readonly<{ answerIndex: number; index: number; onAnswer: (optionIndex: number) => void; question: QuizQuestion }>) {
  return (
    <fieldset className="rounded-2xl border border-ink/15 bg-white/70 p-5">
      <legend className="px-1 font-serif text-xl font-bold">{index + 1}. {question.prompt}</legend>
      <div className="mt-3 space-y-2">
        {question.options.map((option, optionIndex) => (
          <label className="flex cursor-pointer gap-3 rounded-xl border border-transparent p-3 text-sm leading-6 hover:border-ink/15 hover:bg-white" key={option.label}>
            <input checked={answerIndex === optionIndex} name={`${question.id}-${index}`} onChange={() => onAnswer(optionIndex)} type="radio" />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {answerIndex >= 0 ? <QuizFeedback answerIndex={answerIndex} question={question} /> : null}
    </fieldset>
  );
}

export function SectionQuiz({ policy, answers, onAnswer, onRetry }: SectionQuizProps) {
  if (policy.kind === "none") return <NoQuiz reason={policy.reason} />;
  const isComplete = policy.questions.every((_, index) => (answers[index] ?? -1) >= 0);
  return (
    <div className="space-y-5">
      {policy.questions.map((question, index) => (
        <QuestionCard answerIndex={answers[index] ?? -1} index={index} key={question.id} onAnswer={(option) => onAnswer(index, option)} question={question} />
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-bold">{isComplete ? `${scoreQuiz(policy.questions, answers)} of ${policy.questions.length} correct` : "Answer every question to see your score."}</p>
        {answers.length ? <button className="tool-button" onClick={onRetry} type="button">Retry quiz</button> : null}
      </div>
    </div>
  );
}
