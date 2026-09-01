"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { HandbookProgressRequestError, loadHandbookProgress, saveHandbookProgress } from "../handbook-progress-client";
import { emptyHandbookProgress, type HandbookProgress } from "../handbook-progress";

type ProgressStatus = "loading" | "ready" | "signed-out" | "error";

interface HandbookProgressContextValue {
  readonly progress: HandbookProgress;
  readonly status: ProgressStatus;
  readonly message: string;
  readonly hasSavedProgress: boolean;
  readonly recordLocation: (sectionSlug: string, headingId: string | null) => void;
  readonly toggleChecklistItem: (checklistId: string) => void;
  readonly toggleSection: (sectionSlug: string) => void;
}

const HandbookProgressContext = createContext<HandbookProgressContextValue | null>(null);

function toggled(values: readonly string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function useLoadedProgress() {
  const [progress, setProgress] = useState(emptyHandbookProgress);
  const [status, setStatus] = useState<ProgressStatus>("loading");
  const [message, setMessage] = useState("Loading saved handbook progress…");
  const [hasSavedProgress, setHasSavedProgress] = useState(false);
  const [revision, setRevision] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    loadHandbookProgress(controller.signal).then(({ state, warning, revision: loadedRevision }) => {
      if (state) {
        setProgress(state);
      }
      setHasSavedProgress(Boolean(state));
      setRevision(loadedRevision);
      setStatus("ready");
      setMessage(warning ?? (state ? "Saved progress loaded." : "No saved progress yet. Choose where to begin."));
    }).catch((error: Error) => {
      if (error.name === "AbortError") return;
      const isSignedOut = error instanceof HandbookProgressRequestError && error.status === 401;
      setStatus(isSignedOut ? "signed-out" : "error");
      setMessage(isSignedOut
        ? "Reading stays available. Sign in to save progress across visits."
        : "Reading stays available, but saved progress is temporarily unavailable.");
    });
    return () => controller.abort();
  }, []);
  return { progress, setProgress, status, setStatus, message, setMessage, hasSavedProgress, setHasSavedProgress, revision, setRevision };
}

interface ProgressUpdaterOptions {
  readonly status: ProgressStatus;
  readonly progress: HandbookProgress;
  readonly revision: string | null;
  readonly setProgress: Dispatch<SetStateAction<HandbookProgress>>;
  readonly setStatus: Dispatch<SetStateAction<ProgressStatus>>;
  readonly setMessage: Dispatch<SetStateAction<string>>;
  readonly setHasSavedProgress: Dispatch<SetStateAction<boolean>>;
  readonly setRevision: Dispatch<SetStateAction<string | null>>;
}

function useProgressUpdater(options: ProgressUpdaterOptions) {
  const progressRef = useRef(options.progress);
  const revisionRef = useRef(options.revision);
  const saveQueue = useRef(Promise.resolve());
  useEffect(() => { progressRef.current = options.progress; }, [options.progress]);
  useEffect(() => { revisionRef.current = options.revision; }, [options.revision]);
  return useCallback((update: (current: HandbookProgress) => HandbookProgress) => {
    const current = progressRef.current;
    const next = update(current);
    if (next === current) return;
    progressRef.current = next;
    options.setProgress(next);
    if (options.status !== "ready") return;
    options.setMessage("Saving progress…");
    saveQueue.current = saveQueue.current.then(() => saveHandbookProgress(next, revisionRef.current)).then((savedRevision) => {
      revisionRef.current = savedRevision;
      options.setRevision(savedRevision);
      options.setHasSavedProgress(true);
      options.setStatus("ready");
      options.setMessage("Progress saved.");
    }).catch((error: unknown) => {
      options.setStatus("error");
      const message = error instanceof HandbookProgressRequestError && error.status === 409
        ? `${error.message} Your current progress remains on this page.`
        : "Reading stays available, but progress could not be saved.";
      options.setMessage(message);
    });
  }, [options]);
}

function useProgressActions(updateProgress: (update: (current: HandbookProgress) => HandbookProgress) => void) {
  const recordLocation = useCallback((sectionSlug: string, headingId: string | null) => {
    updateProgress((current) => {
      if (current.lastRead?.sectionSlug === sectionSlug && current.lastRead.headingId === headingId) return current;
      return { ...current, lastRead: { sectionSlug, headingId } };
    });
  }, [updateProgress]);

  const toggleChecklistItem = useCallback((checklistId: string) => {
    updateProgress((current) => ({ ...current, checkedItems: toggled(current.checkedItems, checklistId) }));
  }, [updateProgress]);

  const toggleSection = useCallback((sectionSlug: string) => {
    updateProgress((current) => ({ ...current, completedSections: toggled(current.completedSections, sectionSlug) }));
  }, [updateProgress]);
  return { recordLocation, toggleChecklistItem, toggleSection };
}

export function HandbookProgressProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const state = useLoadedProgress();
  const options = useMemo(() => ({ status: state.status, progress: state.progress, revision: state.revision, setProgress: state.setProgress, setStatus: state.setStatus, setMessage: state.setMessage, setHasSavedProgress: state.setHasSavedProgress, setRevision: state.setRevision }), [state.status, state.progress, state.revision, state.setProgress, state.setStatus, state.setMessage, state.setHasSavedProgress, state.setRevision]);
  const updateProgress = useProgressUpdater(options);
  const { recordLocation, toggleChecklistItem, toggleSection } = useProgressActions(updateProgress);
  const value = useMemo(() => ({
    progress: state.progress, status: state.status, message: state.message, hasSavedProgress: state.hasSavedProgress,
    recordLocation, toggleChecklistItem, toggleSection,
  }), [state.progress, state.status, state.message, state.hasSavedProgress, recordLocation, toggleChecklistItem, toggleSection]);
  return <HandbookProgressContext.Provider value={value}>{children}</HandbookProgressContext.Provider>;
}

export function useHandbookProgress() {
  const value = useContext(HandbookProgressContext);
  if (!value) throw new Error("useHandbookProgress must be used within HandbookProgressProvider");
  return value;
}
