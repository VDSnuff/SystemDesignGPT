import { learningPayloadSchema, type LearningPayload } from "./learning-types";

interface LearningStateBody {
  readonly state?: unknown;
  readonly warning?: string;
  readonly message?: string;
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
  if (body.state === null) return { state: null, warning: body.warning };
  const parsed = learningPayloadSchema.safeParse(body.state);
  if (!parsed.success) throw new LearningStateRequestError("Saved learning work is not valid.", 500);
  return { state: parsed.data, warning: body.warning };
}

export async function saveLearningState(pageSlug: string, payload: LearningPayload) {
  const response = await fetch("/api/learning-state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pageSlug, ...payload }),
  });
  const body = await responseBody(response);
  if (!response.ok) throw new LearningStateRequestError(body.message ?? "Learning work could not be saved.", response.status);
}
