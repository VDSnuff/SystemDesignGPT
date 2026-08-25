"use client";

import { FormEvent, useState } from "react";
import { AsyncStatus } from "./AsyncStatus";

interface LearningNotesProps {
  readonly pageSlug: string;
  readonly note: string;
  readonly onNoteChange: (note: string) => void;
}

export function LearningNotes({ pageSlug, note, onNoteChange }: LearningNotesProps) {
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("");
  const [hasError, setHasError] = useState(false);
  const [isSending, setIsSending] = useState(false);

  async function sendComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasError(false);
    setIsSending(true);
    setStatus("Sending…");
    try {
      const response = await fetch("/api/learning-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageSlug, body: comment }),
      });
      const body = await response.json() as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Comment could not be sent.");
      setComment("");
      setStatus("Comment sent to the owner.");
    } catch (error) {
      setHasError(true);
      const message = error instanceof Error ? error.message : "Comment could not be sent.";
      setStatus(`${message} Your comment is still here; edit it and try again.`);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <label className="block" htmlFor="private-page-note">
        <span className="font-serif text-2xl font-bold">Private page note</span>
        <span className="mt-1 block text-sm text-muted">Saved to your signed-in account when you save this learning work.</span>
        <span className="mt-1 block text-xs text-muted" id="private-page-note-help">Optional · up to 10,000 characters.</span>
        <textarea aria-describedby="private-page-note-help" className="mt-4 min-h-56 w-full rounded-2xl border border-ink/20 bg-white p-4 text-sm leading-6" id="private-page-note" maxLength={10_000} onChange={(event) => onNoteChange(event.target.value)} placeholder="What do you want to remember from this page?" value={note} />
      </label>
      <form onSubmit={sendComment}>
        <label className="block" htmlFor="learning-comment">
          <span className="font-serif text-2xl font-bold">Learning comment</span>
          <span className="mt-1 block text-sm text-muted">Send a question, correction, or suggestion to the site owner.</span>
          <span className="mt-1 block text-xs text-muted" id="learning-comment-help">Required · up to 4,000 characters. If sending fails, your text remains so you can edit and retry.</span>
          <textarea aria-describedby="learning-comment-help" className="mt-4 min-h-56 w-full rounded-2xl border border-ink/20 bg-white p-4 text-sm leading-6" id="learning-comment" maxLength={4_000} onChange={(event) => setComment(event.target.value)} placeholder="Tell the owner what helped or what should improve…" required value={comment} />
        </label>
        <div className="mt-3 flex items-center gap-3">
          <button className="tool-button-dark" disabled={isSending} type="submit">{isSending ? "Sending comment…" : "Send to owner"}</button>
          <AsyncStatus className="text-xs text-muted" isError={hasError} message={status} />
        </div>
      </form>
    </div>
  );
}
