import { z } from "zod";

export const readingLocationSchema = z.object({
  sectionSlug: z.string().trim().min(1).max(100),
  headingId: z.string().trim().min(1).max(160).nullable(),
});

export const handbookProgressSchema = z.object({
  lastRead: readingLocationSchema.nullable(),
  completedSections: z.array(z.string().trim().min(1).max(100)).max(100),
  checkedItems: z.array(z.string().trim().min(1).max(180)).max(1_000),
});

export type HandbookProgress = z.infer<typeof handbookProgressSchema>;

export const emptyHandbookProgress: HandbookProgress = {
  lastRead: null,
  completedSections: [],
  checkedItems: [],
};
