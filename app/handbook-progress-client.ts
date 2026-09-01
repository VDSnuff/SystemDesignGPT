import { handbookProgressSchema, type HandbookProgress } from "./handbook-progress";
import { persistenceRevisionSchema } from "./persistence-revision";

interface HandbookProgressBody {
  readonly state?: unknown;
  readonly warning?: string;
  readonly message?: string;
  readonly revision?: unknown;
  readonly updatedAt?: unknown;
}

export class HandbookProgressRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "HandbookProgressRequestError";
  }
}

async function responseBody(response: Response) {
  try { return await response.json() as HandbookProgressBody; } catch { return {}; }
}

export async function loadHandbookProgress(signal: AbortSignal) {
  const response = await fetch("/api/handbook-progress", { signal });
  const body = await responseBody(response);
  if (!response.ok) {
    throw new HandbookProgressRequestError(body.message ?? "Handbook progress could not be loaded.", response.status);
  }
  const revision = persistenceRevisionSchema.nullable().safeParse(body.revision);
  if (!revision.success) throw new HandbookProgressRequestError("Saved handbook progress has an invalid revision.", 500);
  if (body.state === null) return { state: null, warning: body.warning, revision: revision.data };
  const parsed = handbookProgressSchema.safeParse(body.state);
  if (!parsed.success) throw new HandbookProgressRequestError("Saved handbook progress is not valid.", 500);
  return { state: parsed.data, warning: body.warning, revision: revision.data };
}

export async function saveHandbookProgress(progress: HandbookProgress, expectedUpdatedAt: string | null) {
  const response = await fetch("/api/handbook-progress", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...progress, expectedUpdatedAt }),
  });
  const body = await responseBody(response);
  if (!response.ok) {
    throw new HandbookProgressRequestError(body.message ?? "Handbook progress could not be saved.", response.status);
  }
  const revision = persistenceRevisionSchema.safeParse(body.updatedAt);
  if (!revision.success) throw new HandbookProgressRequestError("Saved handbook progress has an invalid revision.", 500);
  return revision.data;
}
