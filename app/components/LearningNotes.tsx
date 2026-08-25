"use client";

import { FormEvent, useState } from "react";

interface LearningNotesProps {
  readonly pageSlug: string;
  readonly note: string;
  readonly onNoteChange: (note: string) => void;
}

export function LearningNotes({ pageSlug, note, onNoteChange }: LearningNotesProps) {
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("");

  async function sendComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      setStatus(error instanceof Error ? error.message : "Comment could not be sent.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <label className="block">
        <span className="font-serif text-2xl font-bold">Private page note</span>
        <span className="mt-1 block text-sm text-muted">Saved to your signed-in account when you save this learning work.</span>
        <textarea className="mt-4 min-h-56 w-full rounded-2xl border border-ink/20 bg-white p-4 text-sm leading-6" maxLength={10_000} onChange={(event) => onNoteChange(event.target.value)} placeholder="What do you want to remember from this page?" value={note} />
      </label>
      <form onSubmit={sendComment}>
        <label className="block">
          <span className="font-serif text-2xl font-bold">Learning comment</span>
          <span className="mt-1 block text-sm text-muted">Send a question, correction, or suggestion to the site owner.</span>
          <textarea className="mt-4 min-h-56 w-full rounded-2xl border border-ink/20 bg-white p-4 text-sm leading-6" maxLength={4_000} onChange={(event) => setComment(event.target.value)} placeholder="Tell the owner what helped or what should improve…" required value={comment} />
        </label>
        <div className="mt-3 flex items-center gap-3">
          <button className="tool-button-dark" type="submit">Send to owner</button>
          <span aria-live="polite" className="text-xs text-muted">{status}</span>
        </div>
      </form>
    </div>
  );
}
