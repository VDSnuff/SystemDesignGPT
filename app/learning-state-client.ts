import { learningPayloadSchema, type LearningPayload } from "./learning-types";
import { persistenceRevisionSchema } from "./persistence-revision";

interface LearningStateBody {
  readonly state?: unknown;
  readonly warning?: string;
  readonly message?: string;
  readonly revision?: unknown;
  readonly updatedAt?: unknown;
}

export class LearningStateRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "LearningStateRequestError";
  }
}

async function responseBody(response: Response) {
  try { return await response.json() as LearningStateBody; } catch { return {}; }
}

export async function loadLearningState(pageSlug: string, signal: AbortSignal) {
  const response = await fetch(`/api/learning-state?page=${encodeURIComponent(pageSlug)}`, { signal });
  const body = await responseBody(response);
  if (!response.ok) throw new LearningStateRequestError(body.message ?? "Learning work could not be loaded.", response.status);
  const revision = persistenceRevisionSchema.nullable().safeParse(body.revision);
  if (!revision.success) throw new LearningStateRequestError("Saved learning work has an invalid revision.", 500);
  if (body.state === null) return { state: null, warning: body.warning, revision: revision.data };
  const parsed = learningPayloadSchema.safeParse(body.state);
  if (!parsed.success) throw new LearningStateRequestError("Saved learning work is not valid.", 500);
  return { state: parsed.data, warning: body.warning, revision: revision.data };
}

export async function saveLearningState(pageSlug: string, payload: LearningPayload, expectedUpdatedAt: string | null) {
  const response = await fetch("/api/learning-state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pageSlug, ...payload, expectedUpdatedAt }),
  });
  const body = await responseBody(response);
  if (!response.ok) throw new LearningStateRequestError(body.message ?? "Learning work could not be saved.", response.status);
  const revision = persistenceRevisionSchema.safeParse(body.updatedAt);
  if (!revision.success) throw new LearningStateRequestError("Saved learning work has an invalid revision.", 500);
  return revision.data;
}
