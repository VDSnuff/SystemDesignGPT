"use client";

import { useEffect, useState } from "react";
import { initialDiagram, learningPayloadSchema, type DiagramState, type LearningPayload } from "../learning-types";
import type { QuizQuestion } from "../section-quiz";
import { LearningNotes } from "./LearningNotes";
import { SectionDiagram } from "./SectionDiagram";
import { SectionQuiz } from "./SectionQuiz";

type Tab = "diagram" | "quiz" | "notes";

interface LearningLabProps {
  readonly pageSlug: string;
  readonly questions: readonly QuizQuestion[];
}

const emptyPayload: LearningPayload = { note: "", diagram: initialDiagram, quizAnswers: [] };

async function loadPayload(pageSlug: string, signal: AbortSignal) {
  const response = await fetch(`/api/learning-state?page=${encodeURIComponent(pageSlug)}`, { signal });
  const body = await response.json() as { state?: unknown; message?: string };
  if (!response.ok) throw new Error(body.message ?? "Learning work could not be loaded.");
  if (body.state === null) return null;
  const parsed = learningPayloadSchema.safeParse(body.state);
  if (!parsed.success) throw new Error("Saved learning work is not valid.");
  return parsed.data;
}

function TabButton({ active, children, onClick }: Readonly<{ active: boolean; children: React.ReactNode; onClick: () => void }>) {
  const className = active ? "tool-button-dark" : "tool-button";
  return <button aria-pressed={active} className={className} onClick={onClick} type="button">{children}</button>;
}

export function LearningLab({ pageSlug, questions }: LearningLabProps) {
  const [tab, setTab] = useState<Tab>("diagram");
  const [payload, setPayload] = useState<LearningPayload>(emptyPayload);
  const [status, setStatus] = useState("Loading saved work…");

  useEffect(() => {
    const controller = new AbortController();
    loadPayload(pageSlug, controller.signal)
      .then((saved) => {
        if (saved) setPayload(saved);
        setStatus(saved ? "Saved work loaded." : "Ready for your first save.");
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setStatus(error.message);
      });
    return () => controller.abort();
  }, [pageSlug]);

  function updateDiagram(diagram: DiagramState) {
    setPayload((current) => ({ ...current, diagram }));
  }

  function updateAnswer(questionIndex: number, optionIndex: number) {
    setPayload((current) => {
      const quizAnswers = questions.map((_, index) => index === questionIndex ? optionIndex : current.quizAnswers[index] ?? -1);
      return { ...current, quizAnswers };
    });
  }

  async function save() {
    setStatus("Saving…");
    try {
      const response = await fetch("/api/learning-state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageSlug, ...payload }),
      });
      const body = await response.json() as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Learning work could not be saved.");
      setStatus("All learning work for this page is saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Learning work could not be saved.");
    }
  }

  return (
    <section aria-labelledby="learning-lab-heading" className="mt-14 border-t border-ink/15 pt-10" id="learning-lab">
      <p className="kicker">Practice after learning</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-4xl tracking-[-0.03em]" id="learning-lab-heading">Section learning lab</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Build the idea, test your recall, and keep page-specific notes.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist">
          <TabButton active={tab === "diagram"} onClick={() => setTab("diagram")}>Diagram</TabButton>
          <TabButton active={tab === "quiz"} onClick={() => setTab("quiz")}>Quiz</TabButton>
          <TabButton active={tab === "notes"} onClick={() => setTab("notes")}>Notes & feedback</TabButton>
        </div>
      </div>
      <div className="mt-6 rounded-3xl border border-ink/15 bg-[#eef1e8] p-4 sm:p-6">
        {tab === "diagram" ? <SectionDiagram onChange={updateDiagram} value={payload.diagram} /> : null}
        {tab === "quiz" ? <SectionQuiz answers={payload.quizAnswers} onAnswer={updateAnswer} questions={questions} /> : null}
        {tab === "notes" ? <LearningNotes note={payload.note} onNoteChange={(note) => setPayload((current) => ({ ...current, note }))} pageSlug={pageSlug} /> : null}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className="tool-button-dark" onClick={save} type="button">Save learning work</button>
        <span aria-live="polite" className="text-xs text-muted">{status}</span>
      </div>
    </section>
  );
}
