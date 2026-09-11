import { and, desc, eq, lt, or } from "drizzle-orm";
import { learningComments } from "../db/schema";
import { commentCursorSchema, type CommentCursor } from "./learning-types";

export const commentPageSize = 100;
const cursorSeparator = "|";

export function encodeCommentCursor(cursor: CommentCursor) {
  return `${cursor.createdAt}${cursorSeparator}${cursor.id}`;
}

export function decodeCommentCursor(raw: string): CommentCursor | null {
  const separator = raw.indexOf(cursorSeparator);
  if (separator < 0) return null;
  const parsed = commentCursorSchema.safeParse({ createdAt: raw.slice(0, separator), id: raw.slice(separator + 1) });
  return parsed.success ? parsed.data : null;
}

// Rows sharing a boundary timestamp are disambiguated by id so a page never skips or repeats them.
export function commentsOlderThan(cursor: CommentCursor) {
  return or(
    lt(learningComments.createdAt, cursor.createdAt),
    and(eq(learningComments.createdAt, cursor.createdAt), lt(learningComments.id, cursor.id)),
  );
}

export function commentPageOrder() {
  return [desc(learningComments.createdAt), desc(learningComments.id)];
}
