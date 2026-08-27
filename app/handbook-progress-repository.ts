import { eq } from "drizzle-orm";
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
  await getDb().insert(handbookProgress).values(row).onConflictDoUpdate({
    target: handbookProgress.userId,
    set: {
      lastPageSlug: row.lastPageSlug,
      lastHeadingId: row.lastHeadingId,
      completedSectionsPayload: row.completedSectionsPayload,
      checkedItemsPayload: row.checkedItemsPayload,
      updatedAt: row.updatedAt,
    },
  });
}

async function deleteForUser(userId: string) {
  await getDb().delete(handbookProgress).where(eq(handbookProgress.userId, userId));
}

export const handbookProgressRepository: HandbookProgressRepository = { deleteForUser, find, save };
