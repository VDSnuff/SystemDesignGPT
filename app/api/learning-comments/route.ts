import { desc, eq } from "drizzle-orm";
import { authenticatedUser, isOwner, isSameOrigin } from "../../authenticated-user";
import { findBookSection } from "../../book-content.generated";
import { commentInputSchema, commentStatusSchema } from "../../learning-types";
import { getDb } from "../../../db";
import { learningComments } from "../../../db/schema";

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function requestBody(request: Request) {
  try { return await request.json(); } catch { return null; }
}

export async function GET(request: Request) {
  const user = authenticatedUser(request);
  if (!user) return json({ message: "Sign in to review comments." }, 401);
  if (!isOwner(user)) return json({ message: "Owner access is required." }, 403);
  try {
    const comments = await getDb().select({
      id: learningComments.id,
      userEmail: learningComments.userEmail,
      pageSlug: learningComments.pageSlug,
      pageTitle: learningComments.pageTitle,
      body: learningComments.body,
      status: learningComments.status,
      createdAt: learningComments.createdAt,
    }).from(learningComments)
      .orderBy(desc(learningComments.createdAt)).limit(100);
    return json({ comments });
  } catch (error) {
    console.error("learning_comments.read_failed", { userId: user.id, error });
    return json({ message: "Comments are temporarily unavailable." }, 503);
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ message: "Invalid request origin." }, 403);
  const user = authenticatedUser(request);
  if (!user) return json({ message: "Sign in to send a comment." }, 401);
  const parsed = commentInputSchema.safeParse(await requestBody(request));
  if (!parsed.success) return json({ message: "Write a comment of up to 4,000 characters." }, 400);
  const section = findBookSection(parsed.data.pageSlug);
  if (!section) return json({ message: "That handbook section does not exist." }, 400);
  const comment = {
    id: crypto.randomUUID(),
    userId: user.id,
    userEmail: user.email,
    pageSlug: section.slug,
    pageTitle: section.title,
    body: parsed.data.body,
    status: "new" as const,
    createdAt: new Date().toISOString(),
  };
  try {
    await getDb().insert(learningComments).values(comment);
    return json({ sent: true, id: comment.id }, 201);
  } catch (error) {
    console.error("learning_comments.write_failed", { userId: user.id, pageSlug: section.slug, error });
    return json({ message: "Your comment could not be sent." }, 503);
  }
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return json({ message: "Invalid request origin." }, 403);
  const user = authenticatedUser(request);
  if (!user) return json({ message: "Sign in to update comments." }, 401);
  if (!isOwner(user)) return json({ message: "Owner access is required." }, 403);
  const parsed = commentStatusSchema.safeParse(await requestBody(request));
  if (!parsed.success) return json({ message: "The comment update is not valid." }, 400);
  try {
    await getDb().update(learningComments).set({ status: parsed.data.status })
      .where(eq(learningComments.id, parsed.data.id));
    return json({ updated: true });
  } catch (error) {
    console.error("learning_comments.update_failed", { userId: user.id, commentId: parsed.data.id, error });
    return json({ message: "The comment could not be updated." }, 503);
  }
}
