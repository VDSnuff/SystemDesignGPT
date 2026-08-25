"use client";

import { useHandbookProgress } from "./HandbookProgressProvider";

export function SectionProgressControls({ sectionSlug }: Readonly<{ sectionSlug: string }>) {
  const { progress, status, toggleSection } = useHandbookProgress();
  const isComplete = progress.completedSections.includes(sectionSlug);
  return (
    <button
      aria-pressed={isComplete}
      className={isComplete ? "tool-button-dark" : "tool-button"}
      disabled={status === "loading"}
      onClick={() => toggleSection(sectionSlug)}
      type="button"
    >
      {status === "loading" ? "Loading progress…" : (isComplete ? "Section complete · Undo" : "Mark section complete")}
    </button>
  );
}
