"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AsyncStatus } from "../../components/AsyncStatus";

interface LearningComment {
  readonly id: string;
  readonly userEmail: string;
  readonly pageSlug: string;
  readonly pageTitle: string;
  readonly body: string;
  readonly status: "new" | "read";
  readonly createdAt: string;
}

async function loadComments(signal: AbortSignal) {
  const response = await fetch("/api/learning-comments", { signal });
  const body = await response.json() as { comments?: LearningComment[]; message?: string };
  if (!response.ok) throw new Error(body.message ?? "Comments could not be loaded.");
  return body.comments ?? [];
}

interface CommentCardProps {
  readonly comment: LearningComment;
  readonly onStatusChange: (comment: LearningComment) => void;
}

function CommentCard({ comment, onStatusChange }: CommentCardProps) {
  return (
    <article className="rounded-2xl border border-ink/15 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2><Link className="font-serif text-2xl font-bold hover:underline" href={`/book/${comment.pageSlug}`}>{comment.pageTitle}</Link></h2>
          <p className="mt-1 text-xs text-muted">{comment.userEmail} · {new Date(comment.createdAt).toLocaleString()}</p>
          <p className="mt-1 text-xs font-bold"><span aria-hidden="true">{comment.status === "new" ? "● " : "✓ "}</span>Status: {comment.status === "new" ? "New" : "Read"}</p>
        </div>
        <button className={comment.status === "new" ? "tool-button-dark" : "tool-button"} onClick={() => onStatusChange(comment)} type="button">
          {comment.status === "new" ? "Mark read" : "Mark new"}
        </button>
      </div>
      <p className="mt-5 whitespace-pre-wrap text-sm leading-7">{comment.body}</p>
    </article>
  );
}

export function OwnerComments() {
  const [comments, setComments] = useState<readonly LearningComment[]>([]);
  const [status, setStatus] = useState("Loading comments…");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    loadComments(controller.signal)
      .then((items) => {
        setComments(items);
        setHasError(false);
        setStatus(items.length ? "" : "No learning comments yet.");
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") {
          setHasError(true);
          setStatus(error.message);
        }
      });
    return () => controller.abort();
  }, []);

  async function toggleStatus(comment: LearningComment) {
    const nextStatus = comment.status === "new" ? "read" : "new";
    setHasError(false);
    setStatus(`Updating ${comment.pageTitle}…`);
    try {
      const response = await fetch("/api/learning-comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: comment.id, status: nextStatus }),
      });
      const body = await response.json() as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Comment could not be updated.");
      setComments((current) => current.map((item) => item.id === comment.id ? { ...item, status: nextStatus } : item));
      setStatus(`${comment.pageTitle} marked ${nextStatus}.`);
    } catch (error) {
      setHasError(true);
      setStatus(error instanceof Error ? error.message : "Comment could not be updated. Try again.");
    }
  }

  return (
    <div className="space-y-4">
      <AsyncStatus className="text-sm text-muted" isError={hasError} message={status} />
      {comments.map((comment) => <CommentCard comment={comment} key={comment.id} onStatusChange={toggleStatus} />)}
    </div>
  );
}
