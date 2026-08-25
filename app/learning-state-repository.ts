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
  await getDb().insert(learningPageState).values(row).onConflictDoUpdate({
    target: [learningPageState.userId, learningPageState.pageSlug],
    set: {
      note: row.note,
      diagramPayload: row.diagramPayload,
      quizPayload: row.quizPayload,
      updatedAt: row.updatedAt,
    },
  });
}

export const learningStateRepository: LearningStateRepository = { find, save };
