import { authenticatedUser, isSameOrigin } from "./authenticated-user";
import { findBookSection } from "./book-content.generated";
import { workshopPage } from "./content";
import { diagramStateSchema, initialDiagram } from "./diagram-model";
import type { LearningStateRecord, LearningStateRepository } from "./learning-state-contract";
import { learningStateInputSchema } from "./learning-types";
import { decodeQuizAnswers } from "./quiz-persistence";

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function requestBody(request: Request) {
  try { return await request.json(); } catch { return null; }
}

function parseJson(value: string) {
  try { return JSON.parse(value) as unknown; } catch { return null; }
}

function isLearningPage(pageSlug: string) {
  return pageSlug === workshopPage.slug || Boolean(findBookSection(pageSlug));
}

export function decodeStoredState(row: LearningStateRecord) {
  const diagram = diagramStateSchema.safeParse(parseJson(row.diagramPayload));
  const quiz = decodeQuizAnswers(row.quizPayload);
  const warnings: string[] = [];
  if (!diagram.success) warnings.push("The saved diagram was invalid and has been reset so you can recover it.");
  if (quiz.warning) warnings.push(quiz.warning);
  return {
    state: {
      note: row.note.slice(0, 10_000),
      diagram: diagram.success ? diagram.data : initialDiagram,
      quizAnswers: quiz.answers,
    },
    warning: warnings.join(" ") || undefined,
  };
}

export async function handleLearningStateGet(request: Request, repository: LearningStateRepository) {
  const user = authenticatedUser(request);
  if (!user) return json({ message: "Sign in to load learning work." }, 401);
  const pageSlug = new URL(request.url).searchParams.get("page") ?? "";
  if (!isLearningPage(pageSlug)) return json({ message: "That learning page does not exist." }, 400);
  try {
    const row = await repository.find(user.id, pageSlug);
    return json(row ? decodeStoredState(row) : { state: null });
  } catch (error) {
    console.error("learning_state.read_failed", { userId: user.id, pageSlug, error });
    return json({ message: "Learning work is temporarily unavailable." }, 503);
  }
}

export async function handleLearningStatePut(request: Request, repository: LearningStateRepository) {
  if (!isSameOrigin(request)) return json({ message: "Invalid request origin." }, 403);
  const user = authenticatedUser(request);
  if (!user) return json({ message: "Sign in to save learning work." }, 401);
  const parsed = learningStateInputSchema.safeParse(await requestBody(request));
  if (!parsed.success) return json({ message: "The learning work is not valid." }, 400);
  if (!isLearningPage(parsed.data.pageSlug)) return json({ message: "That learning page does not exist." }, 400);
  const updatedAt = new Date().toISOString();
  try {
    await repository.save({ ...parsed.data, userId: user.id, updatedAt });
    return json({ saved: true, updatedAt });
  } catch (error) {
    console.error("learning_state.write_failed", { userId: user.id, pageSlug: parsed.data.pageSlug, error });
    return json({ message: "Learning work could not be saved." }, 503);
  }
}
