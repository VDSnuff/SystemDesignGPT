"use client";

import Link from "next/link";
import { bookProgressSections, learningPaths, type LearningPath } from "../book-progress.generated";
import { useHandbookProgress } from "./HandbookProgressProvider";

function sectionHref(sectionSlug: string, headingId?: string | null) {
  const base = sectionSlug === "introduction" ? "/" : `/book/${sectionSlug}`;
  return headingId ? `${base}#${headingId}` : base;
}

function PathSectionList({ completed, path }: Readonly<{ completed: ReadonlySet<string>; path: LearningPath }>) {
  return (
    <ol className="mt-2 space-y-1 border-l border-ink/15 pl-3">
      {path.sectionSlugs.map((slug, index) => {
        const section = bookProgressSections.find((item) => item.slug === slug);
        return section ? <li className="text-[11px] leading-4" key={slug}>
          <Link className="underline" href={section.href}>{index + 1}. {section.title}</Link>
          <span className="ml-1 text-muted">· {completed.has(slug) ? "Complete" : "Not complete"}</span>
        </li> : null;
      })}
    </ol>
  );
}

function LearningPathCard({ completed, path }: Readonly<{ completed: ReadonlySet<string>; path: LearningPath }>) {
  const pathCompleted = path.sectionSlugs.filter((slug) => completed.has(slug)).length;
  const nextSlug = path.sectionSlugs.find((slug) => !completed.has(slug)) ?? path.sectionSlugs[0];
  return <article>
    <h3 className="text-xs font-bold">{path.title}</h3>
    <p className="mt-1 text-[11px] leading-4 text-muted">{path.purpose}</p>
    <p className="mt-1 text-[11px]">{path.estimatedScope} · {pathCompleted}/{path.sectionSlugs.length} complete</p>
    <Link className="mt-1 inline-block text-xs font-bold underline" href={sectionHref(nextSlug)}>{pathCompleted === path.sectionSlugs.length ? "Review path" : "Continue path"}</Link>
    <PathSectionList completed={completed} path={path} />
  </article>;
}

function GuidedPaths({ completed }: Readonly<{ completed: ReadonlySet<string> }>) {
  return <details className="mt-4 border-t border-ink/10 pt-3">
    <summary className="cursor-pointer text-xs font-bold">Guided learning paths</summary>
    <div className="mt-3 space-y-4">
      {learningPaths.map((path) => <LearningPathCard completed={completed} key={path.id} path={path} />)}
    </div>
  </details>;
}

export function HandbookProgressPanel({ instanceId = "standalone" }: Readonly<{ instanceId?: string }>) {
  const { progress, status, message, hasSavedProgress } = useHandbookProgress();
  const completed = new Set(progress.completedSections);
  const lastRead = progress.lastRead;
  const resumeSection = lastRead ? bookProgressSections.find((section) => section.slug === lastRead.sectionSlug) : null;
  const firstUse = status === "ready" && !hasSavedProgress && completed.size === 0 && progress.checkedItems.length === 0;
  const isComplete = completed.size === bookProgressSections.length;
  const headingId = `handbook-progress-${instanceId}`;
  return <section aria-labelledby={headingId} className="mb-5 rounded-2xl border border-ink/15 bg-white/60 p-3">
    <h2 className="text-sm font-bold" id={headingId}>Your handbook progress</h2>
    <p className="mt-1 text-xs leading-5 text-muted">{isComplete ? "All handbook sections are complete. Your choices remain editable." : `${completed.size} of ${bookProgressSections.length} sections complete.`}</p>
    <progress aria-label="Overall handbook completion" className="mt-2 w-full accent-[#688e19]" max={bookProgressSections.length} value={completed.size} />
    {resumeSection ? <Link className="tool-button-dark mt-3 inline-flex" href={sectionHref(resumeSection.slug, lastRead?.headingId)}>Resume reading · {resumeSection.title}</Link> : null}
    {firstUse ? <p className="mt-3 text-xs leading-5">Choose a path or open any section. Completion is always your choice.</p> : null}
    <p aria-live="polite" className="mt-2 text-[11px] leading-4 text-muted">{status === "loading" ? "Loading saved progress…" : message}</p>
    <GuidedPaths completed={completed} />
  </section>;
}
