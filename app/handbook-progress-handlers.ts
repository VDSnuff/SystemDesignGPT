import { authenticatedUser, isSameOrigin } from "./authenticated-user";
import { bookChecklistIds, bookLearningSections } from "./book-learning.generated";
import type { HandbookProgressRecord, HandbookProgressRepository } from "./handbook-progress-contract";
import { emptyHandbookProgress, handbookProgressSchema, type HandbookProgress } from "./handbook-progress";
import { readJsonRequest } from "./json-request";

const maximumRequestBytes = 16 * 1_024;

const sectionSlugs = new Set(bookLearningSections.map((section) => section.slug));
const checklistIds = new Set<string>(bookChecklistIds);

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function parseArray(value: string) {
  try { return JSON.parse(value) as unknown; } catch { return null; }
}

function isKnownLocation(progress: HandbookProgress) {
  if (!progress.lastRead) return true;
  const section = bookLearningSections.find((item) => item.slug === progress.lastRead?.sectionSlug);
  if (!section) return false;
  return progress.lastRead.headingId === null
    || section.headings.some((heading) => heading.id === progress.lastRead?.headingId);
}

function isKnownProgress(progress: HandbookProgress) {
  const hasDuplicates = new Set(progress.completedSections).size !== progress.completedSections.length
    || new Set(progress.checkedItems).size !== progress.checkedItems.length;
  return !hasDuplicates
    && isKnownLocation(progress)
    && progress.completedSections.every((slug) => sectionSlugs.has(slug))
    && progress.checkedItems.every((id) => checklistIds.has(id));
}

export function decodeStoredProgress(row: HandbookProgressRecord) {
  const parsed = handbookProgressSchema.safeParse({
    lastRead: row.lastPageSlug ? { sectionSlug: row.lastPageSlug, headingId: row.lastHeadingId } : null,
    completedSections: parseArray(row.completedSectionsPayload),
    checkedItems: parseArray(row.checkedItemsPayload),
  });
  if (!parsed.success) {
    return { state: emptyHandbookProgress, warning: "Saved handbook progress was invalid and has been reset." };
  }
  const completedSections = parsed.data.completedSections.filter((slug) => sectionSlugs.has(slug));
  const checkedItems = parsed.data.checkedItems.filter((id) => checklistIds.has(id));
  const lastRead = isKnownLocation(parsed.data) ? parsed.data.lastRead : null;
  const wasMigrated = completedSections.length !== parsed.data.completedSections.length
    || checkedItems.length !== parsed.data.checkedItems.length
    || lastRead !== parsed.data.lastRead;
  return {
    state: { lastRead, completedSections, checkedItems },
    warning: wasMigrated ? "Progress for changed handbook content was updated safely." : undefined,
  };
}

export async function handleHandbookProgressGet(request: Request, repository: HandbookProgressRepository) {
  const user = authenticatedUser(request);
  if (!user) return json({ message: "Sign in to load handbook progress." }, 401);
  try {
    const row = await repository.find(user.id);
    return json(row ? decodeStoredProgress(row) : { state: null });
  } catch {
    console.error("handbook_progress.read_failed", { userId: user.id });
    return json({ message: "Saved handbook progress is temporarily unavailable." }, 503);
  }
}

export async function handleHandbookProgressPut(request: Request, repository: HandbookProgressRepository) {
  if (!isSameOrigin(request)) return json({ message: "Invalid request origin." }, 403);
  const user = authenticatedUser(request);
  if (!user) return json({ message: "Sign in to save handbook progress." }, 401);
  const body = await readJsonRequest(request, maximumRequestBytes);
  if (!body.ok) return json({ message: body.status === 415 ? "Send handbook progress as JSON." : "The handbook progress is not valid for this edition." }, body.status);
  const parsed = handbookProgressSchema.safeParse(body.value);
  if (!parsed.success || !isKnownProgress(parsed.data)) {
    return json({ message: "The handbook progress is not valid for this edition." }, 400);
  }
  try {
    const updatedAt = new Date().toISOString();
    await repository.save({ ...parsed.data, userId: user.id, updatedAt });
    return json({ saved: true, updatedAt });
  } catch {
    console.error("handbook_progress.write_failed", { userId: user.id });
    return json({ message: "Handbook progress could not be saved." }, 503);
  }
}

export async function handleHandbookProgressDelete(request: Request, repository: HandbookProgressRepository) {
  if (!isSameOrigin(request)) return json({ message: "Invalid request origin." }, 403);
  const user = authenticatedUser(request);
  if (!user) return json({ message: "Sign in to delete handbook progress." }, 401);
  try {
    await repository.deleteForUser(user.id);
    return json({ deleted: true });
  } catch {
    console.error("handbook_progress.delete_failed", { userId: user.id });
    return json({ message: "Handbook progress could not be deleted." }, 503);
  }
}
