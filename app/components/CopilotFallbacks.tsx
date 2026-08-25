"use client";

import Link from "next/link";
import { useState } from "react";

interface CopilotFallbacksProps {
  readonly canCheckAgain: boolean;
  readonly fallbackHref: string;
  readonly fallbackLabel: string;
  readonly onCheckAgain: () => void;
  readonly pageLabel: string;
}

function reviewPrompt(pageLabel: string) {
  return `Review ${pageLabel}. List the requirements, assumptions, failure modes, trade-offs, and evidence needed before calling the design ready.`;
}

export function CopilotFallbacks(props: CopilotFallbacksProps) {
  const [copyStatus, setCopyStatus] = useState("");

  async function copyReviewPrompt() {
    try {
      await navigator.clipboard.writeText(reviewPrompt(props.pageLabel));
      setCopyStatus("Review prompt copied.");
    } catch {
      setCopyStatus("The review prompt could not be copied.");
    }
  }

  return (
    <section aria-label="Tools available without AI" className="mb-3 rounded-2xl border border-ink/15 bg-paper p-3">
      <p className="text-xs font-semibold">Continue without AI</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link className="tool-button bg-white" href={props.fallbackHref}>{props.fallbackLabel}</Link>
        <button className="tool-button bg-white" onClick={copyReviewPrompt} type="button">Copy review prompt</button>
        <Link className="tool-button bg-white" href="/book/13-master-system-design-review-checklist">Open master checklist</Link>
        {props.canCheckAgain ? (
          <button className="tool-button bg-white" onClick={props.onCheckAgain} type="button">Check setup again</button>
        ) : null}
      </div>
      <p aria-live="polite" className="mt-2 text-xs text-muted">{copyStatus}</p>
    </section>
  );
}
