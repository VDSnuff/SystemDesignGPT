import { and, eq } from "drizzle-orm";
import { authenticatedUser, isSameOrigin } from "../../authenticated-user";
import { findBookSection } from "../../book-content.generated";
import { initialDiagram, learningPayloadSchema, learningStateInputSchema } from "../../learning-types";
import { getDb } from "../../../db";
import { learningPageState } from "../../../db/schema";

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function requestBody(request: Request) {
  try { return await request.json(); } catch { return null; }
}

function parseStoredState(row: typeof learningPageState.$inferSelect) {
  try {
    return learningPayloadSchema.parse({
      note: row.note,
      diagram: JSON.parse(row.diagramPayload),
      quizAnswers: JSON.parse(row.quizPayload),
    });
  } catch {
    return { note: row.note, diagram: initialDiagram, quizAnswers: [] };
  }
}

export async function GET(request: Request) {
  const user = authenticatedUser(request);
  if (!user) return json({ message: "Sign in to load learning work." }, 401);
  const pageSlug = new URL(request.url).searchParams.get("page") ?? "";
  if (!findBookSection(pageSlug)) return json({ message: "That handbook section does not exist." }, 400);
  try {
    const [row] = await getDb().select().from(learningPageState).where(and(
      eq(learningPageState.userId, user.id),
      eq(learningPageState.pageSlug, pageSlug),
    )).limit(1);
    return json({ state: row ? parseStoredState(row) : null });
  } catch (error) {
    console.error("learning_state.read_failed", { userId: user.id, pageSlug, error });
    return json({ message: "Learning work is temporarily unavailable." }, 503);
  }
}

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return json({ message: "Invalid request origin." }, 403);
  const user = authenticatedUser(request);
  if (!user) return json({ message: "Sign in to save learning work." }, 401);
  const parsed = learningStateInputSchema.safeParse(await requestBody(request));
  if (!parsed.success) return json({ message: "The learning work is not valid." }, 400);
  if (!findBookSection(parsed.data.pageSlug)) return json({ message: "That handbook section does not exist." }, 400);
  const updatedAt = new Date().toISOString();
  const values = {
    userId: user.id,
    pageSlug: parsed.data.pageSlug,
    note: parsed.data.note,
    diagramPayload: JSON.stringify(parsed.data.diagram),
    quizPayload: JSON.stringify(parsed.data.quizAnswers),
    updatedAt,
  };
  try {
    await getDb().insert(learningPageState).values(values).onConflictDoUpdate({
      target: [learningPageState.userId, learningPageState.pageSlug],
      set: { note: values.note, diagramPayload: values.diagramPayload, quizPayload: values.quizPayload, updatedAt },
    });
    return json({ saved: true, updatedAt });
  } catch (error) {
    console.error("learning_state.write_failed", { userId: user.id, pageSlug: parsed.data.pageSlug, error });
    return json({ message: "Learning work could not be saved." }, 503);
  }
}
