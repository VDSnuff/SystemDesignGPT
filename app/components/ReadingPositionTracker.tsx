"use client";

import { useEffect } from "react";
import { useHandbookProgress } from "./HandbookProgressProvider";

interface ReadingObserverOptions {
  readonly headingIds: readonly string[];
  readonly recordLocation: (sectionSlug: string, headingId: string | null) => void;
  readonly sectionSlug: string;
}

function observeReadingPosition({ headingIds, recordLocation, sectionSlug }: ReadingObserverOptions) {
  const hashHeading = window.location.hash.slice(1);
  if (hashHeading && headingIds.includes(hashHeading)) recordLocation(sectionSlug, hashHeading);
  if (typeof IntersectionObserver === "undefined") return;
  let hasTrackedHeading = Boolean(hashHeading);
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.find((entry) => entry.isIntersecting);
    if (!visible) return;
    hasTrackedHeading = true;
    recordLocation(sectionSlug, visible.target.id);
  }, { rootMargin: "-10% 0px -70%", threshold: 0 });
  const trackSection = () => {
    if (hasTrackedHeading || window.scrollY < 160) return;
    recordLocation(sectionSlug, null);
    window.removeEventListener("scroll", trackSection);
  };
  headingIds.map((id) => document.getElementById(id)).filter((heading): heading is HTMLElement => Boolean(heading))
    .forEach((heading) => observer.observe(heading));
  window.addEventListener("scroll", trackSection, { passive: true });
  return () => { observer.disconnect(); window.removeEventListener("scroll", trackSection); };
}

export function ReadingPositionTracker({ headingIds, sectionSlug }: Readonly<{ headingIds: readonly string[]; sectionSlug: string }>) {
  const { recordLocation, status } = useHandbookProgress();
  useEffect(() => status === "loading" ? undefined : observeReadingPosition({ headingIds, recordLocation, sectionSlug }), [headingIds, recordLocation, sectionSlug, status]);

  return null;
}
