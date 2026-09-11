import { and, count, eq, lt } from "drizzle-orm";
import { authenticatedUser, isOwner, isSameOrigin, type AuthenticatedUser } from "../../authenticated-user";
import { findBookSection } from "../../book-content.generated";
import { readJsonRequest } from "../../json-request";
import {
  commentPageOrder, commentPageSize, commentsOlderThan, decodeCommentCursor, encodeCommentCursor,
} from "../../learning-comments-queries";
import {
  commentDeleteSchema, commentInputSchema, commentStatusSchema, type CommentCursor,
} from "../../learning-types";
import { rateLimitRepository, rateLimitScopes } from "../../rate-limit-repository";
import { getDb } from "../../../db";
import { learningComments } from "../../../db/schema";

const maximumRequestBytes = 8 * 1_024;
const commentWindowMs = 24 * 60 * 60 * 1_000;
const commentRetentionMs = 180 * 24 * 60 * 60 * 1_000;
const maxCommentsPerWindow = 5;
const maxGlobalCommentsPerWindow = 200;
const maxRetainedCommentsPerUser = 20;
const globalRateKey = "all-users";

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function invalidBody(status: 400 | 413 | 415, message: string) {
  if (status === 415) return json({ message: "Send comment requests as JSON." }, status);
  if (status === 413) return json({ message: "The comment request is too large." }, status);
  return json({ message }, status);
}

async function isRateLimited(userId: string) {
  const userCount = await rateLimitRepository.consume(rateLimitScopes.commentsUser, userId, commentWindowMs);
  if (userCount > maxCommentsPerWindow) return true;
  const globalCount = await rateLimitRepository.consume(rateLimitScopes.commentsGlobal, globalRateKey, commentWindowMs);
  return globalCount > maxGlobalCommentsPerWindow;
}

async function removeExpiredComments(now = Date.now()) {
  const cutoff = new Date(now - commentRetentionMs).toISOString();
  await getDb().delete(learningComments).where(lt(learningComments.createdAt, cutoff));
}

async function retainedCommentCount(userId: string) {
  const [row] = await getDb().select({ value: count() }).from(learningComments)
    .where(eq(learningComments.userId, userId));
  return row?.value ?? 0;
}

async function enforceSubmissionPolicy(userId: string) {
  try {
    if (await isRateLimited(userId)) return json({ message: "Comment limit reached. Try again tomorrow." }, 429);
    await removeExpiredComments();
    if (await retainedCommentCount(userId) >= maxRetainedCommentsPerUser) {
      return json({ message: "Delete an older comment before sending another." }, 429);
    }
    return null;
  } catch {
    return json({ message: "Comment submission is temporarily unavailable." }, 503);
  }
}

async function saveComment(user: AuthenticatedUser, pageSlug: string, body: string) {
  const section = findBookSection(pageSlug);
  if (!section) return json({ message: "That handbook section does not exist." }, 400);
  const comment = {
    id: crypto.randomUUID(), userId: user.id, userEmail: user.email,
    pageSlug: section.slug, pageTitle: section.title, body,
    status: "new" as const, createdAt: new Date().toISOString(),
  };
  try {
    await getDb().insert(learningComments).values(comment);
    return json({ sent: true, id: comment.id }, 201);
  } catch {
    console.error("learning_comments.write_failed", { userId: user.id, pageSlug: section.slug });
    return json({ message: "Your comment could not be sent." }, 503);
  }
}

async function listComments(cursor: CommentCursor | null) {
  const comments = await getDb().select({
    id: learningComments.id,
    userEmail: learningComments.userEmail,
    pageSlug: learningComments.pageSlug,
    pageTitle: learningComments.pageTitle,
    body: learningComments.body,
    status: learningComments.status,
    createdAt: learningComments.createdAt,
  }).from(learningComments)
    .where(cursor ? commentsOlderThan(cursor) : undefined)
    .orderBy(...commentPageOrder())
    .limit(commentPageSize);
  const last = comments.at(-1);
  const nextCursor = comments.length === commentPageSize && last ? encodeCommentCursor(last) : undefined;
  return { comments, nextCursor };
}

export async function GET(request: Request) {
  const user = authenticatedUser(request);
  if (!user) return json({ message: "Sign in to review comments." }, 401);
  if (!isOwner(user)) return json({ message: "Owner access is required." }, 403);
  const before = new URL(request.url).searchParams.get("before");
  const cursor = before ? decodeCommentCursor(before) : null;
  if (before && !cursor) return json({ message: "The comment cursor is not valid." }, 400);
  try {
    await removeExpiredComments();
    return json(await listComments(cursor));
  } catch {
    console.error("learning_comments.read_failed", { userId: user.id });
    return json({ message: "Comments are temporarily unavailable." }, 503);
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ message: "Invalid request origin." }, 403);
  const user = authenticatedUser(request);
  if (!user) return json({ message: "Sign in to send a comment." }, 401);
  const policyResponse = await enforceSubmissionPolicy(user.id);
  if (policyResponse) return policyResponse;
  const body = await readJsonRequest(request, maximumRequestBytes);
  if (!body.ok) return invalidBody(body.status, "Write a comment of up to 4,000 characters.");
  const parsed = commentInputSchema.safeParse(body.value);
  if (!parsed.success) return json({ message: "Write a comment of up to 4,000 characters." }, 400);
  return saveComment(user, parsed.data.pageSlug, parsed.data.body);
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return json({ message: "Invalid request origin." }, 403);
  const user = authenticatedUser(request);
  if (!user) return json({ message: "Sign in to update comments." }, 401);
  if (!isOwner(user)) return json({ message: "Owner access is required." }, 403);
  const body = await readJsonRequest(request, maximumRequestBytes);
  if (!body.ok) return invalidBody(body.status, "The comment update is not valid.");
  const parsed = commentStatusSchema.safeParse(body.value);
  if (!parsed.success) return json({ message: "The comment update is not valid." }, 400);
  try {
    const updated = await getDb().update(learningComments).set({ status: parsed.data.status })
      .where(eq(learningComments.id, parsed.data.id)).returning({ id: learningComments.id });
    if (updated.length === 0) return json({ updated: false, message: "That comment no longer exists." }, 404);
    return json({ updated: true });
  } catch {
    console.error("learning_comments.update_failed", { userId: user.id, commentId: parsed.data.id });
    return json({ message: "The comment could not be updated." }, 503);
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return json({ message: "Invalid request origin." }, 403);
  const user = authenticatedUser(request);
  if (!user) return json({ message: "Sign in to delete comments." }, 401);
  const body = await readJsonRequest(request, maximumRequestBytes);
  if (!body.ok) return invalidBody(body.status, "The comment deletion is not valid.");
  const parsed = commentDeleteSchema.safeParse(body.value);
  if (!parsed.success) return json({ message: "The comment deletion is not valid." }, 400);
  try {
    const condition = isOwner(user)
      ? eq(learningComments.id, parsed.data.id)
      : and(eq(learningComments.id, parsed.data.id), eq(learningComments.userId, user.id));
    const deleted = await getDb().delete(learningComments).where(condition).returning({ id: learningComments.id });
    return json({ deleted: deleted.length > 0 });
  } catch {
    console.error("learning_comments.delete_failed", { userId: user.id, commentId: parsed.data.id });
    return json({ message: "The comment could not be deleted." }, 503);
  }
}
