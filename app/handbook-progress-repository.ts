import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { handbookProgress } from "../db/schema";
import type { HandbookProgressRepository, HandbookProgressWrite } from "./handbook-progress-contract";

async function find(userId: string) {
  const [row] = await getDb().select().from(handbookProgress)
    .where(eq(handbookProgress.userId, userId)).limit(1);
  return row ?? null;
}

async function save(value: HandbookProgressWrite) {
  const row = {
    userId: value.userId,
    lastPageSlug: value.lastRead?.sectionSlug ?? null,
    lastHeadingId: value.lastRead?.headingId ?? null,
    completedSectionsPayload: JSON.stringify(value.completedSections),
    checkedItemsPayload: JSON.stringify(value.checkedItems),
    updatedAt: value.updatedAt,
  };
  const saved = value.expectedUpdatedAt === null
    ? await getDb().insert(handbookProgress).values(row).onConflictDoNothing().returning()
    : await getDb().update(handbookProgress).set(row).where(and(
      eq(handbookProgress.userId, value.userId),
      eq(handbookProgress.updatedAt, value.expectedUpdatedAt),
    )).returning();
  return saved.length === 1;
}

async function deleteForUser(userId: string) {
  await getDb().delete(handbookProgress).where(eq(handbookProgress.userId, userId));
}

export const handbookProgressRepository: HandbookProgressRepository = { deleteForUser, find, save };
