"use client";

import { useEffect, useState } from "react";
import { initialDiagram, type DiagramState, type LearningPayload } from "../learning-types";
import {
  LearningStateRequestError,
  loadLearningState,
  saveLearningState,
} from "../learning-state-client";
import { DiagramEditor } from "./DiagramEditor";

interface DiagramBuilderProps {
  readonly pageSlug: string;
}

const emptyWorkshopPayload: LearningPayload = {
  note: "",
  diagram: initialDiagram,
  quizAnswers: [],
};

export function DiagramBuilder({ pageSlug }: DiagramBuilderProps) {
  const [diagram, setDiagram] = useState<DiagramState>(initialDiagram);
  const [isReady, setIsReady] = useState(false);
  const [canSave, setCanSave] = useState(false);
  const [status, setStatus] = useState("Loading your workshop diagram…");

  useEffect(() => {
    const controller = new AbortController();
    loadLearningState(pageSlug, controller.signal)
      .then(({ state, warning }) => {
        if (state) setDiagram(state.diagram);
        setCanSave(true);
        setIsReady(true);
        setStatus(warning ?? (state ? "Saved workshop diagram loaded." : "Ready for your first workshop save."));
      })
      .catch((error: Error) => {
        if (error.name === "AbortError") return;
        const isSignedOut = error instanceof LearningStateRequestError && error.status === 401;
        setCanSave(!isSignedOut);
        setIsReady(true);
        setStatus(isSignedOut ? "You can edit this diagram now. Sign in to save it for your next visit." : error.message);
      });
    return () => controller.abort();
  }, [pageSlug]);

  async function save() {
    setStatus("Saving workshop diagram…");
    try {
      await saveLearningState(pageSlug, { ...emptyWorkshopPayload, diagram });
      setStatus("Workshop diagram saved for your next visit.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Workshop diagram could not be saved.");
    }
  }

  return (
    <section aria-labelledby="canvas-heading" className="mt-9">
      <div className="mb-5">
        <p className="kicker">Diagram constructor</p>
        <h2 className="mt-2 font-serif text-4xl tracking-[-0.03em]" id="canvas-heading">Make the boundaries visible.</h2>
      </div>
      {isReady ? <DiagramEditor label="Workshop diagram canvas" onChange={setDiagram} value={diagram} /> : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className="tool-button-dark" disabled={!canSave || !isReady} onClick={save} type="button">Save workshop diagram</button>
        <span aria-live="polite" className="text-xs text-muted">{status}</span>
      </div>
    </section>
  );
}
