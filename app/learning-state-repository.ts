import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { learningPageState } from "../db/schema";
import { serializeDiagram } from "./diagram-model";
import type { LearningStateRepository, LearningStateWrite } from "./learning-state-contract";
import { serializeQuizAnswers } from "./quiz-persistence";

async function find(userId: string, pageSlug: string) {
  const [row] = await getDb().select().from(learningPageState).where(and(
    eq(learningPageState.userId, userId),
    eq(learningPageState.pageSlug, pageSlug),
  )).limit(1);
  return row ?? null;
}

async function save(value: LearningStateWrite) {
  const row = {
    userId: value.userId,
    pageSlug: value.pageSlug,
    note: value.note,
    diagramPayload: serializeDiagram(value.diagram),
    quizPayload: serializeQuizAnswers(value.quizAnswers),
    updatedAt: value.updatedAt,
  };
  const saved = value.expectedUpdatedAt === null
    ? await getDb().insert(learningPageState).values(row).onConflictDoNothing().returning()
    : await getDb().update(learningPageState).set(row).where(and(
      eq(learningPageState.userId, value.userId),
      eq(learningPageState.pageSlug, value.pageSlug),
      eq(learningPageState.updatedAt, value.expectedUpdatedAt),
    )).returning();
  return saved.length === 1;
}

async function deleteForUser(userId: string) {
  await getDb().delete(learningPageState).where(eq(learningPageState.userId, userId));
}

export const learningStateRepository: LearningStateRepository = { deleteForUser, find, save };
