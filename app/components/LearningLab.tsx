"use client";

import { useEffect, useState } from "react";
import { initialDiagram, learningPayloadSchema, type DiagramState, type LearningPayload } from "../learning-types";
import { loadLearningState, saveLearningState } from "../learning-state-client";
import type { QuizPolicy } from "../section-quiz";
import { DiagramEditor } from "./DiagramEditor";
import { AsyncStatus } from "./AsyncStatus";
import { LearningLabTabs, type LearningTab } from "./LearningLabTabs";
import { LearningNotes } from "./LearningNotes";
import { SectionQuiz } from "./SectionQuiz";

interface LearningLabProps {
  readonly pageSlug: string;
  readonly quizPolicy: QuizPolicy;
}

const emptyPayload: LearningPayload = { note: "", diagram: initialDiagram, quizAnswers: [] };

export function LearningLab({ pageSlug, quizPolicy }: LearningLabProps) {
  const [tab, setTab] = useState<LearningTab>("diagram");
  const [payload, setPayload] = useState<LearningPayload>(emptyPayload);
  const [status, setStatus] = useState("Loading saved work…");
  const [hasError, setHasError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const baseId = `learning-lab-${pageSlug}`;

  useEffect(() => {
    const controller = new AbortController();
    loadLearningState(pageSlug, controller.signal)
      .then(({ state, warning }) => {
        if (state) setPayload(state);
        setHasError(false);
        setStatus(warning ?? (state ? "Saved work loaded." : "Ready for your first save."));
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") {
          setHasError(true);
          setStatus(`${error.message} Your work remains available; edit it and try saving again.`);
        }
      });
    return () => controller.abort();
  }, [pageSlug]);

  function updateDiagram(diagram: DiagramState) {
    setPayload((current) => ({ ...current, diagram }));
  }

  function updateAnswer(questionIndex: number, optionIndex: number) {
    if (quizPolicy.kind !== "quiz") return;
    setPayload((current) => {
      const quizAnswers = quizPolicy.questions.map((_, index) => index === questionIndex ? optionIndex : current.quizAnswers[index] ?? -1);
      return { ...current, quizAnswers };
    });
  }

  function retryQuiz() {
    setPayload((current) => ({ ...current, quizAnswers: [] }));
  }

  async function save() {
    setHasError(false);
    setIsSaving(true);
    setStatus("Saving…");
    try {
      const parsedPayload = learningPayloadSchema.parse(payload);
      await saveLearningState(pageSlug, parsedPayload);
      setStatus("All learning work for this page is saved.");
    } catch (error) {
      setHasError(true);
      const message = error instanceof Error ? error.message : "Learning work could not be saved.";
      setStatus(`${message} Your work is still here; edit it and try again.`);
    } finally {
      setIsSaving(false);
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
        <LearningLabTabs activeTab={tab} baseId={baseId} onChange={setTab} />
      </div>
      <div aria-labelledby={`${baseId}-tab-diagram`} className="mt-6 rounded-3xl border border-ink/15 bg-[#eef1e8] p-4 sm:p-6" hidden={tab !== "diagram"} id={`${baseId}-panel-diagram`} role="tabpanel" tabIndex={0}>
        <DiagramEditor label="Section diagram canvas" onChange={updateDiagram} value={payload.diagram} />
      </div>
      <div aria-labelledby={`${baseId}-tab-quiz`} className="mt-6 rounded-3xl border border-ink/15 bg-[#eef1e8] p-4 sm:p-6" hidden={tab !== "quiz"} id={`${baseId}-panel-quiz`} role="tabpanel" tabIndex={0}>
        <SectionQuiz answers={payload.quizAnswers} onAnswer={updateAnswer} onRetry={retryQuiz} policy={quizPolicy} />
      </div>
      <div aria-labelledby={`${baseId}-tab-notes`} className="mt-6 rounded-3xl border border-ink/15 bg-[#eef1e8] p-4 sm:p-6" hidden={tab !== "notes"} id={`${baseId}-panel-notes`} role="tabpanel" tabIndex={0}>
        <LearningNotes note={payload.note} onNoteChange={(note) => setPayload((current) => ({ ...current, note }))} pageSlug={pageSlug} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className="tool-button-dark" disabled={isSaving} onClick={save} type="button">{isSaving ? "Saving learning work…" : "Save learning work"}</button>
        <AsyncStatus className="text-xs text-muted" isError={hasError} message={status} />
      </div>
    </section>
  );
}
